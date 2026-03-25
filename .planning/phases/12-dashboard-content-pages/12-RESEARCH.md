# Phase 12 Research: Dashboard Content Pages (Widget Redistribution)

**Researched:** 2026-03-25
**Status:** Ready for planning
**Requirements:** DASH-01, DASH-02, DASH-03, DASH-04

---

## 1. Current Architecture

### What Phase 11 Delivered (Complete)

```
src/app/dashboard/
  layout.tsx     — Server Component; auth guard (redirect to "/" if no session); renders DashboardSidebar + <main>
  page.tsx       — Placeholder: "Dashboard" h1 + "Overview 콘텐츠가 곧 추가됩니다." muted text

src/widgets/dashboard/
  dashboard-sidebar.tsx  — "use client"; usePathname(); 5 coaching links + 2 account links + CTA

src/entities/session/
  queries.ts     — getUserSessions, getUserFeedback, getUserSnapshots (all take userId: string)
  index.ts       — re-exports all three query functions

src/app/history/
  page.tsx       — redirect("/dashboard") only (no data logic)
```

### Sub-pages That Do NOT Yet Exist

```
src/app/dashboard/history/page.tsx     ← needed for DASH-02
src/app/dashboard/weaknesses/page.tsx  ← needed for DASH-03
src/app/dashboard/actions/page.tsx     ← needed for DASH-04
```

The sidebar already links to these 4 routes. Visiting them currently returns a 404 within the dashboard layout.

### Sidebar Route Map (Already Wired)

| Sidebar Label | href                      | Requirement |
|---------------|---------------------------|-------------|
| Overview      | /dashboard                | DASH-01     |
| 면접 기록      | /dashboard/history        | DASH-02     |
| 약점 분석      | /dashboard/weaknesses     | DASH-03     |
| 액션 플랜      | /dashboard/actions        | DASH-04     |
| 학습하기       | /dashboard/learn          | Phase 13    |
| 프로필         | /dashboard/profile        | Phase 14    |
| Billing       | /dashboard/billing        | Phase 14    |

---

## 2. Widget Inventory

All widgets live in `src/widgets/history/` and use a `*Inner` naming convention.

### Widget Breakdown

| Widget File | Export Name | Data Prop Type | Target Page |
|-------------|-------------|----------------|-------------|
| `score-trend-chart.tsx` | `ScoreTrendChartInner` | `ScoreTrendPoint[]` | Overview + History |
| `type-comparison-chart.tsx` | `TypeComparisonChartInner` | `TypeComparisonGroup[]` | History |
| `star-radar-chart.tsx` | `StarRadarChartInner` | `StarRadarData` | Weaknesses |
| `body-language-panel.tsx` | `BodyLanguagePanelInner` | `BodyLanguageData` | Weaknesses |
| `filler-heatmap.tsx` | `FillerHeatmapInner` | `FillerHeatmapData` | Weaknesses |
| `action-tracker.tsx` | `ActionTrackerInner` | `ActionTrackerData` | Actions |
| `ai-recommendation-card.tsx` | `AiRecommendationCardInner` | `AiRecommendationData` | Actions |

### Inline Elements Inside history-dashboard.tsx (Not Extracted)

| Element | Description | Target Page |
|---------|-------------|-------------|
| Stat cards (3-col grid) | totalSessions, changeRate, recentWeekSessions | Overview |
| Session list | sessions.map(...) — each row links to /results/[id] | History |
| Empty state (0 sessions) | Full-screen centred h1 + CTA button | Overview (all pages) |

---

## 3. Data Functions

### Query Functions (entities/session/queries.ts)

```ts
export async function getUserSessions(userId: string): Promise<SessionRow[]>
export async function getUserFeedback(userId: string): Promise<FeedbackRow[]>
export async function getUserSnapshots(userId: string): Promise<SnapshotRow[]>
```

### Compute Functions (features/analytics/compute-analytics.ts)

```ts
export function computeAnalytics(sessions: SessionRow[], feedbackRows: FeedbackRow[]): DashboardAnalytics
export function computeBodyLanguage(snapshotRows: MetricSnapshotRow[]): BodyLanguageData
```

### Data Coupling per Page

| Page | Fields from DashboardAnalytics | Extra |
|------|-------------------------------|-------|
| Overview | `stats`, `scoreTrends` | `sessions` (last 3) |
| History | `scoreTrends`, `typeComparison` | `sessions` (full list) |
| Weaknesses | `starRadar`, `fillerHeatmap` | `bodyLanguage` (from computeBodyLanguage) |
| Actions | `actionTracker`, `aiRecommendation` | — |

