import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sessionFeedbackSchema } from "@/entities/feedback/schema";
import { db } from "@/shared/db";
import { feedback as feedbackTable, sessions } from "@/shared/db/schema";
import { Problems, problemDetails } from "@/shared/lib/api-error";
import { auth } from "@/shared/lib/auth";
import { getOpenAI, parseJsonResponse } from "@/shared/lib/openai";
import { rateLimit } from "@/shared/lib/rate-limit";

const checkRate = rateLimit({ windowMs: 60_000, max: 10 });

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
    language: string;
  },
): Promise<Map<number, string>> {
  const isEn = context.language === "en";
  const languageNote = isEn
    ? "Write every suggestedAnswer in natural spoken English (3-5 sentences)."
    : "각 suggestedAnswer는 자연스러운 한국어 구어체 3-5문장으로 작성.";

  const systemPrompt = `${isEn ? "You are a senior interview coach in Korea. Draft a model answer for each interview question." : "당신은 한국 면접 전문 코치입니다. 각 질문에 대한 모범 답안을 작성하세요."}

## ${isEn ? "Rules" : "규칙"}

${
  isEn
    ? `- Speak as a real candidate would (natural spoken English).
- 3-5 sentences per answer.
- Use STAR structure for experience-based questions only. Skip STAR for hypothetical or knowledge questions.
- No abstract platitudes — concrete and actionable only.
- Reflect the job role and company context when provided.
- Never name interview frameworks (STAR, etc.) in the answer text.`
    : `- 실제 지원자가 말하듯 자연스러운 구어체.
- 답안마다 3-5문장.
- 경험 기반 질문에만 STAR 구조 활용 (가정형/지식형 질문은 STAR 무시).
- 추상적 미사여구 금지 — 구체적·실전적 내용만.
- 직무·기업 맥락 반영.
- 답안 본문에 면접 프레임워크 이름(STAR 등) 언급 금지.`
}
${languageNote}

## ${isEn ? "Context" : "맥락"}

- ${isEn ? "Role" : "직무"}: ${context.jobTitle}
- ${isEn ? "Interview type" : "면접 유형"}: ${context.interviewType}
${context.companyName ? `- ${isEn ? "Company" : "기업"}: ${context.companyName}` : ""}
${context.jobResearchJson ? `- ${isEn ? "Company research" : "기업 조사"}:\n${JSON.stringify(context.jobResearchJson)}` : ""}

## ${isEn ? "Output" : "출력"} (JSON)

\`\`\`json
{ "answers": [{ "questionId": number, "suggestedAnswer": "..." }] }
\`\`\``;

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
      return Problems.unauthorized(`/api/sessions/${id}/feedback`);
    }

    const limited = checkRate(session.user.id, "session-feedback");
    if (limited) return limited;

    const [target] = await db
      .select({
        userId: sessions.userId,
        jobTitle: sessions.jobTitle,
        interviewType: sessions.interviewType,
        companyName: sessions.companyName,
        jobResearchJson: sessions.jobResearchJson,
        resumeFileId: sessions.resumeFileId,
        language: sessions.language,
      })
      .from(sessions)
      .where(eq(sessions.id, id))
      .limit(1);

    if (!target) {
      return Problems.notFound(`/api/sessions/${id}/feedback`);
    }

    if (target.userId !== session.user.id) {
      return Problems.forbidden(`/api/sessions/${id}/feedback`);
    }

    const [existing] = await db
      .select({ id: feedbackTable.id })
      .from(feedbackTable)
      .where(eq(feedbackTable.sessionId, id))
      .limit(1);

    if (existing) {
      return problemDetails({
        type: "https://ultracoach.kr/errors/feedback-already-exists",
        title: "feedback already exists",
        instance: `/api/sessions/${id}/feedback`,
        status: 409,
      });
    }

    const body = requestSchema.safeParse(await request.json());
    if (!body.success) {
      return Problems.validation(
        "invalid request body",
        `/api/sessions/${id}/feedback`,
      );
    }

    const { metrics, transcript, questions, historySummary } = body.data;

    const isEn = target.language === "en";

    const growthInstruction = historySummary
      ? isEn
        ? `\n\n## Growth tracking\n\n- First session: delivery ${historySummary.firstDelivery ?? "n/a"}, content ${historySummary.firstContent ?? "n/a"}\n- Previous session: delivery ${historySummary.prevDelivery ?? "n/a"}, content ${historySummary.prevContent ?? "n/a"}\n- Previous action items: ${JSON.stringify(historySummary.prevActionItems ?? [])}\n- Streak: ${historySummary.streakCount ?? 0}\n- Include growthComparison change vs first session.\n- Mention whether previous action items were addressed in summary.`
        : `\n\n## 성장 추적\n\n- 첫 세션 전달력 ${historySummary.firstDelivery ?? "없음"} / 답변력 ${historySummary.firstContent ?? "없음"}\n- 직전 세션 전달력 ${historySummary.prevDelivery ?? "없음"} / 답변력 ${historySummary.prevContent ?? "없음"}\n- 이전 액션 아이템: ${JSON.stringify(historySummary.prevActionItems ?? [])}\n- 연속 향상 ${historySummary.streakCount ?? 0}회\n- growthComparison에 첫 세션 대비 변화율 포함\n- 이전 액션 아이템 개선 여부를 summary에 언급`
      : "";

    const systemPrompt = `${isEn ? "You are a senior interview coach. Analyze this interview session and produce actionable feedback." : "당신은 한국 면접 전문 코치입니다. 면접 세션을 분석하고 실전에 도움이 되는 피드백을 제공하세요."}

## Hard rules

${isEn ? `- ${"Write every feedback string in English."}\n- Never use technical metric names (\`posture.isUpright\`, \`yaw\`, \`pitch\`, \`shoulderTilt\`, \`headOffset\`, \`gesture.isModerate\`, \`isFrontFacing\` 등). Translate to plain language like "posture slumped", "gaze drifted sideways".\n- Never name interview frameworks (STAR 등) in any output string.\n- No empty praise — every claim must cite a concrete moment or quote.` : `- 모든 피드백 문자열은 한국어로 작성.\n- 메트릭 변수명(\`posture.isUpright\`, \`yaw\`, \`pitch\`, \`shoulderTilt\`, \`headOffset\`, \`gesture.isModerate\`, \`isFrontFacing\` 등) 절대 출력 금지. 대신 "자세가 흐트러졌습니다", "시선이 옆으로 향했습니다" 같은 일반어 사용.\n- 면접 프레임워크 이름(STAR 등) 출력 절대 금지.\n- 빈말 금지 — 모든 평가는 구체적 순간이나 답변 인용으로 뒷받침.`}
${growthInstruction}

