import { z } from "zod";

const transcribeResponseSchema = z.object({ text: z.string() });

export async function transcribeAudio(
  audioBlob: Blob,
  locale: string,
): Promise<string> {
  const formData = new FormData();
  formData.append("audio", audioBlob, "answer.webm");
  formData.append("locale", locale);

  const res = await fetch("/api/whisper", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error("failed to transcribe");
  const data = transcribeResponseSchema.parse(await res.json());
  return data.text;
}
