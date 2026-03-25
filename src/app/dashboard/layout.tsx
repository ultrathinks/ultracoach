import { redirect } from "next/navigation";
import { auth } from "@/shared/lib/auth";
import { DashboardSidebar } from "@/widgets/dashboard/dashboard-sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      <DashboardSidebar />
      <main className="flex-1 overflow-auto no-scrollbar p-6 md:p-8">{children}</main>
    </div>
  );
}
