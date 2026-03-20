import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    apiKey: process.env.ELEVENLABS_API_KEY,
    simliApiKey: process.env.SIMLI_API_KEY,
  });
}
