import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/shared/db";
import {
  metricSnapshots,
  questions as questionsTable,
  sessions,
} from "@/shared/db/schema";
import { auth } from "@/shared/lib/auth";

const metricSnapshotSchema = z.object({
  timestamp: z.number(),
  gaze: z.object({
    pitch: z.number(),
    yaw: z.number(),
    isFrontFacing: z.boolean(),
  }),
  posture: z.object({
    shoulderTilt: z.number(),
    headOffset: z.number(),
    isUpright: z.boolean(),
  }),
  expression: z.object({
    frownScore: z.number(),
    isPositiveOrNeutral: z.boolean(),
  }),
  gesture: z.object({
    wristMovement: z.number(),
    isModerate: z.boolean(),
  }),
});

const metricEventSchema = z.object({
  timestamp: z.number(),
  type: z.enum(["gaze", "posture", "expression", "gesture"]),
  message: z.string(),
});

const requestSchema = z.object({
  jobTitle: z.string().max(200),
  interviewType: z.string().max(50),
  mode: z.string().max(20),
  durationSec: z.number().int().min(0).max(86400),
  companyName: z.string().max(100).nullable().optional(),
  jobResearchJson: z.record(z.unknown()).nullable().optional(),
  resumeFileId: z.string().max(200).nullable().optional(),
  questions: z
    .array(
      z.object({
        type: z.string().max(50),
        text: z.string().max(5000),
        answer: z.string().max(10000).nullable(),
        order: z.number().int().min(0),
      }),
    )
    .max(50),
  metrics: z
    .object({
      snapshots: z.array(metricSnapshotSchema),
      events: z.array(metricEventSchema),
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
      return NextResponse.json(
        { error: "invalid request body" },
        { status: 400 },
      );
    }

    const data = body.data;
    const userId = session.user.id;

    const newSession = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(sessions)
        .values({
          userId,
          jobTitle: data.jobTitle,
          interviewType: data.interviewType,
          mode: data.mode,
          status: "completed",
          durationSec: data.durationSec,
          companyName: data.companyName ?? null,
          jobResearchJson: data.jobResearchJson ?? null,
          resumeFileId: data.resumeFileId ?? null,
        })
        .returning({ id: sessions.id });

      if (data.questions.length > 0) {
        await tx.insert(questionsTable).values(
          data.questions.map((q) => ({
            sessionId: created.id,
            type: q.type,
            text: q.text,
            answer: q.answer,
            order: q.order,
          })),
        );
      }

      if (data.metrics) {
        await tx.insert(metricSnapshots).values({
          sessionId: created.id,
          snapshotsJson: data.metrics.snapshots,
          eventsJson: data.metrics.events,
        });
      }

      return created;
    });

    return NextResponse.json({ sessionId: newSession.id });
  } catch (error) {
    console.error("session save failed:", error);
    return NextResponse.json(
      { error: "failed to save session" },
      { status: 500 },
    );
  }
}