## ${isEn ? "Scoring" : "채점"} (deliveryScore / contentScore, 0-100)

${isEn ? `- 90+ : confident delivery / specific examples + clear logic + persuasive close\n- 70-89: mostly stable / core message delivered with minor gaps\n- 50-69: visible tension / abstract or vague answers\n- <50  : delivery hurts content / question intent missed` : `- 90+ : 자연스럽고 자신감 있는 전달 / 구체적 경험 + 명확한 논리 + 설득력 있는 결론\n- 70-89: 대체로 안정적, 간헐적 불안 / 핵심은 전달했으나 일부 구체성 부족\n- 50-69: 긴장감 눈에 띔 / 추상적·두루뭉술한 답변 다수\n- <50  : 전달 자체가 내용 방해 / 질문 의도 파악 실패`}

## STAR ${isEn ? "evaluation rule" : "평가 규칙"}

${isEn ? "Apply starFulfillment only to experience-based questions (past behavior). For hypothetical or knowledge questions, set all four to false and ignore in feedback." : "starFulfillment은 경험 기반 질문(과거 행동)에만 평가. 가정형/지식형 질문은 4개 모두 false로 두고 피드백에서 무시."}

## ${isEn ? "Output" : "출력"} (JSON)

\`\`\`json
{
  "deliveryScore": number,
  "contentScore": number,
  "summary": "${isEn ? "1-2 sentences with one strength and one weakness" : "1-2문장, 강점 1개와 약점 1개 포함"}",
  "growthComparison": { "deliveryChange": number, "contentChange": number } | null,
  "keyMoments": [{ "timestamp": number, "duration": number, "description": "...", "type": "positive"|"negative" }],
  "actionItems": [{ "id": number, "text": "..." }],
  "nextSessionSuggestion": "...",
  "questionAnalyses": [{
    "questionId": number,
    "questionText": "...",
    "answer": "...",
    "starFulfillment": { "situation": boolean, "task": boolean, "action": boolean, "result": boolean },
    "fillerWords": [{ "word": "...", "count": number }],
    "durationSec": number,
    "contentScore": number,
    "feedback": "..."
  }]
}
\`\`\`

${isEn ? "actionItems must contain exactly 3 entries." : "actionItems는 정확히 3개."}`;

    const userPrompt = [
      `${target.language === "en" ? "Metrics" : "메트릭"}:\n${JSON.stringify(metrics)}`,
      `${target.language === "en" ? "Transcript" : "트랜스크립트"}:\n${transcript}`,
      `${target.language === "en" ? "Questions" : "질문 목록"}:\n${JSON.stringify(questions)}`,
    ].join("\n\n---\n\n");

    const feedbackCall = getOpenAI()
      .chat.completions.create({
        model: "gpt-5.4-mini",
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
      language: target.language,
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
    return Problems.internal("failed to generate feedback");
  }
}
