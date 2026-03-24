# v1.2 Coaching Loop — Architecture Research

## New Components Needed

### API Routes

**`src/app/api/sessions/[id]/drill/route.ts`** (POST)
- Receives: `{ questionText: string, answer: string }` (text, not audio — Whisper handled client-side via existing `/api/whisper`)
- Returns: `{ feedback: string, contentScore: number, suggestedAnswer: string, starFulfillment: StarFulfillment }`
- Auth: same ownership-check pattern as the existing feedback route (call `auth()`, verify `sessions.userId === session.user.id`)
- No DB write — drill feedback is ephemeral, returned to client only
- LLM prompt: focused single-question coach. Input = questionText + answer. Output = short corrective feedback + model answer.

### Pages

**`src/app/drill/[sessionId]/page.tsx`** (Server Component)
- Loads session + feedback rows from DB (needs `questionAnalysesJson` to populate question list)
- Ownership check, redirect to `/` if unauthorized
- Renders `<DrillScreen>` widget

### Widgets

**`src/widgets/drill/drill-screen.tsx`**
- Question selector: list of questions from the session's `questionAnalysesJson`
- Shows `suggestedAnswer` (from extended feedback, see Modified Components below) alongside the question
- Camera feed (reuses webcam `getUserMedia` pattern from `interview-screen.tsx`)
- VAD + Whisper cycle for recording the drill answer (same flow as interview loop)
- Sends transcript to `POST /api/sessions/[id]/drill`
- Renders drill result inline: score, feedback, model answer comparison

### Features

**`src/features/drill/use-drill-engine.ts`**
- Encapsulates: `getUserMedia` → VAD listen → MediaRecorder → Whisper fetch → drill API call
- Reuses `createVad` from `src/features/interview-engine/vad.ts` and the `transcribeAudio` pattern from `use-interview-engine.ts`
- Exposes: `{ startDrill, stopDrill, phase, transcript, result, audioLevel }`
- `phase`: `"idle" | "listening" | "processing" | "done"`

### Zod Schemas / Types

**`src/entities/feedback/schema.ts`** — extended `questionAnalysisSchema` (see Modified Components)

**`src/entities/drill/types.ts`** (new entity)
- `DrillResult`: `{ feedback: string, contentScore: number, suggestedAnswer: string, starFulfillment: StarFulfillment }`

---

## Modified Components

### `src/entities/feedback/schema.ts`
Add `suggestedAnswer` field to `questionAnalysisSchema`:

```ts
suggestedAnswer: z.string().optional(),
```

`optional()` preserves backward compatibility with existing feedback rows that lack this field.

### `src/app/api/sessions/[id]/feedback/route.ts`
Extend the LLM system prompt's `questionAnalyses` output spec to include:
```
"suggestedAnswer": "이 질문에 대한 모범 답안 (STAR 구조 적용, 150-200자)"
```
Zod parse will succeed on old rows (field is optional). New sessions will populate it.

No change to the DB insert — `summaryJson` already stores the full parsed object as jsonb, so `suggestedAnswer` is persisted automatically inside `summaryJson` and `questionAnalysesJson`.

### `src/widgets/report/report-view.tsx`
Add "재연습" CTA per question in the `questionAnalyses` section:
- Button: `재연습하기` → links to `/drill/[sessionId]?q=[questionId]`
- Shows `suggestedAnswer` (if present) in a collapsible panel under each question block

### `src/app/results/[id]/results-client.tsx`
Pass `sessionId` down to `ReportView` so it can construct drill links. Currently `ReportView` has no session ID.

---

## Reusable Components (no modification needed)

| Component | Reuse point |
|-----------|-------------|
| `src/features/interview-engine/vad.ts` — `createVad()` | VAD in drill engine, identical config |
| `src/features/interview-engine/vad.ts` — `calibrate()` | Optional mic calibration before drill |
| `src/app/api/whisper/route.ts` | Drill engine calls same endpoint for transcription |
| `src/shared/lib/auth.ts` | Auth check in new drill API route |
| `src/shared/db/schema.ts` — `sessions`, `feedback` tables | Read-only from new page/API, no schema changes |
| `src/shared/ui/` — `Card`, `Button`, `Chip` | Drill screen UI |
| `src/shared/lib/openai.ts` — `getOpenAI()`, `parseJsonResponse()` | Drill API route LLM call |
| `src/shared/lib/cn.ts` | Class merging in drill widget |
| `src/proxy.ts` JWT middleware | Automatically covers `/api/sessions/[id]/drill` — no config needed |
| `ScoreRing` widget (`src/widgets/report/score-ring.tsx`) | Display drill `contentScore` |

