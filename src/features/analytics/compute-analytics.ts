import type {
  ActionItemEntry,
  ActionTrackerData,
  AiRecommendationData,
  BodyLanguageCategory,
  BodyLanguageData,
  ChangeRate,
  DashboardAnalytics,
  DashboardStats,
  FillerHeatmapCell,
  FillerHeatmapData,
  FillerHeatmapSession,
  ScoreTrendPoint,
  StarRadarData,
  TypeComparisonGroup,
} from "@/entities/analytics";
import { sessionFeedbackSchema } from "@/entities/feedback/schema";
import { metricSnapshotsArraySchema } from "@/entities/metrics/schema";

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

interface MetricSnapshotRow {
  sessionId: string;
  snapshotsJson: unknown;
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
  feedbackRows: FeedbackRow[],
): DashboardAnalytics {
  const completed = sessions.filter(
    (s) => s.deliveryScore !== null && s.contentScore !== null,
  );
  // Sort ascending by date for trend (sessions come desc from DB)
  const ascending = [...completed].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  // All sessions ascending (including incomplete) for filler/action analysis
  const allAscending = [...sessions].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return {
    scoreTrends: buildScoreTrends(ascending),
    typeComparison: buildTypeComparison(completed),
    stats: buildStats(sessions, ascending),
    starRadar: buildStarRadar(feedbackRows),
    fillerHeatmap: buildFillerHeatmap(feedbackRows, allAscending),
    actionTracker: buildActionTracker(feedbackRows, allAscending),
    aiRecommendation: buildAiRecommendation(feedbackRows, allAscending),
  };
}

export function parseFeedback(summaryJson: unknown) {
  return sessionFeedbackSchema.safeParse(summaryJson);
}

