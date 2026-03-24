# UltraCoach

## What This Is

AI 면접 코칭 플랫폼. 실시간 음성 면접을 진행하면서 AI가 발화 패턴, 바디랭귀지, 답변 구조를 분석하고 피드백을 제공한다. 취업 준비생과 이직 준비자가 대상.

## Core Value

사용자가 반복 연습을 통해 면접 실력이 향상되고 있다는 것을 데이터로 확인할 수 있다.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. v1.0 -->

- Google OAuth 인증 + 세션 기반 인가
- 면접 셋업 (직무, 유형, 모드, 이력서 업로드, 기업조사)
- AI 면접 엔진 (질문생성 → TTS → VAD → Whisper 전사 루프)
- 실시간 AI 코칭 (4중 필터: 발화중 금지, 최소간격, 쿨다운, 심각도 우선)
- Simli 아바타 연동
- 바디랭귀지 감지 (시선, 자세, 표정, 제스처)
- 세션 결과 리포트 (종합평가, 핵심순간, 액션아이템, 질문별 분석)
- 기본 히스토리 페이지 (세션 목록, 평균 점수, 미니 차트)
- Docker + GitHub Actions CI/CD

### Active

<!-- Current scope. Building toward these. -->

- [ ] 대시보드 강화 (v1.1 마일스톤)

### Out of Scope

- 실시간 채팅 — 핵심 가치와 무관
- 영상 면접 녹화 재생 — 스토리지 비용
- 모바일 앱 — 웹 우선

## Context

- Next.js 15 + Turbopack, Drizzle ORM, PostgreSQL
- FSD 아키텍처 (app → widgets → features → entities → shared)
- 다크 모드 only, Pretendard 폰트, glassmorphism 디자인
- GPT-5.4로 피드백 생성, Whisper로 전사, TTS로 질문 읽기
- feedback 테이블에 STAR 분석, 추임새, 성장 비교 등 풍부한 jsonb 데이터 보유

## Constraints

- **Tech stack**: Next.js + Drizzle + PostgreSQL 유지
- **Design**: 다크 모드 only, 기존 디자인 시스템 (gradient, glassmorphism) 준수
- **Data**: 새 데이터 수집 없이 기존 DB 데이터만 활용
- **Purpose**: 시연/투자 심사에서 "프로덕트"로 인식되도록

## Current Milestone: v1.1 Dashboard

**Goal:** 대시보드를 강화하여 "한 번 쓰고 끝나는 도구"가 아닌 "계속 돌아오는 서비스"로 보이게 만든다.

**Target features:**
- 성장 데이터 시각화 (점수 추이, 변화율, 스트릭)
- STAR 레이더 차트 (약점 패턴 분석)
- 추임새 히트맵 (습관 추적)
- 바디랭귀지 점수 (시선/자세/표정/제스처 집계)
- 면접유형별 비교 (인성/기술/컬처핏)
- 액션아이템 트래킹 (이전 피드백 개선 추적)
- AI 다음 세션 추천

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 기존 데이터만 활용 | 새 수집 없이 빠른 구현, 이미 풍부한 jsonb 데이터 보유 | — Pending |
| 히스토리 페이지 확장 | 별도 대시보드 페이지 vs 기존 히스토리 강화 → 결정 필요 | — Pending |

---
*Last updated: 2026-03-24 after v1.1 milestone start*
