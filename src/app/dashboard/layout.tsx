import { redirect } from "next/navigation";
import { auth } from "@/shared/lib/auth";
import { DashboardNav } from "@/widgets/dashboard/dashboard-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <DashboardNav />
      <main className="px-6 py-8">{children}</main>
    </div>
  );
}
