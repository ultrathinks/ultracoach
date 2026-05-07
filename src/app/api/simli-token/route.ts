import { NextResponse } from "next/server";
import { generateIceServers, generateSimliSessionToken } from "simli-client";
import { z } from "zod";
import {
  AVATAR_IDS,
  DEFAULT_AVATAR_ID,
  findAvatar,
} from "@/shared/config/avatars";
import { Problems } from "@/shared/lib/api-error";
import { auth } from "@/shared/lib/auth";
import { meetsPlan } from "@/shared/lib/permissions";
import { rateLimit } from "@/shared/lib/rate-limit";

const checkRate = rateLimit({ windowMs: 60_000, max: 10 });

const requestSchema = z.object({
  avatarId: z.enum(AVATAR_IDS).optional(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Problems.unauthorized("/api/simli-token");
    }

    const limited = checkRate(session.user.id, "simli-token");
    if (limited) return limited;

    const body = requestSchema.safeParse(
      await request.json().catch(() => ({})),
    );
    if (!body.success) {
      return Problems.validation("invalid request body", "/api/simli-token");
    }

    const requestedId = body.data.avatarId ?? DEFAULT_AVATAR_ID;
    const avatar = findAvatar(requestedId);
    if (!avatar) {
      return Problems.notFound("/api/simli-token");
    }

    if (!meetsPlan(session.user, avatar.plan)) {
      return Problems.planRequired({
        requiredPlan: avatar.plan,
        currentPlan: session.user.plan,
        instance: "/api/simli-token",
      });
    }

    const apiKey = process.env.SIMLI_API_KEY;
    if (!apiKey) {
      return Problems.internal(
        "simli api key not configured",
        "/api/simli-token",
      );
    }

    const token = await generateSimliSessionToken(
      {
        config: {
          faceId: avatar.faceId,
          handleSilence: true,
          maxSessionLength: 3600,
          maxIdleTime: 300,
        },
        apiKey,
      },
      "https://api.simli.ai",
    );

    const iceServers = await generateIceServers(apiKey);

    return NextResponse.json({
      sessionToken: token.session_token,
      iceServers,
      avatarId: avatar.id,
    });
  } catch (error) {
    console.error("simli token generation failed:", error);
    return Problems.internal(
      "failed to generate avatar token",
      "/api/simli-token",
    );
  }
}
