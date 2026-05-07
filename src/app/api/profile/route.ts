import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/shared/db";
import { users } from "@/shared/db/schema";
import { Problems } from "@/shared/lib/api-error";
import { auth } from "@/shared/lib/auth";
import { rateLimit } from "@/shared/lib/rate-limit";

const checkRate = rateLimit({ windowMs: 60_000, max: 20 });

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Problems.unauthorized("/api/profile");
  }

  const limited = checkRate(session.user.id, "profile");
  if (limited) return limited;

  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : null;

  if (!name || name.length === 0) {
    return Problems.validation("name is required", "/api/profile");
  }

  if (name.length > 50) {
    return Problems.validation(
      "name must be 50 characters or less",
      "/api/profile",
    );
  }

  await db.update(users).set({ name }).where(eq(users.id, session.user.id));

  return NextResponse.json({ ok: true });
}
