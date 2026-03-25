# Phase 11: Dashboard Layout + Data Layer Refactor - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

/dashboard 라우트에 사이드바 레이아웃을 구축하고, 기존 /history의 데이터 페칭 로직을 서브페이지에서 재사용 가능하도록 분리한다. nav-bar 링크와 로그인 콜백 리다이렉트를 /dashboard로 변경한다. 기존 /history는 /dashboard로 리다이렉트 처리한다.

</domain>

<decisions>
## Implementation Decisions

### 사이드바 배경 스타일
- Glassmorphism — 기존 `.glass` 클래스 재사용 (반투명 + blur)
- 오른쪽 border: `1px solid rgba(255,255,255,0.08)` (glass-border 토큰)

### 사이드바 활성 상태
- 활성 항목 왼쪽에 indigo 세로 바 2px 표시
- 활성 항목 텍스트는 foreground, 비활성은 secondary/muted

### 사이드바 아이콘
- Lucide React 아이콘 라이브러리 사용
- tree-shake 지원으로 번들 크기 최소화

### 사이드바 섹션 그룹핑
- 두 그룹으로 분리, 구분선으로 나눔
- 상단 그룹 (코칭): Overview, 면접 기록, 약점 분석, 액션 플랜, 학습하기
- 하단 그룹 (계정): 프로필, Billing
- 최하단: "면접 시작하기" CTA 버튼 → /interview 이동

### 모바일 반응형
- md (768px) 브레이크포인트 기준
- 768px 미만: 사이드바 숨김, 상단에 햄버거 버튼 표시
- 햄버거 클릭 시 왼쪽에서 오버레이로 슬라이드인, 배경 dim 처리
- 배경 클릭 시 닫힘

### 헤더-사이드바 공존
- NavBar 그대로 유지 (로고 + "면접"/"대시보드" 링크 + 프로필 드롭다운)
- "기록" → "대시보드"로 텍스트/href 변경
- /dashboard에서도 NavBar 링크 중복 유지 — 의도적 (사이트 전체 통일 헤더)
- 프로필 드롭다운 내 "면접 기록" → "대시보드"로 변경, href /history → /dashboard

### 데이터 레이어 분리
- 쿼리 함수를 `entities/session/queries.ts`로 추출 (FSD entities 레이어)
- 개별 함수로 분리: `getUserSessions()`, `getUserFeedback()`, `getUserSnapshots()`
- 각 서브페이지에서 필요한 쿼리만 독립 호출 가능
- compute 함수는 기존 `features/analytics`에 유지

### /history 경로 처리
- Phase 11에서 /history → /dashboard 리다이렉트 처리
- history/page.tsx를 redirect 코드로 교체

### 로그인 리다이렉트
- NextAuth 로그인 콜백에서 리다이렉트 경로를 /dashboard로 변경

### Claude's Discretion
- 사이드바 너비 (w-60~w-72 범위에서 적절히)
- 오버레이 애니메이션 구현 방식
- 햄버거 아이콘 배치 (NavBar 내 또는 콘텐츠 상단)
- Lucide 아이콘 구체적 선택 (각 메뉴 항목별)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Layout requirements
- `.planning/REQUIREMENTS.md` — LAYOUT-01~04 요구사항 정의
- `.planning/ROADMAP.md` §Phase 11 — 구현 범위, 성공 기준, 리팩토링 목록

### Design system
- `src/app/globals.css` — 컬러 토큰, glass 클래스, gradient-text 정의

### Existing data layer (추출 대상)
- `src/app/history/page.tsx` — 현재 3개 병렬 DB 쿼리 + compute 함수 호출 구조
- `src/features/analytics/index.ts` — computeAnalytics, computeBodyLanguage 함수

### Navigation (변경 대상)
- `src/widgets/nav/nav-bar.tsx` — links 배열, ProfileDropdown 컴포넌트

### Auth (변경 대상)
- `src/shared/lib/auth.config.ts` — pages.signIn 설정
- `src/shared/lib/auth.ts` — NextAuth 설정

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `.glass` CSS 클래스: 사이드바 배경에 직접 적용 가능
- `Button` 컴포넌트 (`shared/ui/button.tsx`): CTA 버튼에 사용
- `cn()` 유틸리티: 조건부 클래스 병합
- `motion/react` (framer-motion): 오버레이 애니메이션에 사용 가능 (history-dashboard에서 이미 사용 중)

### Established Patterns
- Server Component 페이지 + Client Component 위젯 분리 (history/page.tsx → HistoryDashboard)
- dynamic import로 recharts SSR 방지
- `Promise.all` 병렬 DB 쿼리 패턴
- `usePathname()` 기반 네비게이션 활성 상태 감지 (nav-bar.tsx에서 사용 중)

### Integration Points
- `/app/dashboard/layout.tsx` — 새로 생성, 사이드바 포함
- `/app/dashboard/page.tsx` — placeholder (Phase 12에서 채움)
- `nav-bar.tsx` links 배열 — "기록" → "대시보드" 변경
- `auth.config.ts` 또는 `auth.ts` — 로그인 콜백 리다이렉트 경로 변경
- `entities/session/queries.ts` — 새로 생성, DB 쿼리 함수 추출

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-dashboard-layout-data-layer-refactor*
*Context gathered: 2026-03-25*
