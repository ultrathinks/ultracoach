import { and, desc, eq, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@/shared/db";
import {
  paymentMethods,
  payments,
  subscriptions,
  users,
} from "@/shared/db/schema";
import { auth } from "@/shared/lib/auth";
import { PageContainer, PageHeader } from "@/shared/ui";
import { BillingOverview } from "@/widgets/dashboard/billing-overview";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const t = await getTranslations("billing");
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const userId = session.user.id;

  const [userRow, subscription, paymentRows, methodRows] = await Promise.all([
    db
      .select({ plan: users.plan })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .then((r) => r[0] ?? null),
    db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          ne(subscriptions.status, "canceled"),
        ),
      )
      .orderBy(desc(subscriptions.createdAt))
      .limit(1)
      .then((r) => r[0] ?? null),
    db
      .select({
        id: payments.id,
        amount: payments.amount,
        status: payments.status,
        receiptUrl: payments.receiptUrl,
        approvedAt: payments.approvedAt,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .where(eq(payments.userId, userId))
      .orderBy(desc(payments.createdAt))
      .limit(20),
    db
      .select({ tossCustomerKey: paymentMethods.tossCustomerKey })
      .from(paymentMethods)
      .where(eq(paymentMethods.userId, userId))
      .orderBy(desc(paymentMethods.createdAt))
      .limit(1),
  ]);

  // customerKey: 결제 수단이 이미 있으면 재사용, 없으면 사용자 ID 사용
  const customerKey = methodRows[0]?.tossCustomerKey ?? userId;

  // users.plan은 recomputePlan이 grantedPlan / activeSubPlan / partnerPlan 셋 중 최고치를 반영해 박은 값이라
  // 그대로 신뢰하면 admin grant·partner·결제 어느 경로든 일관됨. JWT는 stale 가능성이 있어 우회.
  const currentPlan = userRow?.plan ?? "free";

  const subscriptionInfo =
    subscription && subscription.plan !== "free"
      ? {
          id: subscription.id,
          plan: subscription.plan,
          status: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        }
      : null;

  return (
    <PageContainer size="content" className="px-6 py-10">
      <PageHeader title={t("title")} description={t("description")} />
      <BillingOverview
        currentPlan={currentPlan}
        subscription={subscriptionInfo}
        payments={paymentRows.map((p) => ({
          id: p.id,
          amount: p.amount,
          status: p.status,
          receiptUrl: p.receiptUrl,
          approvedAt: p.approvedAt?.toISOString() ?? null,
          createdAt: p.createdAt.toISOString(),
        }))}
        customerKey={customerKey}
        customerEmail={session.user.email ?? null}
        customerName={session.user.name ?? null}
        role={session.user.role}
        partner={session.user.partner}
      />
    </PageContainer>
  );
}
