import { getOpenAI } from "@/shared/lib/openai";
import { NextResponse } from "next/server";
import { toFile } from "openai";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ALLOWED_EXTENSIONS = [".pdf", ".docx"];

export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "no file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "file too large, max 5MB" },
        { status: 400 },
      );
    }

    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!ALLOWED_TYPES.includes(file.type) || !ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: "only pdf and docx files are allowed" },
        { status: 400 },
      );
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
