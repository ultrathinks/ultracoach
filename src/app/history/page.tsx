import { db } from "@/shared/db";
import { sessions } from "@/shared/db/schema";
import { auth } from "@/shared/lib/auth";
import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { HistoryDashboard } from "@/widgets/history/history-dashboard";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const userSessions = await db
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
    .limit(50);

  const serialized = userSessions.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
  }));

  return <HistoryDashboard sessions={serialized} />;
}
