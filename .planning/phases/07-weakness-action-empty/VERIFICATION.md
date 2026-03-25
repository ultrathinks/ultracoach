---
phase: "07"
status: passed
verified_at: "2026-03-25"
must_haves_verified: 6/6
---

# Phase 07 Verification: Weakness Analysis, Action Tracking, and Empty States

## Summary

All 6 must-have requirements verified against the codebase. Build passes with zero errors. No gaps found.

---

## WEAK-01: STAR Radar Chart

**Status: PASS**

File: `src/widgets/history/star-radar-chart.tsx`

- `RadarChart`, `PolarGrid`, `PolarAngleAxis`, `PolarRadiusAxis`, `Radar` imported from recharts
- `dataKey="subject"` on `PolarAngleAxis` — axes are S/T/A/R via `StarRadarPoint.subject`
- `domain={[0, 100]}` explicit on `PolarRadiusAxis`
- `PolarRadiusAxis angle={90}` — Situation axis at top
- Empty state (data.length === 0): renders card with "첫 세션을 완료하면 STAR 충족률을 확인할 수 있어요"
- Named export `StarRadarChartInner`, no `as` assertions
- Loaded via `dynamic({ ssr: false })` in `history-dashboard.tsx`

---

## WEAK-02: Filler Word Heatmap

**Status: PASS**

File: `src/widgets/history/filler-heatmap.tsx`

- Pure inline SVG `<rect>` grid — no chart library dependency
- `CELL_SIZE = 28`, `CELL_GAP = 3`, `CELL_RADIUS = 4` matching UI-SPEC
- `cellColor()` function: lerp from indigo (129,140,248) to pink (244,114,182) based on `freqPerMin / maxFreq`
- Zero-frequency cells: `rgba(129,140,248,0.05)`
- `cellMap: Map<'sessionIdx-wordIdx', freqPerMin>` for O(1) lookup
- Hover tooltip via `useState<TooltipState>` showing `{word} - {freq}/분 ({sessionLabel})`
- `overflow-x-auto` wrapper for mobile scroll
- Empty state (0 sessions or 0 words): "세션이 쌓이면 추임새 패턴을 한눈에 볼 수 있어요"
- Named export `FillerHeatmapInner`, no `as` assertions

---

## WEAK-03: Body Language Panel

**Status: PASS**

File: `src/widgets/history/body-language-panel.tsx`

- 4 progress bars for 시선/자세/표정/제스처 (rendered from `data.categories` array)
- `TrendIndicator` sub-component: `▲` (green, up), `▼` (red, down), `—` (muted, flat), null (none)
- Progress bar: `h-2 rounded-full bg-border` track, `bg-indigo transition-all duration-500` fill, `width: category.score%`
- Mini-hint when all trends are "none" (1 session): "추이 변화는 2개 이상 세션에서 확인할 수 있어요"
- Empty state (`!data.hasData`): "카메라를 켜고 면접하면 바디랭귀지를 분석할 수 있어요"
- Named export `BodyLanguagePanelInner`, no `as` assertions
- Uses pure Tailwind CSS — no Recharts

---

## ACTN-01: Action Item Tracker

**Status: PASS**

File: `src/widgets/history/action-tracker.tsx`

- Renders `data.items` list from `ActionTrackerData`
- `TagBadge` sub-component: "신규" (indigo pill, `bg-indigo/15 text-indigo`), "반복" (pink pill, `bg-pink/15 text-pink`)
- Tag guard: `{item.tag !== null && <TagBadge tag={item.tag} />}` — badges hidden when tag is null (single session)
- Empty state 1 (no sessions, `sessionDate === ""`): "면접 후 개선할 점을 정리해 드려요"
- Empty state 2 (session exists, no items): "이 세션에서는 별도 액션 아이템이 없어요"
- Named export `ActionTrackerInner`, no `as` assertions

---

## ACTN-02: AI Recommendation Card

**Status: PASS**

File: `src/widgets/history/ai-recommendation-card.tsx`

- Displays `data.suggestion` sourced from `feedback.summaryJson.nextSessionSuggestion` (confirmed via `compute-analytics.ts` line 492: `suggestion: parsed.data.nextSessionSuggestion`)
- Click-to-expand with `useState(false)`, `role="button"`, `tabIndex={0}`, `onKeyDown` Enter/Space
- Chevron SVG rotates 180deg on expand via inline style + `transition-transform duration-200`
- 80-char truncation with smart word-boundary (`lastIndexOf(" ")`, 60% floor)
- Empty state 1 (no sessions, `suggestion === "" && sessionDate === ""`): "면접 후 다음 세션을 위한 맞춤 제안을 받아보세요"
- Empty state 2 (session exists, no suggestion): "이 세션에 대한 추천이 아직 없어요"
- Named export `AiRecommendationCardInner`, no `as` assertions

