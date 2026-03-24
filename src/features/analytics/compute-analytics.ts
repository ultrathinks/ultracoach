import type {
  ChangeRate,
  DashboardAnalytics,
  DashboardStats,
  ScoreTrendPoint,
  TypeComparisonGroup,
} from "@/entities/analytics";
import { sessionFeedbackSchema } from "@/entities/feedback/schema";

// --- Input row types (match Drizzle select shapes) ---

interface SessionRow {
  id: string;
  interviewType: string;
  deliveryScore: number | null;
  contentScore: number | null;
  createdAt: string; // ISO string (serialized from Date in page.tsx)
}

interface FeedbackRow {
  sessionId: string;
  summaryJson: unknown;
}

// --- Label map ---

const TYPE_LABELS: Record<string, string> = {
  personality: "인성",
  technical: "기술",
  "culture-fit": "컬처핏",
};

// --- Public API ---

export function computeAnalytics(
  sessions: SessionRow[],
  // _feedbackRows: forward compatibility for Phase 7 (STAR/filler analysis).
  // sessionFeedbackSchema.safeParse will be applied here when Phase 7 extends this module.
  _feedbackRows: FeedbackRow[],
): DashboardAnalytics {
  const completed = sessions.filter(
    (s) => s.deliveryScore !== null && s.contentScore !== null,
  );
  // Sort ascending by date for trend (sessions come desc from DB)
  const ascending = [...completed].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return {
    scoreTrends: buildScoreTrends(ascending),
    typeComparison: buildTypeComparison(completed),
    stats: buildStats(sessions, ascending),
  };
}

// parseFeedback: Phase 7 extension point — STAR/filler analysis will call sessionFeedbackSchema.safeParse here.
export function parseFeedback(summaryJson: unknown) {
  return sessionFeedbackSchema.safeParse(summaryJson);
}

// --- Score Trends (GROW-01) ---

function buildScoreTrends(ascending: SessionRow[]): ScoreTrendPoint[] {
  return ascending.map((s) => ({
    sessionId: s.id,
    createdAt: s.createdAt,
    deliveryScore: s.deliveryScore,
    contentScore: s.contentScore,
    interviewType: s.interviewType,
  }));
}

// --- Type Comparison (COMP-01) ---

function buildTypeComparison(completed: SessionRow[]): TypeComparisonGroup[] {
  const groups = new Map<string, { delivery: number[]; content: number[] }>();

  for (const s of completed) {
    const existing = groups.get(s.interviewType) ?? {
      delivery: [],
      content: [],
    };
    existing.delivery.push(s.deliveryScore ?? 0);
    existing.content.push(s.contentScore ?? 0);
    groups.set(s.interviewType, existing);
  }

  const result: TypeComparisonGroup[] = [];
  for (const [type, data] of groups) {
    result.push({
      type,
      typeLabel: TYPE_LABELS[type] ?? type,
      avgDelivery: Math.round(
        data.delivery.reduce((a, b) => a + b, 0) / data.delivery.length,
      ),
      avgContent: Math.round(
        data.content.reduce((a, b) => a + b, 0) / data.content.length,
      ),
      count: data.delivery.length,
    });
  }

  // Sort: 인성 → 기술 → 컬처핏
  const order = ["personality", "technical", "culture-fit"];
  return result.sort(
    (a, b) =>
      (order.indexOf(a.type) === -1 ? 99 : order.indexOf(a.type)) -
      (order.indexOf(b.type) === -1 ? 99 : order.indexOf(b.type)),
  );
}

// --- Stats (GROW-02, GROW-03) ---

function buildStats(
  allSessions: SessionRow[],
  ascending: SessionRow[],
): DashboardStats {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const recentWeekSessions = allSessions.filter(
    (s) => new Date(s.createdAt) >= weekAgo,
  ).length;

  return {
    totalSessions: allSessions.length,
    recentWeekSessions,
    changeRate: computeChangeRate(ascending),
  };
}

function computeChangeRate(ascending: SessionRow[]): ChangeRate {
  if (ascending.length < 2) {
    return { deliveryChange: 0, contentChange: 0, hasEnoughData: false };
  }

  const first = ascending[0];
  const latest = ascending[ascending.length - 1];

  // Individual score changes: latest - first (absolute difference)
  const deliveryChange =
    (latest.deliveryScore ?? 0) - (first.deliveryScore ?? 0);
  const contentChange = (latest.contentScore ?? 0) - (first.contentScore ?? 0);

  return {
    deliveryChange,
    contentChange,
    hasEnoughData: true,
  };
}
