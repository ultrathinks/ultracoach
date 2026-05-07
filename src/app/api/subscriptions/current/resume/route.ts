import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/shared/db";
import { subscriptions } from "@/shared/db/schema";
import { Problems } from "@/shared/lib/api-error";
import { requireApiAuth } from "@/shared/lib/permissions";
import { trackServer } from "@/shared/lib/track";

export async function POST() {
  const guard = await requireApiAuth("/api/subscriptions/current/resume");
  if ("error" in guard) return guard.error;

  const userId = guard.session.user.id;
  const [active] = await db
    .select()
    .from(subscriptions)
    .where(
      and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")),
    )
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);

  if (!active) return Problems.notFound("/api/subscriptions/current/resume");

  await db
    .update(subscriptions)
    .set({ cancelAtPeriodEnd: false, updatedAt: new Date() })
    .where(eq(subscriptions.id, active.id));

  await trackServer("billing_resume", null, userId);
  return new NextResponse(null, { status: 204 });
}
