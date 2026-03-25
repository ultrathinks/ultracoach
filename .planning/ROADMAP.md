# Roadmap: UltraCoach v1.3

**Milestone:** v1.3 Dashboard
**Phases:** 11-14
**Requirements:** 16 total (LAYOUT-01~04, DASH-01~04, LEARN-01~03, PROF-01~02, BILL-01~02)

---

## Phase 11: Dashboard Layout + Data Layer Refactor

**Goal:** /dashboard 라우트에 사이드바 레이아웃을 구축하고, 기존 /history의 데이터 페칭 로직을 서브페이지에서 재사용 가능하도록 분리한다.

**Requirements:** LAYOUT-01, LAYOUT-02, LAYOUT-03, LAYOUT-04

**Refactoring:**
- `/app/history/page.tsx`의 데이터 페칭 로직 (sessions, feedback, snapshots 쿼리)을 재사용 가능한 함수로 추출
- `nav-bar.tsx` 링크 "기록" → "대시보드" 변경, href `/history` → `/dashboard`
- NextAuth 로그인 콜백에서 리다이렉트 경로를 `/dashboard`로 변경

**New implementation:**
- `/app/dashboard/layout.tsx` — 사이드바 포함 공통 레이아웃 (Server Component)
- 사이드바 컴포넌트 (Overview, 면접 기록, 약점 분석, 액션 플랜, 학습하기, 프로필, Billing 링크 + 하단 면접 시작 CTA)
- `/app/dashboard/page.tsx` — placeholder (Phase 12에서 Overview로 채움)

**Success criteria:**
1. /dashboard 접속 시 사이드바가 표시되고 모든 섹션 링크가 보인다
2. 헤더 네비게이션에서 "대시보드"로 표시되고 /dashboard로 이동한다
3. Google OAuth 로그인 완료 후 /dashboard로 자동 리다이렉트된다
4. 사이드바 하단 "면접 시작하기" 버튼이 /interview로 이동한다
5. 데이터 페칭 함수가 분리되어 서브페이지에서 독립적으로 호출 가능하다

---

## Phase 12: Dashboard Content Pages (Widget Redistribution)

**Goal:** history-dashboard.tsx를 분해하고, 기존 위젯을 4개 서브페이지로 재배치한다. 기존 /history 경로를 /dashboard로 대체한다.

**Requirements:** DASH-01, DASH-02, DASH-03, DASH-04

**Refactoring:**
- `widgets/history/history-dashboard.tsx` 분해 — 모놀리식 컴포넌트를 제거하고 각 위젯이 독립 페이지에서 사용되도록 전환
- 각 서브페이지가 Phase 11에서 추출한 데이터 함수를 직접 호출 (필요한 데이터만 fetch)
- 기존 `/app/history/page.tsx` 삭제 또는 `/dashboard`로 리다이렉트 처리

**New implementation:**
- `/app/dashboard/page.tsx` — Overview (stat cards + 점수 추이 LineChart + 최근 세션 2-3개 요약)
- `/app/dashboard/history/page.tsx` — 세션 목록 + 유형별 비교 BarChart
- `/app/dashboard/weakness/page.tsx` — STAR 레이더 + 바디랭귀지 패널 + 추임새 히트맵
- `/app/dashboard/actions/page.tsx` — 액션 트래커 + AI 추천 카드

**Success criteria:**
1. /dashboard (Overview)에서 통계 카드, 점수 추이, 최근 세션 요약이 한 화면에 보인다
2. /dashboard/history에서 전체 세션 목록과 유형별 비교 차트가 표시된다
3. /dashboard/weakness에서 STAR 레이더, 바디랭귀지, 추임새 히트맵이 표시된다
4. /dashboard/actions에서 액션 트래커와 AI 추천이 표시된다
5. 세션 0개일 때 모든 페이지에 빈 상태 안내 + 면접 시작 CTA가 표시된다

---

## Phase 13: Learn (MDX Content)

**Goal:** 면접 팁 MDX 콘텐츠 10개와 목록/상세 페이지를 구축해 사용자가 학습 자료를 읽을 수 있게 한다.

**Requirements:** LEARN-01, LEARN-02, LEARN-03

**New implementation:**
- MDX 설정 (next/mdx 또는 contentlayer)
- `/content/learn/` 디렉토리에 MDX 파일 10개
- `/app/dashboard/learn/page.tsx` — 글 목록 (카드 형태)
- `/app/dashboard/learn/[slug]/page.tsx` — MDX 상세 렌더링

**Success criteria:**
1. /dashboard/learn에서 면접 팁 글 10개가 카드 형태로 표시된다
2. 카드 클릭 시 /dashboard/learn/[slug]에서 본문이 렌더링된다
3. MDX 서식 (제목, 단락, 강조, 리스트)이 정상 표시된다
4. 존재하지 않는 slug 접근 시 404가 표시된다

---

## Phase 14: Profile + Billing

**Goal:** 프로필 관리 페이지와 Billing 껍데기 UI를 추가해 SaaS 필수 요소를 완성한다.

**Requirements:** PROF-01, PROF-02, BILL-01, BILL-02

**New implementation:**
- `/app/dashboard/profile/page.tsx` — 내 정보 표시 (NextAuth session + users 테이블)
- `/app/api/profile/route.ts` — 프로필 수정 API (PATCH)
- `/app/dashboard/billing/page.tsx` — Free/Pro 플랜 카드 UI

**Success criteria:**
1. /dashboard/profile에서 이름, 이메일, 프로필 사진이 표시된다
2. 이름 수정 후 저장하면 변경이 반영된다
3. /dashboard/billing에서 Free/Pro 플랜 카드가 나란히 표시된다
4. 현재 플랜(Free)에 "현재 플랜" 배지가 표시된다
5. Pro "업그레이드" 버튼 클릭 시 "준비 중" 안내가 표시된다

---

## Coverage

| Requirement | Phase |
|-------------|-------|
| LAYOUT-01   | 11    | 2/3 | In Progress|  |
| LAYOUT-03   | 11    |
| LAYOUT-04   | 11    |
| DASH-01     | 12    |
| DASH-02     | 12    |
| DASH-03     | 12    |
| DASH-04     | 12    |
| LEARN-01    | 13    |
| LEARN-02    | 13    |
| LEARN-03    | 13    |
| PROF-01     | 14    |
| PROF-02     | 14    |
| BILL-01     | 14    |
| BILL-02     | 14    |

**Total:** 16 requirements, 16 mapped, 0 unmapped. Coverage: 100%

---
*Roadmap created: 2026-03-25*
*Updated: 2026-03-25 — refactoring plan added to Phase 11-12*
