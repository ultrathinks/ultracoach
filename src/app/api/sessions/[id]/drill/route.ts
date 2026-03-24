import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { questionAnalysisSchema } from "@/entities/feedback/schema";
import { db } from "@/shared/db";
import { feedback as feedbackTable, sessions } from "@/shared/db/schema";
import { auth } from "@/shared/lib/auth";
import { getOpenAI, parseJsonResponse } from "@/shared/lib/openai";

const drillRequestSchema = z.object({
  questionId: z.number(),
  transcript: z.string().min(1).max(10000),
});

const drillResponseSchema = z.object({
  contentScore: z.number().min(0).max(100),
  feedback: z.string(),
  starFulfillment: z.object({
    situation: z.boolean(),
    task: z.boolean(),
    action: z.boolean(),
    result: z.boolean(),
  }),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // auth + ownership check (same pattern as feedback/route.ts)
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const [target] = await db
      .select({
        userId: sessions.userId,
        jobTitle: sessions.jobTitle,
        interviewType: sessions.interviewType,
      })
      .from(sessions)
      .where(eq(sessions.id, id))
      .limit(1);

    if (!target) {
      return NextResponse.json({ error: "session not found" }, { status: 404 });
    }

    if (target.userId !== session.user.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // validate request body
    const body = drillRequestSchema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json(
        { error: "invalid request body" },
        { status: 400 },
      );
    }

    const { questionId, transcript } = body.data;

    // retrieve original question analysis from feedback for context
    const [fb] = await db
      .select({ summaryJson: feedbackTable.summaryJson })
      .from(feedbackTable)
      .where(eq(feedbackTable.sessionId, id))
      .limit(1);

    if (!fb?.summaryJson) {
      return NextResponse.json(
        { error: "feedback not found" },
        { status: 404 },
      );
    }

    // safeParse summaryJson to extract the specific question
    const parsed = z
      .object({ questionAnalyses: z.array(questionAnalysisSchema) })
      .safeParse(fb.summaryJson);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid feedback data" },
        { status: 500 },
      );
    }

    const originalQa = parsed.data.questionAnalyses.find(
      (qa) => qa.questionId === questionId,
    );

    if (!originalQa) {
      return NextResponse.json(
        { error: "question not found in session" },
        { status: 404 },
      );
    }

    // build LLM prompt
    const suggestedRef = originalQa.suggestedAnswer
      ? `\n\n## 모범 답안 (참고)\n${originalQa.suggestedAnswer}`
      : "";

    const systemPrompt = `당신은 한국 면접 전문 코치입니다. 재연습 답변을 분석하고 피드백을 제공하세요.
모든 피드백은 한국어로 작성하세요.

## 맥락
- 직무: ${target.jobTitle}
- 면접 유형: ${target.interviewType}
- 질문: ${originalQa.questionText}
- 이전 점수: ${originalQa.contentScore}점${suggestedRef}

## 채점 기준
- 90+: 구체적 경험, 명확한 논리, 설득력 있는 결론까지 완비
- 70-89: 핵심은 전달했으나 구체성이나 논리 일부 부족
- 50-69: 추상적이거나 두루뭉술한 답변이 다수
- 50 미만: 질문 의도 파악 실패 또는 답변 자체가 부실

## 피드백 원칙
- 이전 답변 대비 개선된 점과 아직 부족한 점을 구체적으로 지적
- 모범 답안이 있으면 모범 답안 대비 어디가 부족한지 비교 분석
- 당장 적용할 수 있는 구체적 개선 포인트 1-2개 제시
- STAR 구조가 적합한 질문이면 STAR 충족도 평가

## 출력 (JSON)
{
  "contentScore": number (0-100),
  "feedback": "2-4문장의 구체적 피드백",
  "starFulfillment": { "situation": boolean, "task": boolean, "action": boolean, "result": boolean }
}`;

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-5.4-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `재연습 답변:\n${transcript}` },
      ],
      response_format: { type: "json_object" },
    });

    const result = parseJsonResponse(completion, drillResponseSchema);

    // ephemeral — no DB write
    return NextResponse.json(result);
  } catch (error) {
    console.error("drill feedback failed:", error);
    return NextResponse.json(
      { error: "failed to generate drill feedback" },
      { status: 500 },
    );
  }
}
