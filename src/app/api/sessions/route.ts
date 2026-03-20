import { db } from "@/shared/db";
import {
  sessions,
  questions as questionsTable,
  feedback as feedbackTable,
  metricSnapshots,
} from "@/shared/db/schema";
import { auth } from "@/shared/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  jobTitle: z.string(),
  interviewType: z.string(),
  mode: z.string(),
  durationSec: z.number(),
  resumeFileId: z.string().nullable().optional(),
  questions: z.array(
    z.object({
      type: z.string(),
      text: z.string(),
      answer: z.string().nullable(),
      order: z.number(),
    }),
  ),
  metrics: z
    .object({
      snapshots: z.unknown(),
      events: z.unknown(),
    })
    .optional(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = requestSchema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json({ error: "invalid request body" }, { status: 400 });
    }

    const data = body.data;

    // create session
    const [newSession] = await db
      .insert(sessions)
      .values({
        userId: session.user.id,
        jobTitle: data.jobTitle,
        interviewType: data.interviewType,
        mode: data.mode,
        status: "completed",
        durationSec: data.durationSec,
        resumeFileId: data.resumeFileId ?? null,
      })
      .returning({ id: sessions.id });

    // insert questions
    if (data.questions.length > 0) {
      await db.insert(questionsTable).values(
        data.questions.map((q) => ({
          sessionId: newSession.id,
          type: q.type,
          text: q.text,
          answer: q.answer,
          order: q.order,
        })),
      );
    }

    // insert metrics
    if (data.metrics) {
      await db.insert(metricSnapshots).values({
        sessionId: newSession.id,
        snapshotsJson: data.metrics.snapshots,
        eventsJson: data.metrics.events,
      });
    }

    return NextResponse.json({ sessionId: newSession.id });
  } catch (error) {
    console.error("session save failed:", error);
    return NextResponse.json(
      { error: "failed to save session" },
      { status: 500 },
    );
  }
}
