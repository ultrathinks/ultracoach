import { NextResponse } from "next/server";
import { resolveLocale } from "@/i18n/request";
import { Problems } from "@/shared/lib/api-error";
import { auth } from "@/shared/lib/auth";
import { getOpenAI } from "@/shared/lib/openai";
import { rateLimit } from "@/shared/lib/rate-limit";

const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB (Whisper API limit)
const checkRate = rateLimit({ windowMs: 60_000, max: 60 });

const HALLUCINATION_PATTERNS_KO = [
  /구독.*좋아요/,
  /영상.*여기까지/,
  /다음.*영상.*만나/,
  /시청.*감사/,
  /먹방/,
  /^(.{2,10})\1{2,}$/,
];

const HALLUCINATION_PATTERNS_EN = [
  /thanks for watching/i,
  /like and subscribe/i,
  /please subscribe/i,
  /^(.{2,10})\1{2,}$/,
];

function isHallucination(text: string, locale: "ko" | "en"): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0) return true;
  const patterns =
    locale === "en" ? HALLUCINATION_PATTERNS_EN : HALLUCINATION_PATTERNS_KO;
  return patterns.some((p) => p.test(trimmed));
}

const PROMPTS = {
  ko: "면접관과 지원자의 대화입니다. 지원자가 면접 질문에 답변하고 있습니다.",
  en: "A conversation between an interviewer and a candidate. The candidate is answering an interview question.",
};

const NO_RESPONSE = {
  ko: "(응답 없음)",
  en: "(no response)",
};

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Problems.unauthorized("/api/whisper");
    }

    const limited = checkRate(session.user.id, "whisper");
    if (limited) return limited;

    const formData = await request.formData();
    const audio = formData.get("audio");
    if (!(audio instanceof File)) {
      return Problems.validation("no audio file", "/api/whisper");
    }

    if (audio.size > MAX_AUDIO_SIZE) {
      return Problems.validation(
        "audio file too large, max 25MB",
        "/api/whisper",
      );
    }

    if (!audio.type.startsWith("audio/")) {
      return Problems.validation(
        "only audio files are allowed",
        "/api/whisper",
      );
    }

    const locale = await resolveLocale();

    const transcription = await getOpenAI().audio.transcriptions.create({
      model: "whisper-1",
      file: audio,
      language: locale,
      temperature: 0,
      prompt: PROMPTS[locale],
    });

    const text = transcription.text.trim();

    if (isHallucination(text, locale)) {
      return NextResponse.json({ text: NO_RESPONSE[locale] });
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error("whisper transcription failed:", error);
    return Problems.internal("failed to transcribe audio");
  }
}