---

## Data Flow

### Feature 1: Answer Rewrite (suggestedAnswer)

```
interview-screen.tsx (handleEnd)
  → POST /api/sessions/[id]/feedback
      LLM prompt now includes suggestedAnswer per question
      → parseJsonResponse → sessionFeedbackSchema (suggestedAnswer: optional)
      → db.insert(feedback) { summaryJson: feedbackData, questionAnalysesJson: feedbackData.questionAnalyses }
         (suggestedAnswer stored inside jsonb automatically)
  → router.push /results/[id]

results/[id]/page.tsx
  → db.select feedback.summaryJson
  → ResultsClient → ReportView
      questionAnalyses[i].suggestedAnswer (present on new sessions)
      → rendered in collapsible panel per question
      → "재연습하기" button links to /drill/[sessionId]?q=[questionId]
```

### Feature 2: Practice Drill

```
/drill/[sessionId]/page.tsx (Server Component)
  → auth() ownership check
  → db.select feedback.questionAnalysesJson (question list + suggestedAnswers)
  → renders <DrillScreen questions={...} sessionId={...} initialQuestionId={searchParams.q} />

DrillScreen (widget)
  → renders question selector + suggestedAnswer panel
  → user selects question → "연습 시작" button
  → useDrillEngine.startDrill()
      getUserMedia (camera+mic)
      createVad → onSpeechEnd:
        MediaRecorder blob → POST /api/whisper → transcript
      → POST /api/sessions/[sessionId]/drill { questionText, answer: transcript }
          auth() + ownership check
          getOpenAI().chat.completions.create (focused single-question prompt)
          → returns { feedback, contentScore, suggestedAnswer, starFulfillment }
      → phase = "done", result displayed inline
  → user can retry same question or pick another
```

---

## DB Schema Changes

**None required.**

`suggestedAnswer` is stored inside the existing `jsonb` columns:
- `feedback.summaryJson` (full feedback object)
- `feedback.questionAnalysesJson` (array of question analyses)

Both columns are already untyped `jsonb`, so adding a new field to the LLM output is automatically persisted without a migration.

Drill feedback is ephemeral — returned in the API response only, not stored.

If drill history tracking is added in a future milestone, a new `drill_attempts` table would be needed. Out of scope for v1.2.

---

## Suggested Build Order

Dependencies flow bottom-up (lower items must exist before higher ones).

### Wave 1 — Schema + Prompt Extension (no UI, unblocks everything)
1. **Extend `questionAnalysisSchema`** — add `suggestedAnswer: z.string().optional()` in `src/entities/feedback/schema.ts`
2. **Extend feedback API prompt** — add `suggestedAnswer` to LLM output spec in `src/app/api/sessions/[id]/feedback/route.ts`
3. **Verify** — run a test session and confirm `suggestedAnswer` appears in the response JSON. Existing sessions unaffected (field optional).

### Wave 2 — Drill API (backend, no UI dependency)
4. **Create `POST /api/sessions/[id]/drill/route.ts`** — auth + ownership check, single-question LLM call, ephemeral response

### Wave 3 — Report View Extension (builds on Wave 1)
5. **Pass `sessionId` to `ReportView`** — update `ResultsClient` and `ReportView` props
6. **Add `suggestedAnswer` panel + "재연습하기" link** in `report-view.tsx` question analyses section

### Wave 4 — Drill Engine Feature (builds on Wave 2, reuses VAD/Whisper)
7. **Create `src/features/drill/use-drill-engine.ts`** — wraps VAD + Whisper + drill API in a clean hook

### Wave 5 — Drill Screen + Page (builds on Waves 3 + 4)
8. **Create `src/widgets/drill/drill-screen.tsx`** — camera feed, question selector, drill result display
9. **Create `src/app/drill/[sessionId]/page.tsx`** — server component, auth, DB read, renders DrillScreen

### Rollback boundary
Waves 1-3 are safe to ship independently. Wave 1 extends the prompt with a backward-compatible field; existing sessions and UI are unaffected until Wave 3 renders it.