---

## INFR-01: Empty States

**Status: PASS**

File: `src/widgets/history/history-dashboard.tsx`

**0-session handling:** `if (sessions.length === 0)` early return at top of `HistoryDashboard` renders:
- "아직 면접 기록이 없습니다" copy
- "면접 시작하기" CTA button linking to `/interview`
- Entire dashboard including all new panels is skipped

**1-session handling (partial data):** Each panel handles its own minimum-data state:
- `StarRadarChartInner`: empty state if `data.length === 0`
- `FillerHeatmapInner`: empty state if `data.sessions.length === 0 || data.words.length === 0`
- `BodyLanguagePanelInner`: mini-hint when all category trends are "none" (only 1 session worth of snapshots)
- `ActionTrackerInner`: empty state 2 if `items.length === 0` but `sessionDate !== ""`
- `AiRecommendationCardInner`: empty state 2 if `suggestion === ""` but `sessionDate !== ""`

**2-session handling (partial rendering):** Charts and panels render with available data; `BodyLanguagePanelInner` shows trend arrows when 2+ snapshot rows present; `ActionTrackerInner` shows 신규/반복 delta tags when tag is non-null.

All panel empty state strings are Korean. No panel returns null at the component root — cards always render with a heading visible.

---

## Dashboard Integration

**Status: PASS**

File: `src/widgets/history/history-dashboard.tsx`

All 5 Phase 7 widgets are imported and rendered:

| Widget | Import | Rendered |
|--------|--------|---------|
| `StarRadarChartInner` | `dynamic({ ssr: false })` as `StarRadarChart` | Yes — `<StarRadarChart data={analytics.starRadar} />` |
| `BodyLanguagePanelInner` | direct import | Yes — `<BodyLanguagePanelInner data={bodyLanguage} />` |
| `FillerHeatmapInner` | direct import | Yes — `<FillerHeatmapInner data={analytics.fillerHeatmap} />` |
| `ActionTrackerInner` | direct import | Yes — `<ActionTrackerInner data={analytics.actionTracker} />` |
| `AiRecommendationCardInner` | direct import | Yes — `<AiRecommendationCardInner data={analytics.aiRecommendation} />` |

Layout order matches UI-SPEC: stat cards → score trend → type comparison → 약점 분석 (radar + body language grid, heatmap full-width) → 액션 플랜 (action tracker + AI card grid) → session list.

`HistoryDashboardProps` correctly extended with `bodyLanguage: BodyLanguageData`.

---

## Page Wiring

**Status: PASS**

File: `src/app/history/page.tsx`

- `Promise.all` expanded to 3 parallel queries: `userSessions`, `feedbackRows`, `snapshotRows`
- `snapshotRows` query: `metricSnapshots` joined on `sessions`, filtered by `userId`, ordered `desc(sessions.createdAt)`, limited to 2
- `computeBodyLanguage(snapshotRows)` called after `computeAnalytics`
- `bodyLanguage` prop passed to `<HistoryDashboard />`

---

## Build Verification

**Status: PASS**

```
pnpm build
```

Output:
- `Compiled successfully in 8.0s`
- `Generating static pages using 7 workers (12/12)`
- 0 TypeScript errors
- 14 routes compiled (12 static/dynamic app routes + middleware proxy)
- No warnings related to Phase 7 files

---

## Phase Goal Assessment

**Goal:** 코칭 가치의 핵심인 약점 분석 패널을 추가하고, 액션아이템 추적과 AI 추천으로 재방문 동기를 만든다. 빈 상태를 완전히 처리한다.

All 5 roadmap success criteria met:

1. STAR 4개 항목 충족률을 레이더 차트로 확인 — WEAK-01 PASS
2. 추임새 빈도를 분당 횟수 + 히트맵 색상으로 파악 — WEAK-02 PASS
3. 바디랭귀지 4개 카테고리 진행바 + 추세 화살표 — WEAK-03 PASS
4. 최근 세션 액션아이템 + AI 다음 세션 추천 대시보드 노출 — ACTN-01, ACTN-02 PASS
5. 세션 0–2개 사용자에게 모든 차트 영역 적절한 한국어 안내, 빈 공간 없음, JS 에러 없음 — INFR-01 PASS
