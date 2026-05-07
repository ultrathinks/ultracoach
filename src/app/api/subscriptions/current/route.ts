import { and, desc, eq, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/shared/db";
import { subscriptions } from "@/shared/db/schema";
import { Problems } from "@/shared/lib/api-error";
import { requireApiAuth } from "@/shared/lib/permissions";
import { recomputePlan } from "@/shared/lib/plan";
import { trackServer } from "@/shared/lib/track";

const deleteSchema = z.object({
  cancelAtPeriodEnd: z.boolean().optional(),
});

export async function GET() {
  const guard = await requireApiAuth("/api/subscriptions/current");
  if ("error" in guard) return guard.error;

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, guard.session.user.id),
        ne(subscriptions.status, "canceled"),
      ),
    )
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);

  if (!sub) return NextResponse.json({ subscription: null });
  return NextResponse.json({ subscription: sub });
}

export async function DELETE(request: Request) {
  const guard = await requireApiAuth("/api/subscriptions/current");
  if ("error" in guard) return guard.error;

  const body = deleteSchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) {
    return Problems.validation(
      "invalid request body",
      "/api/subscriptions/current",
    );
  }

  const cancelAtPeriodEnd = body.data.cancelAtPeriodEnd ?? true;
  const userId = guard.session.user.id;

  const [active] = await db
    .select()
    .from(subscriptions)
    .where(
      and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")),
    )
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);

  if (!active) {
    return Problems.notFound("/api/subscriptions/current");
  }

  if (cancelAtPeriodEnd) {
    await db
      .update(subscriptions)
      .set({ cancelAtPeriodEnd: true, updatedAt: new Date() })
      .where(eq(subscriptions.id, active.id));
    await trackServer("billing_cancel_at_period_end", null, userId);
  } else {
    await db
      .update(subscriptions)
      .set({
        status: "canceled",
        canceledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, active.id));
    await recomputePlan(userId);
    await trackServer("billing_cancel_immediate", null, userId);
  }

  return new NextResponse(null, { status: 204 });
}
