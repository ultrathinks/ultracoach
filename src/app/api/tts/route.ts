import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveLocale } from "@/i18n/request";
import { auth } from "@/shared/lib/auth";
import { rateLimit } from "@/shared/lib/rate-limit";

const checkRate = rateLimit({ windowMs: 60_000, max: 60 });

const KO_VOICE_ID_DEFAULT = "4JJwo477JUAx3HV0T7n7";
const EN_VOICE_ID_DEFAULT = "21m00Tcm4TlvDq8ikWAM";
const MODEL_ID = "eleven_multilingual_v2";

const requestSchema = z.object({
  text: z.string().min(1).max(5000),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const limited = checkRate(session.user.id, "tts");
    if (limited) return limited;

    const body = requestSchema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json(
        { error: "invalid request body" },
        { status: 400 },
      );
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "elevenlabs api key not configured" },
        { status: 500 },
      );
    }

    const locale = await resolveLocale();
    const voiceId =
      locale === "en"
        ? (process.env.ELEVENLABS_VOICE_ID_EN ?? EN_VOICE_ID_DEFAULT)
        : (process.env.ELEVENLABS_VOICE_ID_KO ?? KO_VOICE_ID_DEFAULT);

    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: body.data.text,
          model_id: MODEL_ID,
          voice_settings: {
            stability: 0.65,
            similarity_boost: 0.85,
            style: 0.15,
            use_speaker_boost: true,
          },
        }),
      },
    );

    if (!res.ok || !res.body) {
      return NextResponse.json({ error: "tts failed" }, { status: 502 });
    }

    return new Response(res.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("tts proxy failed:", error);
    return NextResponse.json({ error: "tts proxy error" }, { status: 500 });
  }
}
