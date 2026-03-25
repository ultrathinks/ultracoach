# Pitfalls: v1.2 Coaching Loop

UltraCoach — specific to adding answer rewrite generation and practice drill mode to the existing codebase.

---

## Critical Pitfalls (Must Avoid)

### 1. `suggestedAnswer` in the same GPT call generates paraphrase, not a model answer

**What goes wrong:** The feedback prompt at `/api/sessions/[id]/feedback` currently sends the transcript and all questions to GPT-5.4 as one payload. Adding `suggestedAnswer` to the `questionAnalyses` array output in the same prompt causes the model to generate an answer that is semantically anchored to the user's actual answer. GPT mirrors the structure the user used, re-states the same experience, and adds polish — it does not demonstrate a fundamentally different approach. The user receives a rephrased version of what they said instead of a model answer that teaches them a new technique.

**Why this happens in this codebase:** The system prompt says `"실제 답변을 인용하며"` (cite the actual answer). That instruction is correct for feedback but causes the model to stay within the user's frame when generating a suggested answer in the same pass.

**Prevention:** Add `suggestedAnswer` to `questionAnalysisSchema` but generate it with a separate, focused prompt. The generation prompt must explicitly prohibit referencing the user's answer: "지원자의 실제 답변과 무관하게 이 질문에 대한 이상적인 답변을 생성하세요." Pass only `questionText`, `questionType`, `jobTitle`, and `interviewType` — not the user's answer or transcript — to that prompt call.

**Phase to address:** Before writing the prompt. This is a prompt architecture decision, not an implementation detail.

---

### 2. Idempotency check at line 56–67 of feedback route blocks drill feedback from ever being stored

**What goes wrong:** The existing feedback route checks for an existing feedback row and returns `409` if one already exists. This guard is correct for full-session feedback. If drill mode reuses the same `/api/sessions/[id]/feedback` route or the same `feedback` table row concept, the `UNIQUE` constraint on `feedback.sessionId` (line 79 of `schema.ts`) means a second drill attempt on the same session ID will always fail with 409 — even for a completely new drill attempt.

**Why this is a real risk:** The STATE-v1.2.md notes "재연습 피드백은 LLM API 호출 (diff가 아닌 독립 분석)". If drill feedback is stored as a new row per drill attempt (correct), it needs its own table or a composite key on `(sessionId, drillAttemptId)`. The existing `feedback` table has a hard `UNIQUE` constraint on `sessionId` that would need a migration to accommodate this.

**Prevention:** Create a separate `drill_attempts` table for drill feedback. Do not store drill feedback in the `feedback` table at all. This avoids both the unique constraint collision and conflates two different data types (session-level holistic feedback vs. per-question single-drill feedback). The migration is additive and does not touch the existing `feedback` table.

**Phase to address:** DB schema design before any API route is written.

---

### 3. `questionAnalysesJson` is stored as a flat jsonb column — adding `suggestedAnswer` to it is a schema drift trap

**What goes wrong:** `feedback.questionAnalysesJson` is a `jsonb` column with no DB-level schema enforcement. Adding `suggestedAnswer` to the LLM output and the Zod schema adds it to the JSON written to that column. Old rows written before this change have no `suggestedAnswer` field. When `report-view.tsx` or any new drill UI reads `questionAnalysesJson`, code that does `qa.suggestedAnswer` will get `undefined` on all historical rows.

**Why this is subtle:** Drizzle does not validate jsonb on read. The TypeScript type `QuestionAnalysis` will be updated to include `suggestedAnswer` but old DB rows will silently return `undefined`. If the UI renders `qa.suggestedAnswer` without guarding, it renders nothing and no error is thrown — the bug is invisible until a user notices blank fields on their old results.

**Prevention:**
- Add `suggestedAnswer` to `questionAnalysisSchema` as `z.string().optional()` permanently (not `.default("")`) so that old rows parse correctly via `safeParse`.
- The UI component that renders `suggestedAnswer` must check `if (!qa.suggestedAnswer) return null` and show a contextually correct message ("이전 세션의 리포트에는 모범 답안이 제공되지 않습니다") rather than silently rendering nothing.
- Never backfill old rows programmatically. The cost of re-generating model answers for all historical sessions is not justified; mark the feature as "available for sessions after v1.2 launch only."

