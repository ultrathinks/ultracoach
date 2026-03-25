import { auth } from "@/shared/lib/auth";
import { rateLimit } from "@/shared/lib/rate-limit";
import { getOpenAI } from "@/shared/lib/openai";
import { NextResponse } from "next/server";

const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB (Whisper API limit)
const checkRate = rateLimit({ windowMs: 60_000, max: 60 });

const HALLUCINATION_PATTERNS = [
  /구독.*좋아요/,
  /영상.*여기까지/,
  /다음.*영상.*만나/,
  /시청.*감사/,
  /먹방/,
  /^(.{2,10})\1{2,}$/, // same phrase repeated 3+ times
];

function isHallucination(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0) return true;
  return HALLUCINATION_PATTERNS.some((p) => p.test(trimmed));
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const limited = checkRate(session.user.id, "whisper");
    if (limited) return limited;

    const formData = await request.formData();
    const audio = formData.get("audio");
    if (!(audio instanceof File)) {
      return NextResponse.json({ error: "no audio file" }, { status: 400 });
    }

    if (audio.size > MAX_AUDIO_SIZE) {
      return NextResponse.json(
        { error: "audio file too large, max 25MB" },
        { status: 400 },
      );
    }

    if (!audio.type.startsWith("audio/")) {
      return NextResponse.json(
        { error: "only audio files are allowed" },
        { status: 400 },
      );
    }

    const transcription = await getOpenAI().audio.transcriptions.create({
      model: "whisper-1",
      file: audio,
      language: "ko",
      temperature: 0,
      prompt: "면접관과 지원자의 대화입니다. 지원자가 면접 질문에 답변하고 있습니다.",
    });

    const text = transcription.text.trim();

    if (isHallucination(text)) {
      return NextResponse.json({ text: "(응답 없음)" });
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error("whisper transcription failed:", error);
    return NextResponse.json(
      { error: "failed to transcribe audio" },
      { status: 500 },
    );
  }
}
