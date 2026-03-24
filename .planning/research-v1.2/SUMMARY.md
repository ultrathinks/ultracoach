# Research Summary: v1.2 Coaching Loop

## Stack Additions

**없음.** 기존 스택(Next.js 15, OpenAI SDK, Whisper, Zustand, Zod, Motion)으로 전부 구현 가능.

## Key Architectural Decisions

| 결정 | 선택 | 근거 |
|------|------|------|
| suggestedAnswer 생성 | 별도 배치 LLM 콜 (gpt-5.4-mini) | 기존 feedback 프롬프트와 동일 콜에 넣으면 사용자 답변의 paraphrase가 됨 (Pitfall #1) |
| 드릴 피드백 저장 | Ephemeral (DB 미저장) | 새 테이블 불필요, 기존 feedback 테이블 UNIQUE 제약 충돌 방지 |
| 드릴 VAD/Whisper | `createVad` 직접 import | useInterviewEngine 수정 없이 독립 훅 (god hook 방지) |
| 드릴 라우트 | `/drill/[sessionId]` 별도 페이지 | AudioContext 충돌 방지 (결과 페이지와 분리) |
| DB 마이그레이션 | 없음 | suggestedAnswer는 기존 jsonb 컬럼에 자동 포함, `.optional()` 처리 |

## Feature Table Stakes

### 모범 답안
- 질문별 개선 답안 (사용자 경험 기반, STAR 구조 적용)
- "왜 더 나은지" 설명 포함
- 기존 세션은 빈 상태 표시 (backfill 안 함)

### 재연습 드릴
- 단일 질문 집중 연습 (카메라 + 질문 텍스트)
- 음성 답변 → Whisper 전사 → LLM 피드백
- 아바타/MediaPipe 없음, 텍스트 피드백만
- 최소 답변 길이 게이트 (15단어 미만 → 재시도 안내)

## Watch Out For

1. **프롬프트 격리**: suggestedAnswer 프롬프트에 사용자 답변 넣지 말 것 → paraphrase 방지
2. **비용**: suggestedAnswer는 gpt-5.4-mini로 전체 질문 배치 1회 호출
3. **AudioContext**: 드릴 페이지 unmount 시 반드시 `vad.stop()` → context.close()
4. **구 세션 호환**: `suggestedAnswer: z.string().optional()` — 기존 세션에서 undefined 안전 처리
5. **드릴 종료 조건**: 최대 5회 or 80점+ 달성 시 완료 상태 표시

## Build Order (5 Waves)

1. **스키마 + 프롬프트** — questionAnalysisSchema 확장, suggestedAnswer 배치 생성
2. **드릴 API** — `POST /api/sessions/[id]/drill` (ephemeral 피드백)
3. **리포트 뷰 확장** — suggestedAnswer 표시 + "재연습하기" CTA
4. **드릴 엔진** — useDrillEngine (VAD + Whisper + 드릴 API)
5. **드릴 화면** — drill-screen + 페이지 라우트

Waves 1-3은 독립 배포 가능 (rollback boundary).

---
*Synthesized: 2026-03-24*
