# UltraCoach

## What This Is

AI 면접 코칭 플랫폼. 실시간 음성 면접을 진행하면서 AI가 발화 패턴, 바디랭귀지, 답변 구조를 분석하고 피드백을 제공한다. 대시보드에서 성장 추적, 약점 분석, 액션 플랜을 확인할 수 있다. 취업 준비생과 이직 준비자가 대상.

## Core Value

사용자가 반복 연습을 통해 면접 실력이 향상되고 있다는 것을 데이터로 확인할 수 있다.

## Requirements

### Validated

- Google OAuth 인증 + 세션 기반 인가 — v1.0
- 면접 셋업 (직무, 유형, 모드, 이력서 업로드, 기업조사) — v1.0
- AI 면접 엔진 (질문생성 -> TTS -> VAD -> Whisper 전사 루프) — v1.0
- 실시간 AI 코칭 (4중 필터) — v1.0
- Simli 아바타 연동 — v1.0
- 바디랭귀지 감지 (시선, 자세, 표정, 제스처) — v1.0
- 세션 결과 리포트 — v1.0
- 기본 히스토리 페이지 — v1.0
- Docker + GitHub Actions CI/CD — v1.0
- 점수 추이 차트 + 변화율 + 세션 수 stat cards — v1.1
- 유형별(인성/기술/컬처핏) 비교 차트 — v1.1
- STAR 충족률 레이더 차트 — v1.1
- 추임새 빈도 히트맵 — v1.1
- 바디랭귀지 카테고리별 점수 패널 — v1.1
- 액션아이템 트래커 + AI 다음 세션 추천 — v1.1
- 빈 상태 처리 (세션 0~2개) — v1.1
- zod safeParse 기반 데이터 파싱 (as 캐스트 금지) — v1.1
- 차트 SSR 방지 (dynamic import) — v1.1

### Active

- [ ] 모범 답안 생성 + 아쉬운 답변 식별 (v1.2)
- [ ] 드릴 모드 UI + 엔진 (v1.2)

### Out of Scope

- 실시간 채팅 — 핵심 가치와 무관
- 영상 면접 녹화 재생 — 스토리지 비용
- 모바일 앱 — 웹 우선
- 소셜 비교/순위 — 취업 준비 맥락에서 부적절한 동기 부여
- 스트릭 카운터 — 매일 해야 한다는 압박은 역효과

## Context

- Next.js 15 + Turbopack, Drizzle ORM, PostgreSQL
- FSD 아키텍처 (app -> widgets -> features -> entities -> shared)
- 다크 모드 only, Pretendard 폰트, glassmorphism 디자인
- GPT-5.4로 피드백 생성, Whisper로 전사, TTS로 질문 읽기
- recharts@2.15.4 for dashboard charts (v1.1)
- Shipped v1.1: 1,276 LOC added, 12 widget/compute modules

## Constraints

- **Tech stack**: Next.js + Drizzle + PostgreSQL 유지
- **Design**: 다크 모드 only, 기존 디자인 시스템 (gradient, glassmorphism) 준수
- **Data**: 새 데이터 수집 없이 기존 DB 데이터만 활용
- **Purpose**: 시연/투자 심사에서 "프로덕트"로 인식되도록

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 기존 데이터만 활용 | 새 수집 없이 빠른 구현, 이미 풍부한 jsonb 데이터 보유 | Good |
| 히스토리 페이지 확장 (별도 대시보드 아님) | 네비게이션 변경 불필요, 기존 페이지 강화 | Good |
| recharts v2 (v3 제외) | v3은 redux 번들 포함, 불필요한 복잡도 | Good |
| 변화율 절대 점수 차이 (% 아님) | 0-100 스케일에서 절대 차이가 더 직관적 | Good |
| BodyLanguageData 별도 prop (DashboardAnalytics 외부) | 별도 데이터 소스 (metricSnapshots), 독립적 prop 경로 | Good |
| zod safeParse + as 캐스트 금지 | 런타임 안전성, 타입 정확성 보장 | Good |
| v1.2 재연습 아바타 미사용 | 드릴 모드는 자기 카메라만. Simli 호출 없이 가벼운 UX | Pending |
| v1.2 실시간 내용 코칭 제외 | v1.2는 사후 코칭에 집중 | Pending |

---
*Last updated: 2026-03-25 after v1.1 milestone*
