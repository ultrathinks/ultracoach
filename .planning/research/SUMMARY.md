# Dashboard v1.1 Research Summary

**Date:** 2026-03-24
**Scope:** Analytics dashboard on `/history`. No new data collection.

---

## 1. Stack Decisions

### Add

| Package | Version | Reason |
|---------|---------|--------|
| `recharts` | `2.15.4` (v2, not v3) | Radar + Line + Bar charts. SVG output, CSS variable colors, React 19 compatible, ~50KB gzip |
| `react-is` | `^19.0.0` | Recharts 2.x peerDep; explicit pin avoids lockfile ambiguity |

Two packages total. Everything else — animation, CSS, data fetching, type validation — is covered by existing stack.

### Do NOT Add

| Package | Reason |
|---------|--------|
| `recharts@3.x` | Bundles `@reduxjs/toolkit` + `react-redux` at runtime. ~90KB vs ~50KB for no relevant feature gain |
| `@tremor/react` | peerDep `react@^18.0.0` — blocked on React 19 |
| `chart.js` / `react-chartjs-2` | Canvas-based. No SVG, no CSS variable colors, no smooth transitions. Incompatible with glassmorphism design system |
| `@nivo/*` | Separate package per chart type, each pulling full D3. 2–3× bundle impact of Recharts |
| `D3.js` | Already covered by Recharts internals for all chart types needed here |
| `react-spring` | Redundant with `motion/react` already in project |

**Filler word heatmap:** inline SVG `<rect>` grid — same pattern as existing `MiniChart`. No library needed.

---

## 2. Feature Priority and Build Order

### Table Stakes (absence makes the app feel like a demo)

| # | Feature | Complexity | Data source | New DB? |
|---|---------|-----------|------------|---------|
| 1 | Score trend chart (enhanced) | Low | `sessions.deliveryScore/contentScore` | No |
| 2 | Interview type comparison | Low | `sessions.interviewType` aggregated | No |
| 3 | STAR weakness radar | Medium | `feedback.questionAnalysesJson[].starFulfillment` | No |
| 4 | Body language score grid | Medium | `metricSnapshots.snapshotsJson` → server-aggregated | No |

Items 1–3 alone are enough to feel like a complete product.

### Differentiators (unique to this product, high coaching value)

| # | Feature | Complexity | Data source | New DB? |
|---|---------|-----------|------------|---------|
| 5 | Filler word frequency (normalized per-minute) | Low-Medium | `feedback.questionAnalysesJson[].fillerWords` | No |
| 6 | Action item tracking (read-only aggregate first) | Medium | `feedback.actionItemsJson` | No |
| 7 | AI next session recommendation (Option A: surface existing data) | Low | `feedback.summaryJson.nextSessionSuggestion` + STAR rates | No |

### Anti-features — do not build

- Streak counters (anxiety-inducing for job-seekers, not daily-learning app)
- Session timeline scrubber (requires audio storage)
- Social/leaderboard features (shame, not motivation)
- Percentile ranking (misleading with small N)
- Confetti animations (tone-deaf in job-seeking context)

### Recommended build sequence

1. Score trend chart — highest visibility, lowest effort
2. Interview type comparison — pure SQL aggregation, immediate signal
3. STAR radar chart — core coaching value
4. Body language score grid — unique to this product
5. Filler word frequency — completes habit-tracking story
6. Action item tracking (read-only)
7. AI recommendation (Option A, surfaces already-generated data)

---

## 3. Architecture

### Routing: extend `/history`, no new route

`/history` already serves as dashboard entry point (summary stats, mini chart, session list). Adding `/dashboard` would split identical user intent across two URLs. Verdict: enhance in-place. URL stays `/history`. Session list moves below analytics panels.

New API route: `GET /api/sessions/stats` — needed only if client-side filter interactions require re-querying without full page reload. Initial render always uses server component.

### Data flow

```
app/history/page.tsx  (server component, force-dynamic)
  ├── auth() check
  ├── Promise.all([
  │     SELECT sessions (scalar columns, no joins),
  │     SELECT feedback JOIN sessions (questionAnalysesJson, summaryJson)
  │   ])
  ├── computeAnalytics(sessionsRows, feedbackRows) → DashboardAnalytics
  └── <HistoryDashboard sessions={...} analytics={...} />
        └── widgets/history/ client components (chart rendering)
```

metricSnapshots fetched separately on demand — do not join into the main query.

### Aggregation strategy: JS-side, not PostgreSQL jsonb functions

Rationale: dataset is bounded (≤50 sessions × ~5 questions). Raw SQL `jsonb_array_elements` gives hard-to-read queries and `unknown` TypeScript types. JS-side aggregation with `sessionFeedbackSchema.safeParse()` is type-safe, testable, and sufficient at this scale.

### FSD layer compliance

```
entities/analytics/types.ts          — pure interfaces, no imports
features/analytics/compute-analytics.ts  — pure functions, depends on entities
widgets/history/*.tsx                 — "use client", depends on features + entities + shared/ui
app/history/page.tsx                  — server component, depends on widgets + shared/db
app/api/sessions/stats/route.ts       — depends on features/analytics, shared/db, shared/lib/auth
```

Dependency direction: `app → widgets → features → entities → shared`. No upward imports.

### New files

