---
phase: 9
plan: 2
title: "drill feedback API with auth, ownership check, and LLM analysis"
status: completed
commit: a648119
completed_at: "2026-03-25"
---

# Summary: Plan 09-02 — Drill Feedback API

## What was done

Created `POST /api/sessions/[id]/drill` endpoint that provides ephemeral LLM-powered feedback for a single re-practiced question.

## File created

- `src/app/api/sessions/[id]/drill/route.ts` — 158 lines

## Implementation details

- Auth + session ownership check follows the exact pattern from `feedback/route.ts` (401 for unauthenticated, 403 for wrong owner, 404 for missing session)
- Request validation via zod: `questionId: z.number()` + `transcript: z.string().min(1).max(10000)`
- Retrieves `summaryJson` from feedback table, parses via `questionAnalysisSchema` to find the original question's `questionText`, `contentScore`, and `suggestedAnswer`
- Builds context-aware system prompt in Korean including prior score and suggestedAnswer (when available)
- Calls `gpt-5.4-mini` with `response_format: { type: "json_object" }`
- Parses response with `parseJsonResponse(completion, drillResponseSchema)` — no unsafe type assertions
- Returns `{ contentScore, feedback, starFulfillment }` — zero DB insert/update operations (ephemeral)

## Acceptance criteria verification

| Criterion | Result |
|-----------|--------|
| File exists | pass |
| `export async function POST` | pass |
| `await auth()` | pass |
| `target.userId !== session.user.id` | pass |
| `drillRequestSchema` | pass |
| `drillResponseSchema` | pass |
| `model: "gpt-5.4-mini"` | pass |
| `parseJsonResponse` | pass |
| Zero `db.insert`/`db.update` | pass (0 matches) |
| `questionId: z.number()` | pass |
| `transcript: z.string()` | pass |
| No `as` type assertions | pass |
| `biome check` — no errors | pass |
| `tsc --noEmit` | pass (exit 0) |
| `pnpm build` | pass (route listed in output) |

## Key decisions

- Did not import `QuestionAnalysis` type from `entities/feedback/types.ts` — used `questionAnalysisSchema` zod inference instead to avoid separate type dependency while keeping validation tight
- `drillResponseSchema` defined inline (not reusing `starFulfillmentSchema`) to keep the file self-contained and avoid coupling to entity exports
- suggestedRef appended to system prompt only when `originalQa.suggestedAnswer` is truthy (optional field)
