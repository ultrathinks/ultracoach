import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/shared/db";
import { users } from "@/shared/db/schema";
import { auth } from "@/shared/lib/auth";
import { ProfileForm } from "@/widgets/dashboard/profile-form";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) redirect("/");

  return (
    <ProfileForm
      name={user.name ?? ""}
      email={user.email}
      image={user.image ?? ""}
    />
  );
}
