import { NextResponse } from "next/server";
import { AVATARS } from "@/shared/config/avatars";
import { Problems } from "@/shared/lib/api-error";
import { auth } from "@/shared/lib/auth";
import { meetsPlan } from "@/shared/lib/permissions";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Problems.unauthorized("/api/avatars");
  }

  const data = AVATARS.map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    persona: a.persona,
    previewImage: a.previewImage,
    plan: a.plan,
    locales: a.locales,
    unlocked: meetsPlan(session.user, a.plan),
  }));

  return NextResponse.json(
    { data },
    {
      headers: {
        "Cache-Control": "private, max-age=60",
      },
    },
  );
}
