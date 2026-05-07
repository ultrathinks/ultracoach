import { and, eq, isNotNull, lte, or, sql } from "drizzle-orm";
import { db } from "../shared/db";
import {
  jobRuns,
  paymentMethods,
  payments,
  subscriptions,
  users,
} from "../shared/db/schema";
import {
  generateOrderId,
  nextPeriodEnd,
  PLAN_NAMES,
} from "../shared/lib/billing";
import { enqueueEmail, sendDiscordAlert } from "../shared/lib/email";
import { JOB_LOCK_IDS, withJobLock } from "../shared/lib/job-lock";
import { logError } from "../shared/lib/log-error";
import { recomputePlan } from "../shared/lib/plan";
import {
  chargeBillingKey,
  isRetryableTossError,
  TossError,
} from "../shared/lib/toss";
import { trackServer } from "../shared/lib/track";

const RETRY_DELAY_HOURS = 24;
const MAX_RETRIES = 3;

export async function billingRenewalJob() {
  return withJobLock(JOB_LOCK_IDS.BILLING_RENEWAL, async () => {
    const runId = crypto.randomUUID();
    const startedAt = new Date();
    let processedCount = 0;
    await db.insert(jobRuns).values({
      id: runId,
      jobName: "billing-renewal",
      status: "running",
      startedAt,
    });

    try {
      const targets = await db
        .select({
          subscription: subscriptions,
          method: paymentMethods,
          user: users,
        })
        .from(subscriptions)
        .innerJoin(users, eq(users.id, subscriptions.userId))
        .leftJoin(
          paymentMethods,
          and(
            eq(paymentMethods.userId, subscriptions.userId),
            eq(paymentMethods.isDefault, true),
          ),
        )
        .where(
          and(
            eq(subscriptions.status, "active"),
            eq(subscriptions.cancelAtPeriodEnd, false),
            lte(
              subscriptions.currentPeriodEnd,
              new Date(Date.now() + 24 * 60 * 60 * 1000),
            ),
            or(
              sql`${subscriptions.retryAfter} IS NULL`,
              lte(subscriptions.retryAfter, new Date()),
            ),
            sql`${subscriptions.retryCount} < ${MAX_RETRIES}`,
            isNotNull(paymentMethods.tossBillingKey),
          ),
        );

      for (const { subscription, method, user } of targets) {
        if (!method) continue;
        await renewSubscription(subscription, method, user);
        processedCount++;
      }

      const finishedAt = new Date();
      await db
        .update(jobRuns)
        .set({
          status: "success",
          finishedAt,
          durationMs: finishedAt.getTime() - startedAt.getTime(),
          processedCount,
        })
        .where(eq(jobRuns.id, runId));
    } catch (err) {
      await logError(err, {
        source: "worker",
        context: { job: "billing-renewal" },
      });
      await sendDiscordAlert(
        `billing-renewal failed: ${err instanceof Error ? err.message : "unknown"}`,
      );
      await db
        .update(jobRuns)
        .set({
          status: "failed",
          finishedAt: new Date(),
          errorMessage: err instanceof Error ? err.message : "unknown",
        })
        .where(eq(jobRuns.id, runId));
      throw err;
    }
  });
}

type SubscriptionRow = typeof subscriptions.$inferSelect;
type PaymentMethodRow = typeof paymentMethods.$inferSelect;
type UserRow = typeof users.$inferSelect;

async function renewSubscription(
  subscription: SubscriptionRow,
  method: PaymentMethodRow,
  user: UserRow,
) {
  const orderId = generateOrderId(`renew-${subscription.id.slice(0, 8)}`);

  try {
    const result = await chargeBillingKey({
      billingKey: method.tossBillingKey,
      customerKey: method.tossCustomerKey,
      amount: subscription.amount,
      orderId,
      orderName: `UltraCoach ${PLAN_NAMES[subscription.plan]} 갱신`,
      customerEmail: user.email ?? undefined,
      customerName: user.name ?? undefined,
    });

    const periodStart = subscription.currentPeriodEnd;
    const periodEnd = nextPeriodEnd(periodStart);

    await db.transaction(async (tx) => {
      await tx
        .update(subscriptions)
        .set({
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          retryCount: 0,
          retryAfter: null,
          lastPaymentError: null,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, subscription.id));

      await tx.insert(payments).values({
        userId: subscription.userId,
        subscriptionId: subscription.id,
        orderId,
        tossPaymentKey: result.paymentKey,
        amount: result.totalAmount,
        status: "done",
        receiptUrl: result.receipt?.url ?? null,
        approvedAt: new Date(result.approvedAt),
      });
    });

    await trackServer(
      "billing_renewal_succeeded",
      { plan: subscription.plan, amount: subscription.amount },
      subscription.userId,
    );

    await enqueueEmail({
      to: user.email,
      subject: "[UltraCoach] 결제 완료",
      template: "payment_receipt",
      payload: {
        amount: result.totalAmount,
        plan: PLAN_NAMES[subscription.plan],
        approvedAt: result.approvedAt,
        receiptUrl: result.receipt?.url ?? null,
        periodEnd: periodEnd.toISOString(),
      },
      priority: 1,
      locale: user.locale === "en" ? "en" : "ko",
    });
  } catch (err) {
    await handleRenewalFailure(err, subscription, user, orderId);
  }
}

async function handleRenewalFailure(
  err: unknown,
  subscription: SubscriptionRow,
  user: UserRow,
  orderId: string,
) {
  const code = err instanceof TossError ? err.code : "unknown";
  const message = err instanceof Error ? err.message : "unknown";
  const retryable = err instanceof TossError && isRetryableTossError(err.code);
  const attempts = subscription.retryCount + 1;
  const exhausted = !retryable || attempts >= MAX_RETRIES;

  await db.insert(payments).values({
    userId: subscription.userId,
    subscriptionId: subscription.id,
    orderId,
    amount: subscription.amount,
    status: "failed",
    failureCode: code,
    failureMessage: message,
  });

  if (exhausted) {
    await db
      .update(subscriptions)
      .set({
        status: "past_due",
        retryCount: attempts,
        lastPaymentError: message,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, subscription.id));
    await recomputePlan(subscription.userId);
    await enqueueEmail({
      to: user.email,
      subject: "[UltraCoach] 구독이 만료되었습니다",
      template: "payment_downgraded",
      payload: { reason: message },
      priority: 1,
      locale: user.locale === "en" ? "en" : "ko",
    });
    await trackServer(
      "billing_renewal_exhausted",
      { plan: subscription.plan, code },
      subscription.userId,
    );
  } else {
    const retryAfter = new Date(Date.now() + RETRY_DELAY_HOURS * 60 * 60_000);
    await db
      .update(subscriptions)
      .set({
        retryCount: attempts,
        retryAfter,
        lastPaymentError: message,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, subscription.id));
    await enqueueEmail({
      to: user.email,
      subject: "[UltraCoach] 결제 재시도 예정",
      template: "payment_failed_retry",
      locale: user.locale === "en" ? "en" : "ko",
      payload: {
        reason: message,
        attempts,
        retryAt: retryAfter.toISOString(),
      },
      priority: 2,
    });
  }
}
