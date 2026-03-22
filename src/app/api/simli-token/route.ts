import {
  generateSimliSessionToken,
  generateIceServers,
} from "simli-client";
import { NextResponse } from "next/server";

const FACE_ID = "tmp9i8bbq7c";

export async function POST() {
  try {
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
          handleSilence: true,
          maxSessionLength: 3600,
          maxIdleTime: 60,
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
