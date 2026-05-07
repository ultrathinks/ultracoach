import { z } from "zod";
import { resolveLocale } from "@/i18n/request";
import { AVATARS, findAvatar, resolveVoiceId } from "@/shared/config/avatars";
import { Problems } from "@/shared/lib/api-error";
import { auth } from "@/shared/lib/auth";
import { rateLimit } from "@/shared/lib/rate-limit";

const checkRate = rateLimit({ windowMs: 60_000, max: 60 });

const MODEL_ID = "eleven_multilingual_v2";

const ALLOWED_VOICE_IDS = new Set<string>(
  AVATARS.flatMap((a) => [a.voiceIdKo, a.voiceIdEn]),
);

const requestSchema = z.object({
  text: z.string().min(1).max(5000),
  avatarId: z.string().optional(),
  voiceId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Problems.unauthorized("/api/tts");
    }

    const limited = checkRate(session.user.id, "tts");
    if (limited) return limited;

    const body = requestSchema.safeParse(await request.json());
    if (!body.success) {
      return Problems.validation("invalid request body", "/api/tts");
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return Problems.internal("elevenlabs api key not configured", "/api/tts");
    }

    const locale = await resolveLocale();
    const requestedVoiceId = body.data.voiceId;
    let voiceId: string;
    if (requestedVoiceId) {
      if (!ALLOWED_VOICE_IDS.has(requestedVoiceId)) {
        return Problems.validation("voice id not allowed", "/api/tts");
      }
      voiceId = requestedVoiceId;
    } else {
      const avatar = findAvatar(body.data.avatarId) ?? AVATARS[0];
      voiceId = resolveVoiceId(avatar, locale);
    }

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
      return Problems.internal("tts upstream failed", "/api/tts");
    }

    return new Response(res.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("tts proxy failed:", error);
    return Problems.internal("tts proxy error", "/api/tts");
  }
}
