import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/shared/db";
import { paymentMethods, payments, subscriptions } from "@/shared/db/schema";
import { Problems } from "@/shared/lib/api-error";
import {
  generateOrderId,
  nextPeriodEnd,
  PLAN_AMOUNTS_KRW,
  PLAN_NAMES,
} from "@/shared/lib/billing";
import { logError } from "@/shared/lib/log-error";
import { requireApiAuth } from "@/shared/lib/permissions";
import { recomputePlan } from "@/shared/lib/plan";
import { chargeBillingKey, TossError } from "@/shared/lib/toss";
import { trackServer } from "@/shared/lib/track";

const postSchema = z.object({
  plan: z.enum(["pro", "premium"]),
  paymentMethodId: z.string().optional(),
});

export async function POST(request: Request) {
  const guard = await requireApiAuth("/api/subscriptions");
  if ("error" in guard) return guard.error;

  const body = postSchema.safeParse(await request.json());
  if (!body.success) {
    return Problems.validation("invalid request body", "/api/subscriptions");
  }

  const { plan, paymentMethodId } = body.data;
  const userId = guard.session.user.id;

  // 결제 수단 선택 (지정된 ID 또는 기본)
  const [method] = await db
    .select()
    .from(paymentMethods)
    .where(
      and(
        eq(paymentMethods.userId, userId),
        isNull(paymentMethods.deletedAt),
        paymentMethodId
          ? eq(paymentMethods.id, paymentMethodId)
          : eq(paymentMethods.isDefault, true),
      ),
    )
    .limit(1);

  if (!method) {
    return Problems.validation(
      "no payment method registered",
      "/api/subscriptions",
    );
  }

  const amount = PLAN_AMOUNTS_KRW[plan];
  const orderId = generateOrderId(`sub-${userId.slice(0, 8)}`);

  try {
    const tossResult = await chargeBillingKey({
      billingKey: method.tossBillingKey,
      customerKey: method.tossCustomerKey,
      amount,
      orderId,
      orderName: `UltraCoach ${PLAN_NAMES[plan]} 구독`,
      customerEmail: guard.session.user.email ?? undefined,
      customerName: guard.session.user.name ?? undefined,
    });

    const now = new Date();
    const periodEnd = nextPeriodEnd(now);

    const subscriptionId = await db.transaction(async (tx) => {
      const [sub] = await tx
        .insert(subscriptions)
        .values({
          userId,
          plan,
          status: "active",
          amount,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        })
        .returning({ id: subscriptions.id });

      await tx.insert(payments).values({
        userId,
        subscriptionId: sub.id,
        orderId,
        tossPaymentKey: tossResult.paymentKey,
        amount: tossResult.totalAmount,
        status: "done",
        receiptUrl: tossResult.receipt?.url ?? null,
        approvedAt: new Date(tossResult.approvedAt),
      });

      return sub.id;
    });

    await recomputePlan(userId);
    await trackServer("billing_payment_succeeded", { plan, amount }, userId);

    return NextResponse.json({
      subscriptionId,
      plan,
      currentPeriodEnd: periodEnd,
      receiptUrl: tossResult.receipt?.url ?? null,
    });
  } catch (err) {
    if (err instanceof TossError) {
      await db.insert(payments).values({
        userId,
        subscriptionId: null,
        orderId,
        amount,
        status: "failed",
        failureCode: err.code,
        failureMessage: err.message,
      });
      await trackServer(
        "billing_payment_failed",
        { plan, amount, code: err.code },
        userId,
      );
      return Problems.validation(err.message, "/api/subscriptions");
    }
    await logError(err, { userId, context: { route: "/api/subscriptions" } });
    return Problems.internal(
      "failed to create subscription",
      "/api/subscriptions",
    );
  }
}
