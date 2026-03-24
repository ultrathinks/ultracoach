# Roadmap: v1.2 Coaching Loop

**Milestone:** v1.2 Coaching Loop
**Goal:** "채점표"에서 "진짜 코칭"으로 전환. 아쉬운 답변에 모범 답안 제공 + 재연습 드릴
**Phase range:** 8–10 (v1.0 = 1–5, v1.1 = 6–7)

---

## Phase 8 — 모범 답안 생성 + 아쉬운 답변 식별

**Goal:** 피드백 API를 확장하여 질문별 모범 답안을 생성하고, 아쉬운 답변을 식별한다. UI 변경 없이 백엔드만.

**Requirements covered:** REWRT-01, REWRT-02

### What to build

1. **스키마 확장** (`src/entities/feedback/schema.ts`): `questionAnalysisSchema`에 `suggestedAnswer: z.string().optional()` 추가
2. **모범 답안 배치 생성** (`src/app/api/sessions/[id]/feedback/route.ts`): 기존 피드백 생성 후, 별도 gpt-5.4-mini 배치 콜로 전체 질문의 suggestedAnswer를 한 번에 생성. 프롬프트 격리: 사용자 답변 미포함, questionText + jobTitle + interviewType만 전달
3. **아쉬운 답변 식별 로직**: contentScore 기준 하위 답변을 식별하는 순수 함수 (피드백 데이터 후처리)

### Success criteria

- 새 세션의 피드백 JSON에 질문별 `suggestedAnswer` 필드가 포함된다
- suggestedAnswer가 사용자 답변의 paraphrase가 아닌 독립적인 모범 답안이다
- 기존(v1.2 이전) 세션의 피드백을 safeParse해도 에러가 발생하지 않는다
- contentScore 하위 답변 리스트가 정확히 추출된다

---

## Phase 9 — 결과 화면 확장 + 드릴 API

**Goal:** 결과 화면에 아쉬운 답변 섹션과 모범 답안을 표시하고, 드릴 피드백 API를 준비한다.

**Requirements covered:** REWRT-03, REWRT-04, REWRT-05, DRILL-02

### What to build

1. ~~**결과 화면 "아쉬운 답변" 섹션** (`src/widgets/report/report-view.tsx`): contentScore 하위 질문들을 별도 섹션으로 표시, 각 항목에 suggestedAnswer 접을 수 있는 패널 포함~~ ✓ Plan 01 complete (c9f15d3)
2. ~~**sessionId 전달** (`src/app/results/[id]/results-client.tsx`): ReportView에 sessionId prop 추가하여 드릴 링크 구성 가능~~ ✓ Plan 01 complete (c9f15d3)
3. ~~**"재연습하기" CTA**: 아쉬운 답변 항목에 `/drill/[sessionId]?q=[questionId]` 링크 버튼~~ ✓ Plan 01 complete (c9f15d3)
4. ~~**구 세션 처리**: suggestedAnswer가 없는 세션에서 아쉬운 답변 섹션 전체 숨김 (CONTEXT 결정: 안내 메시지 없음)~~ ✓ Plan 01 complete (c9f15d3)
5. ~~**드릴 피드백 API** (`src/app/api/sessions/[id]/drill/route.ts`): POST, auth + 소유권 체크, 단일 질문 LLM 분석, ephemeral 응답 (DB 미저장). gpt-5.4-mini 사용~~ ✓ Plan 02 complete (a648119)
6. ~~**드릴 페이지 스켈레톤** (`src/app/drill/[sessionId]/page.tsx`): Server Component, auth + 소유권 체크, ?q= searchParam, job title 표시, "재연습하기" CTA의 유효한 라우트 타겟~~ ✓ Plan 03 complete (06a7c5e)

### Success criteria

- 사용자가 결과 화면에서 아쉬운 답변 목록을 확인할 수 있다
- 각 아쉬운 답변에 모범 답안을 접었다 펼 수 있다
- "재연습하기" 버튼이 드릴 페이지로 올바르게 라우팅된다
- v1.2 이전 세션에서 에러 없이 안내 메시지가 표시된다
- 드릴 API가 단일 질문 답변에 대해 contentScore + feedback + starFulfillment를 반환한다

---

## Phase 10 — 드릴 모드 UI + 엔진

**Goal:** 재연습 드릴의 전체 UX를 완성한다. 카메라 + VAD + Whisper + LLM 피드백 + 종료 조건.

**Requirements covered:** DRILL-01, DRILL-03, DRILL-04

### What to build

1. **드릴 엔진 훅** (`src/features/drill/use-drill-engine.ts`): `createVad` 직접 import, MediaRecorder + Whisper 패턴 재사용. `{ startDrill, stopDrill, phase, transcript, result, audioLevel }` 노출
2. **드릴 화면** (`src/widgets/drill/drill-screen.tsx`): 질문 텍스트 + suggestedAnswer 참고 패널 + 카메라 피드(자기 얼굴) + 오디오 레벨 바 + 드릴 결과 인라인 표시
3. **드릴 페이지** (`src/app/drill/[sessionId]/page.tsx`): Server Component, auth + 소유권 체크, feedback 데이터 로드, DrillScreen 렌더
4. **드릴 준비 화면**: 카메라/마이크 권한 확인 + "연습 시작" 버튼 (getUserMedia 에러 시 안내)
5. **종료 조건**: 최대 5회 시도 or 80점+ 달성 → "목표 달성" 완료 상태 + 다음 질문 CTA
6. **최소 답변 길이 게이트**: 15단어 미만 → "답변이 너무 짧습니다" 안내 (LLM 호출 안 함)

### Success criteria

- 사용자가 드릴 화면에서 질문 텍스트와 모범 답안을 확인할 수 있다
- 사용자가 카메라를 켜고 음성으로 답변하면 Whisper가 전사한다
- 전사된 답변에 대해 LLM 피드백이 3초 이내에 표시 시작된다
- 80점 이상 달성 시 "목표 달성" 화면이 표시된다
- 5회 시도 후 자동 종료되며 최고 점수가 표시된다
- 카메라/마이크 권한 거부 시 명확한 안내가 표시된다

---

## Coverage Verification

| Requirement | Phase | Category |
|-------------|-------|----------|
| REWRT-01 | 8 | 모범 답안 생성 (스키마 + API) |
| REWRT-02 | 8 | 아쉬운 답변 식별 |
| REWRT-03 | 9 | 결과 화면 아쉬운 답변 섹션 |
| REWRT-04 | 9 | 재연습 드릴 라우팅 |
| REWRT-05 | 9 | 구 세션 빈 상태 |
| DRILL-02 | 9 | 드릴 피드백 API |
| DRILL-01 | 10 | 카메라 + VAD + Whisper 드릴 |
| DRILL-03 | 10 | 드릴 종료 조건 |
| DRILL-04 | 10 | 드릴 준비 화면 |

**Total:** 9/9 requirements mapped. 0 unmapped.

---

## Key Constraints

- 새 npm 의존성 없음 (기존 스택 100% 재사용)
- DB 마이그레이션 없음 (suggestedAnswer는 기존 jsonb에 포함)
- 드릴 피드백은 ephemeral (DB 미저장)
- suggestedAnswer 프롬프트는 사용자 답변 미포함 (paraphrase 방지)
- suggestedAnswer 배치 생성은 gpt-5.4-mini (비용 최적화)
- 드릴 라우트는 별도 페이지 (AudioContext 충돌 방지)
- Phase 8-9는 독립 배포 가능 (rollback boundary)

---

*Created: 2026-03-24*
