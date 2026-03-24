---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: milestone
status: unknown
last_updated: "2026-03-24T13:00:00.000Z"
progress:
  total_phases: 1
  completed_phases: 0
  total_plans: 5
  completed_plans: 3
---

## Current Position

Phase: 06 (infra-score-trend-type-comparison) — EXECUTING
Plan: 4 of 5 (plans 01, 02, 03, 04 complete)

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-24)

**Core value:** 사용자가 반복 연습을 통해 면접 실력이 향상되고 있다는 것을 데이터로 확인할 수 있다
**Current focus:** Phase 06 — infra-score-trend-type-comparison

## Phase Summary

| Phase | Goal | Status |
|-------|------|--------|
| 6 | 인프라 + 점수 추이 + 유형 비교 | Not started |
| 7 | 약점 분석 + 액션 추적 + 빈 상태 완결 | Not started |

## Next Action

Phase 6 진행 중:

- [x] Plan 01: `src/entities/analytics/types.ts` + `index.ts` — 타입 정의 완료 (50e5af6)
- [x] Plan 02: `src/features/analytics/compute-analytics.ts` + `index.ts` — 순수 함수 + zod 파싱 완료 (f4abfc1, acea83f)
- [ ] Plan 03: `src/app/history/page.tsx` 수정 — 데이터 fetch 추가
- [x] Plan 04: `src/widgets/history/type-comparison-chart.tsx` — grouped bar chart widget 완료 (266efa0)
- [ ] Plan 05: `src/widgets/history/analytics-overview.tsx` — stat cards + 컴포지션

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
