---
phase: 7
plan: 07
status: complete
commit: 7673221
date: "2026-03-25"
---

# Plan 07 Summary: Dashboard integration, page wiring, and empty state completion

## What was done

### Task 07.1 — metricSnapshots query and computeBodyLanguage (commit 9c5b21f)

- Added `metricSnapshots` to the import from `@/shared/db/schema`
- Added `computeBodyLanguage` to the import from `@/features/analytics`
- Expanded `Promise.all` from 2 to 3 queries: added metricSnapshots query for latest 2 sessions (desc order, limit 2) joined on userId for authorization
- Called `computeBodyLanguage(snapshotRows)` after the analytics compute
- Passed `bodyLanguage={bodyLanguage}` prop to `HistoryDashboard`

### Task 07.2 — HistoryDashboard props and dynamic imports (commit 2181b91)

- Added `BodyLanguageData` to the analytics type import
- Added direct imports for `BodyLanguagePanelInner`, `FillerHeatmapInner`, `ActionTrackerInner`, `AiRecommendationCardInner` (no SSR concern — no Recharts)
- Added `StarRadarChart` as `dynamic({ ssr: false })` (uses Recharts, needs SSR guard)
- Updated `HistoryDashboardProps` interface: added `bodyLanguage: BodyLanguageData`
- Updated function signature to destructure `bodyLanguage`

### Task 07.3 — INSERT new panel sections (commit 7673221)

Inserted two new `motion.div` sections between the existing charts container and the session list:

**약점 분석 section:**
- Section title "약점 분석" / subtitle "STAR 충족률, 추임새, 바디랭귀지를 분석합니다"
- 2-column grid (`grid-cols-1 md:grid-cols-2`): `StarRadarChart` | `BodyLanguagePanelInner`
- Full-width: `FillerHeatmapInner`
- `motion.div` with `{ delay: 0.15 }`

**액션 플랜 section:**
- Section title "액션 플랜" / subtitle "AI가 제안하는 다음 단계입니다"
- 2-column grid: `ActionTrackerInner` | `AiRecommendationCardInner`
- `motion.div` with `{ delay: 0.2 }`

No existing JSX was removed or modified.

### Task 07.4 — Verify empty state (no code changes)

Confirmed the `sessions.length === 0` early return at the top of `HistoryDashboard` is preserved intact with:
- "아직 면접 기록이 없습니다" copy
- "면접 시작하기" CTA button

## Verification

- `pnpm build`: compiled successfully, 12 static/dynamic pages, no errors
- `npx tsc --noEmit`: zero type errors
- Layout order matches UI-SPEC: stat cards → charts → 약점 분석 → 액션 플랜 → session list
- No `as` type assertions added

## Files modified

- `src/app/history/page.tsx` — third query, computeBodyLanguage, bodyLanguage prop
- `src/widgets/history/history-dashboard.tsx` — props, imports, two new sections
