---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: milestone
status: unknown
last_updated: "2026-03-24T15:05:02.922Z"
progress:
  total_phases: 3
  completed_phases: 2
  total_plans: 12
  completed_plans: 12
---

## Current Position

Phase: 07 (weakness-action-empty) — COMPLETE
Plan: 7 of 7 — COMPLETE

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-24)

**Core value:** 사용자가 반복 연습을 통해 면접 실력이 향상되고 있다는 것을 데이터로 확인할 수 있다
**Current focus:** Phase 07 — weakness-action-empty

## Phase Summary

| Phase | Goal | Status |
|-------|------|--------|
| 6 | 인프라 + 점수 추이 + 유형 비교 | Not started |
| 7 | 약점 분석 + 액션 추적 + 빈 상태 완결 | In progress (6/7) |

## Next Action

Phase 7 진행 중:

- [x] Plan 01: `src/entities/analytics/types.ts` + `index.ts` + `src/entities/metrics/schema.ts` — Phase 7 타입 정의 + zod 스키마 추출 완료 (6dccdd6)
- [x] Plan 02: `src/features/analytics/compute-analytics.ts` — buildStarRadar, buildFillerHeatmap, buildActionTracker, buildAiRecommendation, computeBodyLanguage 완료 (b08e19a)
- [x] Plan 03: `src/widgets/history/star-radar-chart.tsx` — RadarChart inner component (ced0927)
- [x] Plan 04: `src/widgets/history/body-language-panel.tsx` — BodyLanguagePanelInner, progress bars + trend arrows 완료 (be1e3c0)
- [x] Plan 05: `src/widgets/history/filler-heatmap.tsx` — SVG heatmap 완료 (3642494)
- [x] Plan 06: `src/widgets/history/action-tracker.tsx` + `ai-recommendation-card.tsx` — ActionTrackerInner + AiRecommendationCardInner 완료 (02570a3, 02582e3)
- [x] Plan 07: history page integration — metricSnapshots query, bodyLanguage prop, dashboard layout (9c5b21f, 2181b91, 7673221)

## Accumulated Context

- feedback 테이블의 jsonb 데이터가 매우 풍부 (STAR 분석, 추임새, 성장비교, 핵심순간)
- metricSnapshots에 시선/자세/표정/제스처 시계열 데이터 보유 (집계뷰에서는 제외, Phase 7 on-demand)
- 현재 히스토리 페이지: 총 세션, 평균 점수, 미니 차트, 세션 목록
- 새 데이터 수집 없이 기존 데이터만으로 대시보드 구현 가능
- recharts@2.15.4 (v2) 결정 — v3은 redux 번들로 인해 제외
- 모든 차트: dynamic({ ssr: false }) 필수 (SSR hydration mismatch 방지)
- computeAnalytics: completed 세션만 (non-null scores) 추이/비교 계산에 투입
- 변화율: 퍼센트 아닌 절대 점수 차이 (latest - first) — 0-100 스케일에 더 직관적
- parseFeedback() 헬퍼 export로 sessionFeedbackSchema Phase 7 확장 포인트 명시
- Phase 7 Plan 01 완료: StarRadarData, FillerHeatmapData, BodyLanguageData, ActionTrackerData, AiRecommendationData 타입 정의됨
- DashboardAnalytics에 starRadar, fillerHeatmap, actionTracker, aiRecommendation 필드 추가됨 (BodyLanguageData는 별도 prop — Option A)
- metricSnapshotSchema는 entities/metrics/schema.ts에서 export — history/page.tsx에서 @/entities/metrics로 import 가능
- Phase 7 Plan 02 완료: computeAnalytics가 전체 DashboardAnalytics 반환 (타입에러 없음)
- computeBodyLanguage는 standalone export — page.tsx가 snapshotRows를 desc 순으로 직접 전달
- allAscending: 모든 세션(완료/미완료) ascending sort — filler/action 분석용
- Jaccard 0.5 threshold로 액션 아이템 fuzzy 중복 감지 (computeWordOverlap)
- Phase 7 Plan 06 완료: ActionTrackerInner (신규/반복 태그, 2 empty states) + AiRecommendationCardInner (80자 truncation, 접기/펼치기, 키보드 접근성) 완료
- AI card: 80자 초과 시 스마트 word-boundary 잘라내기 + chevron 180deg rotate 200ms ease
- tag null = 세션 1개 (비교 불가), "new" = indigo pill, "repeat" = pink pill
