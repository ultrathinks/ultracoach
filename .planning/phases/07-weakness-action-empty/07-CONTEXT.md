# Phase 7: Weakness Analysis, Action Tracking, and Empty States - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

`/history` 페이지에 약점 분석 패널(STAR 레이더, 바디랭귀지, 추임새 히트맵) + 액션아이템 트래커 + AI 추천 카드를 추가하고, 모든 패널의 빈 상태를 완결한다. 새 라우트 없음. 기존 데이터만 활용.

</domain>

<decisions>
## Implementation Decisions

### 패널 레이아웃 & 구성
- 세로 단일 컬럼 흐름 유지 (Phase 6과 일관성)
- 순서: stat cards → 기존 차트(점수 추이, 유형 비교) → 약점 분석 섹션 → 액션 플랜 섹션 → 세션 목록
- 섹션 제목으로 영역 구분: 제목 텍스트 + 서브텍스트 설명 (예: "약점 분석" + "STAR 충족률, 추임새, 바디랭귀지를 분석합니다")
- 관련 패널 2열 나란히 배치: STAR 레이더 | 바디랭귀지, 액션아이템 | AI 추천 (데스크톱 2열, 모바일 세로 스택)
- 추임새 히트맵은 full-width로 단독 배치

### STAR 레이더 차트
- 전체 세션 평균 집계: 모든 세션의 모든 질문에서 S/T/A/R 각각의 충족률(%) 계산
- Recharts `RadarChart` 사용, `dynamic({ ssr: false })` 래핑
- 4축: Situation, Task, Action, Result

### 바디랭귀지 패널
- 시선/자세/표정/제스처 4개 카테고리
- 진행바(progress bar) + 추세 화살표(이전 세션 대비 증감)
- metricSnapshots 데이터 활용 (on-demand 집계)

### 추임새 히트맵
- 세션 × 단어 격자형 히트맵: Y축 세션(날짜), X축 상위 추임새 단어
- 인라인 SVG `<rect>` 그리드로 구현 (Recharts 불필요)
- 색상 스케일: 보라-빨강 (indigo → pink/red). 기존 gradient 디자인 시스템과 일관성
- 분당 빈도 기준으로 색상 농도 결정

### 액션아이템 트래커
- 최근 세션의 액션아이템 목록만 표시
- 이전 대비 델타: 신규/반복 태그로 표시. 이전 세션에도 유사한 액션아이템이 있으면 "반복" 태그, 새로운 것이면 "신규" 태그
- `feedback.summaryJson.actionItems` 데이터 사용

### AI 추천 카드
- `feedback.summaryJson.nextSessionSuggestion` 데이터 표면화
- 한 줄 요약 + 클릭하면 상세 펼치기 (접기/펼치기 UI)
- 최근 세션의 추천만 표시

### 빈 상태 전략
- 세션 0개: 각 패널 자리에 개별 안내 메시지 표시 (패널이 무엇인지 소개하는 효과)
- 세션 1개: 데이터가 있으면 표시. STAR 레이더 1개 세션 데이터로 충족률 표시, 히트맵 1행, 액션아이템 목록(델타 없이). "추이 변화는 2개 이상 세션에서 확인할 수 있어요" 미니 안내
- 톤: 격려 + 안내. "첫 세션을 완료하면 STAR 충족률을 확인할 수 있어요" 스타일
- JS 에러 없이 모든 패널이 안전하게 렌더링되어야 함

### Claude's Discretion
- 레이더 차트 디자인 디테일 (그리드 스타일, 툴팁)
- 바디랭귀지 진행바 구체적 스타일
- 히트맵 셀 크기, 간격, 반응형 동작
- 접기/펼치기 애니메이션 방식
- 섹션 제목 타이포그래피 세부사항

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` -- WEAK-01, WEAK-02, WEAK-03, ACTN-01, ACTN-02, INFR-01 요구사항 정의
- `.planning/ROADMAP.md` -- Phase 7 빌드 목록, 성공 기준, 핵심 제약사항

### Data Schema
- `src/entities/feedback/schema.ts` -- sessionFeedbackSchema (starFulfillment, fillerWords, actionItems, nextSessionSuggestion)
- `src/entities/feedback/types.ts` -- SessionFeedback, StarFulfillment, QuestionAnalysis, ActionItem 타입
- `src/shared/db/schema.ts` -- sessions, feedback, metricSnapshots 테이블 정의

### Phase 6 Context (Prior Decisions)
- `.planning/phases/06-infra-score-trend-type-comparison/06-CONTEXT.md` -- 차트 스타일, 레이아웃, 색상, 빈 상태 패턴 결정

### Design System
- `src/app/globals.css` -- CSS 변수 (색상, 폰트, glassmorphism). 차트 색상은 여기 정의된 변수만 사용

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `computeAnalytics()` (`src/features/analytics/compute-analytics.ts`): `_feedbackRows` 파라미터가 Phase 7 확장 포인트로 준비됨. `parseFeedback()` 헬퍼 export
- `sessionFeedbackSchema` (`src/entities/feedback/schema.ts`): starFulfillment, fillerWords, actionItems, nextSessionSuggestion 파싱 가능
- `DashboardAnalytics` 타입 (`src/entities/analytics/types.ts`): Phase 7 데이터 타입 확장 필요
- `HistoryDashboard` (`src/widgets/history/history-dashboard.tsx`): 현재 stat cards + 차트 + 세션 목록 컴포지션. 새 패널 통합 대상
- `getScoreColor()`, `typeLabel`, `modeLabel` (`history-dashboard.tsx`): 재사용 가능 유틸
- `Card` (`src/shared/ui/card.tsx`): glass variant 카드 래퍼
- `cn()` (`src/shared/lib/cn`): Tailwind 클래스 병합

### Established Patterns
- 다크 모드 only, bg-card + border-white/[0.1] 카드 스타일
- Recharts 차트: `dynamic({ ssr: false })` 래핑, CSS 변수 색상
- motion/react fade-in 애니메이션
- Server Component에서 DB 쿼리 → Client Component에 props 전달
- `Promise.all([sessionsQuery, feedbackQuery])` 병렬 쿼리 패턴

### Integration Points
- `src/app/history/page.tsx`: 이미 sessions + feedback 쿼리 존재. metricSnapshots 쿼리 추가 필요 (바디랭귀지)
- `src/features/analytics/compute-analytics.ts`: STAR/filler/action 집계 함수 추가 대상
- `src/entities/analytics/types.ts`: 새 타입(StarRadar, FillerHeatmap, BodyLanguage, ActionTracker) 추가 대상
- `src/widgets/history/history-dashboard.tsx`: 새 패널 import + 섹션 구성 추가 대상

</code_context>

<specifics>
## Specific Ideas

- 히트맵 색상이 세션 진행에 따라 옅어지면 추임새 습관 개선을 시각적으로 확인 가능
- 액션아이템 "반복" 태그로 개선되지 않은 부분을 강조하여 재연습 동기 부여
- 섹션 제목 + 서브텍스트로 대시보드가 길어져도 시각적 계층 유지

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 07-weakness-action-empty*
*Context gathered: 2026-03-24*
