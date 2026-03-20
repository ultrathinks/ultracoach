import { db } from "@/shared/db";
import { sessions } from "@/shared/db/schema";
import { desc } from "drizzle-orm";
import { HistoryDashboard } from "@/widgets/history/history-dashboard";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const allSessions = await db
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
    .orderBy(desc(sessions.createdAt))
    .limit(50);

  const serialized = allSessions.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
  }));

  return <HistoryDashboard sessions={serialized} />;
}
