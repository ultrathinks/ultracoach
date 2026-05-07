const TOSS_API_BASE = "https://api.tosspayments.com/v1";
const CHARGE_TIMEOUT_MS = 65_000;

export class TossError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "TossError";
  }
}

interface TossBillingAuthorizationResponse {
  billingKey: string;
  customerKey: string;
  authenticatedAt: string;
  method: string;
  card?: {
    issuerCode: string;
    acquirerCode: string;
    number: string;
    cardType: string;
    ownerType: string;
  };
}

interface TossPaymentResponse {
  mId: string;
  paymentKey: string;
  orderId: string;
  status: string;
  totalAmount: number;
  approvedAt: string;
  receipt?: { url: string };
  card?: { number: string; issuerCode: string };
}

function authHeader(): string {
  const secret = process.env.TOSS_SECRET_KEY;
  if (!secret) throw new Error("missing TOSS_SECRET_KEY");
  return `Basic ${Buffer.from(`${secret}:`).toString("base64")}`;
}

export async function issueBillingKey(input: {
  authKey: string;
  customerKey: string;
}): Promise<TossBillingAuthorizationResponse> {
  const res = await fetch(`${TOSS_API_BASE}/billing/authorizations/issue`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new TossError(
      data.code ?? "unknown",
      data.message ?? "billing key issue failed",
      res.status,
    );
  }
  return data;
}

export async function chargeBillingKey(input: {
  billingKey: string;
  customerKey: string;
  amount: number;
  orderId: string;
  orderName: string;
  customerEmail?: string;
  customerName?: string;
}): Promise<TossPaymentResponse> {
  const { billingKey, ...body } = input;
  const res = await fetch(`${TOSS_API_BASE}/billing/${billingKey}`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      "Idempotency-Key": body.orderId,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(CHARGE_TIMEOUT_MS),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new TossError(
      data.code ?? "unknown",
      data.message ?? "charge failed",
      res.status,
    );
  }
  return data;
}

export async function deleteBillingKey(billingKey: string): Promise<void> {
  const res = await fetch(`${TOSS_API_BASE}/billing/${billingKey}`, {
    method: "DELETE",
    headers: {
      Authorization: authHeader(),
    },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new TossError(
      data.code ?? "unknown",
      data.message ?? "billing key delete failed",
      res.status,
    );
  }
}

const RETRYABLE_CODES = new Set([
  "REJECT_CARD_PAYMENT",
  "EXCEED_MAX_DAILY_PAYMENT_COUNT",
  "FAILED_INTERNAL_SYSTEM_PROCESSING",
]);

export function isRetryableTossError(code: string): boolean {
  return RETRYABLE_CODES.has(code);
}
