import { NextResponse } from "next/server";
import { generateIceServers, generateSimliSessionToken } from "simli-client";

const FACE_ID = "14de6eb1-0ea6-4fde-9522-8552ce691cb6";

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
          // Simli compose token currently exposes session controls only.
          // Aspect ratio / width / height are not available config fields.
          handleSilence: true,
          maxSessionLength: 3600,
          maxIdleTime: 120,
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
