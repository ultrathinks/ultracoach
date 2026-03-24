---
plan: "06-04"
title: "Type Comparison Chart Widget"
status: completed
commit: 266efa0
date: "2026-03-24"
---

## What Was Built

Created `src/widgets/history/type-comparison-chart.tsx` — a Recharts grouped `BarChart` component that compares average delivery and content scores across interview types (인성/기술/컬처핏).

## Tasks Completed

### Task 4.1 — Create the type comparison bar chart widget

**File created:** `src/widgets/history/type-comparison-chart.tsx`

Key implementation details:
- `"use client"` directive at line 1
- Named export `TypeComparisonChartInner` for dynamic import compatibility
- Accepts `TypeComparisonGroup[]` from `@/entities/analytics`
- Grouped bar layout: `barGap={4}`, `barCategoryGap="30%"` — two bars per type group
- `전달력` bar: `var(--color-indigo)`, `답변력` bar: `var(--color-pink)`
- `radius={[4, 4, 0, 0]}` rounded top corners, `maxBarSize={40}` prevents overstretching
- Returns `null` when `data.length === 0` (no error, no broken chart)
- No hardcoded hex colors (all CSS variables)
- No `as` type assertions
- Manual HTML legend below chart matching design system conventions

## Acceptance Criteria Results

| Criterion | Result |
|-----------|--------|
| `"use client"` at line 1 | pass |
| `TypeComparisonChartInner` at least 2 matches | pass (2) |
| `BarChart` at least 1 match | pass (3) |
| `var(--color-indigo)` at least 1 match | pass (1) |
| `var(--color-pink)` at least 1 match | pass (1) |
| `유형별 비교` exactly 1 match | pass (1) |
| `as` type assertions = 0 | pass (0) |
| No hardcoded hex colors | pass (0) |
| Build succeeds | pass |

## Decisions Made

- Followed the plan specification exactly — no deviations needed
- Korean data keys (`전달력`, `답변력`) provide automatic Tooltip labeling without custom formatter

## Consuming Pattern (for Plan 06-05)

```typescript
const TypeComparisonChart = dynamic(
  () => import("@/widgets/history/type-comparison-chart").then((m) => ({ default: m.TypeComparisonChartInner })),
  { ssr: false },
);
```
