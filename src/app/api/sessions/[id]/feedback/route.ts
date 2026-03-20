import { db } from "@/shared/db";
import {
  sessions,
  feedback as feedbackTable,
} from "@/shared/db/schema";
import { getOpenAI, parseJsonResponse } from "@/shared/lib/openai";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const systemPrompt = `You are an expert interview coach for Korean job interviews.
Analyze the interview session and provide structured feedback in Korean.

Return a JSON object with:
{
  "deliveryScore": number (0-100),
  "contentScore": number (0-100),
  "summary": string,
  "growthComparison": null,
  "keyMoments": [{ "timestamp": number, "duration": number, "description": string, "type": "positive"|"negative" }],
  "actionItems": [{ "id": number, "text": string }] (exactly 3),
  "nextSessionSuggestion": string,
  "questionAnalyses": [{
    "questionId": number,
    "questionText": string,
    "answer": string,
    "starFulfillment": { "situation": boolean, "task": boolean, "action": boolean, "result": boolean },
    "fillerWords": [{ "word": string, "count": number }],
    "durationSec": number,
    "contentScore": number,
    "feedback": string
  }]
}`;

    const userPrompt = [
      `메트릭 데이터:\n${JSON.stringify(body.metrics ?? {})}`,
      `트랜스크립트:\n${body.transcript ?? ""}`,
      `질문 목록:\n${JSON.stringify(body.questions ?? [])}`,
    ].join("\n\n---\n\n");

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });

    const feedbackData = parseJsonResponse(completion);
    const parsed = feedbackData as {
      deliveryScore: number;
      contentScore: number;
    };

    // save feedback
    await db.insert(feedbackTable).values({
      sessionId: id,
      summaryJson: feedbackData,
      keyMomentsJson: (feedbackData as { keyMoments: unknown }).keyMoments,
      actionItemsJson: (feedbackData as { actionItems: unknown }).actionItems,
      questionAnalysesJson: (feedbackData as { questionAnalyses: unknown })
        .questionAnalyses,
    });

    // update session scores
    await db
      .update(sessions)
      .set({
        deliveryScore: parsed.deliveryScore,
        contentScore: parsed.contentScore,
      })
      .where(eq(sessions.id, id));

    return NextResponse.json(feedbackData);
  } catch (error) {
    console.error("feedback generation failed:", error);
    return NextResponse.json(
      { error: "failed to generate feedback" },
      { status: 500 },
    );
  }
}
