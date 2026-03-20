import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAI() {
  if (!client) {
    client = new OpenAI();
  }
  return client;
}

export function parseJsonResponse<T>(
  completion: OpenAI.Chat.Completions.ChatCompletion,
): T {
  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("empty completion response");
  return JSON.parse(content) as T;
}
