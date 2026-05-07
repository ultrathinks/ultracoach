import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/shared/db";
import { paymentMethods, payments, webhookEvents } from "@/shared/db/schema";
import { logError } from "@/shared/lib/log-error";

const payloadSchema = z.object({
  eventType: z.string(),
  createdAt: z.string().optional(),
  data: z.record(z.unknown()).optional(),
});

const paymentDataSchema = z.object({
  paymentKey: z.string().optional(),
  orderId: z.string().optional(),
  status: z.string().optional(),
});

const billingDeletedDataSchema = z.object({
  billingKey: z.string(),
  customerKey: z.string().optional(),
});

export async function POST(request: Request) {
  const transmissionId =
    request.headers.get("tosspayments-webhook-transmission-id") ??
    `no-id-${Date.now()}`;

  const raw = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(raw);
  if (!parsed.success) {
    // Toss는 200 응답을 기대 — 잘못된 페이로드도 200으로 끝낸다 (재시도 무한루프 방지)
    return NextResponse.json({ ok: true });
  }

  const inserted = await db
    .insert(webhookEvents)
    .values({
      source: "toss",
      transmissionId,
      eventType: parsed.data.eventType,
      payload: raw,
    })
    .onConflictDoNothing({
      target: [webhookEvents.source, webhookEvents.transmissionId],
    })
    .returning({ id: webhookEvents.id });

  // 이미 처리된 transmissionId는 즉시 200
  if (inserted.length === 0) return NextResponse.json({ ok: true });

  try {
    switch (parsed.data.eventType) {
      case "PAYMENT_STATUS_CHANGED": {
        const data = paymentDataSchema.safeParse(parsed.data.data);
        if (data.success && data.data.paymentKey && data.data.status) {
          await syncPaymentStatus(data.data.paymentKey, data.data.status);
        }
        break;
      }
      case "BILLING_DELETED": {
        const data = billingDeletedDataSchema.safeParse(parsed.data.data);
        if (data.success) {
          await markBillingKeyDeleted(data.data.billingKey);
        }
        break;
      }
      default:
        // 미처리 이벤트는 저장만 하고 200
        break;
    }

    await db
      .update(webhookEvents)
      .set({ processedAt: new Date() })
      .where(eq(webhookEvents.id, inserted[0].id));
  } catch (err) {
    await logError(err, {
      source: "server",
      context: { route: "/api/webhooks/toss", transmissionId },
    });
    // 핸들러 실패해도 200 — admin 페이지에서 수동 재처리 (멱등성 보장)
  }

  return NextResponse.json({ ok: true });
}

async function syncPaymentStatus(paymentKey: string, status: string) {
  const normalized = normalizeStatus(status);
  if (!normalized) return;
  await db
    .update(payments)
    .set({ status: normalized })
    .where(eq(payments.tossPaymentKey, paymentKey));
}

async function markBillingKeyDeleted(billingKey: string) {
  await db
    .update(paymentMethods)
    .set({ deletedAt: new Date(), isDefault: false })
    .where(eq(paymentMethods.tossBillingKey, billingKey));
}

function normalizeStatus(
  status: string,
): "done" | "canceled" | "failed" | "partial_canceled" | null {
  switch (status) {
    case "DONE":
      return "done";
    case "CANCELED":
      return "canceled";
    case "PARTIAL_CANCELED":
      return "partial_canceled";
    case "ABORTED":
    case "EXPIRED":
      return "failed";
    default:
      return null;
  }
}
