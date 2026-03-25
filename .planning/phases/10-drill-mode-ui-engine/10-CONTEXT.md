# Phase 10: 드릴 모드 UI + 엔진 - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

재연습 드릴의 전체 UX를 완성한다. 카메라 + VAD + Whisper + LLM 피드백 + 종료 조건. Phase 9에서 만든 드릴 페이지 스켈레톤(`/drill/[sessionId]`)을 실제 동작하는 드릴 모드로 교체. DB 저장 없음 (ephemeral).

</domain>

<decisions>
## Implementation Decisions

### 준비 화면 UX
- 별도 컴포넌트 `DrillPrepScreen`으로 분리 (드릴 엔진 훅과 독립)
- 카메라 미리보기 포함 — getUserMedia 후 `<video>` 스트림 표시. 사용자가 자기 얼굴/구도 확인 후 시작
- 질문 전체 텍스트를 준비 화면에 표시 (카메라 미리보기 위 또는 아래)
- 모범 답안: 접힌 패널로 포함 — 준비 화면에서도 미리 참고 가능 (Phase 9 chevron 패턴 재사용)
- 권한 거부 시: 인라인 에러 메시지 + "다시 시도" 버튼. 페이지 이탈 없이 처리

### 드릴 중 레이아웃
- 기존 인터뷰 화면(`interview-screen.tsx`)과 동일한 카메라 피드 배치 — 새 레이아웃 발명 없이 일관성 유지
- 기존 인터뷰 화면과 동일한 오디오 레벨 바 — `audioLevel` 값으로 수평 바 표시, 리스닝 중에만 표시
- 모범 답안 패널: 항상 화면에 표시 (접기/펼치기 가능). 드릴 중 언제든 참고 가능
- 시도 횟수: 화면 상단에 "시도 2/5" 형태로 표시

### 피드백 표시 방식
- 로딩: 기존 면접 로직과 동일하게 처리 (스피너 + "분석 중" 텍스트)
- 점수: 대형 숫자 + 색상 코딩 (80+ green, 60+ yellow, 60미만 red) — ScoreRing 컴포넌트 재사용 가능
- STAR 충족률 포함 — starFulfillment {situation, task, action, result} 표시 (API가 이미 반환)
- CTA: "다시 시도" (primary 버튼) + "다음 질문으로" (secondary 버튼) 동시 표시

### 완료 상태
- 80점+ 목표 달성 시: "목표 달성!" 화면 + 최종 점수 + "다음 아쉬운 답변으로" CTA + "결과 화면으로" 버튼
- 5회 시도 후 미달성 시: 최고 점수 표시 + "결과 화면으로" 복귀 버튼 (격려 톤)
- "다음 질문으로" 네비게이션: `?q=` 파라미터 업데이트 — 같은 페이지에서 질문만 교체, 페이지 리로드 없이

### 최소 답변 길이 게이트
- 15단어 미만 → "답변이 너무 짧습니다" 안내. LLM 호출 안 함 (Phase 9 CONTEXT에서 결정)
- 클라이언트 측 처리 (API 게이트 아님)

