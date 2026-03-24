# Dashboard Implementation Pitfalls

UltraCoach v1.1 — specific to adding analytics dashboard to this codebase.

---

## 1. JSONB Query Performance

**Severity: High**

### Pitfall: Cross-session aggregation by scanning full jsonb blobs

The `feedback` table stores the entire `SessionFeedback` object in `summaryJson`, but also redundantly stores sub-arrays in `keyMomentsJson`, `actionItemsJson`, `questionAnalysesJson`. For dashboard aggregations (e.g. "average STAR fulfillment across all sessions", "filler word frequency over time"), the naive query pulls every full feedback row and aggregates in JavaScript.

**Specific risk in this codebase:**
- `questionAnalysesJson` is an array of `QuestionAnalysis` objects. Each contains `fillerWords`, `starFulfillment`, `durationSec`. Extracting these cross-session requires either: (a) full table scan + JS reduce, or (b) `jsonb_array_elements` in raw SQL which Drizzle does not generate for you.
- `metricSnapshots.snapshotsJson` can hold up to 600 `MetricSnapshot` objects per session (MAX_SNAPSHOTS = 600, each with gaze/posture/expression/gesture). Fetching this to compute body language averages for a 20-session user means loading 12,000 objects over the wire for a single dashboard page.

**Prevention:**
- For scalar aggregations (avg STAR, avg filler count): compute and denormalize at feedback-write time. The `/api/sessions/[id]/feedback` route already calls `db.update(sessions).set({ deliveryScore, contentScore })`. Add `starScore` (avg of fulfilled booleans) and `fillerCount` (total across questions) as integer columns to the `sessions` table in the same update call.
- For body language: add `bodyLanguageScore` as a computed integer column to `sessions`, populated when `metricSnapshots` is inserted in `POST /api/sessions`. Do this in the same transaction already in the route.
- Never fetch `snapshotsJson` for list/aggregate views. Only fetch it for single-session deep-dive views.
- Add a GIN index on frequently queried jsonb paths only if raw SQL aggregation is unavoidable: `CREATE INDEX ON feedback USING gin(question_analyses_json jsonb_path_ops)`.

**Phase:** Address before writing any dashboard query — at migration time.

---

## 2. Chart Library Bundle Size

**Severity: High**

### Pitfall: Importing a full chart library and paying for it on every page

The project currently has no charting dependency. `history-dashboard.tsx` renders a hand-rolled SVG line chart (~30 lines). Adding Recharts (~180 kB gzipped), Chart.js (~70 kB), or Victory (~100 kB) as a top-level import bloats the JS bundle for all routes, including the landing page and interview page where charts are never needed.

**Specific risk:** Next.js app router bundles are per-layout. The root `layout.tsx` wraps everything. A chart import inside `widgets/history/` or a new `widgets/dashboard/` is fine — but only if the component is not inadvertently imported by a shared module or re-exported from `shared/ui/index.ts`.

**Prevention:**
- Do not add a chart library dependency at all if the existing SVG approach can be extended. The current `MiniChart` in `history-dashboard.tsx` already draws multi-line SVG. A radar chart (for STAR) and area chart (for score trends) are feasible in ~60–80 lines of vanilla SVG math.
- If a library is genuinely needed, use `dynamic()` with `ssr: false` for every chart component: `const RadarChart = dynamic(() => import('@/widgets/dashboard/radar-chart'), { ssr: false })`. This ensures the library is never included in the server bundle.
- Never re-export chart components from `shared/ui/index.ts`. Keep them isolated in `widgets/dashboard/`.
- Measure: run `pnpm build` and check `.next/analyze` (add `@next/bundle-analyzer`) before and after adding any chart dependency.

**Phase:** Decide before choosing a chart library. If using SVG approach, this pitfall is avoided entirely.

---

## 3. SSR vs CSR for Chart Components

**Severity: Medium**

### Pitfall: Hydration mismatch from SVG geometry computed differently on server vs client

