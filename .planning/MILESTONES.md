# Milestones

## v1.2 Drill Mode (Shipped: 2026-03-25)

**Phases:** 8-10
**Timeline:** 2026-03-25

**Key accomplishments:**

- 모범 답안 생성 (GPT-5.4) + 아쉬운 답변 자동 식별 (contentScore < 70)
- WeakAnswerItem 컴포넌트 — STAR 뱃지, 모범 답안 fold/unfold, 재연습 CTA
- POST /api/sessions/[id]/drill — ephemeral LLM 분석 (DB write 없음)
- /drill/[sessionId] 페이지 — 약점 질문 재연습 진입점

**Outcome:**

리포트에서 약점 → 재연습까지 이어지는 코칭 루프 완성. "분석만 하는 도구"에서 "연습까지 유도하는 코치"로 진화.

---

## v1.1 Dashboard (Shipped: 2026-03-25)

**Phases:** 6-7 (12 plans, 21 commits)
**Timeline:** 2026-03-20 ~ 2026-03-25 (5 days)
**Code:** 1,276 LOC TypeScript added, 19 files changed

**Key accomplishments:**

- 점수 추이 LineChart + 유형별 비교 BarChart + stat card 3종으로 성장 추적 대시보드 완성
- STAR 충족률 RadarChart + 추임새 히트맵 + 바디랭귀지 패널로 약점 분석 구현
- 액션아이템 트래커 (신규/반복 자동 태그) + AI 다음 세션 추천 카드
- zod safeParse 기반 순수 compute 레이어 (495 LOC, as 캐스트 0건)
- 빈 상태 완결 — 세션 0~2개 사용자에게 모든 위젯 한국어 안내 표시

**Outcome:**

"기능 데모"에서 "프로덕트"로 전환 완료. /history 페이지가 성장 추적 + 약점 분석 + 액션 플랜을 제공하는 코칭 대시보드로 진화.

---

## v1.0 AI Interview Coach MVP (Shipped: 2026-03-24)

**Phases:** 1-5 (167 commits)

**What shipped:**

- Google OAuth 인증
- 면접 셋업 (직무, 유형, 모드, 이력서 업로드, 기업조사)
- AI 면접 엔진 (질문생성 -> TTS -> VAD -> Whisper 루프)
- 실시간 AI 코칭 (4중 필터)
- Simli 아바타
- 바디랭귀지 감지
- 세션 리포트 (종합평가, 핵심순간, 액션아이템, 질문별 STAR 분석)
- 기본 히스토리 페이지
- Docker + CI/CD

**Outcome:**

MVP 완성. 면접 -> 피드백 루프 작동. 기록 페이지가 기본 수준이라 "프로덕트"보다 "기능 데모" 느낌.
