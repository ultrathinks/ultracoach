import { redirect } from "next/navigation";
import { Problems } from "./api-error";
import { auth } from "./auth";

export type UserRole = "user" | "admin" | "demo";
export type UserPlan = "free" | "pro" | "premium";

const PLAN_ORDER: Record<UserPlan, number> = {
  free: 0,
  pro: 1,
  premium: 2,
};

interface PlanCapabilities {
  monthlySessions: number;
  drillEnabled: boolean;
  advancedAnalytics: boolean;
  recordingPlayback: boolean;
}

export const PLAN_LIMITS: Record<UserPlan, PlanCapabilities> = {
  free: {
    monthlySessions: 3,
    drillEnabled: false,
    advancedAnalytics: false,
    recordingPlayback: false,
  },
  pro: {
    monthlySessions: 30,
    drillEnabled: true,
    advancedAnalytics: true,
    recordingPlayback: true,
  },
  premium: {
    monthlySessions: Number.POSITIVE_INFINITY,
    drillEnabled: true,
    advancedAnalytics: true,
    recordingPlayback: true,
  },
};

export function getMonthlyLimit(user: { plan: UserPlan }): number {
  return PLAN_LIMITS[user.plan].monthlySessions;
}

export function canUseDrill(user: { plan: UserPlan }): boolean {
  return PLAN_LIMITS[user.plan].drillEnabled;
}

export function canUseAdvancedAnalytics(user: { plan: UserPlan }): boolean {
  return PLAN_LIMITS[user.plan].advancedAnalytics;
}

export function canUseRecordingPlayback(user: { plan: UserPlan }): boolean {
  return PLAN_LIMITS[user.plan].recordingPlayback;
}

export function meetsPlan(
  user: { plan: UserPlan },
  minPlan: UserPlan,
): boolean {
  return PLAN_ORDER[user.plan] >= PLAN_ORDER[minPlan];
}

/**
 * Server Component / Action용 — 미인증 시 redirect("/")
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user) redirect("/");
  return session;
}

/**
 * Server Component / Action용 — admin 미달 시 redirect("/")
 */
export async function requireAdminPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/");
  return session;
}

/**
 * API Route용 — 인증 필수
 */
export async function requireApiAuth(instance?: string) {
  const session = await auth();
  if (!session?.user) {
    return { error: Problems.unauthorized(instance) } as const;
  }
  return { session } as const;
}

/**
 * API Route용 — admin 필수
 */
export async function requireApiAdmin(instance?: string) {
  const session = await auth();
  if (!session?.user) {
    return { error: Problems.unauthorized(instance) } as const;
  }
  if (session.user.role !== "admin") {
    return { error: Problems.forbidden(instance) } as const;
  }
  return { session } as const;
}

/**
 * API Route용 — 최소 plan 검사
 */
export async function requireApiPlan(minPlan: UserPlan, instance?: string) {
  const session = await auth();
  if (!session?.user) {
    return { error: Problems.unauthorized(instance) } as const;
  }
  if (!meetsPlan(session.user, minPlan)) {
    return {
      error: Problems.planRequired({
        requiredPlan: minPlan,
        currentPlan: session.user.plan,
        instance,
      }),
    } as const;
  }
  return { session } as const;
}
