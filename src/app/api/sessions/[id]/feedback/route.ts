import { db } from "@/shared/db";
import {
  sessions,
  feedback as feedbackTable,
} from "@/shared/db/schema";
import { auth } from "@/shared/lib/auth";
import { getOpenAI, parseJsonResponse } from "@/shared/lib/openai";
import { sessionFeedbackSchema } from "@/entities/feedback/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  metrics: z.record(z.string(), z.unknown()),
  transcript: z.string().max(100000),
  questions: z.array(z.unknown()).max(30),
  historySummary: z
    .object({
      firstDelivery: z.number().optional(),
      firstContent: z.number().optional(),
      prevDelivery: z.number().optional(),
      prevContent: z.number().optional(),
      prevActionItems: z.array(z.string()).optional(),
      streakCount: z.number().optional(),
    })
    .optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // session ownership check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const [target] = await db
      .select({ userId: sessions.userId })
      .from(sessions)
      .where(eq(sessions.id, id))
      .limit(1);

    if (!target) {
      return NextResponse.json({ error: "session not found" }, { status: 404 });
    }

    if (target.userId !== session.user.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const [existing] = await db
      .select({ id: feedbackTable.id })
      .from(feedbackTable)
      .where(eq(feedbackTable.sessionId, id))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "feedback already exists" },
        { status: 409 },
      );
    }

    const body = requestSchema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json(
        { error: "invalid request body" },
        { status: 400 },
      );
    }

    const { metrics, transcript, questions, historySummary } = body.data;

    const growthInstruction = historySummary
      ? `\n\n성장 추적:
- 첫 세션 전달력: ${historySummary.firstDelivery ?? "없음"}, 답변력: ${historySummary.firstContent ?? "없음"}
- 직전 세션 전달력: ${historySummary.prevDelivery ?? "없음"}, 답변력: ${historySummary.prevContent ?? "없음"}
- 이전 액션 아이템: ${JSON.stringify(historySummary.prevActionItems ?? [])}
- growthComparison에 첫 세션 대비 변화율을 포함하세요
- 이전 액션 아이템의 실제 개선 여부를 summary에 언급하세요
- 연속 향상 횟수: ${historySummary.streakCount ?? 0}회`
      : "";

    const systemPrompt = `You are an expert interview coach for Korean job interviews.
Analyze the interview session and provide structured feedback in Korean.
${growthInstruction}

Return a JSON object with:
{
  "deliveryScore": number (0-100),
  "contentScore": number (0-100),
  "summary": string (1-2 sentence overall assessment),
  "growthComparison": { "deliveryChange": number, "contentChange": number } | null,
  "keyMoments": [{ "timestamp": number, "duration": number, "description": string, "type": "positive"|"negative" }],
  "actionItems": [{ "id": number, "text": string }] (exactly 3),
  "nextSessionSuggestion": string,
  "questionAnalyses": [{
    "questionId": number,
    "questionText": string,
    "answer": string,
    "starFulfillment": { "situation": boolean, "task": boolean, "action": boolean, "result": boolean },
    "fillerWords": [{ "word": string, "count": number }],
    "durationSec": number,
    "contentScore": number,
    "feedback": string
  }]
}`;

    const userPrompt = [
      `메트릭 데이터:\n${JSON.stringify(metrics)}`,
      `트랜스크립트:\n${transcript}`,
      `질문 목록:\n${JSON.stringify(questions)}`,
    ].join("\n\n---\n\n");

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });

    const feedbackData = parseJsonResponse(completion, sessionFeedbackSchema);

    await db.insert(feedbackTable).values({
      sessionId: id,
      summaryJson: feedbackData,
      keyMomentsJson: feedbackData.keyMoments,
      actionItemsJson: feedbackData.actionItems,
      questionAnalysesJson: feedbackData.questionAnalyses,
    });

    await db
      .update(sessions)
      .set({
        deliveryScore: feedbackData.deliveryScore,
        contentScore: feedbackData.contentScore,
      })
      .where(eq(sessions.id, id));

    return NextResponse.json(feedbackData);
  } catch (error) {
    console.error("feedback generation failed:", error);
    return NextResponse.json(
      { error: "failed to generate feedback" },
      { status: 500 },
    );
  }
}
