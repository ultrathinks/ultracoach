import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { partners, subscriptions, users } from "../db/schema";
import type { UserPlan } from "./permissions";

const PLAN_ORDER: Record<UserPlan, number> = {
  free: 0,
  pro: 1,
  premium: 2,
};

interface EffectivePlanInput {
  grantedPlan: UserPlan | null;
  activeSubPlan: UserPlan | null;
  partnerPlan: UserPlan | null;
}

export function computeEffectivePlan(input: EffectivePlanInput): UserPlan {
  const candidates: UserPlan[] = ["free"];
  if (input.grantedPlan) candidates.push(input.grantedPlan);
  if (input.activeSubPlan) candidates.push(input.activeSubPlan);
  if (input.partnerPlan) candidates.push(input.partnerPlan);
  return candidates.reduce((a, b) => (PLAN_ORDER[a] >= PLAN_ORDER[b] ? a : b));
}

export async function recomputePlan(userId: string): Promise<UserPlan> {
  const [user] = await db
    .select({
      grantedPlan: users.grantedPlan,
      partnerId: users.partnerId,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return "free";

  const [activeSub, partnerRow] = await Promise.all([
    db
      .select({ plan: subscriptions.plan })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, "active"),
        ),
      )
      .limit(1)
      .then((rows) => rows[0] ?? null),
    user.partnerId
      ? db
          .select({ plan: partners.plan, active: partners.active })
          .from(partners)
          .where(eq(partners.id, user.partnerId))
          .limit(1)
          .then((rows) => rows[0] ?? null)
      : Promise.resolve(null),
  ]);

  const partnerPlan = partnerRow && partnerRow.active ? partnerRow.plan : null;

  const effective = computeEffectivePlan({
    grantedPlan: user.grantedPlan,
    activeSubPlan: activeSub?.plan ?? null,
    partnerPlan,
  });

  await db.update(users).set({ plan: effective }).where(eq(users.id, userId));

  return effective;
}
