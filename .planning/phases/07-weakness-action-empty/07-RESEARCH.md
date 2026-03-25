# Phase 7: Weakness Analysis, Action Tracking, and Empty States — Research

**Researched:** 2026-03-24
**Status:** Complete

---

## 1. Data Schema Analysis

### feedback table (`src/shared/db/schema.ts`)

The `feedback` table has four jsonb columns:
- `summaryJson` — the primary column. Parsed by `sessionFeedbackSchema`.
- `keyMomentsJson` — separate jsonb (currently unused in analytics path)
- `actionItemsJson` — separate jsonb (currently unused; actionItems also live inside `summaryJson.actionItems`)
- `questionAnalysesJson` — separate jsonb (currently unused; questionAnalyses also nested inside `summaryJson.questionAnalyses`)

**Important:** All Phase 7 data (STAR, fillerWords, actionItems, nextSessionSuggestion) is reachable through `summaryJson` alone. No need to query additional columns.

### sessionFeedbackSchema (`src/entities/feedback/schema.ts`)

Full shape after zod parse:
```
{
  deliveryScore: number,
  contentScore: number,
  summary: string,
  growthComparison: { deliveryChange: number, contentChange: number } | null,
  keyMoments: Array<{ timestamp, duration, description, type: "positive"|"negative" }>,
  actionItems: Array<{ id: number, text: string }>,
  nextSessionSuggestion: string,
  questionAnalyses: Array<{
    questionId: number,
    questionText: string,
    answer: string | null,
    starFulfillment: { situation: boolean, task: boolean, action: boolean, result: boolean },
    fillerWords: Array<{ word: string, count: number }>,
    durationSec: number,
    contentScore: number,
    feedback: string,
  }>
}
```

### STAR fulfillment (WEAK-01)

- Location: `summaryJson.questionAnalyses[*].starFulfillment`
- Type: `{ situation: boolean, task: boolean, action: boolean, result: boolean }`
- Fulfillment rate per dimension = (count of questions where dimension === true) / totalQuestions * 100
- Must aggregate across ALL sessions and ALL questions within each session.
- Minimum viable data: 1 session with 1 question is sufficient for radar display.

### Filler words (WEAK-02)

- Location: `summaryJson.questionAnalyses[*].fillerWords`
- Type: `Array<{ word: string, count: number }>`
- Duration available: `summaryJson.questionAnalyses[*].durationSec`
- Per-minute frequency = (word count in session) / (total durationSec of session / 60)
- Heatmap shape: sessions (Y) x top-N unique words (X), color = per-minute frequency
- Need to collect union of all words across sessions, pick top-N by total count, then build a sparse matrix.

### Action items (ACTN-01)

- Location: `summaryJson.actionItems`
- Type: `Array<{ id: number, text: string }>`
- For "신규/반복" delta: compare latest session's actionItems texts against previous session's actionItems texts. Use simple substring or normalized text comparison.
- Only latest session is displayed per CONTEXT.md decision.

### AI recommendation (ACTN-02)

- Location: `summaryJson.nextSessionSuggestion`
- Type: `string` — a single string containing the full suggestion.
- Display: one-line summary + expand/collapse toggle.

### metricSnapshots table (`src/shared/db/schema.ts`)

```
metric_snapshots {
  id: text PK,
  sessionId: text FK -> sessions.id,
  snapshotsJson: jsonb,   -- Array<MetricSnapshot>
  eventsJson: jsonb,      -- Array<MetricEvent>
}
```

### MetricSnapshot shape (`src/entities/metrics/types.ts`)

```typescript
interface MetricSnapshot {
  timestamp: number;
  gaze:       { pitch: number; yaw: number; isFrontFacing: boolean }
  posture:    { shoulderTilt: number; headOffset: number; isUpright: boolean }
  expression: { frownScore: number; isPositiveOrNeutral: boolean }
  gesture:    { wristMovement: number; isModerate: boolean }
}
```

Body language score per category = (snapshots where boolean === true) / totalSnapshots * 100.
- 시선 = `gaze.isFrontFacing`
- 자세 = `posture.isUpright`
- 표정 = `expression.isPositiveOrNeutral`
- 제스처 = `gesture.isModerate`

Trend arrow (vs. previous session): requires querying metricSnapshots for the latest TWO sessions that have snapshots data.

---

## 2. Existing Patterns & Extension Points

### computeAnalytics (`src/features/analytics/compute-analytics.ts`)

