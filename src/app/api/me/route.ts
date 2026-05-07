import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/shared/db";
import {
  paymentMethods,
  subscriptions,
  usageCounters,
  users,
} from "@/shared/db/schema";
import { Problems } from "@/shared/lib/api-error";
import { logError } from "@/shared/lib/log-error";
import { getMonthlyLimit, requireApiAuth } from "@/shared/lib/permissions";
import { rateLimit } from "@/shared/lib/rate-limit";
import { deleteBillingKey, TossError } from "@/shared/lib/toss";
import { trackServer } from "@/shared/lib/track";

const checkRate = rateLimit({ windowMs: 60_000, max: 30 });

const patchSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  allowDataForTraining: z.boolean().optional(),
  agreeToTerms: z.boolean().optional(),
});

export async function GET() {
  const guard = await requireApiAuth("/api/me");
  if ("error" in guard) return guard.error;

  const userId = guard.session.user.id;
  const yearMonth = new Date().toISOString().slice(0, 7);

  const [user, counter] = await Promise.all([
    db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        image: users.image,
        role: users.role,
        plan: users.plan,
        preferredAvatarId: users.preferredAvatarId,
        agreedToTermsAt: users.agreedToTermsAt,
        allowDataForTraining: users.allowDataForTraining,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .then((r) => r[0]),
    db
      .select({ sessionCount: usageCounters.sessionCount })
      .from(usageCounters)
      .where(
        sql`${usageCounters.userId} = ${userId} AND ${usageCounters.yearMonth} = ${yearMonth}`,
      )
      .limit(1)
      .then((r) => r[0]),
  ]);

  if (!user) return Problems.notFound("/api/me");

  const usage = {
    yearMonth,
    used: counter?.sessionCount ?? 0,
    limit: getMonthlyLimit(user),
  };

  return NextResponse.json({ user, usage });
}

export async function PATCH(request: Request) {
  const guard = await requireApiAuth("/api/me");
  if ("error" in guard) return guard.error;

  const limited = checkRate(guard.session.user.id, "me");
  if (limited) return limited;

  const body = patchSchema.safeParse(await request.json());
  if (!body.success) {
    return Problems.validation("invalid request body", "/api/me");
  }

  const updates: Record<string, unknown> = {};
  if (body.data.name !== undefined) updates.name = body.data.name.trim();
  if (body.data.allowDataForTraining !== undefined) {
    updates.allowDataForTraining = body.data.allowDataForTraining;
  }
  if (body.data.agreeToTerms === true) {
    updates.agreedToTermsAt = new Date();
  }

  if (Object.keys(updates).length === 0) {
    return Problems.validation("no fields to update", "/api/me");
  }

  await db
    .update(users)
    .set(updates)
    .where(eq(users.id, guard.session.user.id));

  return new NextResponse(null, { status: 204 });
}

export async function DELETE() {
  const guard = await requireApiAuth("/api/me");
  if ("error" in guard) return guard.error;

  const userId = guard.session.user.id;

  // 1. Toss 빌링키 삭제 (가능한 것만)
  const methods = await db
    .select({ tossBillingKey: paymentMethods.tossBillingKey })
    .from(paymentMethods)
    .where(eq(paymentMethods.userId, userId));

  for (const method of methods) {
    try {
      await deleteBillingKey(method.tossBillingKey);
    } catch (err) {
      if (!(err instanceof TossError && err.status === 404)) {
        await logError(err, {
          userId,
          context: { route: "/api/me", action: "delete-billing-key" },
        });
      }
    }
  }

  // 2. 활성 구독 cancel
  await db
    .update(subscriptions)
    .set({
      status: "canceled",
      canceledAt: new Date(),
    })
    .where(eq(subscriptions.userId, userId));

  // 3. 사용자 row 삭제 (cascade로 sessions/questions/feedback/metrics/payments 모두 정리)
  await db.delete(users).where(eq(users.id, userId));

  await trackServer("account_deleted", null, userId);

  return new NextResponse(null, { status: 204 });
}
