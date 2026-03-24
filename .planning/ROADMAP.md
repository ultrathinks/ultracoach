# Roadmap: v1.1 Dashboard

**Milestone:** v1.1 Dashboard
**Goal:** 대시보드 강화로 "한 번 쓰고 끝나는 도구"에서 "계속 돌아오는 서비스"로 전환
**Phase range:** 6–7 (v1.0 = phases 1–5)

---

## Phase 6 — Infrastructure, Score Trend, and Type Comparison

**Goal:** 데이터 파이프라인을 안전하게 구축하고, 가장 가시성 높은 차트 두 개를 먼저 제공한다.

**Requirements covered:** INFR-02, INFR-03, GROW-01, GROW-02, GROW-03, COMP-01

### What to build

1. ~~**Type layer** (`src/entities/analytics/types.ts`): `ScoreTrend`, `TypeComparison`, `DashboardAnalytics` 인터페이스 정의~~ ✓ Plan 01 complete (50e5af6)
2. ~~**Compute layer** (`src/features/analytics/compute-analytics.ts`): `zod` `safeParse` 기반 순수 함수. `as` 캐스트 없음~~ ✓ Plan 02 complete (f4abfc1)
3. ~~**Data fetch** (`src/app/history/page.tsx`): `Promise.all([sessionsQuery, feedbackQuery])` + `computeAnalytics()` 호출~~ ✓ Plan 03 complete
4. ~~**Score trend chart** (`src/widgets/history/score-trend-chart.tsx`): Recharts `LineChart`, `dynamic({ ssr: false })` 래핑~~ ✓ Plan 03 complete
5. ~~**Type comparison chart** (`src/widgets/history/type-comparison-chart.tsx`): Recharts `BarChart`, 인성/기술/컬처핏 그룹 비교~~ ✓ Plan 04 complete (266efa0)
6. **Stat cards**: 총 세션 수, 변화율, 연습 빈도 — 기존 카드 교체

### Success criteria

- 사용자가 `/history`에서 전체 세션 점수 추이를 선 그래프로 확인할 수 있다
- 사용자가 첫 세션 대비 현재 변화율(%, +/- 표시)을 카드에서 읽을 수 있다
- 사용자가 총 세션 수와 최근 7일 연습 횟수를 카드에서 확인할 수 있다
- 사용자가 면접 유형별 평균 점수를 막대 그래프로 비교할 수 있다
- 세션이 0개인 계정에서 차트 영역이 빈 공간이나 에러가 아닌 한국어 안내 메시지를 보여준다

---

## Phase 7 — Weakness Analysis, Action Tracking, and Empty States

**Goal:** 코칭 가치의 핵심인 약점 분석 패널을 추가하고, 액션아이템 추적과 AI 추천으로 재방문 동기를 만든다. 빈 상태를 완전히 처리한다.

**Requirements covered:** WEAK-01, WEAK-02, WEAK-03, ACTN-01, ACTN-02, INFR-01

### What to build

1. ~~**Type layer** (`src/entities/analytics/types.ts`, `src/entities/metrics/schema.ts`): Phase 7 타입 정의 + zod 스키마 추출~~ ✓ Plan 01 complete (6dccdd6)
2. ~~**Compute layer** (`src/features/analytics/compute-analytics.ts`): buildStarRadar, buildFillerHeatmap, buildActionTracker, buildAiRecommendation, computeBodyLanguage 순수 함수~~ ✓ Plan 02 complete (b08e19a)
3. ~~**STAR radar chart** (`src/widgets/history/star-radar-chart.tsx`): Recharts `RadarChart`, 전체 세션 STAR 충족률 시각화~~ ✓ Plan 03 complete (ced0927)
2. ~~**Body language panel** (`src/widgets/history/body-language-panel.tsx`): 시선/자세/표정/제스처 4개 진행바 + 추세 화살표~~ ✓ Plan 04 complete (be1e3c0)
3. ~~**Filler word heatmap** (`src/widgets/history/filler-heatmap.tsx`): 인라인 SVG `<rect>` 그리드, 분당 추임새 빈도~~ ✓ Plan 05 complete (3642494)
4. ~~**Action item tracker** (`src/widgets/history/action-tracker.tsx`): 최근 세션 액션아이템 목록 + 이전 대비 델타 표시~~ ✓ Plan 06 complete (02570a3)
5. ~~**AI recommendation card** (`src/widgets/history/ai-recommendation-card.tsx`): `feedback.summaryJson.nextSessionSuggestion` 데이터 표면화~~ ✓ Plan 06 complete (02582e3)
6. ~~**Empty state 완결** (`INFR-01`): 세션 0개 → 전체 안내, 1개 → 차트별 최소 데이터 안내, 2개 → 부분 렌더링~~ ✓ Plan 07 complete (7673221)
7. ~~**Compose** (`src/widgets/history/history-dashboard.tsx`): 모든 패널 조합, `SessionList` 아래 배치~~ ✓ Plan 07 complete (7673221)

### Success criteria

- 사용자가 STAR 4개 항목(Situation/Task/Action/Result)의 충족률을 레이더 차트로 한눈에 볼 수 있다
- 사용자가 추임새 빈도를 분당 횟수로 확인하고 세션별 증감을 히트맵 색상으로 파악할 수 있다
- 사용자가 바디랭귀지 4개 카테고리 점수를 진행바와 추세 화살표로 확인할 수 있다
- 사용자가 최근 세션의 액션아이템과 AI 다음 세션 추천을 대시보드에서 바로 읽을 수 있다
- 세션 수가 0–2개인 사용자에게 모든 차트 영역이 적절한 한국어 안내 메시지를 표시하며 빈 공간이나 JS 에러가 발생하지 않는다

---

## Coverage Verification

| Requirement | Phase | Category |
|-------------|-------|----------|
| INFR-02 | 6 | Infrastructure |
| INFR-03 | 6 | Infrastructure |
| GROW-01 | 6 | Score trend chart |
| GROW-02 | 6 | Change rate stat card |
| GROW-03 | 6 | Session count stat card |
| COMP-01 | 6 | Type comparison chart |
| WEAK-01 | 7 | STAR radar |
| WEAK-02 | 7 | Filler word heatmap |
| WEAK-03 | 7 | Body language panel |
| ACTN-01 | 7 | Action item tracker |
| ACTN-02 | 7 | AI recommendation card |
| INFR-01 | 7 | Empty states |

**Total:** 12/12 requirements mapped. 0 unmapped.

---

## Key Constraints

- `/history` 페이지 확장. 새 라우트 없음
- `recharts@2.15.4` + `react-is@^19.0.0`만 신규 의존성 추가
- 모든 차트: `"use client"` + `dynamic({ ssr: false })`
- 데이터 가공: `zod safeParse` 사용, `as` 캐스트 금지
- 색상: CSS 변수만 사용 (`var(--color-indigo)` 등), 하드코딩 hex 금지
- 쿼리: 최대 2개 병렬 쿼리 (`sessions` + `feedback`). `snapshotsJson` 집계뷰에서 제외

---

*Created: 2026-03-24*
