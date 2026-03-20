import { getOpenAI } from "@/shared/lib/openai";
import { NextResponse } from "next/server";
import { toFile } from "openai";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "no file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await getOpenAI().files.create({
      file: await toFile(buffer, file.name),
      purpose: "assistants",
    });

    return NextResponse.json({ fileId: uploaded.id });
  } catch (error) {
    console.error("resume upload failed:", error);
    return NextResponse.json(
      { error: "failed to upload resume" },
      { status: 500 },
    );
  }
}
