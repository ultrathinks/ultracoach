/**
 * RFC 9457 Problem Details for HTTP APIs
 * https://www.rfc-editor.org/rfc/rfc9457
 */

const PROBLEM_TYPE_BASE = "https://ultracoach.kr/errors";

export interface ProblemDetails {
  type?: string;
  title: string;
  detail?: string;
  instance?: string;
  status: number;
  [extension: string]: unknown;
}

export function problemDetails(init: ProblemDetails): Response {
  const body: ProblemDetails = {
    ...init,
    type: init.type ?? `${PROBLEM_TYPE_BASE}/${slugify(init.title)}`,
  };
  return new Response(JSON.stringify(body), {
    status: init.status,
    headers: { "Content-Type": "application/problem+json" },
  });
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const Problems = {
  unauthorized(instance?: string): Response {
    return problemDetails({
      type: `${PROBLEM_TYPE_BASE}/unauthorized`,
      title: "Unauthorized",
      detail: "authentication required",
      instance,
      status: 401,
    });
  },
  forbidden(instance?: string): Response {
    return problemDetails({
      type: `${PROBLEM_TYPE_BASE}/forbidden`,
      title: "Forbidden",
      detail: "insufficient permissions",
      instance,
      status: 403,
    });
  },
  notFound(instance?: string): Response {
    return problemDetails({
      type: `${PROBLEM_TYPE_BASE}/not-found`,
      title: "Not Found",
      instance,
      status: 404,
    });
  },
  validation(detail: string, instance?: string): Response {
    return problemDetails({
      type: `${PROBLEM_TYPE_BASE}/validation-error`,
      title: "Validation Error",
      detail,
      instance,
      status: 422,
    });
  },
  rateLimited(instance?: string): Response {
    return problemDetails({
      type: `${PROBLEM_TYPE_BASE}/rate-limited`,
      title: "Too Many Requests",
      detail: "request rate exceeded",
      instance,
      status: 429,
    });
  },
  quotaExceeded(opts: {
    plan: string;
    used: number;
    limit: number;
    resetAt: string;
    instance?: string;
  }): Response {
    return problemDetails({
      type: `${PROBLEM_TYPE_BASE}/quota-exceeded`,
      title: "Monthly quota exceeded",
      detail: `${opts.plan} plan allows ${opts.limit} interviews per month`,
      instance: opts.instance,
      status: 402,
      used: opts.used,
      limit: opts.limit,
      resetAt: opts.resetAt,
    });
  },
  planRequired(opts: {
    requiredPlan: string;
    currentPlan: string;
    instance?: string;
  }): Response {
    return problemDetails({
      type: `${PROBLEM_TYPE_BASE}/plan-required`,
      title: "Higher plan required",
      detail: `requires ${opts.requiredPlan} plan or higher`,
      instance: opts.instance,
      status: 402,
      requiredPlan: opts.requiredPlan,
      currentPlan: opts.currentPlan,
    });
  },
  internal(detail: string, instance?: string): Response {
    return problemDetails({
      type: `${PROBLEM_TYPE_BASE}/internal`,
      title: "Internal Server Error",
      detail,
      instance,
      status: 500,
    });
  },
};
