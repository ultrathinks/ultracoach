import { auth } from "@/shared/lib/auth";
import { rateLimit } from "@/shared/lib/rate-limit";
import { getOpenAI } from "@/shared/lib/openai";
import { NextResponse } from "next/server";

const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB (Whisper API limit)
const checkRate = rateLimit({ windowMs: 60_000, max: 60 });

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
    });

    console.log(
      `[whisper] size=${audio.size} type=${audio.type} text="${transcription.text}"`,
    );

    return NextResponse.json({ text: transcription.text });
  } catch (error) {
    console.error("whisper transcription failed:", error);
    return NextResponse.json(
      { error: "failed to transcribe audio" },
      { status: 500 },
    );
  }
}
