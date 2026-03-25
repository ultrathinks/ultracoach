---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-03-25T00:27:39.561Z"
progress:
  total_phases: 5
  completed_phases: 3
  total_plans: 19
  completed_plans: 18
---

## Current Position

Phase: 10 (drill-mode-ui-engine) — EXECUTING
Plan: 1 of 4

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-24)

**Core value:** 사용자가 반복 연습을 통해 면접 실력이 향상되고 있다는 것을 데이터로 확인할 수 있다
**Current focus:** Phase 10 — drill-mode-ui-engine

## Phase Summary

| Phase | Goal | Status |
|-------|------|--------|
| 6 | 인프라 + 점수 추이 + 유형 비교 | Not started |
| 7 | 약점 분석 + 액션 추적 + 빈 상태 완결 | Completed (7/7) |
| 8 | 모범답안 생성 + 약점 식별 | Completed (3/3) |
| 9 | results expansion + drill API | Completed (3/3) |

## Next Action

Phase 09 진행 중:

- [x] Plan 01: weak answers section + drill CTA in ReportView — sessionId prop threading, WeakAnswerItem component, suggestedAnswer fold/unfold 완료 (c9f15d3)
- [x] Plan 02: `src/app/api/sessions/[id]/drill/route.ts` — POST /api/sessions/[id]/drill, auth + ownership check + gpt-5.4-mini LLM analysis, ephemeral 완료 (a648119)
- [x] Plan 03: `src/app/drill/[sessionId]/page.tsx` — Server Component, auth + ownership check, ?q= param, placeholder UI with back link 완료 (06a7c5e)

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
- Phase 09 Plan 02 완료: POST /api/sessions/[id]/drill — auth+ownership check, questionId+transcript zod validation, retrieves original QA from feedback summaryJson, calls gpt-5.4-mini, returns ephemeral { contentScore, feedback, starFulfillment }
- drill API는 DB write 없음 (ephemeral). suggestedAnswer 있으면 LLM prompt에 포함
- drillResponseSchema는 route 파일 내 inline 정의 (entities coupling 최소화)
- Phase 09 Plan 03 완료: /drill/[sessionId] Server Component — force-dynamic, auth redirect, ownership notFound, ?q= searchParam, job title context, back link to results
- Biome organizeImports: @/ alias imports must come after third-party imports (drizzle-orm, next/*)