```
src/entities/analytics/types.ts
src/entities/analytics/index.ts
src/features/analytics/compute-analytics.ts
src/features/analytics/index.ts
src/widgets/history/analytics-overview.tsx    (score trend)
src/widgets/history/star-radar.tsx
src/widgets/history/filler-word-heatmap.tsx
src/widgets/history/body-language-panel.tsx
src/widgets/history/type-comparison.tsx
src/widgets/history/action-item-tracker.tsx
src/widgets/history/session-list.tsx          (extracted from history-dashboard.tsx)
src/app/api/sessions/stats/route.ts           (optional, Step 6)
```

### Modified files

```
src/app/history/page.tsx              — add feedback query + computeAnalytics
src/widgets/history/history-dashboard.tsx  — add analytics prop, compose panels
src/proxy.ts                          — add /api/sessions/stats matcher (Step 6 only)
```

No schema migrations required for v1.1. No nav changes required.

---

## 4. Top Pitfalls

| # | Pitfall | Severity | Prevention |
|---|---------|----------|-----------|
| 1 | Scanning full jsonb blobs for cross-session aggregation | High | Denormalize `starScore`, `fillerCount`, `bodyLanguageScore` into `sessions` table at feedback-write time. Never fetch `snapshotsJson` for aggregate views |
| 2 | Over-fetching: all 50 sessions × full feedback jsonb blobs | High | Dashboard query = single `SELECT` on `sessions` scalar columns. Join feedback only for fields explicitly needed; never pass raw `summaryJson` to client components |
| 3 | Empty states for 0–2 sessions | High | Define minimum data thresholds per chart: score trend ≥3 sessions, STAR radar ≥1 personality/culture-fit session. Render contextual placeholder messages, not `null` or `NaN` |
| 4 | Chart library bundle bloat | High | All Recharts components wrapped in `dynamic(() => import(...), { ssr: false })`. Never re-export from `shared/ui/index.ts`. Run bundle-analyzer before/after |
| 5 | SSR/CSR hydration mismatch in charts | Medium | All chart components have `"use client"`. Charts that read container dimensions use `useLayoutEffect` + `isMounted` guard, or `dynamic({ ssr: false })` |
| 6 | Dashboard cards look bolted-on | Medium | Colors always via CSS variables (`var(--color-indigo)` etc.), never hardcoded hex. Use existing card structure `rounded-xl bg-card border border-white/[0.1] p-5/6`. Extract `getScoreColor` to `shared/lib/score-color.ts` |
| 7 | Color-only encoding in dark-mode charts | Medium | Always pair color with secondary encoding: dashed vs solid lines, numeric labels on bars, text labels on radar axes. `aria-hidden` on decorative SVG, `role="img"` + `aria-label` on data containers |
| 8 | `history/page.tsx` becoming a 5–7 query orchestration blob | Medium | Keep page to ≤2 parallel queries (sessions + feedback). Move heavier aggregations to `/api/sessions/stats` route |
| 9 | `as` cast on historical jsonb spreading to aggregations | Low | Use `sessionFeedbackSchema.safeParse()` in `compute-analytics.ts`. Discard sessions that fail parse rather than crashing. Existing CLAUDE.md rule prohibits `as` — apply strictly |

---

## 5. Recommended Implementation Sequence

### Step 1 — Types (no dependencies, start here)
- `src/entities/analytics/types.ts`: `ScoreTrend`, `StarAggregate`, `FillerWordAggregate`, `BodyLanguageAggregate`, `ActionItemHistory`, `DashboardAnalytics`
- `src/entities/analytics/index.ts`

### Step 2 — Compute layer (pure functions, immediately testable)
- `src/features/analytics/compute-analytics.ts`
  - Input: sessions rows + feedback rows + optional metricSnapshots rows
  - Output: `DashboardAnalytics`
  - Use `sessionFeedbackSchema.safeParse()` — no `as` casts

### Step 3 — Data fetch (wire compute into page)
- Modify `src/app/history/page.tsx`
  - `Promise.all([sessionsQuery, feedbackQuery])`
  - Call `computeAnalytics()`
  - Pass `analytics: DashboardAnalytics` to `HistoryDashboard`

### Step 4 — Widget components (independent, build in parallel)
Priority order within this step:
1. `session-list.tsx` — extract from existing `history-dashboard.tsx` (no new logic)
2. `analytics-overview.tsx` — score trend line chart (highest user visibility)
3. `type-comparison.tsx` — grouped bar chart (pure sessions data, low effort)
4. `star-radar.tsx` — radar chart, recharts `RadarChart`
5. `body-language-panel.tsx` — 4 progress bars with trend arrows
6. `filler-word-heatmap.tsx` — inline SVG rect grid
7. `action-item-tracker.tsx` — list with delta indicators
8. (ai recommendation block goes inside `analytics-overview.tsx` or as a standalone card)

Each component must: have `"use client"`, use CSS variable colors, handle empty/null state with contextual message, pair color with secondary visual encoding.

### Step 5 — Compose
- Modify `src/widgets/history/history-dashboard.tsx`
  - Accept `analytics: DashboardAnalytics` prop
  - Replace `MiniChart` + stat cards with panel components
  - Render `SessionList` below panels

### Step 6 — API route (add only if interactive filtering is needed)
- `src/app/api/sessions/stats/route.ts`
- Add matcher to `src/proxy.ts`

### Definition of done per chart component
- Renders correctly at 0 sessions, 1 session, 2 sessions, 10+ sessions
- Colors from CSS variables only
- `"use client"` directive present
- Empty state shows contextual Korean message, not blank space or `null`
- No `as` casts in data-processing path