The existing `MiniChart` is inside `history-dashboard.tsx` which is `"use client"` — so it never SSR-renders. This is currently fine. The history `page.tsx` is a server component that passes serialized data down.

The pitfall arises when adding new chart widgets: if a chart component is accidentally placed in a server component (no `"use client"` directive), it will SSR-render the SVG with one set of dimensions, then the client will re-render with `window.innerWidth`-dependent sizing, causing a hydration mismatch and React error in production.

**Specific risk:** A radar chart that computes polygon coordinates from a `useRef` container width — this only works client-side.

**Prevention:**
- All chart components must have `"use client"` at the top. No exceptions.
- For charts that require container dimensions (`ResizeObserver`), use `useLayoutEffect` with an `isMounted` guard pattern, or the `dynamic(() => ..., { ssr: false })` wrapper.
- The correct boundary: `app/history/page.tsx` (server, fetches data) → passes plain serialized data → `widgets/dashboard/` components (`"use client"`, renders charts). This matches the existing pattern in the codebase.
- Do not move data fetching into client components with `useEffect` + fetch. The server component pattern already in `history/page.tsx` is correct and should be extended, not replaced.

**Phase:** At component authoring time — enforce as a code review rule.

---

## 4. Over-fetching Aggregated Data

**Severity: High**

### Pitfall: Fetching all sessions + all feedback rows on every dashboard load

The current history page fetches 50 sessions with `.limit(50)` — only scalar columns, no joins. A dashboard that shows STAR breakdown, filler word trends, and body language scores will be tempted to `JOIN` feedback and metricSnapshots for all 50 rows.

**Specific risk in this codebase:**
- `feedback.summaryJson` contains the full `SessionFeedback` object (~2–5 KB per session as JSON). Joining 50 sessions × full feedback rows = 100–250 KB of JSON just to extract `questionAnalyses[*].starFulfillment`.
- `metricSnapshots.snapshotsJson` at 600 snapshots × ~200 bytes each = ~120 KB per session. Even 5 sessions = 600 KB.

**Prevention:**
- Denormalize aggregated scalars into the `sessions` table (see Pitfall 1). The dashboard query should remain a single `SELECT` on `sessions` only — no joins needed for aggregate views.
- If jsonb data must be queried, use Postgres `jsonb_path_query_array` or `jsonb_array_elements` in a raw `sql` tagged template (Drizzle supports `sql` escape hatch) to extract only the fields you need server-side, not client-side.
- Introduce a `GET /api/dashboard/summary` route that returns pre-aggregated data in a single response: `{ streakCount, avgDelivery, avgContent, starBreakdown, topFillerWords, bodyLanguageAvg }`. This decouples dashboard data shape from session list data shape.
- Never pass raw `summaryJson` blobs to client components for dashboard views. Pass only the derived scalars.

**Phase:** Data layer design — before writing any dashboard API routes.

---

## 5. Dashboard Layout That Looks "Bolted On"

**Severity: Medium**

### Pitfall: New dashboard cards use different spacing, border, and color conventions than existing pages

The existing UI has a strict visual language:
- Cards: `rounded-xl bg-card border border-white/[0.1] p-5` or `p-6`
- Section headers: `text-lg font-semibold mb-3` or `mb-4`
- Score colors: green `#34d399` (80+) / yellow `#fbbf24` (60+) / red `#f87171` (<60) — defined as `--color-green/yellow/red` in `globals.css @theme`
- Gradients: indigo → purple → pink only, via `.gradient-text` and `.gradient-border` classes
- No light-mode variants anywhere

The bolted-on symptom appears when dashboard charts use library-default colors (blue, orange, Recharts grey), hardcoded hex values instead of CSS variables, or card containers with different border-radius or padding than the rest of the app.

