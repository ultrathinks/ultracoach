# Phase 8: 모범 답안 생성 + 아쉬운 답변 식별 - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

피드백 API를 확장하여 질문별 모범 답안(`suggestedAnswer`)을 생성하고, contentScore 기준으로 아쉬운 답변을 식별하는 순수 함수를 제공한다. UI 변경 없이 백엔드만. 결과 화면 표시(Phase 9)와 드릴 모드(Phase 10)는 범위 밖.

</domain>

<decisions>
## Implementation Decisions

### 모범 답안 프롬프트 전략
- 사용자 답변 제외 — paraphrase 방지. questionText + jobTitle + interviewType + companyName + jobResearchJson + resumeFileId(있으면) 전달
- 이력서 활용: `resumeFileId`가 있으면 OpenAI `{ type: "file", file: { file_id } }` content part로 전달 (기존 `next-question/route.ts` 패턴 재사용)
- 기업조사: 세션 DB의 기존 `jobResearchJson` 사용. 추가 웹 검색 없음
- 톤: 실제 면접 말투 구어체, 1-2문장으로 짧게
- 모든 질문에 suggestedAnswer 생성 (UI에서 아쉬운 답변만 필터링하여 표시)

### 아쉬운 답변 식별 기준
- 절대값 기준: contentScore < 70인 질문이 아쉬운 답변
- 모두 70+ 이면 아쉬운 답변 없음 ("No weak answers")
- 독립 순수 함수로 분리 (`identifyWeakAnswers()`) — Phase 9 UI에서도 재사용

### 배치 콜 타이밍과 실패 처리
- 기존 피드백 LLM 콜(gpt-5.4)과 suggestedAnswer LLM 콜(gpt-5.4-mini)을 `Promise.all`로 병렬 실행
- suggestedAnswer 프롬프트는 사용자 답변을 안 받으므로 피드백 콜과 독립적 — 병렬 가능
- 실패 시: 기존 피드백은 정상 저장, suggestedAnswer만 빈 채(null/undefined) 저장. 전체 롤백 안 함
- Phase 9 UI에서 suggestedAnswer 없으면 "모범 답안 미제공" 안내 표시

### 구 세션 호환성
- `questionAnalysisSchema`에 `suggestedAnswer: z.string().optional()` 추가
- v1.2 이전 세션 safeParse 시 자동으로 undefined — 에러 없음
- DB 마이그레이션 불필요 (jsonb 컬럼이므로 zod 스키마 변경만)

### Claude's Discretion
- suggestedAnswer 배치 콜의 정확한 시스템 프롬프트 문구
- gpt-5.4-mini 모델 파라미터 (temperature 등)
- identifyWeakAnswers() 함수의 정확한 위치 (entities/feedback vs features/feedback)
- try-catch 세부 구현

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS-v1.2.md` — REWRT-01, REWRT-02 요구사항 정의
- `.planning/ROADMAP-v1.2.md` — Phase 8 빌드 목록, 성공 기준, 핵심 제약사항

### Data Schema
- `src/entities/feedback/schema.ts` — questionAnalysisSchema, sessionFeedbackSchema (suggestedAnswer 추가 대상)
- `src/entities/feedback/types.ts` — QuestionAnalysis, SessionFeedback 타입 (suggestedAnswer 추가 시 자동 반영)
- `src/shared/db/schema.ts` — feedback 테이블 (jsonb 컬럼, 마이그레이션 불필요)

### Feedback API
- `src/app/api/sessions/[id]/feedback/route.ts` — 기존 피드백 생성 로직. suggestedAnswer 배치 콜 추가 대상

### Resume & Research Pattern
- `src/app/api/next-question/route.ts:235-240` — resumeFileId를 OpenAI file content part로 전달하는 기존 패턴. suggestedAnswer 콜에서 동일 패턴 재사용

### Prior Phase Context
- `.planning/phases/06-infra-score-trend-type-comparison/06-CONTEXT.md` — zod safeParse 패턴, as 캐스트 금지 결정

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `parseJsonResponse()` (`src/shared/lib/openai.ts`): schema + safeParse 기반 LLM 응답 파싱 유틸. suggestedAnswer 배치 콜에서 재사용
- `getOpenAI()` (`src/shared/lib/openai.ts`): OpenAI 클라이언트 싱글턴
- `sessionFeedbackSchema` (`src/entities/feedback/schema.ts`): 기존 피드백 zod 스키마. questionAnalysisSchema 확장 대상
- `auth()` + ownership check 패턴 (`feedback/route.ts:37-54`): 기존 인증/소유권 검증 로직

### Established Patterns
- jsonb 컬럼에 zod 스키마 기반 데이터 저장 (feedback 테이블)
- `z.string().optional()` 로 하위 호환성 유지 (INFR-02 결정)
- OpenAI file content part로 이력서 전달 (`next-question/route.ts:235-237`)
- `response_format: { type: "json_object" }` 로 구조화 응답

### Integration Points
- `src/app/api/sessions/[id]/feedback/route.ts`: suggestedAnswer 배치 콜 추가 + Promise.all 병렬화
- `src/entities/feedback/schema.ts`: questionAnalysisSchema에 suggestedAnswer 필드 추가
- `src/entities/feedback/index.ts`: identifyWeakAnswers 또는 관련 유틸 export 추가

</code_context>

<specifics>
## Specific Ideas

- 모범 답안은 "면접에서 이렇게 말하면 됩니다" 느낌의 짧은 구어체 — 교과서가 아닌 실전 답변
- 이력서가 있는 세션에서는 구직자 경력/프로젝트를 반영한 맞춤형 모범 답안 생성
- gpt-5.4-mini로 비용 최적화 (피드백 자체는 gpt-5.4 유지)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-suggested-answer-weak-identification*
*Context gathered: 2026-03-24*
