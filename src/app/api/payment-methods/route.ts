import { and, desc, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/shared/db";
import { paymentMethods } from "@/shared/db/schema";
import { Problems } from "@/shared/lib/api-error";
import { logError } from "@/shared/lib/log-error";
import { requireApiAuth } from "@/shared/lib/permissions";
import { issueBillingKey, TossError } from "@/shared/lib/toss";

const postSchema = z.object({
  authKey: z.string().min(1),
  customerKey: z.string().min(2).max(300),
});

export async function GET() {
  const guard = await requireApiAuth("/api/payment-methods");
  if ("error" in guard) return guard.error;

  const data = await db
    .select({
      id: paymentMethods.id,
      type: paymentMethods.type,
      cardCompany: paymentMethods.cardCompany,
      cardNumberMasked: paymentMethods.cardNumberMasked,
      isDefault: paymentMethods.isDefault,
      createdAt: paymentMethods.createdAt,
    })
    .from(paymentMethods)
    .where(
      and(
        eq(paymentMethods.userId, guard.session.user.id),
        isNull(paymentMethods.deletedAt),
      ),
    )
    .orderBy(desc(paymentMethods.createdAt));

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const guard = await requireApiAuth("/api/payment-methods");
  if ("error" in guard) return guard.error;

  const body = postSchema.safeParse(await request.json());
  if (!body.success) {
    return Problems.validation("invalid request body", "/api/payment-methods");
  }

  try {
    const tossResult = await issueBillingKey({
      authKey: body.data.authKey,
      customerKey: body.data.customerKey,
    });

    const created = await db.transaction(async (tx) => {
      // 기존 결제 수단을 모두 비기본으로 만든 뒤 새 수단을 기본으로 추가
      await tx
        .update(paymentMethods)
        .set({ isDefault: false })
        .where(eq(paymentMethods.userId, guard.session.user.id));

      const [row] = await tx
        .insert(paymentMethods)
        .values({
          userId: guard.session.user.id,
          type: "card",
          tossBillingKey: tossResult.billingKey,
          tossCustomerKey: tossResult.customerKey,
          cardCompany: tossResult.card?.issuerCode ?? null,
          cardNumberMasked: tossResult.card?.number ?? null,
          isDefault: true,
        })
        .returning({
          id: paymentMethods.id,
          cardCompany: paymentMethods.cardCompany,
          cardNumberMasked: paymentMethods.cardNumberMasked,
        });
      return row;
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof TossError) {
      return Problems.validation(err.message, "/api/payment-methods");
    }
    await logError(err, {
      userId: guard.session.user.id,
      context: { route: "/api/payment-methods" },
    });
    return Problems.internal(
      "failed to issue billing key",
      "/api/payment-methods",
    );
  }
}
