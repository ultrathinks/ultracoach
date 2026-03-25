## Current Position

Phase: Phase 8 (not started)
Plan: ROADMAP-v1.2.md
Status: Roadmap defined, ready to implement
Last activity: 2026-03-24 — ROADMAP-v1.2.md created

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-24)

**Core value:** 사용자가 반복 연습을 통해 면접 실력이 향상되고 있다는 것을 데이터로 확인할 수 있다
**Current focus:** v1.2 Coaching Loop milestone — Phase 8

## Phase Summary

| Phase | Goal | Status |
|-------|------|--------|
| 8 | 모범 답안 생성 + 아쉬운 답변 식별 (백엔드) | Not started |
| 9 | 결과 화면 확장 + 드릴 API | Not started |
| 10 | 드릴 모드 UI + 엔진 | Not started |

## Next Action

Phase 8 시작:
1. `src/entities/feedback/schema.ts` — suggestedAnswer: z.string().optional() 추가
2. `src/app/api/sessions/[id]/feedback/route.ts` — 별도 gpt-5.4-mini 배치 콜로 suggestedAnswer 생성
3. 아쉬운 답변 식별 순수 함수 구현

## Accumulated Context

- feedback API에서 이미 questionAnalyses 배열 생성 중 (질문별 answer, starFulfillment, feedback 포함)
- suggestedAnswer는 기존 feedback 프롬프트와 별도 LLM 콜 필수 (paraphrase 방지, Pitfall #1)
- suggestedAnswer 프롬프트에 사용자 답변 포함 금지 — questionText + jobTitle + interviewType만 전달
- gpt-5.4-mini로 전체 질문 배치 1회 호출 (비용 최적화)
- 기존 VAD + Whisper 인프라 재활용 가능 (createVad 직접 import)
- 드릴은 Simli 아바타 없이 카메라 + 질문 텍스트 방식
- 드릴 피드백은 ephemeral (DB 미저장)
- 드릴 라우트는 별도 페이지 (AudioContext 충돌 방지)
- v1.1 Dashboard는 별도 세션에서 병렬 진행 중 (STATE.md는 v1.1용)
- recharts 의존성은 v1.1에서 추가됨 (v1.2에서는 차트 불필요)
