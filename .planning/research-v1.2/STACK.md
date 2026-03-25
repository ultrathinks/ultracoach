# v1.2 Coaching Loop — Stack Research

## Stack Additions Needed

### No new dependencies required

Both v1.2 features can be implemented entirely with the existing dependency set. Specific rationale per capability:

| Capability | Existing asset | Why no addition needed |
|---|---|---|
| `suggestedAnswer` generation | `openai@6.26.0`, `gpt-5.4`, `sessionFeedbackSchema` (Zod) | Extend prompt + schema only; same API call pathway |
| Drill mode VAD | `vad.ts` (`createVad`) | RMS-based VAD already abstracted; reuse as-is |
| Drill mode Whisper | `/api/whisper/route.ts` | Existing route accepts any `audio/webm` FormData; no changes needed |
| Drill mode LLM feedback | `gpt-5.4` via `getOpenAI()` | New API route, same client |
| Drill mode camera | `getUserMedia` (already in `interview-screen.tsx`) | Same browser API; no lib needed |
| Drill mode audio recording | `MediaRecorder` (already in `use-interview-engine.ts`) | Same pattern; reuse directly |
| Drill UI state | `zustand@5.0.11` | New store slice; same lib |
| Drill UI animations | `motion@12.35.2` | Already used throughout |
| Drill feedback schema | `zod@^3.24.0` | New schema file; same lib |

---

## Integration Points with Existing Code

### Feature 1: suggestedAnswer in feedback API

**File:** `src/app/api/sessions/[id]/feedback/route.ts`

The LLM prompt (line 114–134) outputs a `questionAnalyses` array. Extending `suggestedAnswer` requires:

1. Add `"suggestedAnswer": "STAR 구조로 작성한 모범 답안 (3-5문장)"` to the JSON output spec in the system prompt.
2. Extend `questionAnalysisSchema` in `src/entities/feedback/schema.ts` — add `suggestedAnswer: z.string()`.
3. The `questionAnalysesJson` column in the `feedback` table is `jsonb` — schema-less, so no DB migration needed. The new field persists automatically.
4. The results page at `src/widgets/report/report-view.tsx` renders `feedback.questionAnalyses` — add a "모범 답안" disclosure/expandable section per question card.

No new API route, no new DB column, no new library.

### Feature 2: Practice drill mode

**New route:** `src/app/api/drill-feedback/route.ts`

Receives: `{ questionText: string, answer: string, durationSec: number }`. Calls `gpt-5.4` with a focused single-question coaching prompt. Returns: `{ contentScore, feedback, suggestedAnswer, fillerWords }`. Uses `getOpenAI()` and `auth()` exactly as the existing feedback route does — same auth pattern from `src/proxy.ts`.

**New feature:** `src/features/drill/`

- `use-drill-engine.ts` — hook wrapping VAD + MediaRecorder + Whisper, identical to the listening half of `useInterviewEngine`. Can import `createVad` from `@/features/interview-engine/vad` directly.
- `drill-screen.tsx` — UI: question text display, user camera feed (no avatar video element, no Simli connection), mic level bar, stop button. Pattern mirrors `interview-screen.tsx` minus avatar refs and `useAvatar`/`useMediaPipe`/`CoachOverlay`.

**New page:** `src/app/drill/[questionId]/page.tsx` or triggered from results page as a modal/route.

**Entry point from results:** `src/widgets/report/report-view.tsx` — "다시 연습" button on each `questionAnalysis` card. Routes to drill page with `questionId` and `questionText` as params (or query string).

**New Zustand slice:** `src/entities/drill/` — tracks `{ phase, questionText, transcript, drillFeedback }`. Does not touch `useSessionStore`.

**Auth:** Drill feedback route is a new `/api/` path — `src/proxy.ts` JWT middleware applies automatically (matches `/api/` prefix pattern). No additional auth wiring needed.

---

## What NOT to Add

| Candidate | Decision | Reason |
|---|---|---|
| `react-speech-recognition` or any Web Speech API wrapper | Do not add | Existing `use-web-speech.ts` handles live caption; drill only needs Whisper post-recording, not live |
| `@ffmpeg/ffmpeg` (client-side audio conversion) | Do not add | `MediaRecorder` outputs `audio/webm;codecs=opus` which Whisper accepts natively; no conversion needed |
| Simli avatar in drill | Do not add | PROJECT.md Key Decisions explicitly excludes avatar from drill: "자기 카메라만. Simli 호출 없이 가벼운 UX" |
| MediaPipe in drill | Do not add | Drill is post-session practice; body language scoring adds complexity with no scoped benefit for v1.2 |
| Streaming LLM response (`stream: true`) | Do not add | Drill feedback is short (4 fields); latency gain negligible, added SSE plumbing not justified |
| New DB table for drill results | Do not add | PROJECT.md constraint: "새 데이터 수집 없이 기존 DB 데이터만 활용". Drill feedback is ephemeral — display only, not persisted |
| `openai` SDK upgrade | Do not add | `openai@6.26.0` already supports `gpt-5.4` and all needed endpoints |

---

## Key Technical Decisions

### 1. suggestedAnswer lives in the existing feedback API, not a separate endpoint

The feedback API already runs a full-session LLM call with all questions in context. Generating `suggestedAnswer` per question inside the same call is cheaper (one LLM round-trip vs N) and has richer context (session metrics, other answers). The `questionAnalysesJson` jsonb column absorbs the new field without migration.

### 2. Drill feedback is ephemeral (no DB persistence)

Storing drill attempts would require a new table, new API routes, and new UI for drill history — scope beyond v1.2. The drill result is shown immediately after the attempt and discarded on navigation. This satisfies "진짜 코칭" (give the user corrective feedback) without expanding data model scope.

### 3. `use-drill-engine.ts` reuses `createVad` directly, not through `useInterviewEngine`

`useInterviewEngine` couples VAD to `useSessionStore` (phase transitions, `addHistory`, `updateLastAnswer`). The drill has its own simpler state. Importing `createVad` from `src/features/interview-engine/vad.ts` directly avoids store coupling and keeps drill logic self-contained.

### 4. Drill route auth follows existing proxy pattern

`src/proxy.ts` applies JWT auth to all `/api/*` routes except `/api/auth`. A new `/api/drill-feedback` route is automatically protected. No `middleware.ts` changes needed.

### 5. `suggestedAnswer` schema extension is non-breaking

Existing stored `questionAnalysesJson` rows lack `suggestedAnswer`. The Zod schema should use `.optional()` on the new field (or `.default("")`) so that the results page does not break when rendering historical sessions that pre-date v1.2. Only sessions processed after the prompt update will have the field.

---

*Researched: 2026-03-24*
