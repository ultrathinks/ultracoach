import { NextResponse } from "next/server";
import { z } from "zod";
import { getOpenAI } from "@/shared/lib/openai";

const requestSchema = z.object({
  jobTitle: z.string().max(200),
  companyName: z.string().max(100).optional(),
  interviewType: z.string().max(50),
});

const researchSchema = z.object({
  jobRequirements: z.array(z.string()),
  companyInfo: z.string().optional(),
  recentNews: z.array(z.string()).optional(),
  interviewTrends: z.array(z.string()),
});

function buildResearchPrompt(
  jobTitle: string,
  interviewType: string,
  companyName?: string,
): string {
  const focus =
    interviewType === "technical"
      ? "기술 스택, 엔지니어링 관행, 기술 면접 출제 경향"
      : interviewType === "culture-fit"
        ? "회사 가치관, 조직 문화, 컬처핏 면접 경향"
        : "인성 면접 출제 경향, 직무 핵심 역량, 소프트 스킬";

  const companyPart = companyName
    ? `\n회사: <user_input>${companyName}</user_input>\n이 회사에 대한 정보(개요, 최근 뉴스/동향)도 조사해주세요.`
    : "";

  return `당신은 채용 시장 리서처입니다. 아래 직무에 대해 웹에서 조사하고 결과를 JSON으로 반환하세요.

직무: <user_input>${jobTitle}</user_input>${companyPart}

조사 초점: ${focus}

반드시 아래 JSON 형식으로만 응답하세요:
{
  "jobRequirements": ["핵심 역량/기술 요구사항 5-8개"],
  ${companyName ? '"companyInfo": "회사 개요 2-3문장",' : ""}
  ${companyName ? '"recentNews": ["최근 뉴스/동향 2-3개"],' : ""}
  "interviewTrends": ["면접 출제 경향 3-5개"]
}`;
}

export async function POST(request: Request) {
  try {
    const body = requestSchema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json(
        { error: "invalid request body" },
        { status: 400 },
      );
    }

    const { jobTitle, companyName, interviewType } = body.data;
    const openai = getOpenAI();

    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      tools: [{ type: "web_search_preview" }],
      input: buildResearchPrompt(jobTitle, interviewType, companyName),
      text: {
        format: { type: "json_object" },
      },
    });

    const text = response.output_text;
    if (!text) {
      return NextResponse.json({ research: null });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json({ research: null });
    }

    const result = researchSchema.safeParse(parsed);
    if (!result.success) {
      return NextResponse.json({ research: null });
    }

    return NextResponse.json({ research: result.data });
  } catch (error) {
    console.error("job research failed:", error);
    return NextResponse.json({ research: null });
  }
}