**Prevention:**
- All chart stroke/fill colors must reference CSS variables: `var(--color-indigo)`, `var(--color-pink)`, `var(--color-green)`, etc. — never hardcoded hex. The existing `MiniChart` does this correctly with `stroke="var(--color-indigo)"`.
- Score-colored elements (STAR fulfillment indicators, body language scores) must use the same `getScoreColor` logic already in `history-dashboard.tsx` and `score-ring.tsx`. Extract it to `shared/lib/score-color.ts` and import from there — do not re-implement it.
- New sections in the dashboard must use identical card structure to what already exists. Do not introduce new shadow utilities, new border opacity values, or new background colors not in `@theme`.
- The `glass` class (backdrop blur) should only be used for overlays (it already is — coach overlay). Dashboard cards use `bg-card`, not `glass`. Do not mix them.
- Radar chart for STAR: fill with `rgba` of the existing indigo/purple/pink palette, not a library default.

**Phase:** During UI implementation — enforce in every PR review of dashboard widgets.

---

## 6. Accessibility with Dark-Mode-Only Charts

**Severity: Medium**

### Pitfall: Charts that are unreadable for color-blind users or fail contrast requirements

Dark mode with low-contrast chart colors is a common failure point. The current palette has:
- Indigo `#818cf8` on background `#09090b` — contrast ratio ~5.2:1 (passes AA for large text, marginal for small)
- Pink `#f472b6` on `#09090b` — ~4.8:1
- Green `#34d399` on `#09090b` — ~9.3:1 (good)
- Yellow `#fbbf24` on `#09090b` — ~8.4:1 (good)

**Specific risks:**
- A STAR radar chart that encodes fulfillment using filled vs unfilled areas with indigo/pink as the only distinction will be unreadable for deuteranopia users (red-green) and protanopia (red) users.
- Line charts with multiple data series: if only color distinguishes delivery vs content trends, colorblind users cannot differentiate them.
- SVG text labels inside charts: if font size is below 12px, contrast requirements tighten.

**Prevention:**
- Always pair color with a secondary visual encoding: shape (circle vs square legend markers), pattern (dashed vs solid lines), or text label directly on the data point.
- The existing `MiniChart` uses color only for the two lines — add a dashed `strokeDasharray` to one line as a secondary differentiator.
- For STAR radar: fulfilled = filled polygon + label, unfulfilled = empty polygon + muted label. Do not rely solely on color fill.
- Body language scores: use the same green/yellow/red scale, but also show the numeric value. Never color-only status indicators.
- Chart SVG elements that are purely decorative should have `aria-hidden="true"`. Data containers should have `role="img"` and `aria-label` describing what the chart shows.

**Phase:** During UI implementation — not a post-launch polish item.

---

## 7. Empty State Handling for 0–2 Sessions

**Severity: High**

### Pitfall: Dashboard crashes or shows meaningless charts for new users

The current `HistoryDashboard` handles 0 sessions (shows CTA). The `MiniChart` requires `scores.length >= 2` and returns `null` otherwise. But more complex dashboard features break silently at low counts:

