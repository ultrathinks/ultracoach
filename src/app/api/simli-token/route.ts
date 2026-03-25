import { auth } from "@/shared/lib/auth";
import { rateLimit } from "@/shared/lib/rate-limit";
import { NextResponse } from "next/server";
import { generateIceServers, generateSimliSessionToken } from "simli-client";

const checkRate = rateLimit({ windowMs: 60_000, max: 10 });

const FACE_ID = "7e74d6e7-d559-4394-bd56-4923a3ab75ad";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const limited = checkRate(session.user.id, "simli-token");
    if (limited) return limited;

    const apiKey = process.env.SIMLI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "simli api key not configured" },
        { status: 500 },
      );
    }

    const token = await generateSimliSessionToken(
      {
        config: {
          faceId: FACE_ID,
          // Simli compose token currently exposes session controls only.
          // Aspect ratio / width / height are not available config fields.
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
    });
  } catch (error) {
    console.error("simli token generation failed:", error);
    return NextResponse.json(
      { error: "failed to generate simli token" },
      { status: 500 },
    );
  }
}
