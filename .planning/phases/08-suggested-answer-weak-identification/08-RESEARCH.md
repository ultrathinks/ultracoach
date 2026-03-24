# Phase 8 Research: 모범 답안 생성 + 아쉬운 답변 식별

**Researched:** 2026-03-24
**Status:** Complete — All canonical refs read

---

## 1. Current Feedback API Architecture

**File:** `src/app/api/sessions/[id]/feedback/route.ts`

### Full POST handler flow

1. **Auth + ownership check** (lines 37-54): `auth()` → DB query selects only `userId` from sessions table
2. **Duplicate check** (lines 56-67): Queries feedbackTable for existing row. Returns 409 if exists.
3. **Request validation** (lines 69-75): `requestSchema.safeParse(await request.json())`. Accepts `metrics`, `transcript`, `questions`, `historySummary` (optional).
4. **Prompt construction** (lines 79-134): System prompt with scoring criteria + optional growth instruction. User prompt from metrics + transcript + questions.
5. **LLM call** (lines 142-149): `getOpenAI().chat.completions.create()` with model **`gpt-5.4`**, `response_format: { type: "json_object" }`.
6. **Response parsing** (line 151): `parseJsonResponse(completion, sessionFeedbackSchema)` — throws if invalid.
7. **DB writes** (lines 153-167): Insert feedback row + update sessions with scores.
8. **Response** (line 169): `NextResponse.json(feedbackData)`.

### Critical finding
**Session fields not accessible.** Ownership query only fetches `userId`. Phase 8 must expand it to also fetch `jobTitle`, `interviewType`, `companyName`, `jobResearchJson`, `resumeFileId`.

---

## 2. Schema Structure

**File:** `src/entities/feedback/schema.ts`

### questionAnalysisSchema (current)
```typescript
z.object({
  questionId: z.number(),
  questionText: z.string(),
  answer: z.string().nullable().default(""),
  starFulfillment: starFulfillmentSchema,
  fillerWords: z.array(z.object({ word: z.string(), count: z.number() })),
  durationSec: z.number(),
  contentScore: z.number(),
  feedback: z.string(),
})
```

### suggestedAnswer fits as
```typescript
suggestedAnswer: z.string().optional()
```

- `z.infer<typeof questionAnalysisSchema>` auto-updates the `QuestionAnalysis` type
- Old sessions: `safeParse` → `suggestedAnswer: undefined` — no error
- No DB migration: `questionAnalysesJson` is jsonb

---

## 3. Resume File Pattern

**File:** `src/app/api/next-question/route.ts`, lines 235-240

```typescript
const userContent = resumeFileId
  ? [
      { type: "file" as const, file: { file_id: resumeFileId } },
      { type: "text" as const, text: parts.join("\n") },
    ]
  : parts.join("\n");
```

Reuse exact pattern for suggestedAnswer batch call.

---

## 4. parseJsonResponse Utility

**File:** `src/shared/lib/openai.ts`

```typescript
function parseJsonResponse<T>(
  completion: OpenAI.Chat.Completions.ChatCompletion,
  schema: z.ZodType<T>,
): T
```

1. Extracts `completion.choices[0]?.message?.content`
2. `JSON.parse(content)`
3. `schema.safeParse(parsed)` — throws on failure
4. Returns typed `result.data`

Reuse directly with a new `suggestedAnswersSchema`.

---

## 5. Session Data for suggestedAnswer

Expand the existing ownership query (single query, no extra round-trip):

```typescript
const [target] = await db
  .select({
    userId: sessions.userId,
    jobTitle: sessions.jobTitle,
    interviewType: sessions.interviewType,
    companyName: sessions.companyName,
    jobResearchJson: sessions.jobResearchJson,
    resumeFileId: sessions.resumeFileId,
  })
  .from(sessions)
  .where(eq(sessions.id, id))
  .limit(1);
```

---

## 6. Integration: Promise.allSettled

**Not Promise.all** — it short-circuits on rejection. Use `Promise.allSettled` for parallel + isolated failure:

```typescript
const [feedbackResult, suggestedResult] = await Promise.allSettled([
  feedbackCall,
  suggestedCall,
]);
if (feedbackResult.status === "rejected") throw feedbackResult.reason;
// suggestedResult.status === "rejected" → log + continue with empty
```

### Merging suggestedAnswer into questionAnalyses

```typescript
const answerMap = new Map(suggestedAnswers.map(a => [a.questionId, a.suggestedAnswer]));
const mergedAnalyses = feedbackData.questionAnalyses.map(qa => ({
  ...qa,
  suggestedAnswer: answerMap.get(qa.questionId),
}));
```

---

## 7. identifyWeakAnswers Design

### Location: `src/entities/feedback/lib.ts` (new file)

Pure domain logic. Export from `src/entities/feedback/index.ts`.

### Signature
```typescript
function identifyWeakAnswers(
  analyses: QuestionAnalysis[],
  threshold?: number, // default 70
): QuestionAnalysis[]
```

### Logic
```typescript
return analyses.filter(qa => qa.contentScore < threshold);
```

- All >= 70 → returns `[]` ("No weak answers")
- Sort ascending by `contentScore` (worst first)

---

## 8. Error Handling Strategy

Inner try-catch for suggestedAnswer, outer try-catch for main feedback (existing).

If suggestedAnswer fails: `suggestedAnswers = []`, merge step is no-op, feedback stored without suggestedAnswer fields. Log error for monitoring.

---

## 9. Validation Architecture

1. **Schema backward compat**: Parse legacy JSON through updated schema — suggestedAnswer: undefined
2. **API response check**: New feedback includes `suggestedAnswer: string` per question
3. **Paraphrase check**: suggestedAnswer does not contain verbatim user answer phrases
4. **identifyWeakAnswers**: `[45, 72, 68, 90]` → returns `[45, 68]`; all >= 70 → `[]`
5. **Failure isolation**: Mock suggestedAnswer LLM failure → feedback still stored correctly
6. **DB persistence**: `questionAnalysesJson` jsonb contains suggestedAnswer fields

---

## Key Findings Summary

| # | Finding | Impact |
|---|---------|--------|
| 1 | Session fields not in feedback route query | Must expand ownership query |
| 2 | Promise.allSettled, not Promise.all | Failure isolation |
| 3 | parseJsonResponse is generic | Direct reuse for suggestedAnswer |
| 4 | resumeFileId pattern in next-question | Copy exact content part array pattern |
| 5 | questionAnalysisSchema + z.infer | No types.ts change needed |
| 6 | No DB migration | jsonb handles schema evolution |
| 7 | Model split: gpt-5.4 (feedback) / gpt-5.4-mini (suggestedAnswer) | Cost optimization |
| 8 | identifyWeakAnswers in entities/feedback/lib.ts | FSD-compliant pure function |
| 9 | No new npm packages | Entire implementation uses existing stack |
| 10 | Prompt isolation: no user answer in suggestedAnswer call | Paraphrase prevention |

---

## RESEARCH COMPLETE
