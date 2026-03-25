---
plan: 09-01
title: "weak answers section with suggested answer panels and drill CTA"
status: completed
commit: c9f15d3
---

# Summary

## What was done

Implemented the "아쉬운 답변" (weak answers) section in the results report page.

### Task 1: sessionId prop threading
- Added `sessionId={session.id}` to `<ReportView>` in `results-client.tsx`
- Added `sessionId: string` to `ReportViewProps` interface in `report-view.tsx`

### Task 2: Weak answers section
- New `WeakAnswerItem` private component (same file) renders per-question:
  - Q number + question text + contentScore (yellow ≥60, red <60)
  - STAR fulfillment badges (green filled / muted unfilled)
  - Answer preview (truncated at 100 chars with template literal)
  - AI feedback text
  - Foldable suggested answer panel with indigo left border and chevron (180deg rotation, 200ms)
  - "재연습하기" gradient CTA linking to `/drill/[sessionId]?q=[questionId]`
- Section guarded by `hasAnySuggestedAnswer && weakAnswers.length > 0`
- Pre-v1.2 sessions (no suggestedAnswer on any question): section hidden entirely
- All questions ≥70: section not rendered
- Animation delay: 0.45 (between action items 0.4 and question analyses 0.55)
- Question analyses delay bumped 0.5 → 0.55; next suggestion 0.6 → 0.65

## Files modified

- `src/app/results/[id]/results-client.tsx`
- `src/widgets/report/report-view.tsx`

## Decisions

- Used `qa.questionId` as React key (replacing index key in question analyses map — lint fix)
- SVG chevron uses `aria-hidden="true"` (decorative inside labeled button)
- Import order follows Biome's organize-imports rule: third-party first, then `@/` aliases