- Signature: `computeAnalytics(sessions: SessionRow[], _feedbackRows: FeedbackRow[]): DashboardAnalytics`
- `_feedbackRows` is intentionally unused now, explicitly marked as "Phase 7 extension point"
- `parseFeedback(summaryJson: unknown)` is already exported — calls `sessionFeedbackSchema.safeParse(summaryJson)`
- The function returns `DashboardAnalytics` — this type must be extended with Phase 7 fields.
- Pattern for extension: add new aggregation functions (`buildStarRadar`, `buildFillerHeatmap`, `buildActionTracker`) following the same private function pattern, then add their return values to the `DashboardAnalytics` return object.

### DashboardAnalytics type (`src/entities/analytics/types.ts`)

Current shape:
```typescript
interface DashboardAnalytics {
  scoreTrends: ScoreTrendPoint[];
  typeComparison: TypeComparisonGroup[];
  stats: DashboardStats;
}
```
Must add: `starRadar`, `fillerHeatmap`, `actionTracker`, `bodyLanguage` (or body language is handled separately via its own props from page.tsx).

### HistoryDashboard (`src/widgets/history/history-dashboard.tsx`)

- "use client" — it is a client component
- Currently renders: stat cards → ScoreTrendChart → TypeComparisonChart → session list
- Both charts are `dynamic({ ssr: false })` loaded
- Empty state (0 sessions): returns a centered "아직 면접 기록이 없습니다" with a "면접 시작하기" button. This is the ONLY existing empty state — all panel-level empty states need to be added.
- Props: `{ sessions: SessionSummary[], analytics: DashboardAnalytics }`
- Phase 7 adds new panels between the existing charts and the session list, and updates props to include body language data (or adds it to analytics).

### Established chart patterns

From `score-trend-chart.tsx` and `type-comparison-chart.tsx`:
1. "use client" directive
2. Recharts component imported directly (NOT dynamic — the parent HistoryDashboard does dynamic import of the Inner component)
3. `ResponsiveContainer width="100%" height={240}`
4. CSS variables for all colors: `var(--color-indigo)`, `var(--color-pink)`, `var(--color-muted)`, `var(--color-card)`, `var(--color-foreground)`
5. Tooltip style: `backgroundColor: "var(--color-card)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px"`
6. Axes: `tickLine={false}`, `axisLine={false}`, `stroke="var(--color-muted)"`, `fontSize={12}`
7. Card wrapper: `<div className="rounded-xl bg-card border border-white/[0.1] p-6">`
8. Empty guard at top: `if (data.length === 0) return null;`
9. Exported as named export (not default), e.g. `export { ScoreTrendChartInner }`

### Server Component → Client Component data flow

From `src/app/history/page.tsx`:
- Server Component queries DB, serializes dates to ISO strings
- Passes serialized data as props to HistoryDashboard (client component)
- `Promise.all([...])` pattern for parallel queries
- `createdAt.toISOString()` for date serialization

---

## 3. Recharts RadarChart Usage

**Version:** recharts@2.15.4 (v2 API)

### Required imports

```typescript
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
```

### Data shape required by RadarChart

```typescript
const chartData = [
  { subject: "Situation", value: 72 },
  { subject: "Task",      value: 85 },
  { subject: "Action",    value: 60 },
  { subject: "Result",    value: 78 },
];
```

### Minimal configuration for this project's dark mode

```tsx
<ResponsiveContainer width="100%" height={260}>
  <RadarChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
    <PolarGrid stroke="rgba(255,255,255,0.1)" />
    <PolarAngleAxis
      dataKey="subject"
      tick={{ fill: "var(--color-secondary)", fontSize: 12 }}
    />
    <PolarRadiusAxis
      angle={30}
      domain={[0, 100]}
      tick={{ fill: "var(--color-muted)", fontSize: 10 }}
      axisLine={false}
    />
    <Radar
      dataKey="value"
      stroke="var(--color-indigo)"
      fill="var(--color-indigo)"
      fillOpacity={0.2}
    />
    <Tooltip
      contentStyle={{
        backgroundColor: "var(--color-card)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "8px",
        color: "var(--color-foreground)",
        fontSize: "13px",
      }}
    />
  </RadarChart>
</ResponsiveContainer>
```

### Key notes

- `PolarGrid` default is a polygon grid; `gridType="circle"` switches to circle grid — either works; polygon is more angular/sharp.
- `PolarRadiusAxis` domain must be explicit `[0, 100]` to avoid auto-scaling to max value.
- Radar `fill` + low `fillOpacity` creates the area fill; `stroke` draws the border line.
- Must be wrapped in `dynamic({ ssr: false })` at the HistoryDashboard level, same as existing charts.
- The Inner component file is "use client" only — dynamic import wrapper in history-dashboard.tsx.

