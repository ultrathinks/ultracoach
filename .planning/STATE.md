## Current Position

Phase: Phase 6 (not started)
Plan: ROADMAP.md
Status: Roadmap defined, ready to implement
Last activity: 2026-03-24 — ROADMAP.md created for v1.1 Dashboard

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-24)

**Core value:** 사용자가 반복 연습을 통해 면접 실력이 향상되고 있다는 것을 데이터로 확인할 수 있다
**Current focus:** v1.1 Dashboard milestone — Phase 6

## Phase Summary

| Phase | Goal | Status |
|-------|------|--------|
| 6 | 인프라 + 점수 추이 + 유형 비교 | Not started |
| 7 | 약점 분석 + 액션 추적 + 빈 상태 완결 | Not started |

## Next Action

Phase 6 시작:
1. `src/entities/analytics/types.ts` — 타입 정의
2. `src/features/analytics/compute-analytics.ts` — 순수 함수 + zod 파싱
3. `src/app/history/page.tsx` 수정 — 데이터 fetch 추가
4. `src/widgets/history/analytics-overview.tsx` — 점수 추이 차트
5. `src/widgets/history/type-comparison.tsx` — 유형별 비교 차트

## Accumulated Context

- feedback 테이블의 jsonb 데이터가 매우 풍부 (STAR 분석, 추임새, 성장비교, 핵심순간)
- metricSnapshots에 시선/자세/표정/제스처 시계열 데이터 보유 (집계뷰에서는 제외, Phase 7 on-demand)
- 현재 히스토리 페이지: 총 세션, 평균 점수, 미니 차트, 세션 목록
- 새 데이터 수집 없이 기존 데이터만으로 대시보드 구현 가능
- recharts@2.15.4 (v2) 결정 — v3은 redux 번들로 인해 제외
- 모든 차트: dynamic({ ssr: false }) 필수 (SSR hydration mismatch 방지)
