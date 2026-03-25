import { redirect } from "next/navigation";
import { getUserFeedback, getUserSessions } from "@/entities/session";
import { computeAnalytics } from "@/features/analytics/compute-analytics";
import { auth } from "@/shared/lib/auth";
import { DashboardOverview } from "@/widgets/dashboard/dashboard-overview";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const [sessions, feedbackRows] = await Promise.all([
    getUserSessions(session.user.id),
    getUserFeedback(session.user.id),
  ]);

  const serialized = sessions.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
  }));

  const analytics = computeAnalytics(serialized, feedbackRows);

  return <DashboardOverview sessions={serialized} analytics={analytics} />;
}
