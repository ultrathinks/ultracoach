import { getOpenAI, parseJsonResponse } from "@/shared/lib/openai";
import { NextResponse } from "next/server";
import { z } from "zod";

const SYSTEM_PROMPT = `당신은 산업심리학(I/O Psychology) 기반으로 훈련된 한국 면접관입니다.
구조화 면접(structured interview) 방법론에 따라 지원자와 1:1 면접을 진행합니다.

## 학술 기반 핵심 원칙

1. **구조화 면접**: 모든 질문은 직무 관련 역량(competency)에 매핑 (Campion et al., 1997)
2. **행동 질문 우선**: "~한 경험을 말씀해주세요" 형태 우선 (Taylor & Small, 2002: r=.56)
3. **상황 질문에는 딜레마 필수**: 상충하는 두 가치 포함 (Latham et al., 1980)
4. **DICE 탐침**: 구체성(D), 기억(I), 명확화(C), 이유(E) 4유형
5. **스트레스 면접 금지**: 압박 시나리오로 대체

## 역량 프레임워크 (5대 역량)
- 직무 전문성 / 문제 해결 / 협업·소통 / 성장 마인드셋 / 조직 적합도

## 질문 유형별 전략

### intro — 첫 질문, 긴장 완화
### deep-dive — 행동 질문 (60%), STAR 유도
### new-topic — 상황 질문 (25%), 딜레마 필수
### follow-up — DICE 탐침, 답변 부족 시
### pressure — 압박 시나리오, 중후반부
### closing — 마무리

## 대화 흐름
- 0-3회: intro + 첫 역량 탐색, 부드러운 톤
- 4-8회: 2-3번째 역량, 전문적 톤, 행동 질문 중심
- 9-14회: 4-5번째 역량 + 압박 시나리오
- 15-18회: 미탐색 역량 보완
- 19회+: 마무리 유도

## 전환 방식
- "네, 잘 알겠습니다. 다른 쪽 얘기를 해볼까요?"
- "방금 [X] 말씀하셨는데, 관련해서..."
- 이력서 언급 시 "이력서에 [Y]라고 적으셨는데..."

## 면접 종료 판단
- 20회 이상 + 5개 역량 중 4개 탐색 → 마무리
- closing 질문 후 답변을 받은 다음에만 shouldEnd: true

## 출력 (JSON)
{
  "question": "자연스러운 구어체 질문",
  "type": "intro|follow-up|deep-dive|new-topic|pressure|closing",
  "shouldEnd": false
}`;

const requestSchema = z.object({
  jobTitle: z.string(),
  interviewType: z.string(),
  resumeFileId: z.string().nullable().optional(),
  history: z.array(
    z.object({
      role: z.enum(["interviewer", "interviewee"]),
      content: z.string(),
    }),
  ),
});

export async function POST(request: Request) {
  try {
    const body = requestSchema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json({ error: "invalid request body" }, { status: 400 });
    }
    const { jobTitle, interviewType, resumeFileId, history } = body.data;

    const parts: string[] = [`직무: ${jobTitle}`, `면접 유형: ${interviewType}`];

    if (history.length === 0) {
      parts.push("\n(첫 만남입니다. 자연스럽게 인사하며 자기소개를 요청하세요)");
    } else {
      parts.push(`\n대화 이력 (${history.length}회):`);
      for (const entry of history) {
        const label = entry.role === "interviewer" ? "면접관" : "지원자";
        parts.push(`${label}: ${entry.content}`);
      }

      const lastIdx = history.findLastIndex((e) => e.role === "interviewer");
      const lastMsg = lastIdx >= 0 ? history[lastIdx].content : "";
      const isAfterClosing =
        lastMsg.includes("마지막") ||
        lastMsg.includes("하고 싶은 말") ||
        lastMsg.includes("마무리");

      if (isAfterClosing && history.length > lastIdx + 1) {
        parts.push(
          "\n(지원자가 마무리 답변을 완료했습니다. shouldEnd: true로 면접을 종료하세요)",
        );
      }
    }

    parts.push("\n다음 발언을 생성하세요.");

    const userContent = resumeFileId
      ? [
          { type: "file" as const, file: { file_id: resumeFileId } },
          { type: "text" as const, text: parts.join("\n") },
        ]
      : parts.join("\n");

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
      temperature: 0.75,
    });

    const parsed = parseJsonResponse<{
      question: string;
      type?: string;
      shouldEnd?: boolean;
    }>(completion);

    return NextResponse.json({
      question: parsed.question,
      type: parsed.type ?? "follow-up",
      shouldEnd: parsed.shouldEnd ?? false,
    });
  } catch (error) {
    console.error("next question generation failed:", error);
    return NextResponse.json(
      { error: "failed to generate next question" },
      { status: 500 },
    );
  }
}
