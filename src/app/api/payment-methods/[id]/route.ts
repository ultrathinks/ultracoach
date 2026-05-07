import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/shared/db";
import { paymentMethods } from "@/shared/db/schema";
import { Problems } from "@/shared/lib/api-error";
import { logError } from "@/shared/lib/log-error";
import { requireApiAuth } from "@/shared/lib/permissions";
import { deleteBillingKey, TossError } from "@/shared/lib/toss";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const instance = `/api/payment-methods/${id}`;
  const guard = await requireApiAuth(instance);
  if ("error" in guard) return guard.error;

  const [target] = await db
    .select()
    .from(paymentMethods)
    .where(
      and(
        eq(paymentMethods.id, id),
        eq(paymentMethods.userId, guard.session.user.id),
        isNull(paymentMethods.deletedAt),
      ),
    )
    .limit(1);

  if (!target) return Problems.notFound(instance);

  try {
    await deleteBillingKey(target.tossBillingKey);
  } catch (err) {
    if (err instanceof TossError && err.status !== 404) {
      await logError(err, {
        userId: guard.session.user.id,
        context: { route: instance, billingKey: target.tossBillingKey },
      });
    }
    // 토스에서 이미 없거나 실패해도 DB는 정리
  }

  await db
    .update(paymentMethods)
    .set({ deletedAt: new Date(), isDefault: false })
    .where(eq(paymentMethods.id, id));

  return new NextResponse(null, { status: 204 });
}