---

## 4. SVG Heatmap Implementation

### Approach

Inline SVG `<rect>` grid — no Recharts needed. Pure React + SVG.

### Data structure needed

```typescript
interface FillerHeatmapData {
  sessions: Array<{
    sessionId: string;
    label: string; // e.g. "3/24"
  }>;
  words: string[]; // top-N unique filler words, ordered by total frequency
  cells: Array<{
    sessionIdx: number;
    wordIdx: number;
    freqPerMin: number; // 0 if no occurrence
  }>;
  maxFreq: number; // for color normalization
}
```

### SVG layout

- Cell size: ~28×28px with 3px gap
- Y axis: session labels (dates), newest at top
- X axis: word labels, rotated 30-45deg or horizontal if short
- Color scale: `opacity` or `fill` interpolation from indigo (`#818cf8`) → pink (`#f472b6`) based on `freqPerMin / maxFreq`
- Transparent/near-transparent cells for zero frequency

### Color interpolation

Since this uses CSS variables which can't be interpolated directly, use a fixed gradient array or inline style with computed `rgba`:
```typescript
function cellColor(freqPerMin: number, maxFreq: number): string {
  if (maxFreq === 0) return "rgba(129,140,248,0.05)"; // near-transparent indigo
  const t = Math.min(freqPerMin / maxFreq, 1);
  // lerp indigo(129,140,248) → pink(244,114,182)
  const r = Math.round(129 + t * (244 - 129));
  const g = Math.round(140 + t * (114 - 140));
  const b = Math.round(248 + t * (182 - 248));
  return `rgba(${r},${g},${b},${0.15 + t * 0.75})`;
}
```

### Responsive behavior

- Wrap SVG in a `div` with `overflow-x: auto` for narrow viewports
- `viewBox` based on computed grid dimensions, or use fixed cell size with scrollable wrapper
- Top-N words: 6–8 words max keeps it legible on mobile

### Word selection

Top-N by total count across all sessions. Aggregate: `Map<word, totalCount>`, sort desc, take first 8.

---

## 5. Body Language Data Pipeline

### Current state

`metricSnapshots` table exists and is populated by `POST /api/sessions` when `data.metrics` is provided. The write path is complete.

**The read path does NOT exist yet.** `src/app/history/page.tsx` does not query `metricSnapshots` at all. This is the main new infrastructure needed for WEAK-03.

### What needs to be added

**Query in `src/app/history/page.tsx`:**

```typescript
import { metricSnapshots } from "@/shared/db/schema";

// Add to Promise.all:
db
  .select({
    sessionId: metricSnapshots.sessionId,
    snapshotsJson: metricSnapshots.snapshotsJson,
  })
  .from(metricSnapshots)
  .innerJoin(sessions, eq(metricSnapshots.sessionId, sessions.id))
  .where(eq(sessions.userId, session.user.id))
  .orderBy(desc(sessions.createdAt))
  .limit(2) // only need latest 2 sessions for score + trend delta
```

### Zod schema for snapshotsJson

The schema already exists in `src/app/api/sessions/route.ts` as `metricSnapshotSchema` — it should be extracted to `src/entities/metrics/schema.ts` for reuse. Currently only `src/entities/metrics/types.ts` exists; the zod schema is not exported from entities.

### Score computation

```typescript
function computeBodyLanguageScore(snapshots: MetricSnapshot[]): {
  gaze: number; posture: number; expression: number; gesture: number;
} {
  if (snapshots.length === 0) return { gaze: 0, posture: 0, expression: 0, gesture: 0 };
  const total = snapshots.length;
  return {
    gaze: Math.round(snapshots.filter(s => s.gaze.isFrontFacing).length / total * 100),
    posture: Math.round(snapshots.filter(s => s.posture.isUpright).length / total * 100),
    expression: Math.round(snapshots.filter(s => s.expression.isPositiveOrNeutral).length / total * 100),
    gesture: Math.round(snapshots.filter(s => s.gesture.isModerate).length / total * 100),
  };
}
```

### Trend delta

Compare latest session score vs. second-latest session score per category. Arrow up if positive, down if negative, flat if zero or no prior session.

### Data sparsity risk

Not all sessions will have metricSnapshots (e.g., sessions recorded without camera, or before the feature existed). The body language panel must gracefully handle `snapshotsJson = null` or empty array — show "데이터 없음" state.