**Specific failure modes in this codebase:**
- STAR radar chart: if a user has 1 session with 3 questions and 2 of them lack STAR data (LLM returned null), averaging across them produces NaN or misleading 0s.
- Score trend line: 1 data point produces a single dot, not a line. `step = width / (scores.length - 1)` divides by zero at 1 session (already guarded in `MiniChart` with `>= 2` check — this pattern must be replicated everywhere).
- Growth comparison: `growthComparison` in `SessionFeedback` is `null` for the first session. Any component that renders `feedback.growthComparison.deliveryChange` without null-checking will throw at runtime for first-session users.
- Body language average: if a user completed sessions before `metricSnapshots` was being saved (possible since it's `optional()` in the POST schema), `metricSnapshots` rows may not exist for older sessions. Aggregating will produce averages from incomplete data.
- Streak count: 1 session always shows streak = 1. This can look odd as a prominently displayed metric.

**Prevention:**
- Define minimum data thresholds per chart type and render a specific placeholder, not `null`:
  - Score trend: requires >= 3 sessions. Below threshold: "3회 이상 면접 후 추이를 확인할 수 있습니다" with a progress indicator (e.g. `1/3 완료`).
  - STAR radar: requires >= 1 completed session with >= 1 personality/culture-fit question. For technical-only sessions, STAR is not meaningful — show "STAR 분석은 인성/컬처핏 면접에서만 제공됩니다".
  - Body language: requires >= 1 session where `metricSnapshots` row exists. Show "바디랭귀지 데이터 없음" if missing.
- Never use optional chaining shortcuts like `feedback.growthComparison?.deliveryChange ?? 0` to paper over null. Show the user a contextually correct message instead.
- Test the dashboard UI with: 0 sessions, 1 session (no feedback yet), 1 session (feedback exists), 2 sessions (mixed complete/incomplete).

**Phase:** Before any chart component is considered "done" — empty states are part of the definition of done.

---

## 8. history/page.tsx Scope Creep

**Severity: Medium**

### Pitfall: Turning the history page server component into an orchestration layer that makes 4+ DB queries

The current `history/page.tsx` makes one clean query. Dashboard requirements (score trend, STAR breakdown, body language, filler words, streaks) could lead to 5–7 separate queries in the same server component, each with left joins or subqueries.

**Prevention:**
- Keep `history/page.tsx` fetching only session-level scalars (as it does now). Move dashboard aggregations to a dedicated server action or API route: `GET /api/dashboard/summary?userId=...`.
- If the dashboard becomes a distinct page (`/dashboard`), create `app/dashboard/page.tsx` as a new server component. Do not expand `history/page.tsx` into a dashboard page — they have different data requirements and different UX intents (list vs analytics).
- Use Promise.all for parallel DB queries when multiple are genuinely needed: `const [sessions, summary] = await Promise.all([fetchSessions(), fetchSummary()])`.

**Phase:** Architecture decision — decide early whether dashboard is a new page or history enhancement.

---

## 9. results-client.tsx Type Safety Gap

**Severity: Low (but causes runtime errors)**

### Pitfall: `as` cast on jsonb data propagates into dashboard components

In `results-client.tsx` line 30: `const parsed = feedback.summaryJson as SessionFeedback`. This is the pattern the codebase currently uses. For a single-session view it is tolerable because the data was written by a validated LLM response. For dashboard aggregation, this pattern becomes dangerous: if any historical session has malformed `summaryJson` (e.g. the LLM omitted `questionAnalyses` before the schema was stable), mapping over all sessions will throw at runtime.

**Prevention:**
- Use `sessionFeedbackSchema.safeParse(feedback.summaryJson)` (the schema already exists in `entities/feedback/schema.ts`) when processing jsonb data for dashboard aggregation. Discard or flag sessions that fail parse rather than crashing.
- The CLAUDE.md rule `as` 타입 단언 금지 already prohibits this pattern. Apply it strictly in all new dashboard data-processing code.
- For dashboard summary computations (averages, breakdowns), validate at the point of aggregation — not at the point of display.

**Phase:** During dashboard data-fetching implementation — not a UI concern.

---

## Summary Table

| # | Pitfall | Severity | Phase to Address |
|---|---------|----------|-----------------|
| 1 | JSONB cross-session aggregation scan | High | Before migration |
| 2 | Chart library bundle size | High | Before dependency decision |
| 3 | SSR/CSR hydration mismatch in charts | Medium | At component authoring |
| 4 | Over-fetching full jsonb blobs for aggregates | High | Data layer design |
| 5 | Dashboard cards not matching existing visual language | Medium | During UI implementation |
| 6 | Color-only encoding in dark-mode charts | Medium | During UI implementation |
| 7 | Missing empty states for 0–2 sessions | High | Definition of done per chart |
| 8 | history/page.tsx becoming an orchestration blob | Medium | Architecture decision |
| 9 | `as` cast on historical jsonb propagating to aggregations | Low | During data-fetching implementation |
