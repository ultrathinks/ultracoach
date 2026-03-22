import OpenAI from "openai";
import type { z } from "zod";

let client: OpenAI | null = null;

export function getOpenAI() {
  if (!client) {
    client = new OpenAI();
  }
  return client;
}

export function parseJsonResponse<T>(
  completion: OpenAI.Chat.Completions.ChatCompletion,
  schema: z.ZodType<T>,
): T {
  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("empty completion response");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("invalid json from completion");
  }

  const result = schema.safeParse(parsed);
  if (!result.success) throw new Error("invalid completion response");
  return result.data;
}
