import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/shared/db";
import { users } from "@/shared/db/schema";
import { auth } from "@/shared/lib/auth";
import { ProfileForm } from "@/widgets/dashboard/profile-form";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const [row] = await db
    .select({
      allowDataForTraining: users.allowDataForTraining,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return (
    <ProfileForm
      name={session.user.name ?? ""}
      email={session.user.email ?? ""}
      image={session.user.image ?? ""}
      allowDataForTraining={row?.allowDataForTraining ?? false}
    />
  );
}
