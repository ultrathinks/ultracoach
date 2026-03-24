import { z } from "zod";

export const starFulfillmentSchema = z.object({
  situation: z.boolean(),
  task: z.boolean(),
  action: z.boolean(),
  result: z.boolean(),
});

export const questionAnalysisSchema = z.object({
  questionId: z.number(),
  questionText: z.string(),
  answer: z.string().nullable().default(""),
  starFulfillment: starFulfillmentSchema,
  fillerWords: z.array(z.object({ word: z.string(), count: z.number() })),
  durationSec: z.number(),
  contentScore: z.number(),
  feedback: z.string(),
  suggestedAnswer: z.string().optional(),
});

export const sessionFeedbackSchema = z.object({
  deliveryScore: z.number(),
  contentScore: z.number(),
  summary: z.string(),
  growthComparison: z
    .object({
      deliveryChange: z.number(),
      contentChange: z.number(),
    })
    .nullable(),
  keyMoments: z.array(
    z.object({
      timestamp: z.number(),
      duration: z.number(),
      description: z.string(),
      type: z.enum(["positive", "negative"]),
    }),
  ),
  actionItems: z.array(z.object({ id: z.number(), text: z.string() })),
  nextSessionSuggestion: z.string(),
  questionAnalyses: z.array(questionAnalysisSchema),
});
