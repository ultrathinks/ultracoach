import { addMonths } from "./date";
import type { UserPlan } from "./permissions";

export const PLAN_AMOUNTS_KRW: Record<Exclude<UserPlan, "free">, number> = {
  pro: Number(process.env.SUBSCRIPTION_PRO_AMOUNT ?? 19900),
  premium: Number(process.env.SUBSCRIPTION_PREMIUM_AMOUNT ?? 39900),
};

export const PLAN_NAMES: Record<UserPlan, string> = {
  free: "Free",
  pro: "Pro",
  premium: "Premium",
};

export function generateOrderId(prefix = "order"): string {
  return `${prefix}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}

export function nextPeriodEnd(start: Date): Date {
  return addMonths(start, 1);
}
