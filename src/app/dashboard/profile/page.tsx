import { redirect } from "next/navigation";
import { auth } from "@/shared/lib/auth";
import { ProfileForm } from "@/widgets/dashboard/profile-form";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  return (
    <ProfileForm
      name={session.user.name ?? ""}
      email={session.user.email ?? ""}
      image={session.user.image ?? ""}
    />
  );
}