### Claude's Discretion
- 완료 화면의 정확한 격려 메시지 문구
- DrillPrepScreen의 정확한 레이아웃 비율 (카메라 vs 질문 텍스트)
- 피드백 로딩 중 정확한 인디케이터 스타일
- 15단어 미만 게이트 UI 정확한 표현 방식

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS-v1.2.md` — DRILL-01, DRILL-03, DRILL-04 요구사항 정의
- `.planning/ROADMAP-v1.2.md` — Phase 10 빌드 목록, 성공 기준, 핵심 제약사항

### Prior Phase Context (선행 의존)
- `.planning/phases/09-results-expansion-drill-api/09-CONTEXT.md` — 드릴 API 스펙 (엔드포인트, 요청/응답 구조, suggestedAnswer 포함 방식), 최소 답변 길이 게이트 결정
- `.planning/phases/08-suggested-answer-weak-identification/08-CONTEXT.md` — suggestedAnswer 생성 방식, identifyWeakAnswers() 설계

### Drill Page (수정 대상)
- `src/app/drill/[sessionId]/page.tsx` — Phase 9에서 만든 스켈레톤. Phase 10에서 실제 DrillScreen 렌더링으로 교체

### Existing Patterns (재사용)
- `src/features/interview-engine/use-interview-engine.ts` — MediaRecorder + Whisper + VAD 루프 패턴. 드릴 엔진 훅 구조의 기반
- `src/features/interview-engine/vad.ts` — `createVad()` + `calibrate()` 직접 import
- `src/widgets/interview/interview-screen.tsx` — 카메라 피드, 오디오 레벨 바, getUserMedia 패턴
- `src/widgets/history/ai-recommendation-card.tsx` — chevron 접기/펼치기 패턴 (모범 답안 패널에서 재사용)
- `src/widgets/report/score-ring.tsx` — ScoreRing 컴포넌트 (피드백 점수 표시)
- `src/app/api/sessions/[id]/drill/route.ts` — 드릴 API 엔드포인트 (POST, ephemeral 응답)

### Data Schema
- `src/entities/feedback/schema.ts` — questionAnalysisSchema (suggestedAnswer 포함)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `createVad()` (`src/features/interview-engine/vad.ts`): threshold/silenceDelay/minSpeechDuration/onSpeechEnd/onLevel 옵션. 드릴 엔진에서 직접 import
- `calibrate()` (`src/features/interview-engine/vad.ts`): 2초 주변 소음 측정 후 임계값 계산. 준비 화면에서 활용 가능
- MediaRecorder + audioChunksRef 패턴 (`use-interview-engine.ts:94-168`): 그대로 드릴 엔진에서 재사용
- `transcribeAudio()` 패턴 (`use-interview-engine.ts:80-92`): FormData + /api/whisper POST
- `ScoreRing` (`src/widgets/report/score-ring.tsx`): 점수 시각화. Phase 9 결과 화면에서 이미 사용 중
- chevron 접기/펼치기 (`ai-recommendation-card.tsx`): 180deg rotate 200ms ease + 높이 애니메이션
- `cn()` (`src/shared/lib/cn.ts`), `motion` (motion/react): 공통 유틸

### Established Patterns
- `interview-screen.tsx`: webcamRef → getUserMedia → stream → video srcObject 패턴
- `interview-screen.tsx`: audioLevel state → 수평 레벨 바 렌더링
- `useInterviewEngine`: `loopAbortRef`로 루프 중단 제어 — 드릴도 동일 패턴
- glassmorphism 카드: `rounded-xl bg-card border border-white/[0.06]`
- motion.div staggered 애니메이션 (delay 0.1씩)

### Integration Points
- `src/app/drill/[sessionId]/page.tsx`: Server Component에서 DrillScreen Client Component로 데이터 전달 (question, suggestedAnswer, sessionId, jobTitle)
- 드릴 피드백 API: `POST /api/sessions/[id]/drill` → `{ contentScore, feedback, starFulfillment }`
- 결과 화면으로 복귀: `/results/[sessionId]`
- 다음 질문 네비게이션: `router.replace` 또는 `<Link href={?q=nextId}>` 로 ?q= 교체

</code_context>

<specifics>
## Specific Ideas

- 드릴 화면은 인터뷰 화면과 동일한 feel — 사용자가 이미 익숙한 레이아웃 그대로. "새로운 화면"이 아니라 "익숙한 환경에서 연습"
- 준비 화면에서 카메라 켜서 자기 얼굴 확인 후 시작 — 긴장 완화 효과
- 모범 답안은 접힌 상태가 기본이지만 드릴 내내 접근 가능 — "외우기 모드" 유도 아닌 "참고용"
- 5회 미달성 마무리는 격려 톤 — "열심히 연습했습니다" 느낌. 실패 피드백 아님

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-drill-mode-ui-engine*
*Context gathered: 2026-03-25*
