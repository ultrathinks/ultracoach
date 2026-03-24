## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-03-24 — Milestone v1.2 Coaching Loop started

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-24)

**Core value:** 사용자가 반복 연습을 통해 면접 실력이 향상되고 있다는 것을 데이터로 확인할 수 있다
**Current focus:** v1.2 Coaching Loop milestone

## Accumulated Context

- feedback API에서 이미 questionAnalyses 배열 생성 중 (질문별 answer, starFulfillment, feedback 포함)
- suggestedAnswer 필드를 추가하면 모범 답안 생성 가능
- 기존 VAD + Whisper 인프라 재활용 가능 (interview-screen에서 사용 중)
- 재연습 드릴은 Simli 아바타 없이 카메라 + 질문 텍스트 방식
- 재연습 피드백은 LLM API 호출 (diff가 아닌 독립 분석)
- v1.1 Dashboard는 별도 세션에서 병렬 진행 중 (STATE.md는 v1.1용)
