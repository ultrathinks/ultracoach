import { db } from "@/shared/db";
import { feedback, metricSnapshots, sessions } from "@/shared/db/schema";
import { auth } from "@/shared/lib/auth";
import { computeAnalytics, computeBodyLanguage } from "@/features/analytics";
import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { HistoryDashboard } from "@/widgets/history/history-dashboard";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const [userSessions, feedbackRows, snapshotRows] = await Promise.all([
    db
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
      .where(eq(sessions.userId, session.user.id))
      .orderBy(desc(sessions.createdAt))
      .limit(50),
    db
      .select({
        sessionId: feedback.sessionId,
        summaryJson: feedback.summaryJson,
      })
      .from(feedback)
      .innerJoin(sessions, eq(feedback.sessionId, sessions.id))
      .where(eq(sessions.userId, session.user.id)),
    // NEW: metricSnapshots query (latest 2 sessions only, for body language panel)
    db
      .select({
        sessionId: metricSnapshots.sessionId,
        snapshotsJson: metricSnapshots.snapshotsJson,
      })
      .from(metricSnapshots)
      .innerJoin(sessions, eq(metricSnapshots.sessionId, sessions.id))
      .where(eq(sessions.userId, session.user.id))
      .orderBy(desc(sessions.createdAt))
      .limit(2),
  ]);

  const serialized = userSessions.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
  }));

  const analytics = computeAnalytics(serialized, feedbackRows);
  const bodyLanguage = computeBodyLanguage(snapshotRows);

  return <HistoryDashboard sessions={serialized} analytics={analytics} bodyLanguage={bodyLanguage} />;
}
