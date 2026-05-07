import { NextResponse } from "next/server";
import { toFile } from "openai";
import { Problems } from "@/shared/lib/api-error";
import { auth } from "@/shared/lib/auth";
import { getOpenAI } from "@/shared/lib/openai";
import { rateLimit } from "@/shared/lib/rate-limit";

const checkRate = rateLimit({ windowMs: 60_000, max: 10 });

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ALLOWED_EXTENSIONS = [".pdf", ".docx"];

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Problems.unauthorized("/api/upload-resume");
    }

    const limited = checkRate(session.user.id, "upload-resume");
    if (limited) return limited;

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return Problems.validation("no file provided", "/api/upload-resume");
    }

    if (file.size > MAX_FILE_SIZE) {
      return Problems.validation(
        "file too large, max 50MB",
        "/api/upload-resume",
      );
    }

    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (
      !ALLOWED_TYPES.includes(file.type) ||
      !ALLOWED_EXTENSIONS.includes(ext)
    ) {
      return Problems.validation(
        "only pdf and docx files are allowed",
        "/api/upload-resume",
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
    return Problems.internal("failed to upload resume");
  }
}