**Phase to address:** Before writing the migration. The Zod schema change must come before any DB writes.

---

### 4. Drill mode creates a second `AudioContext` and `MediaRecorder` while the report page's `AudioContext` may still be live

**What goes wrong:** The interview loop in `use-interview-engine.ts` creates one `AudioContext` per `createVad()` call (line 75 of `vad.ts`). If drill mode is launched from the results page in the same browser tab without a full page navigation, and the report page has any audio playback state (e.g. a user previewing a recording), a second `AudioContext` will be instantiated. Browsers limit concurrent `AudioContext` instances to 6 in Chrome and 4 in Safari. On mobile Safari, failing to call `audioContext.close()` before creating a new one causes the new context to fail silently.

**Why this is a real risk here:** `use-recording.ts` stores the `MediaRecorder` in a ref and calls `dispose()` on unmount. But if the user navigates from the results page to the drill page without triggering a React unmount (e.g. soft navigation in Next.js), the old contexts are not closed. The drill page then creates new ones on top of them.

**Prevention:**
- Drill mode must be a new route (`/drill/[sessionId]/[questionId]`) that causes a full React tree unmount of the results page. Do not embed drill mode as a modal or drawer on the results page.
- In the drill page's `useEffect` cleanup, always call `audioContext.close()` — not just `vad.stop()`. The `vad.stop()` method in the existing `createVad` does call `audioContext?.close()` (line 96 of `vad.ts`) — verify this remains true when `createVad` is reused in drill mode.
- Reuse `createVad` as-is. Do not copy-paste it into a new file for drill mode. Tight coupling to the original is acceptable here; drift between two copies is worse.

**Phase to address:** Routing architecture decision before component authoring.

---

## Integration Pitfalls

### 5. Rewriting `useInterviewEngine` to accept a "drill mode" flag creates a god hook

**What goes wrong:** `use-interview-engine.ts` currently manages: VAD lifecycle, MediaRecorder lifecycle, Whisper API calls, question fetching, and session store updates. Adding a `isDrillMode` parameter to skip question fetching and change the feedback path turns it into a branching god hook with two distinct responsibilities.

**Prevention:** Extract the reusable audio pipeline into a lower-level hook: `useAudioCapture(stream, vadOptions) → { startListening, stopListening, audioLevel }`. Both `useInterviewEngine` and the new `useDrillEngine` call `useAudioCapture`. The Whisper call (`transcribeAudio`) is already a standalone `useCallback` — it can be extracted to `features/interview-engine/use-transcribe.ts` and imported by both.

The drill-specific logic (single question display, per-question LLM feedback call, no session store involvement) lives in `useDrillEngine` which is a new hook, not a modified version of the old one.

---

### 6. Drill feedback prompt lacks the context that full-session feedback has — and will produce shallower analysis

**What goes wrong:** The full-session feedback prompt receives: all metrics snapshots (body language data), a complete transcript of the full interview, all questions, and historical session comparison data. Drill mode will only have: the single question text, and the user's single drill answer. The LLM will generate feedback that is structurally similar to `questionAnalyses[i].feedback` but lacks any comparative or contextual grounding. Users will find drill feedback less useful than expected.

**Why this is specific to this codebase:** The `QuestionAnalysis.feedback` field in full-session mode is explicitly instructed to cite the actual answer in context of the full interview. Drill mode feedback has no transcript context. If the prompt is copied from the full-session prompt without adaptation, the model will hallucinate contextual references or produce vague output.

**Prevention:** The drill feedback prompt must be scoped to what it actually has: "이 질문 하나에 대한 이 답변을 평가하세요. 면접 전체 흐름은 알 수 없습니다." Add explicit constraints: "STAR 충족 여부, 구체성, 논리 구조만 평가하세요." Do not attempt to generate `deliveryScore` or body language feedback in drill mode — those require metrics data that drill mode does not collect unless MediaPipe is running.

