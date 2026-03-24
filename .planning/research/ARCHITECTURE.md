# Dashboard Integration Architecture

## Decision: Extend /history, Not a New /dashboard Route

The existing `/history` page is already a "dashboard entry point" — it has summary stats, a mini chart, and a session list. Adding a `/dashboard` route would split the same user intent across two URLs and require nav changes.

**Verdict:** Enhance `/history` in-place. The URL stays `/history`. The page evolves from a session list into a full analytics dashboard. The session list moves to a tab or section below the analytics panels.

Routing change required: none. Nav bar: none. Proxy matcher: none.

---

## Routing Structure

```
/history                  — enhanced dashboard (replaces current history page)
/results/[id]             — unchanged (single session report)
/interview                — unchanged
```

New API routes needed:

```
GET /api/sessions/stats   — aggregated analytics across all sessions
```

This is the only new API route. All other data flows through existing server components or existing routes.

---

## Data Flow

### Option A: Server Component with Direct DB Query (recommended)

The `/history` page is already `force-dynamic` with a direct Drizzle query. The pattern is proven and avoids client-side fetch waterfalls.

```
app/history/page.tsx (server component)
  ├── auth() check
  ├── DB query: sessions (existing — scores, dates, types)
  ├── DB query: feedback joined sessions (new — jsonb aggregation)
  └── renders <HistoryDashboard sessions={...} analytics={...} />
```

The server component fetches two datasets in parallel (`Promise.all`), serializes, passes as props. No new API route needed for the main dashboard render.

### Option B: API Route GET /api/sessions/stats

Needed only if any dashboard panel is a client component that fetches independently (e.g., a filter interaction that re-queries without full page reload). Keep this route as a fallback for interactive filtering. Initial render always uses server component.

**Route shape:**

```
GET /api/sessions/stats
Authorization: JWT via proxy (existing pattern)
Response: {
  sessions: SessionSummary[],   // scores + metadata (existing)
  starAggregates: StarAggregate[],  // per session, computed JS-side
  fillerWordAggregates: FillerAggregate[],
  bodyLanguageAggregates: BodyLanguageAggregate[],
  actionItemHistory: ActionItemHistory[]
}
```

### Data Aggregation Strategy: JS-side, not PostgreSQL jsonb aggregation

**Rationale:** The jsonb columns (`summaryJson`, `questionAnalysesJson`, `snapshotsJson`) store arrays of objects. PostgreSQL jsonb aggregation functions (`jsonb_array_elements`, `jsonb_agg`) would require raw SQL or complex Drizzle `.sql` template calls, making the queries hard to read and type-unsafe. The dataset is bounded (50 sessions max per user, each with ~5 questions). JS-side aggregation is safe at this scale and keeps the code in typed TypeScript.

**Pattern:**

```typescript
// In app/history/page.tsx or /api/sessions/stats handler
const [sessionsRows, feedbackRows] = await Promise.all([
  db.select(...).from(sessions).where(eq(sessions.userId, userId)).orderBy(desc(sessions.createdAt)).limit(50),
  db.select({ sessionId: feedback.sessionId, questionAnalysesJson: feedback.questionAnalysesJson, summaryJson: feedback.summaryJson })
    .from(feedback)
    .innerJoin(sessions, eq(feedback.sessionId, sessions.id))
    .where(eq(sessions.userId, userId))
]);

// JS-side aggregation
const analytics = computeAnalytics(sessionsRows, feedbackRows);
```

For metricSnapshots (body language), fetch separately only when needed — the snapshots are large (up to 600 entries per session). Aggregate the `isUpright`, `isFrontFacing`, `isPositiveOrNeutral`, `isModerate` booleans into per-session percentages in JS.

---

## Component Decomposition (FSD Layers)

### New files — what layer, what responsibility

```
entities/analytics/
  types.ts           — StarAggregate, FillerAggregate, BodyLanguageAggregate,
                       ActionItemHistory, ScoreTrend, TypeBreakdown interfaces
  index.ts           — re-export

features/analytics/
  compute-analytics.ts   — pure functions: takes raw DB rows, returns typed analytics
                           (no hooks, no UI — testable in isolation)
  index.ts

widgets/history/
  history-dashboard.tsx         — MODIFIED: accepts new analytics prop, composes panels
  analytics-overview.tsx        — NEW: score trend chart (replaces MiniChart), streak
  star-radar.tsx                — NEW: STAR fulfillment radar chart per interview type
  filler-word-heatmap.tsx       — NEW: word frequency grid across sessions
  body-language-panel.tsx       — NEW: gaze/posture/expression/gesture % bars
  type-comparison.tsx           — NEW: delivery/content by interview type (bar chart)
  action-item-tracker.tsx       — NEW: previous action items + improvement status
  session-list.tsx              — NEW: extracted from current history-dashboard.tsx
```

### Modified files

```
app/history/page.tsx
  — add second DB query for feedback rows
  — add third DB query for metricSnapshots (optional, lazy)
  — call computeAnalytics(), pass result as analytics prop
  — import HistoryDashboard with updated props

widgets/history/history-dashboard.tsx
  — accept Analytics prop
  — compose new panel components
  — delegate session list to SessionList component

widgets/nav/nav-bar.tsx
  — no change required (history link already present)

src/proxy.ts
  — add /api/sessions/stats to matcher if API route is added
```

### FSD layer compliance check

