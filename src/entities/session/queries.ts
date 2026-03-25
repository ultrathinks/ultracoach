import { desc, eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { feedback, metricSnapshots, sessions } from "@/shared/db/schema";

export async function getUserSessions(userId: string) {
  return db
    .select({
      id: sessions.id,
      jobTitle: sessions.jobTitle,
      interviewType: sessions.interviewType,
      mode: sessions.mode,
      deliveryScore: sessions.deliveryScore,
      contentScore: sessions.contentScore,
      durationSec: sessions.durationSec,
      createdAt: sessions.createdAt,
    })
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .orderBy(desc(sessions.createdAt))
    .limit(50);
}

export async function getUserFeedback(userId: string) {
  return db
    .select({
      sessionId: feedback.sessionId,
      summaryJson: feedback.summaryJson,
    })
    .from(feedback)
    .innerJoin(sessions, eq(feedback.sessionId, sessions.id))
    .where(eq(sessions.userId, userId));
}

export async function getUserSnapshots(userId: string) {
  return db
    .select({
      sessionId: metricSnapshots.sessionId,
      snapshotsJson: metricSnapshots.snapshotsJson,
    })
    .from(metricSnapshots)
    .innerJoin(sessions, eq(metricSnapshots.sessionId, sessions.id))
    .where(eq(sessions.userId, userId))
    .orderBy(desc(sessions.createdAt))
    .limit(2);
}
