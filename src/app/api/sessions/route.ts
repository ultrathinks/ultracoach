import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { interviewTypeSchema } from "@/entities/session";
import { resolveLocale } from "@/i18n/request";
import { db } from "@/shared/db";
import {
  metricSnapshots,
  questions as questionsTable,
  sessions,
  usageCounters,
} from "@/shared/db/schema";
import { Problems } from "@/shared/lib/api-error";
import { auth } from "@/shared/lib/auth";
import { getMonthlyLimit } from "@/shared/lib/permissions";
import { rateLimit } from "@/shared/lib/rate-limit";

const checkRate = rateLimit({ windowMs: 60_000, max: 10 });

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
  interviewType: interviewTypeSchema,
  avatarId: z.string().max(32).nullable().optional(),
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

function currentYearMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function nextMonthFirstDay(): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  ).toISOString();
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Problems.unauthorized("/api/sessions");
    }

    const limited = checkRate(session.user.id, "sessions");
    if (limited) return limited;

    const body = requestSchema.safeParse(await request.json());
    if (!body.success) {
      return Problems.validation("invalid request body", "/api/sessions");
    }

    const data = body.data;
    const userId = session.user.id;
    const language = await resolveLocale();
    const yearMonth = currentYearMonth();

    const counter = await db
      .select({ sessionCount: usageCounters.sessionCount })
      .from(usageCounters)
      .where(
        and(
          eq(usageCounters.userId, userId),
          eq(usageCounters.yearMonth, yearMonth),
        ),
      )
      .limit(1)
      .then((rows) => rows[0]);

    const used = counter?.sessionCount ?? 0;
    const limit = getMonthlyLimit(session.user);
    if (used >= limit) {
      return Problems.quotaExceeded({
        plan: session.user.plan,
        used,
        limit,
        resetAt: nextMonthFirstDay(),
        instance: "/api/sessions",
      });
    }

    const newSession = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(sessions)
        .values({
          userId,
          jobTitle: data.jobTitle,
          interviewType: data.interviewType,
          language,
          status: "completed",
          durationSec: data.durationSec,
          companyName: data.companyName ?? null,
          avatarId: data.avatarId ?? null,
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

      await tx
        .insert(usageCounters)
        .values({
          userId,
          yearMonth,
          sessionCount: 1,
        })
        .onConflictDoUpdate({
          target: [usageCounters.userId, usageCounters.yearMonth],
          set: {
            sessionCount: sql`${usageCounters.sessionCount} + 1`,
            updatedAt: new Date(),
          },
        });

      return created;
    });

    return NextResponse.json({ sessionId: newSession.id });
  } catch (error) {
    console.error("session save failed:", error);
    return Problems.internal("failed to save session", "/api/sessions");
  }
}