export function computeBodyLanguage(
  snapshotRows: MetricSnapshotRow[],
): BodyLanguageData {
  const noData: BodyLanguageData = {
    categories: [
      { key: "gaze", label: "시선", score: 0, trend: "none" },
      { key: "posture", label: "자세", score: 0, trend: "none" },
      { key: "expression", label: "표정", score: 0, trend: "none" },
      { key: "gesture", label: "제스처", score: 0, trend: "none" },
    ],
    hasData: false,
  };

  if (snapshotRows.length === 0) return noData;

  const scores = snapshotRows.map((row) => {
    const parsed = metricSnapshotsArraySchema.safeParse(row.snapshotsJson);
    if (!parsed.success || parsed.data.length === 0) return null;
    const snapshots = parsed.data;
    const total = snapshots.length;
    return {
      gaze: Math.round(
        (snapshots.filter((s) => s.gaze.isFrontFacing).length / total) * 100,
      ),
      posture: Math.round(
        (snapshots.filter((s) => s.posture.isUpright).length / total) * 100,
      ),
      expression: Math.round(
        (snapshots.filter((s) => s.expression.isPositiveOrNeutral).length /
          total) *
          100,
      ),
      gesture: Math.round(
        (snapshots.filter((s) => s.gesture.isModerate).length / total) * 100,
      ),
    };
  });

  const validScores = scores.filter(
    (s): s is NonNullable<typeof s> => s !== null,
  );
  if (validScores.length === 0) return noData;

  const latest = validScores[0]; // snapshotRows come ordered desc from page.tsx query
  const previous = validScores.length > 1 ? validScores[1] : null;

  function trend(
    latestVal: number,
    prevVal: number | null,
  ): BodyLanguageCategory["trend"] {
    if (prevVal === null) return "none";
    if (latestVal > prevVal) return "up";
    if (latestVal < prevVal) return "down";
    return "flat";
  }

  return {
    categories: [
      {
        key: "gaze",
        label: "시선",
        score: latest.gaze,
        trend: trend(latest.gaze, previous?.gaze ?? null),
      },
      {
        key: "posture",
        label: "자세",
        score: latest.posture,
        trend: trend(latest.posture, previous?.posture ?? null),
      },
      {
        key: "expression",
        label: "표정",
        score: latest.expression,
        trend: trend(latest.expression, previous?.expression ?? null),
      },
      {
        key: "gesture",
        label: "제스처",
        score: latest.gesture,
        trend: trend(latest.gesture, previous?.gesture ?? null),
      },
    ],
    hasData: true,
  };
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

// --- STAR Radar (WEAK-01) ---

function buildStarRadar(feedbackRows: FeedbackRow[]): StarRadarData {
  let sCount = 0;
  let tCount = 0;
  let aCount = 0;
  let rCount = 0;
  let totalQuestions = 0;

  for (const row of feedbackRows) {
    const parsed = parseFeedback(row.summaryJson);
    if (!parsed.success) continue;
    for (const qa of parsed.data.questionAnalyses) {
      totalQuestions++;
      if (qa.starFulfillment.situation) sCount++;
      if (qa.starFulfillment.task) tCount++;
      if (qa.starFulfillment.action) aCount++;
      if (qa.starFulfillment.result) rCount++;
    }
  }

  if (totalQuestions === 0) return [];

  return [
    {
      subject: "Situation",
      value: Math.round((sCount / totalQuestions) * 100),
    },
    { subject: "Task", value: Math.round((tCount / totalQuestions) * 100) },
    { subject: "Action", value: Math.round((aCount / totalQuestions) * 100) },
    { subject: "Result", value: Math.round((rCount / totalQuestions) * 100) },
  ];
}

// --- Filler Heatmap (WEAK-02) ---

function buildFillerHeatmap(
  feedbackRows: FeedbackRow[],
  sessions: SessionRow[],
): FillerHeatmapData {
  const empty: FillerHeatmapData = {
    sessions: [],
    words: [],
    cells: [],
    maxFreq: 0,
  };

  // Build a sessionId → session map for ordering and date labels
  const sessionMap = new Map(sessions.map((s) => [s.id, s]));

  // Collect per-session filler data
  const sessionFillerData: Array<{
    sessionId: string;
    label: string;
    wordCounts: Map<string, number>;
    totalDurationSec: number;
  }> = [];

  // Process feedback rows, maintaining session order (sessions are already sorted ascending)
  const orderedSessionIds = sessions.map((s) => s.id);

  for (const sessionId of orderedSessionIds) {
    const row = feedbackRows.find((r) => r.sessionId === sessionId);
    if (!row) continue;
    const parsed = parseFeedback(row.summaryJson);
    if (!parsed.success) continue;

    const wordCounts = new Map<string, number>();
    let totalDurationSec = 0;

    for (const qa of parsed.data.questionAnalyses) {
      totalDurationSec += qa.durationSec;
      for (const fw of qa.fillerWords) {
        wordCounts.set(fw.word, (wordCounts.get(fw.word) ?? 0) + fw.count);
      }
    }

    if (totalDurationSec > 0) {
      const s = sessionMap.get(sessionId);
      const date = s ? new Date(s.createdAt) : new Date();
      sessionFillerData.push({
        sessionId,
        label: `${date.getMonth() + 1}/${date.getDate()}`,
        wordCounts,
        totalDurationSec,
      });
    }
  }

  if (sessionFillerData.length === 0) return empty;

  // Find top-8 words by total count across all sessions
  const globalWordCounts = new Map<string, number>();
  for (const sd of sessionFillerData) {
    for (const [word, count] of sd.wordCounts) {
      globalWordCounts.set(word, (globalWordCounts.get(word) ?? 0) + count);
    }
  }

  const topWords = [...globalWordCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);

  if (topWords.length === 0) return empty;

  // Build cells: sessions (newest first for display) x words
  const reversedSessions = [...sessionFillerData].reverse(); // newest first
  const heatmapSessions: FillerHeatmapSession[] = reversedSessions.map(
    (sd) => ({
      sessionId: sd.sessionId,
      label: sd.label,
    }),
  );

  const cells: FillerHeatmapCell[] = [];
  let maxFreq = 0;

  for (let si = 0; si < reversedSessions.length; si++) {
    const sd = reversedSessions[si];
    const minutes = sd.totalDurationSec / 60;
    for (let wi = 0; wi < topWords.length; wi++) {
      const count = sd.wordCounts.get(topWords[wi]) ?? 0;
      const freqPerMin =
        minutes > 0 ? Math.round((count / minutes) * 100) / 100 : 0;
      cells.push({ sessionIdx: si, wordIdx: wi, freqPerMin });
      if (freqPerMin > maxFreq) maxFreq = freqPerMin;
    }
  }

  return { sessions: heatmapSessions, words: topWords, cells, maxFreq };
}

// --- Action Tracker (ACTN-01) ---

function buildActionTracker(
  feedbackRows: FeedbackRow[],
  sessions: SessionRow[],
): ActionTrackerData {
  const empty: ActionTrackerData = { items: [], sessionDate: "" };

  // sessions are sorted ascending by createdAt
  const orderedSessionIds = sessions.map((s) => s.id);

  const latestSessionId =
    orderedSessionIds.length > 0
      ? orderedSessionIds[orderedSessionIds.length - 1]
      : null;
  const prevSessionId =
    orderedSessionIds.length > 1
      ? orderedSessionIds[orderedSessionIds.length - 2]
      : null;

  if (!latestSessionId) return empty;

  const latestRow = feedbackRows.find((r) => r.sessionId === latestSessionId);
  if (!latestRow) return empty;

  const latestParsed = parseFeedback(latestRow.summaryJson);
  if (!latestParsed.success) return empty;

  const latestSession = sessions.find((s) => s.id === latestSessionId);
  const sessionDate = latestSession ? latestSession.createdAt : "";

  // Get previous session action items for delta comparison
  let prevTexts: string[] = [];
  if (prevSessionId) {
    const prevRow = feedbackRows.find((r) => r.sessionId === prevSessionId);
    if (prevRow) {
      const prevParsed = parseFeedback(prevRow.summaryJson);
      if (prevParsed.success) {
        prevTexts = prevParsed.data.actionItems.map((item) =>
          item.text.toLowerCase().trim(),
        );
      }
    }
  }

  const items: ActionItemEntry[] = latestParsed.data.actionItems.map((item) => {
    let tag: ActionItemEntry["tag"] = null;
    if (prevTexts.length > 0) {
      // Fuzzy match: check if any previous action item text contains or is contained by this one
      const normalizedCurrent = item.text.toLowerCase().trim();
      const isRepeat = prevTexts.some(
        (prevText) =>
          prevText.includes(normalizedCurrent) ||
          normalizedCurrent.includes(prevText) ||
          computeWordOverlap(normalizedCurrent, prevText) >= 0.5,
      );
      tag = isRepeat ? "repeat" : "new";
    }
    return { id: item.id, text: item.text, tag };
  });

  return { items, sessionDate };
}

/** Compute word overlap ratio between two strings (Jaccard-like) */
function computeWordOverlap(a: string, b: string): number {
  const wordsA = new Set(a.split(/\s+/).filter(Boolean));
  const wordsB = new Set(b.split(/\s+/).filter(Boolean));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }
  const union = new Set([...wordsA, ...wordsB]).size;
  return union > 0 ? intersection / union : 0;
}

// --- AI Recommendation (ACTN-02) ---

function buildAiRecommendation(
  feedbackRows: FeedbackRow[],
  sessions: SessionRow[],
): AiRecommendationData {
  const empty: AiRecommendationData = { suggestion: "", sessionDate: "" };

  const latestSessionId =
    sessions.length > 0 ? sessions[sessions.length - 1].id : null;

  if (!latestSessionId) return empty;

  const latestRow = feedbackRows.find((r) => r.sessionId === latestSessionId);
  if (!latestRow) return empty;

  const parsed = parseFeedback(latestRow.summaryJson);
  if (!parsed.success) return empty;

  const latestSession = sessions.find((s) => s.id === latestSessionId);

  return {
    suggestion: parsed.data.nextSessionSuggestion,
    sessionDate: latestSession ? latestSession.createdAt : "",
  };
}
