---
phase: 07-weakness-action-empty
plan: 01
subsystem: entities
tags: [typescript, zod, analytics, metrics, recharts]

# Dependency graph
requires:
  - phase: 06-infra-score-trends
    provides: DashboardAnalytics base type (scoreTrends, typeComparison, stats)
provides:
  - StarRadarData, FillerHeatmapData, BodyLanguageData, ActionTrackerData, AiRecommendationData types
  - DashboardAnalytics extended with starRadar, fillerHeatmap, actionTracker, aiRecommendation
  - metricSnapshotSchema/metricEventSchema/metricSnapshotsArraySchema exported from entities/metrics
affects:
  - 07-02-PLAN (compute-analytics extension)
  - 07-03-PLAN (star-radar-chart uses StarRadarData)
  - 07-04-PLAN (filler-heatmap uses FillerHeatmapData)
  - 07-05-PLAN (body-language-panel uses BodyLanguageData)
  - 07-06-PLAN (action-tracker uses ActionTrackerData, AiRecommendationData)
  - history/page.tsx (metricSnapshotsArraySchema for query parsing)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - BodyLanguageData kept separate from DashboardAnalytics (Option A — separate prop path)
    - metricSnapshotSchema extracted to entities/metrics/schema.ts for reuse

key-files:
  created:
    - src/entities/metrics/schema.ts
  modified:
    - src/entities/analytics/types.ts
    - src/entities/analytics/index.ts
    - src/entities/metrics/index.ts

key-decisions:
  - "BodyLanguageData is NOT a field of DashboardAnalytics — follows separate prop path per Research Option A"
  - "metricSnapshotSchema extracted to entities/metrics/schema.ts, API route keeps its own copy (no cross-layer import)"
  - "useMetricsStore re-added to metrics index after rewrite to avoid breaking existing consumers"

patterns-established:
  - "Sub-interfaces (StarRadarPoint, FillerHeatmapSession, FillerHeatmapCell, BodyLanguageCategory, ActionItemEntry) defined alongside their parent types in types.ts"
  - "All new types exported from index.ts in alphabetical order"

requirements-completed: [WEAK-01, WEAK-02, WEAK-03, ACTN-01, ACTN-02]

# Metrics
duration: 8min
completed: 2026-03-24
---

# Phase 7 Plan 01: Type definitions and metric schema extraction — Summary

**Phase 7 type foundation: StarRadarData, FillerHeatmapData, BodyLanguageData, ActionTrackerData, AiRecommendationData added to analytics entity; DashboardAnalytics extended; metricSnapshotSchema extracted to reusable entity module**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-24
- **Completed:** 2026-03-24
- **Tasks:** 4
- **Files modified:** 4 (3 modified, 1 created)

## Accomplishments
- Appended 7 new interfaces/types to analytics entity types.ts, extending DashboardAnalytics with 4 new fields
- Updated analytics index.ts to export all 15 types alphabetically
- Created entities/metrics/schema.ts with metricSnapshotSchema, metricEventSchema, metricSnapshotsArraySchema
- Updated metrics index.ts to export schemas alongside existing store and types

## Task Commits

All four tasks committed as a single atomic commit:

1. **Tasks 01.1–01.4: All entity types and metric schema** - `6dccdd6` (feat)

## Files Created/Modified
- `src/entities/analytics/types.ts` - Added StarRadarPoint, StarRadarData, FillerHeatmapSession, FillerHeatmapCell, FillerHeatmapData, BodyLanguageCategory, BodyLanguageData, ActionItemEntry, ActionTrackerData, AiRecommendationData; extended DashboardAnalytics
- `src/entities/analytics/index.ts` - Re-export all 15 types (expanded from 5)
- `src/entities/metrics/schema.ts` - New file: metricSnapshotSchema, metricEventSchema, metricSnapshotsArraySchema via zod
- `src/entities/metrics/index.ts` - Added schema exports; restored useMetricsStore export

## Decisions Made
- BodyLanguageData is NOT added to DashboardAnalytics — kept separate per Research Option A decision (body language follows its own prop path from page.tsx)
- API route (`src/app/api/sessions/route.ts`) keeps its own copy of metricSnapshotSchema — no import from entity layer (avoids layer violation; the plan explicitly did not require this refactor)
- useMetricsStore export had to be restored in metrics index after the rewrite inadvertently dropped it

## Deviations from Plan

### Auto-fixed Issues

**1. [Blocking] useMetricsStore dropped from metrics index**
- **Found during:** TypeScript verification after Task 01.4
- **Issue:** Rewriting metrics/index.ts dropped the `useMetricsStore` export that 3 existing files import
- **Fix:** Added `export { useMetricsStore } from "./store"` back to index.ts
- **Files modified:** src/entities/metrics/index.ts
- **Verification:** `npx tsc --noEmit` shows only the expected compute-analytics.ts error, no more useMetricsStore errors
- **Committed in:** 6dccdd6 (included in the single task commit)

---

**Total deviations:** 1 auto-fixed (1 blocking — dropped export restored)
**Impact on plan:** Fix essential to avoid breaking existing consumers. No scope creep.

## Issues Encountered
- metrics/index.ts originally exported `useMetricsStore` from `./store`. The plan's write template only showed types and schemas — had to add the store export back to avoid breaking existing code.

## Next Phase Readiness
- All Phase 7 data types are defined and exported — Plan 02 (compute-analytics extension) can proceed
- DashboardAnalytics now has 4 new required fields; compute-analytics.ts has the expected type error that Plan 02 will resolve
- metricSnapshotSchema is importable from `@/entities/metrics` for history/page.tsx use in Plan 07

---
*Phase: 07-weakness-action-empty*
*Completed: 2026-03-24*
