import { getOpenAI } from "@/shared/lib/openai";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audio = formData.get("audio");
    if (!(audio instanceof File)) {
      return NextResponse.json({ error: "no audio file" }, { status: 400 });
    }

    const transcription = await getOpenAI().audio.transcriptions.create({
      model: "whisper-1",
      file: audio,
      language: "ko",
    });

    return NextResponse.json({ text: transcription.text });
  } catch (error) {
    console.error("whisper transcription failed:", error);
    return NextResponse.json(
      { error: "failed to transcribe audio" },
      { status: 500 },
    );
  }
}