**Decision:** Reuse `computeAnalytics` as-is. Each page calls full compute but uses subset. No splitting needed at current scale.

---

## 4. Chart Components

**Library:** recharts v2.15.4

| Chart | Widget |
|-------|--------|
| LineChart | `score-trend-chart.tsx` |
| BarChart | `type-comparison-chart.tsx` |
| RadarChart | `star-radar-chart.tsx` |
| Custom SVG | `filler-heatmap.tsx` |
| CSS progress bars | `body-language-panel.tsx` |

**SSR Note:** All chart widget files have `"use client"`. Import with `dynamic(..., { ssr: false })` for recharts-based charts.

---

## 5. Shared UI Components

| Component | File | Notes |
|-----------|------|-------|
| `Button` | `button.tsx` | CTA buttons |
| `Card` | `card.tsx` | `glass?: boolean` prop |
| `Chip` | `chip.tsx` | Tags/badges |
| `cn()` | `shared/lib/cn` | Conditional classnames |
| `motion/react` | framer-motion v12.35.2 | Stagger animations |

---

## 6. Route Structure

### Current → Proposed

```
/history              → redirect("/dashboard")  (already done)
/dashboard            → placeholder → Overview (stat cards + score trend + recent sessions)
/dashboard/history    → 404 → session list + score trend + type comparison
/dashboard/weaknesses → 404 → STAR radar + body language + filler heatmap
/dashboard/actions    → 404 → action tracker + AI recommendation
```

All sub-pages share `src/app/dashboard/layout.tsx` (sidebar + auth guard).

### File System Plan

```
src/app/dashboard/
  layout.tsx                (exists — no changes)
  page.tsx                  (replace placeholder)
  history/page.tsx          (new)
  weaknesses/page.tsx       (new)
  actions/page.tsx          (new)

src/widgets/dashboard/
  dashboard-overview.tsx    (new)
  dashboard-history.tsx     (new)
  dashboard-weaknesses.tsx  (new)
  dashboard-actions.tsx     (new)
```

---

## 7. Dependencies & Risks

| Risk | Mitigation |
|------|-----------|
| `auth()` must be called per page (not inherited from layout) | Each page.tsx calls auth() independently |
| `createdAt: Date` → must serialize to ISO string before client props | `.toISOString()` in each page |
| Charts need `dynamic(..., { ssr: false })` | Use dynamic import pattern in new widgets |
| `history-dashboard.tsx` becomes dead code | Delete it as cleanup |
| Empty state per page | Each widget handles its own; Overview needs page-level empty state |
| Sidebar uses `/dashboard/weaknesses` (plural) | Directory must match: `weaknesses/` |
| Layout `<main>` has `p-6 md:p-8` already | New widgets use `max-w-4xl mx-auto` only, no extra padding |

---

## 8. Implementation Approach

### 4 Plans (one per page/requirement)

1. **Plan 01 — Overview Page (DASH-01):** Replace placeholder with stat cards + score trend + recent sessions
2. **Plan 02 — History Page (DASH-02):** Session list + score trend + type comparison chart
3. **Plan 03 — Weaknesses Page (DASH-03):** STAR radar + body language + filler heatmap
4. **Plan 04 — Actions Page (DASH-04):** Action tracker + AI recommendation card

### Shared Extractions

- `session-list.tsx` — shared between Overview (last 3) and History (full list)
- `getScoreColor` / `formatDuration` — move from history-dashboard.tsx to shared util

### Cleanup

- Delete `src/widgets/history/history-dashboard.tsx` after all pages are built
- Keep individual widget files in `src/widgets/history/` — they are the building blocks

---

## 9. Validation Architecture

### Test Strategy per Page

| Page | Validation Method |
|------|------------------|
| Overview | Render with 0 sessions → empty state CTA visible; render with 3+ sessions → stat cards, chart, recent list |
| History | Render with sessions → full list, charts visible; 0 sessions → empty state |
| Weaknesses | Render with feedback+snapshots → radar, body language, heatmap; 0 data → empty states |
| Actions | Render with feedback → tracker, recommendation card; 0 data → empty states |
| All pages | Auth redirect for unauthenticated users (handled by layout) |

### Build Verification

```bash
pnpm build  # All pages must compile without SSR errors
pnpm lint   # Biome checks pass
```