---

## 6. Empty State Strategy

### Current state (Phase 6)

The ONLY existing empty state is in `HistoryDashboard`: when `sessions.length === 0`, the entire component returns the full-page empty state. There is NO per-panel empty state.

Both existing charts (`ScoreTrendChartInner`, `TypeComparisonChartInner`) handle empty data by returning `null` — not a styled empty state. For Phase 7, per-panel empty states must be more descriptive (introduce the panel).

### Per-panel empty state strategy per CONTEXT.md

**0 sessions:**
- All Phase 7 panels show an individual placeholder with descriptive text explaining what the panel shows.
- Example: STAR radar panel → "첫 세션을 완료하면 STAR 충족률을 확인할 수 있어요"
- This is the "panel introduction" effect — users see what's coming.

**1 session:**
- STAR radar: show with 1 session data (fully functional — doesn't need 2+ sessions)
- Filler heatmap: show 1 row (1 session). Functional.
- Action items: show list without "신규/반복" delta tags
- Body language: show if metricSnapshots exist for that session; otherwise "데이터 없음"
- AI recommendation: show if `nextSessionSuggestion` is non-empty
- Trend delta (body language arrows): not shown (needs 2 sessions). Show "—" or omit arrows.

**Mini-hint for trend features:**
"추이 변화는 2개 이상 세션에서 확인할 수 있어요" — shown inline below panels that require 2+ sessions for their trend features (not as a blocking empty state).

### Safety requirement

All panels must render without JS errors when:
- `feedbackRows` is empty (`[]`)
- `questionAnalyses` is empty or missing
- `metricSnapshots` query returns no rows
- `actionItems` is `[]`
- `nextSessionSuggestion` is `""`

Every zod `safeParse` must handle failure gracefully (skip/default, never throw).

---

## 7. Integration Points

### Files to modify

| File | Change |
|------|--------|
| `src/app/history/page.tsx` | Add metricSnapshots query to Promise.all |
| `src/features/analytics/compute-analytics.ts` | Add `buildStarRadar`, `buildFillerHeatmap`, `buildActionTracker`; pass feedbackRows to them; update return value |
| `src/entities/analytics/types.ts` | Add `StarRadarData`, `FillerHeatmapData`, `ActionTrackerData` types; add fields to `DashboardAnalytics` |
| `src/entities/analytics/index.ts` | Export new types |
| `src/widgets/history/history-dashboard.tsx` | Add new panel imports + section layout (약점 분석, 액션 플랜 sections) |

### New files to create

| File | Purpose |
|------|---------|
| `src/widgets/history/star-radar-chart.tsx` | RadarChart inner component for STAR fulfillment (WEAK-01) |
| `src/widgets/history/filler-heatmap.tsx` | SVG heatmap for filler words (WEAK-02) |
| `src/widgets/history/body-language-panel.tsx` | Progress bars + trend arrows for body language (WEAK-03) |
| `src/widgets/history/action-tracker.tsx` | Action items list with 신규/반복 tags (ACTN-01) |
| `src/widgets/history/ai-recommendation-card.tsx` | Expand/collapse AI suggestion card (ACTN-02) |
| `src/entities/metrics/schema.ts` | Export metricSnapshotSchema + metricEventSchema as zod schemas for reuse |

### Body language data flow

Since body language requires per-session metricSnapshots (not aggregated in analytics), the cleanest approach is:

Option A: Query in page.tsx, compute in page.tsx (server), pass computed `BodyLanguageData` as separate prop to HistoryDashboard.
Option B: Pass raw `metricSnapshotRows` to computeAnalytics and aggregate there.

**Recommendation: Option A.** Body language is statically computed per-session from snapshots, not a cross-session trend. Keep it separate from computeAnalytics which deals with cross-session aggregation. HistoryDashboard gets a new `bodyLanguage?: BodyLanguageData` prop.

### Dependency graph

```
page.tsx
  ├── sessions query (existing)
  ├── feedbackRows query (existing)
  ├── metricSnapshotRows query (NEW)
  ├── computeAnalytics(sessions, feedbackRows) → DashboardAnalytics (extended)
  │     ├── buildScoreTrends (existing)
  │     ├── buildTypeComparison (existing)
  │     ├── buildStats (existing)
  │     ├── buildStarRadar (NEW) — uses parseFeedback on feedbackRows
  │     ├── buildFillerHeatmap (NEW) — uses parseFeedback on feedbackRows
  │     └── buildActionTracker (NEW) — uses parseFeedback on latest 2 feedbackRows
  ├── computeBodyLanguage(metricSnapshotRows) → BodyLanguageData (NEW, in page.tsx or separate module)
  └── <HistoryDashboard sessions analytics bodyLanguage />
        ├── StarRadarChart (dynamic ssr:false)
        ├── BodyLanguagePanel (client, no chart lib needed)
        ├── FillerHeatmap (client, inline SVG)
        ├── ActionTracker (client, list UI)
        └── AiRecommendationCard (client, expand/collapse)
```

---

## 8. Risks & Pitfalls

### Risk 1: feedbackRows not joined to session ordering

`feedbackRows` from the existing query has no `createdAt`. To determine "latest session" vs "previous session" for action item delta and body language trend, need to either:
- Join sessions table to feedbackRows query (add `createdAt` to select), OR
- Match feedbackRow.sessionId against ordered `sessions` array in computeAnalytics.

**Current FeedbackRow interface only has `{ sessionId, summaryJson }`.** The sessions array is already sorted descending by `page.tsx` orderBy. The simplest fix: pass the ordered sessions array into `buildActionTracker` and look up the latest/previous sessionIds from there.

### Risk 2: questionAnalyses null/missing in older feedback

`sessionFeedbackSchema` defines `questionAnalyses` as a required array. If older sessions were saved before this field existed, `safeParse` will fail. The `parseFeedback()` helper returns a `SafeParseReturnType` — always check `.success` before using `.data`. Failed parses must be skipped silently (not counted in aggregation).

### Risk 3: metricSnapshots may not exist for all sessions

Sessions recorded before the body language feature shipped, or sessions with camera disabled, won't have a `metric_snapshots` row. The query returns 0 rows — BodyLanguagePanel must show a graceful "데이터 없음" placeholder, not crash.

### Risk 4: RadarChart SSR hydration

Like all Recharts components, RadarChart must not run on SSR. The existing pattern (`dynamic({ ssr: false })` in `history-dashboard.tsx` wrapping the Inner component) must be applied to `StarRadarChartInner` as well.

### Risk 5: Filler heatmap top-N word selection

If `maxFreq === 0` (no filler words recorded), the color normalization divides by zero. Guard: `if (maxFreq === 0) return baseColor`.

If only 1 session and 0 filler words, show empty-state message inside the heatmap panel.

### Risk 6: Action item delta comparison

Simple string equality (`actionItem.text === prevItem.text`) will likely produce all "신규" tags since action item texts are AI-generated and vary. Consider case-insensitive normalized comparison or keyword overlap. The CONTEXT.md says "유사한 액션아이템" — fuzzy matching may be needed, but simple substring check is a reasonable v1 that can be refined.

### Risk 7: DashboardAnalytics type extension is breaking

Adding new required fields to `DashboardAnalytics` means `computeAnalytics` return type expands. Any callers that destructure or use `DashboardAnalytics` will need to be updated. Currently only `HistoryDashboard` consumes it — one place to update.

### Risk 8: FillerHeatmap responsive layout

The heatmap could overflow horizontally on mobile if there are many words. Use `overflow-x: auto` on the wrapper div and set a `min-width` on the SVG based on word count. Alternatively, cap top-N at 6 for mobile.

### Risk 9: metricSnapshotSchema extraction

The zod schema for `MetricSnapshot` is currently defined inside `src/app/api/sessions/route.ts` (not exported). For the read path in history/page.tsx, a new `src/entities/metrics/schema.ts` should re-define (or re-export) this schema to avoid importing from an API route.

---

## RESEARCH COMPLETE

**Key findings summary:**

1. All STAR, filler, action, and AI recommendation data is in `summaryJson` — no additional DB columns needed.
2. `parseFeedback()` is already exported and ready to use in Phase 7 compute functions.
3. metricSnapshots read path is completely absent — must be added to `page.tsx` query.
4. `metricSnapshotSchema` needs to be extracted from `route.ts` to `src/entities/metrics/schema.ts`.
5. RadarChart follows identical pattern to existing charts: "use client" Inner + dynamic import wrapper.
6. SVG heatmap is standalone React + inline SVG, color computed via JS lerp (indigo→pink).
7. Body language is best handled as a separate prop path (not inside `DashboardAnalytics`).
8. Action item delta comparison needs a fuzzy/normalized strategy; simple equality is likely insufficient.
9. The single existing empty state (0 sessions full-page) remains; all per-panel empty states are new work.
10. `HistoryDashboard` props interface must be updated to accept body language data.
