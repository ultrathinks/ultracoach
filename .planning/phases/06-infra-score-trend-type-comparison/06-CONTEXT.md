# Phase 6: Infrastructure, Score Trend, and Type Comparison - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

데이터 파이프라인(타입 + compute layer)을 구축하고, `/history` 페이지에 점수 추이 선 그래프와 유형별 비교 막대 그래프를 추가한다. 기존 stat cards를 새 데이터(총 세션, 변화율, 연습 빈도)로 교체한다. 약점 분석/액션 추적/빈 상태 완결은 Phase 7 범위.

</domain>

<decisions>
## Implementation Decisions

### 차트 시각 스타일
- LineChart(점수 추이): 미니멀 라인 스타일 — 선만 표시 + 툴팁. 도트/gradient fill 없음
- 전달력은 indigo(`var(--color-indigo)`), 답변력은 pink(`var(--color-pink)`) — 기존 MiniChart 색상 유지
- BarChart(유형별 비교): 그룹 막대 — 인성/기술/컬처핏 그룹별로 전달력/답변력 2개 막대가 나란히
- BarChart도 동일 색상 배분 (indigo + pink)

### 대시보드 레이아웃
- 세로 단일 컬럼 플로우: stat cards → LineChart → BarChart → 세션 목록
- 기존 MiniChart(SVG) 제거, Recharts LineChart로 대체
- 차트 2개는 나란히 배치하지 않고 위아래로 쌓기 (max-w-4xl 유지)

### Stat cards 재설계
- 기존 3개(총 세션/평균 전달력/평균 답변력) → 새 3개(총 세션/변화율/7일 연습 횟수)로 교체
- 큰 숫자 + 작은 라벨 스타일 유지 (현재 디자인과 일관성)
- 변화율은 초록(+)/빨간(-) 화살표로 방향 표시. 첫 세션 대비 전달력+답변력 평균 변화율

### 빈 상태 처리
- 세션 0개: 기존 빈 상태 유지 ("아직 면접 기록이 없습니다" + 면접 시작하기 버튼)
- 세션 1개: LineChart에 단일 도트 1개 표시 + "2개 이상 세션을 완료하면 추이를 확인할 수 있어요" 안내 메시지
- 유형 1개만 있을 때: BarChart에 해당 유형만 표시 (빈 그룹 렌더링 안 함)
- 변화율 카드: 세션 1개면 "-" 또는 "첫 세션" 표시

### Claude's Discretion
- 툴팁 정확한 포맷과 위치
- 차트 높이, 여백, 반응형 breakpoint
- X축 라벨 포맷 (날짜 표시 방식)
- 에러 상태 처리

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — GROW-01, GROW-02, GROW-03, COMP-01, INFR-02, INFR-03 요구사항 정의
- `.planning/ROADMAP.md` — Phase 6 빌드 목록, 성공 기준, 핵심 제약사항

### Data Schema
- `src/entities/feedback/schema.ts` — sessionFeedbackSchema (growthComparison, questionAnalyses, fillerWords 등 zod 스키마)
- `src/entities/feedback/types.ts` — SessionFeedback, StarFulfillment, QuestionAnalysis 타입
- `src/shared/db/schema.ts` — sessions, feedback, metricSnapshots 테이블 정의

### Design System
- `src/app/globals.css` — CSS 변수 (색상, 폰트, glassmorphism). 차트 색상은 여기 정의된 변수만 사용

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Card` (`src/shared/ui/card.tsx`): glass variant 지원. 차트 래퍼로 사용 가능
- `getScoreColor()` (`src/widgets/history/history-dashboard.tsx:34`): 점수 기반 색상 유틸. stat cards에서 재사용
- `typeLabel`, `modeLabel` (`history-dashboard.tsx:23-31`): 인성/기술/컬처핏 한국어 라벨. BarChart X축에 재사용
- `cn()` (`src/shared/lib/cn`): Tailwind 클래스 병합 유틸

### Established Patterns
- 다크 모드 only, bg-card + border-white/[0.1] 카드 스타일
- motion/react으로 fade-in 애니메이션 (history-dashboard.tsx)
- Server Component에서 DB 쿼리 → Client Component에 props 전달

### Integration Points
- `src/app/history/page.tsx`: 현재 sessions만 쿼리. feedback 테이블 join 추가 필요
- `src/widgets/history/history-dashboard.tsx`: 기존 stat cards + MiniChart 교체 대상
- 새 위젯: `score-trend-chart.tsx` (LineChart), `type-comparison-chart.tsx` (BarChart) — ROADMAP.md 경로 참조

</code_context>

<specifics>
## Specific Ideas

- 현재 MiniChart의 indigo/pink 색상 배분을 Recharts 차트에도 그대로 유지하여 시각적 일관성 확보
- 차트는 "있는 데이터만 보여주는" 미니멀 접근 — 불필요한 그리드라인/축 장식 최소화

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-infra-score-trend-type-comparison*
*Context gathered: 2026-03-24*