---

### 7. `feedback.questionAnalysesJson` index mismatch when `suggestedAnswer` is rendered in drill

**What goes wrong:** The `questionAnalyses` array in stored feedback is indexed by `questionId` (a sequential number 1–N). When drill mode loads a specific question's data from the results page, it must find the matching `QuestionAnalysis` by `questionId`. If the LLM omits a question in its analysis (which happens when `shouldEnd: true` fires early), the array will have fewer items than the `questions` array. Code that does `questionAnalyses[questionIndex]` by array position will access the wrong analysis for questions after the omitted one.

**Prevention:** Always look up by `questionId` field, not by array index: `questionAnalyses.find(qa => qa.questionId === question.id)`. This is already the safe pattern. Enforce it as a code review rule for all drill-mode data access.

---

### 8. Rate limit at `/api/whisper` is shared between interview loop and drill mode — drill users hit it faster

**What goes wrong:** `whisper/route.ts` applies `rateLimit({ windowMs: 60_000, max: 60 })` per user per minute. In a full interview, users typically answer 10–15 questions — 15 Whisper calls in 30–40 minutes is well within limits. Drill mode encourages rapid re-attempts on a single question. A user doing 20 drill attempts in 5 minutes — 4 per minute — is still fine individually, but combined with any background interview session, they approach the limit. More importantly, the rate limit `store` in `rate-limit.ts` is an in-process `Map` that resets on every server restart (Vercel's serverless functions restart frequently). The effective rate limit in production is lower than the configured 60/min.

**Prevention:** Add a separate rate limit key for drill Whisper calls: `checkRate(session.user.id, "whisper-drill")` with a lower window — e.g., 10 calls per minute. This distinguishes drill retries from interview answers and allows independent tuning. Document this in the rate limit config rather than hardcoding it.

---

## UX Pitfalls

### 9. Camera permission prompt appears twice if drill mode requests `getUserMedia` independently

**What goes wrong:** The interview screen already acquired camera + mic permissions via `getUserMedia`. When the user finishes the interview, tracks are stopped (line 228–231 of `interview-screen.tsx`: `streamRef.current?.getTracks().forEach(t => t.stop())`). When the user later opens drill mode, the browser must be asked again. If permissions were granted for the interview session, they are typically cached by the browser — but on some mobile browsers (iOS Safari 16 and earlier), the permission prompt appears again on every `getUserMedia` call after tracks have been stopped.

**Prevention:** Drill mode UX must include a camera permission step in its preparation flow, equivalent to the "카메라·마이크 연결" prep step in the existing `prepSteps` array. Do not silently call `getUserMedia` and let it fail — show a preparation screen that explicitly tells the user "카메라와 마이크 접근이 필요합니다" and handles the `NotAllowedError` case with a user-friendly message and retry button.

---

### 10. Audio feedback loop: drill mode microphone picks up the LLM-generated feedback being read aloud

**What goes wrong:** If drill mode uses TTS to read the AI feedback to the user (a natural UX for a coaching loop), and the user immediately starts the next drill attempt without waiting for TTS to finish, VAD will detect the TTS audio playing through speakers as speech and trigger the recording. The high-pass filter at 200 Hz in `createVad` reduces some speaker bleed but does not eliminate it — especially on laptops with poor acoustic separation. The resulting Whisper transcript will contain the AI's feedback words mixed into the user's answer.

**This is already partially solved:** `interview-screen.tsx` disables microphone tracks during avatar speech (lines 285–288: `track.enabled = false`). Drill mode must replicate this exact pattern: disable mic audio tracks for the duration of TTS playback, re-enable after `ttsRef.current.speak()` resolves.

**Prevention:** If drill mode uses TTS feedback readout, wrap the entire TTS await in a mic-disable/re-enable block identical to the interview loop pattern. If drill mode does not use TTS (text-only feedback), this pitfall does not apply — prefer text-only feedback for drill mode to avoid this class of problem entirely.

---

### 11. "Start drill" from the report page navigates away and loses scroll position — user cannot compare feedback to model answer

**What goes wrong:** The results report (`/results/[id]`) shows `questionAnalyses` with feedback and the new `suggestedAnswer`. The expected drill UX is: read feedback → read model answer → try drill → come back to compare. If drill mode is a full page navigation to `/drill/[id]/[questionId]`, returning to the results page reloads it from scratch (the feedback is re-fetched server-side) and the user loses their scroll position. For a 10-question interview, this means scrolling back to the right question multiple times per drill session.

**Prevention:** Design the drill entry point as a drawer or bottom sheet on the results page rather than a separate route, OR implement scroll restoration with `sessionStorage`. The drawer approach is simpler: the drill VAD loop runs inside the drawer, the question text and `suggestedAnswer` remain visible behind it. This is the opposite of the advice in pitfall 4 (avoid modal for audio context reasons) — weigh both: a drawer that unmounts cleanly (no background audio contexts persisting) is acceptable.

---

### 12. Drill mode has no "end condition" — users loop indefinitely without a stopping signal

**What goes wrong:** The full interview loop has a clear end: `shouldEnd: true` from the LLM, or the user clicks "종료". Drill mode on a single question has no natural end signal. Users will not know when they have "passed" the question. Without a clear stopping criterion, users either stop too early (after 1–2 attempts, before meaningful improvement) or loop compulsively.

**Prevention:** Define an explicit drill completion signal. Options in order of implementation cost:
- Simple: allow maximum 5 attempts per question per session, show "이 질문 연습을 마칩니다. 최고 점수: N점" after attempt 5.
- Better: use the drill feedback `contentScore` — if the user scores 80+ on any attempt, show a "목표 달성" completion state with a clear CTA to try the next question.

Pick one before implementation. The choice affects how drill feedback is stored (need to track attempt number and score per attempt).

---

## Cost/Performance Pitfalls

### 13. Two gpt-5.4 calls per feedback session (existing feedback + suggestedAnswer) doubles cost without user-visible proportional value

**What goes wrong:** The current feedback call uses `gpt-5.4` for the main analysis. Adding `suggestedAnswer` generation as a second separate call (the correct approach per pitfall 1) doubles the number of `gpt-5.4` calls per session. A 15-question interview generates 15 `suggestedAnswer` calls in addition to the 1 existing feedback call. If each `suggestedAnswer` call is a separate API request, that is 15 additional calls per session end.

**Prevention:**
- Generate all `suggestedAnswers` in a single batched call: send all question texts in one prompt, request a JSON array of suggested answers in one response. This is 1 additional `gpt-5.4` call instead of 15.
- Use `gpt-5.4-mini` for `suggestedAnswer` generation. The main feedback call needs deep reasoning about metrics and transcript context — it warrants `gpt-5.4`. Generating a model answer to a question requires less analytical depth and runs well on the mini model (the same model used for question generation in `/api/next-question`).
- Batch call + mini model reduces the cost of `suggestedAnswer` generation to approximately 5–10% of the existing feedback call cost.

---

### 14. Drill feedback LLM call is triggered on every recording end — no debounce, no minimum quality gate

**What goes wrong:** Drill mode uses VAD + Whisper, same as the interview loop. The `onSpeechEnd` callback fires when 2.5 seconds of silence is detected after any speech above the RMS threshold. If the user coughs, clears their throat, or mutters "어..." (a filler word already above the 0.035 threshold), VAD will fire, Whisper will transcribe a 1-word response, and the drill feedback LLM call will be made on a trivially short answer. Each drill LLM call costs money and takes 2–5 seconds to return.

**Prevention:** Add a minimum transcript length gate before triggering the drill feedback call. A useful answer to an interview question is at minimum 30 words. Gate the LLM call: `if (transcript.split(' ').length < 15) { showRetryMessage("답변이 너무 짧습니다. 다시 시도해주세요."); return; }`. The Whisper call is cheap enough to run on short audio — the LLM feedback call is what needs the gate.

---

### 15. In-process `Map` rate limiter in `rate-limit.ts` is not shared across serverless instances — drill mode bypasses effective rate limiting in production

**What goes wrong:** `rate-limit.ts` uses a module-level `Map` that is local to each serverless function instance. On Vercel, each function invocation may run in a different instance. Two rapid drill attempts from the same user, routed to different instances, each see an empty `Map` and both pass the rate limit check. The 60 req/min limit is per-instance, not per-user globally.

**This is a pre-existing issue** that becomes more acute with drill mode because drill mode generates significantly more API calls per unit time than the interview loop.

**Prevention:** This is a known architectural limitation. For v1.2, mitigate by adding a client-side cooldown: after a drill attempt completes (Whisper transcribed, feedback returned), disable the "다시 시도" button for 5 seconds. This is not a security control but eliminates accidental rapid-fire calls from impatient users. A proper fix (Redis or Upstash for distributed rate limiting) is a future infrastructure item.

---

## Prevention Strategies

### Strategy A: Prompt isolation contract

Every LLM call must have a documented "what this call knows and what it does not know" contract before code is written:

| Call | Knows | Does not know | Model |
|------|-------|---------------|-------|
| Session feedback | Full transcript, all metrics, history | Nothing about "ideal" answers | gpt-5.4 |
| Suggested answer batch | questionText, questionType, jobTitle, interviewType | User's actual answer, transcript, metrics | gpt-5.4-mini |
| Drill feedback | Single question, single drill answer | Interview context, history, metrics | gpt-5.4-mini |

Enforcing this contract prevents cross-contamination of contexts (pitfalls 1, 6) and controls cost (pitfall 13).

---

### Strategy B: Additive DB migration only

All schema changes for v1.2 must be additive:
- Add `suggestedAnswer: z.string().optional()` to `questionAnalysisSchema` — old rows parse correctly.
- Add new `drill_attempts` table — never modify `feedback` table structure.
- Run `pnpm db:generate && pnpm db:migrate` and verify old feedback rows still pass `sessionFeedbackSchema.safeParse()` before shipping.

---

### Strategy C: Audio context ownership rule

One route = one `AudioContext` owner. The entity that creates an `AudioContext` is the only entity that closes it.

- `createVad` creates its own `AudioContext` in `start()` and closes it in `stop()`. This is already correct.
- Drill mode creates its VAD instance and is the sole owner.
- The drill component's `useEffect` cleanup must call `vad.stop()` (which closes the context) before unmount.
- Never share an `AudioContext` instance across hooks or components via props or context.

This rule prevents the multi-context accumulation described in pitfall 4.

---

### Strategy E: Minimum viable drill feedback schema

Define the drill feedback shape before writing the prompt. Keep it smaller than session feedback to avoid scope creep:

```typescript
// drill attempt feedback — stored per attempt in drill_attempts table
interface DrillFeedback {
  contentScore: number;          // 0–100
  starFulfillment: StarFulfillment;
  strengths: string[];           // max 2 items
  improvements: string[];        // max 2 items, actionable
}
```

No `deliveryScore` (no metrics), no `keyMoments` (no timeline), no `growthComparison` (no history). Adding fields later is safe; removing them from stored JSON is not.

---

### Warning Signs by Phase

| Phase | Warning sign | Likely cause |
|-------|--------------|--------------|
| Prompt design | Suggested answer reuses phrases from user's answer | Context contamination — user's answer is in the prompt |
| DB migration | `pnpm db:migrate` touches `feedback` table | Migration is not additive — review it |
| Hook extraction | `useInterviewEngine` gains an `isDrillMode` param | God hook — extract `useAudioCapture` instead |
| UX implementation | Drill starts without a preparation screen | Camera permission prompt will surprise users |
| Cost review | Feedback API latency increases > 2x | Separate per-question suggestedAnswer calls — batch them |
| Production testing | Whisper called on 1-word transcripts | Missing minimum length gate before LLM feedback call |

---

*Created: 2026-03-24*
*Scope: v1.2 Coaching Loop (answer rewrite + drill mode) additions to existing UltraCoach codebase*
