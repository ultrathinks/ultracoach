import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { questionAnalysisSchema } from "@/entities/feedback/schema";
import { db } from "@/shared/db";
import { feedback as feedbackTable, sessions } from "@/shared/db/schema";
import { Problems } from "@/shared/lib/api-error";
import { auth } from "@/shared/lib/auth";
import { getOpenAI, parseJsonResponse } from "@/shared/lib/openai";
import { canUseDrill } from "@/shared/lib/permissions";
import { rateLimit } from "@/shared/lib/rate-limit";

const checkRate = rateLimit({ windowMs: 60_000, max: 30 });

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
      return Problems.unauthorized(`/api/sessions/${id}/drill`);
    }

    if (!canUseDrill(session.user)) {
      return Problems.planRequired({
        requiredPlan: "pro",
        currentPlan: session.user.plan,
        instance: `/api/sessions/${id}/drill`,
      });
    }

    const limited = checkRate(session.user.id, "session-drill");
    if (limited) return limited;

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
      return Problems.notFound(`/api/sessions/${id}/drill`);
    }

    if (target.userId !== session.user.id) {
      return Problems.forbidden(`/api/sessions/${id}/drill`);
    }

    // validate request body
    const body = drillRequestSchema.safeParse(await request.json());
    if (!body.success) {
      return Problems.validation(
        "invalid request body",
        `/api/sessions/${id}/drill`,
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
      return Problems.notFound(`/api/sessions/${id}/drill`);
    }

    // safeParse summaryJson to extract the specific question
    const parsed = z
      .object({ questionAnalyses: z.array(questionAnalysisSchema) })
      .safeParse(fb.summaryJson);

    if (!parsed.success) {
      return Problems.internal(
        "invalid feedback data",
        `/api/sessions/${id}/drill`,
      );
    }

    const originalQa = parsed.data.questionAnalyses.find(
      (qa) => qa.questionId === questionId,
    );

    if (!originalQa) {
      return Problems.notFound(`/api/sessions/${id}/drill`);
    }

    const isEn = false; // drill is currently Korean-only; sessions.language not in select. KO 우선.
    const suggestedRef = originalQa.suggestedAnswer
      ? `\n\n## 모범 답안 (참고용, 답안 본문에 STAR 등 언급 금지)\n${originalQa.suggestedAnswer}`
      : "";

    const systemPrompt = `당신은 한국 면접 전문 코치입니다. 재연습 답변을 분석하고 피드백을 제공하세요.

## Hard rules

- 모든 피드백은 한국어 자연 구어체로
- 면접 프레임워크 이름(STAR 등) 출력 금지
- 빈말 금지 — 모든 평가는 답변 인용 또는 구체적 순간 명시

## 맥락

- 직무: ${target.jobTitle}
- 면접 유형: ${target.interviewType}
- 질문: ${originalQa.questionText}
- 이전 점수: ${originalQa.contentScore}점${suggestedRef}

## 채점 (contentScore, 0-100)

- 90+ : 구체적 경험 + 명확한 논리 + 설득력 있는 결론
- 70-89: 핵심 전달, 일부 구체성·논리 부족
- 50-69: 추상적·두루뭉술
- <50  : 질문 의도 파악 실패 또는 답변 부실

## STAR 평가 규칙

- 경험 기반 질문(과거 행동)에만 starFulfillment 평가
- 가정형/지식형 질문은 4개 모두 false로 두고 피드백에서 무시

## feedback 작성 형식

피드백 본문은 다음 두 부분으로:
1. 이전 점수 ${originalQa.contentScore}점 대비 변화 평가 (1-2문장, 어떤 부분이 좋아졌고 어떤 부분이 여전히 부족한지)
2. 다음 시도에서 적용할 구체적 개선 포인트 1-2개 (실제 행동 단위)

전체 길이 2-3문장 + 개선 포인트 1-2개. 빈 칭찬 금지.

## 출력 (JSON)

\`\`\`json
{
  "contentScore": number,
  "feedback": "...",
  "starFulfillment": { "situation": boolean, "task": boolean, "action": boolean, "result": boolean }
}
\`\`\``;
    void isEn;

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
    return Problems.internal("failed to generate drill feedback");
  }
}
