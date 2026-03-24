# Phase 9: 결과 화면 확장 + 드릴 API - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

결과 화면(`/results/[id]`)에 아쉬운 답변 섹션과 모범 답안을 표시하고, 드릴 피드백 API를 신설한다. Phase 8에서 구현한 `suggestedAnswer` 데이터와 `identifyWeakAnswers()` 함수를 UI에 표면화. 드릴 모드 UI(Phase 10)는 범위 밖.

</domain>

<decisions>
## Implementation Decisions

### 아쉬운 답변 섹션 배치
- 별도 섹션으로 분리: Action Items 아래, 질문별 분석 위에 배치
- 리치 밀도: 질문 텍스트 + contentScore + STAR 배지 + 사용자 답변 요약 + AI 피드백 + 모범 답안(접기/펼치기) + 재연습 버튼
- 아쉬운 답변 0개(모든 질문 70점+)일 때 섹션 자체를 렌더링하지 않음
- 시각적 강조: 주황/엠버 보더 또는 아이콘으로 경고 톤. "개선해야 할 답변" 느낌

### 모범 답안 패널 인터랙션
- 초기 상태: 접힌 상태. "모범 답안 보기" 클릭 시 펼침
- 접기/펼치기 애니메이션: Phase 7 ai-recommendation-card 패턴 재사용 (chevron 180deg rotate 200ms ease + 높이 애니메이션)
- 텍스트 스타일: 인용문 스타일 — 왼쪽 초록/인디고 보더 + 약간 어두운 배경
- v1.2 이전 세션(suggestedAnswer 없음): 아쉬운 답변 섹션 전체를 숨김. 별도 안내 메시지 없음

### 재연습하기 CTA
- 그라디언트 버튼 (기존 indigo→purple→pink). 각 아쉬운 답변 항목마다 개별 버튼
- 링크: `/drill/[sessionId]?q=[questionId]`
- Phase 9에서 드릴 페이지 스켈레톤(빈 껍데기 + "준비 중" 안내)을 같이 생성하여 라우팅 동작 보장
- v1.2 이전 세션: 섹션 전체 숨김으로 자동 처리

### sessionId 전달
- ResultsClient에서 ReportView로 sessionId prop 추가
- ReportView가 드릴 링크 URL 구성에 사용

### 드릴 피드백 API
- 엔드포인트: `POST /api/sessions/[id]/drill`
- 인증: auth() + 세션 소유권 체크 (기존 feedback/route.ts 패턴)
- 요청 body: `{ questionId: number, transcript: string }`
- API가 세션 DB에서 questionText, jobTitle, interviewType, suggestedAnswer 조회
- LLM 프롬프트에 suggestedAnswer를 참조로 포함 — 모범 답안 대비 개선점을 더 정확히 지적
- 응답: `{ contentScore: number, feedback: string, starFulfillment: { situation, task, action, result } }`
- ephemeral: DB 미저장. 매 요청마다 LLM 호출
- 모델: gpt-5.4-mini (비용 최적화)
- 최소 답변 길이 게이트: API에서는 없음. Phase 10 UI에서 클라이언트 측 처리

### Claude's Discretion
- 아쉬운 답변 섹션의 정확한 색상 톤 (주황 vs 엠버)
- 드릴 API 시스템 프롬프트 문구
- 드릴 API zod 스키마 구조
- 드릴 페이지 스켈레톤의 정확한 안내 문구
- 사용자 답변 요약의 truncation 길이

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS-v1.2.md` — REWRT-03, REWRT-04, REWRT-05, DRILL-02 요구사항 정의
- `.planning/ROADMAP-v1.2.md` — Phase 9 빌드 목록, 성공 기준, 핵심 제약사항

### Phase 8 Context (선행 의존)
- `.planning/phases/08-suggested-answer-weak-identification/08-CONTEXT.md` — suggestedAnswer 생성 방식, identifyWeakAnswers() 함수 설계, contentScore < 70 기준, 구 세션 호환성 결정

### Data Schema
- `src/entities/feedback/schema.ts` — questionAnalysisSchema (suggestedAnswer: z.string().optional()), sessionFeedbackSchema
- `src/entities/feedback/types.ts` — QuestionAnalysis, SessionFeedback 타입

### Results Page (수정 대상)
- `src/app/results/[id]/results-client.tsx` — ResultsClient 컴포넌트. sessionId prop 추가 대상
- `src/widgets/report/report-view.tsx` — ReportView 컴포넌트. 아쉬운 답변 섹션 추가 대상

### Existing Patterns
- `src/widgets/history/ai-recommendation-card.tsx` — chevron 접기/펼치기 패턴 (180deg rotate 200ms ease). 모범 답안 패널에서 재사용
- `src/app/api/sessions/[id]/feedback/route.ts` — auth() + 소유권 체크 패턴. 드릴 API에서 재사용
- `src/shared/lib/openai.ts` — parseJsonResponse(), getOpenAI() 유틸

### Phase 6 Context
- `.planning/phases/06-infra-score-trend-type-comparison/06-CONTEXT.md` — zod safeParse 패턴, as 캐스트 금지 결정

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `identifyWeakAnswers()` (Phase 8에서 구현): contentScore < 70 기준 아쉬운 답변 필터링 순수 함수
- `parseJsonResponse()` (`src/shared/lib/openai.ts`): schema + safeParse 기반 LLM 응답 파싱. 드릴 API에서 재사용
- `auth()` + ownership check (`feedback/route.ts:37-54`): 세션 소유권 검증 패턴. 드릴 API에서 동일 패턴
- ai-recommendation-card chevron 패턴: 접기/펼치기 UI. 모범 답안 패널에서 동일 패턴
- `ScoreRing` (`src/widgets/report/score-ring.tsx`): 점수 표시 컴포넌트 (재사용 가능)
- `cn()` (`src/shared/lib/cn.ts`): Tailwind 클래스 병합 유틸
- `motion` (motion/react): 기존 report-view에서 사용 중인 애니메이션 라이브러리

### Established Patterns
- report-view.tsx: motion.div로 각 섹션 staggered 애니메이션 (delay 0.1씩 증가)
- `rounded-xl bg-card border border-white/[0.06]` 카드 스타일 통일
- `sessionFeedbackSchema.safeParse()` 로 피드백 데이터 검증 후 렌더링
- FSD: widgets는 features/entities를 import, app은 widgets를 렌더링

### Integration Points
- `results-client.tsx`: session.id를 ReportView에 전달 (prop 추가)
- `report-view.tsx`: 아쉬운 답변 섹션 추가 (Action Items 아래)
- `src/app/api/sessions/[id]/drill/route.ts`: 새 API route 생성
- `src/app/drill/[sessionId]/page.tsx`: 드릴 페이지 스켈레톤 (Phase 10 대비)

</code_context>

<specifics>
## Specific Ideas

- 아쉬운 답변 섹션은 "지금 고치면 되는 것" 느낌. 무거운 경고가 아닌 코칭 톤
- 모범 답안은 인용문 스타일로 "AI가 작성한 참고 답변"임을 시각적으로 구분
- 리치 밀도: 사용자가 한 카드 안에서 "내가 뭘 말했고 → 뭐가 부족하고 → 이렇게 하면 됨 → 연습하러 가기" 플로우를 한 번에 볼 수 있어야 함
- 드릴 API에 suggestedAnswer를 참조로 넣어서 "모범 답안과 비교했을 때 어디가 부족한지" LLM이 지적할 수 있게

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-results-expansion-drill-api*
*Context gathered: 2026-03-25*