| File | Layer | Imports from |
|------|-------|-------------|
| `entities/analytics/types.ts` | entities | nothing (pure types) |
| `features/analytics/compute-analytics.ts` | features | `entities/analytics`, `entities/feedback`, `entities/metrics` |
| `widgets/history/analytics-overview.tsx` | widgets | `features/analytics`, `entities/analytics`, `shared/ui` |
| `widgets/history/history-dashboard.tsx` | widgets | all widget sub-components, `entities/analytics` |
| `app/history/page.tsx` | app | `widgets/history`, `shared/db`, `shared/lib/auth` |
| `app/api/sessions/stats/route.ts` | app | `shared/db`, `shared/lib/auth`, `features/analytics` |

No upward imports. Dependency direction maintained throughout.

---

## Aggregation Shapes (types.ts contract)

```typescript
// entities/analytics/types.ts

export interface ScoreTrend {
  sessionId: string;
  createdAt: string;
  deliveryScore: number | null;
  contentScore: number | null;
  interviewType: string;
}

export interface StarAggregate {
  interviewType: string;
  situation: number;  // 0-1 fulfillment rate
  task: number;
  action: number;
  result: number;
  sessionCount: number;
}

export interface FillerWordAggregate {
  word: string;
  totalCount: number;
  sessionCount: number;  // how many sessions had this word
}

export interface BodyLanguageAggregate {
  gazeOkRate: number;      // % snapshots where isFrontFacing
  postureOkRate: number;   // % snapshots where isUpright
  expressionOkRate: number; // % snapshots where isPositiveOrNeutral
  gestureOkRate: number;   // % snapshots where isModerate
  sessionCount: number;    // sessions with metric data
}

export interface ActionItemHistory {
  sessionId: string;
  createdAt: string;
  items: { id: number; text: string }[];
  nextSessionDeliveryDelta: number | null;  // score change vs next session
  nextSessionContentDelta: number | null;
}

export interface DashboardAnalytics {
  scoreTrends: ScoreTrend[];
  starAggregates: StarAggregate[];
  fillerWords: FillerWordAggregate[];
  bodyLanguage: BodyLanguageAggregate | null;
  actionItemHistory: ActionItemHistory[];
  streakCount: number;  // consecutive sessions with score >= 70
  typeBreakdown: { type: string; avgDelivery: number; avgContent: number; count: number }[];
}
```

---

## Build Order (dependency-first)

### Step 1 — Types (no dependencies)
- `src/entities/analytics/types.ts` — define all aggregate interfaces above
- `src/entities/analytics/index.ts` — re-export

### Step 2 — Compute layer (depends on Step 1 + existing entity types)
- `src/features/analytics/compute-analytics.ts`
  - Input: `sessions` rows (existing type) + `feedback.questionAnalysesJson` rows + optional `metricSnapshots` rows
  - Output: `DashboardAnalytics`
  - Pure functions, no I/O, testable immediately
- `src/features/analytics/index.ts`

### Step 3 — Data fetch (depends on Step 2)
- Modify `src/app/history/page.tsx`
  - Add `feedback` join query
  - Call `computeAnalytics()`
  - Pass `analytics: DashboardAnalytics` to `HistoryDashboard`

### Step 4 — Widget components (depends on Steps 1, 2 types; can build in parallel)
These are independent of each other and can be built in any order:
- `src/widgets/history/session-list.tsx` — extract from current `history-dashboard.tsx`
- `src/widgets/history/analytics-overview.tsx` — score trend line chart + streak
- `src/widgets/history/star-radar.tsx` — radar chart, recharts or hand-rolled SVG
- `src/widgets/history/filler-word-heatmap.tsx` — word grid
- `src/widgets/history/body-language-panel.tsx` — 4 progress bars
- `src/widgets/history/type-comparison.tsx` — grouped bar chart
- `src/widgets/history/action-item-tracker.tsx` — list with delta indicators

### Step 5 — Compose (depends on Step 4)
- Modify `src/widgets/history/history-dashboard.tsx`
  - Accept `analytics: DashboardAnalytics` prop
  - Replace inline `MiniChart` and stat cards with new panel components
  - Render `SessionList` below analytics panels

### Step 6 — API route (optional, depends on Steps 1-2)
- `src/app/api/sessions/stats/route.ts` — only needed if client-side filtering is added
  - Auth via existing `auth()` pattern
  - Add matcher to `src/proxy.ts`

---

## Integration Points with Existing Code

| Existing file | Change type | What changes |
|--------------|-------------|-------------|
| `src/app/history/page.tsx` | modify | add feedback query + computeAnalytics call |
| `src/widgets/history/history-dashboard.tsx` | modify | add analytics prop, add panel imports |
| `src/entities/feedback/types.ts` | no change | types already cover all needed fields |
| `src/entities/metrics/types.ts` | no change | MetricSnapshot already typed |
| `src/shared/db/schema.ts` | no change | all needed columns exist |
| `src/proxy.ts` | modify (Step 6 only) | add /api/sessions/stats to matcher |
| `src/widgets/nav/nav-bar.tsx` | no change | /history already in nav |

The `feedback.summaryJson` column stores the full `SessionFeedback` object (including `questionAnalyses`, `growthComparison`). The `feedback.questionAnalysesJson` column stores just the array. The compute layer should read from `summaryJson` cast to `SessionFeedback` — this is the same pattern already used in `results-client.tsx` (line 30: `const parsed = feedback.summaryJson as SessionFeedback`). Formalize this with a proper type guard or zod parse in `compute-analytics.ts` rather than `as` cast.

---

## Chart Library Decision

The existing `MiniChart` is hand-rolled SVG inside `history-dashboard.tsx`. For the radar chart and grouped bar chart, hand-rolled SVG becomes complex. Recommend adding `recharts` (React-native, tree-shakeable, SSR-compatible with `"use client"` boundary). All widget chart components are already client components, so no RSC constraint.

If the constraint is zero new dependencies, all charts can be SVG-only — radar and bar charts are feasible with basic trigonometry. Decision point before Step 4.
