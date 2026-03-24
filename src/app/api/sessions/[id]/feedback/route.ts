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

const questionInputSchema = z.object({
  id: z.number(),
  text: z.string().optional(),
  questionText: z.string().optional(),
});

const suggestedAnswerItemSchema = z.object({
  questionId: z.number(),
  suggestedAnswer: z.string(),
});

const suggestedAnswersResponseSchema = z.object({
  answers: z.array(suggestedAnswerItemSchema),
});

async function generateSuggestedAnswers(
  questions: z.infer<typeof questionInputSchema>[],
  context: {
    jobTitle: string;
    interviewType: string;
    companyName: string | null;
    jobResearchJson: unknown;
    resumeFileId: string | null;
  },
): Promise<Map<number, string>> {
  const systemPrompt = `당신은 한국 면접 전문 코치입니다. 각 면접 질문에 대해 모범 답안을 작성하세요.

## 규칙
- 실제 면접에서 말하는 것처럼 자연스러운 구어체로 작성
- 각 답안은 3-5문장으로 간결하게
- STAR 구조가 적합한 질문이면 STAR 구조를 활용
- 추상적 미사여구 금지 — 구체적이고 실전적인 답변만
- 지원 직무와 기업 맥락을 반영

## 맥락
- 직무: ${context.jobTitle}
- 면접 유형: ${context.interviewType}
${context.companyName ? `- 기업: ${context.companyName}` : ""}
${context.jobResearchJson ? `- 기업 조사:\n${JSON.stringify(context.jobResearchJson)}` : ""}

## 출력 (JSON)
{
  "answers": [{ "questionId": number, "suggestedAnswer": "모범 답안" }]
}`;

  const questionList = questions
    .map((q, i) => `${i + 1}. [ID: ${q.id}] ${q.text ?? q.questionText ?? ""}`)
    .join("\n");

  const textPart = `다음 질문들에 대한 모범 답안을 작성하세요:\n\n${questionList}`;

  const userContent = context.resumeFileId
    ? [
        { type: "file" as const, file: { file_id: context.resumeFileId } },
        { type: "text" as const, text: textPart },
      ]
    : textPart;

  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-5.4-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    response_format: { type: "json_object" },
  });

  const result = parseJsonResponse(completion, suggestedAnswersResponseSchema);
  return new Map(result.answers.map((a) => [a.questionId, a.suggestedAnswer]));
}

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
      .select({
        userId: sessions.userId,
        jobTitle: sessions.jobTitle,
        interviewType: sessions.interviewType,
        companyName: sessions.companyName,
        jobResearchJson: sessions.jobResearchJson,
        resumeFileId: sessions.resumeFileId,
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

    const systemPrompt = `당신은 한국 면접 전문 코치입니다. 면접 세션을 분석하고 실전에 도움이 되는 피드백을 제공하세요.
모든 피드백은 한국어로 작성하세요.
${growthInstruction}

## 채점 기준

### 전달력 (deliveryScore)
- 90+: 자연스럽고 자신감 있는 전달, 적절한 속도와 톤
- 70-89: 대체로 안정적이나 간헐적 불안 요소 (시선, 자세 등)
- 50-69: 긴장감이 눈에 띄고, 비언어적 신호에 개선 필요
- 50 미만: 전달 자체가 답변 내용을 방해하는 수준

### 답변력 (contentScore)
- 90+: 구체적 경험, 명확한 논리, 설득력 있는 결론까지 완비
- 70-89: 핵심은 전달했으나 구체성이나 논리 일부 부족
- 50-69: 추상적이거나 두루뭉술한 답변이 다수
- 50 미만: 질문 의도 파악 실패 또는 답변 자체가 부실

## 피드백 원칙

- 빈말 금지: "잘하셨습니다" 같은 뜬구름 피드백 대신 구체적 근거 제시
- 질문별 분석에서 실제 답변을 인용하며 무엇이 좋았고 무엇이 부족했는지 지적
- actionItems는 당장 다음 면접에서 적용할 수 있는 구체적 행동 제시
- STAR 충족도는 해당 질문이 경험 기반 질문일 때만 의미 있음. 기술 질문이나 상황 가정 질문에는 관대하게 평가

## 출력 (JSON)

{
  "deliveryScore": number (0-100),
  "contentScore": number (0-100),
  "summary": "1-2문장 종합 평가 — 강점 1개, 약점 1개를 반드시 포함",
  "growthComparison": { "deliveryChange": number, "contentChange": number } | null,
  "keyMoments": [{ "timestamp": number, "duration": number, "description": "구체적으로 무슨 일이 있었는지", "type": "positive"|"negative" }],
  "actionItems": [{ "id": number, "text": "다음 면접에서 바로 실천할 수 있는 구체적 행동" }] (정확히 3개),
  "nextSessionSuggestion": "다음 연습 세션에서 집중할 영역 추천",
  "questionAnalyses": [{
    "questionId": number,
    "questionText": "질문 원문",
    "answer": "답변 원문",
    "starFulfillment": { "situation": boolean, "task": boolean, "action": boolean, "result": boolean },
    "fillerWords": [{ "word": "어", "count": 3 }],
    "durationSec": number,
    "contentScore": number (0-100),
    "feedback": "이 답변의 구체적 강점/약점 — 실제 답변 내용을 인용하며 분석"
  }]
}`;

    const userPrompt = [
      `메트릭 데이터:\n${JSON.stringify(metrics)}`,
      `트랜스크립트:\n${transcript}`,
      `질문 목록:\n${JSON.stringify(questions)}`,
    ].join("\n\n---\n\n");

    const feedbackCall = getOpenAI()
      .chat.completions.create({
        model: "gpt-5.4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      })
      .then((c) => parseJsonResponse(c, sessionFeedbackSchema));

    const parsedQuestions = questions
      .map((q) => questionInputSchema.safeParse(q))
      .filter((r) => r.success)
      .map((r) => r.data);

    const suggestedCall = generateSuggestedAnswers(parsedQuestions, {
      jobTitle: target.jobTitle,
      interviewType: target.interviewType,
      companyName: target.companyName,
      jobResearchJson: target.jobResearchJson,
      resumeFileId: target.resumeFileId,
    });

    const [feedbackResult, suggestedResult] = await Promise.allSettled([
      feedbackCall,
      suggestedCall,
    ]);

    if (feedbackResult.status === "rejected") {
      throw feedbackResult.reason;
    }

    const feedbackData = feedbackResult.value;

    const suggestedMap =
      suggestedResult.status === "fulfilled"
        ? suggestedResult.value
        : (() => {
            console.error(
              "suggestedAnswer generation failed:",
              suggestedResult.reason,
            );
            return new Map<number, string>();
          })();

    const mergedAnalyses = feedbackData.questionAnalyses.map((qa) => ({
      ...qa,
      suggestedAnswer: suggestedMap.get(qa.questionId),
    }));

    const mergedFeedback = {
      ...feedbackData,
      questionAnalyses: mergedAnalyses,
    };

    await db.insert(feedbackTable).values({
      sessionId: id,
      summaryJson: mergedFeedback,
      keyMomentsJson: mergedFeedback.keyMoments,
      actionItemsJson: mergedFeedback.actionItems,
      questionAnalysesJson: mergedFeedback.questionAnalyses,
    });

    await db
      .update(sessions)
      .set({
        deliveryScore: mergedFeedback.deliveryScore,
        contentScore: mergedFeedback.contentScore,
      })
      .where(eq(sessions.id, id));

    return NextResponse.json(mergedFeedback);
  } catch (error) {
    console.error("feedback generation failed:", error);
    return NextResponse.json(
      { error: "failed to generate feedback" },
      { status: 500 },
    );
  }
}
