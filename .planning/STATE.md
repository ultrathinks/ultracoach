---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: Dashboard
status: defining_requirements
last_updated: "2026-03-25"
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-03-25 — Milestone v1.3 started

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-25)

**Core value:** 사용자가 반복 연습을 통해 면접 실력이 향상되고 있다는 것을 데이터로 확인할 수 있다
**Current focus:** v1.3 Dashboard — SaaS 구조 전환

## Phase Summary

(No phases yet — defining requirements)

## Accumulated Context

- /history 페이지의 모든 위젯이 이미 구현됨 (차트, 레이더, 히트맵, 패널, 트래커, 추천카드)
- 기존 위젯 재배치 + 신규 페이지 추가가 핵심 (위젯 자체는 재작성 불필요)
- Next.js App Router layout.tsx로 사이드바 구현 → 각 서브페이지는 별도 page.tsx
- MDX 콘텐츠는 next/mdx 또는 contentlayer로 처리
- 프로필: NextAuth session 데이터 + users 테이블 활용
- Billing: 실제 결제 없이 UI만 (플랜 카드, 현재 플랜 표시)
