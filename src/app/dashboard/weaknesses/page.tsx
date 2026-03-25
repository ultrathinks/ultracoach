import { redirect } from "next/navigation";
import {
  getUserFeedback,
  getUserSessions,
  getUserSnapshots,
} from "@/entities/session";
import {
  computeAnalytics,
  computeBodyLanguage,
} from "@/features/analytics/compute-analytics";
import { auth } from "@/shared/lib/auth";
import { DashboardWeaknesses } from "@/widgets/dashboard/dashboard-weaknesses";

export default async function WeaknessesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const [sessions, feedbackRows, snapshotRows] = await Promise.all([
    getUserSessions(session.user.id),
    getUserFeedback(session.user.id),
    getUserSnapshots(session.user.id),
  ]);

  const serialized = sessions.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
  }));

  const analytics = computeAnalytics(serialized, feedbackRows);
  const bodyLanguage = computeBodyLanguage(snapshotRows);

  return (
    <DashboardWeaknesses analytics={analytics} bodyLanguage={bodyLanguage} />
  );
}
