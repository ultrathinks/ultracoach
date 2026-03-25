---
status: testing
phase: 10-drill-mode-ui-engine
source: 10-01-SUMMARY.md, 10-02-SUMMARY.md, 10-03-SUMMARY.md, 10-04-SUMMARY.md
started: 2026-03-25T00:00:00Z
updated: 2026-03-25T00:00:00Z
---

## Current Test

number: 1
name: Drill page loads with question data
expected: |
  Navigate to /drill/[sessionId]?q=[questionId]. The page loads without error,
  shows the question text, a "Suggested Answer" collapsible panel with a chevron,
  and a "Start Drill" button that is disabled (grayed out) before camera permission is granted.
awaiting: user response

## Tests

### 1. Drill page loads with question data
expected: Navigate to /drill/[sessionId]?q=[questionId]. Page loads without error, shows question text, collapsible "Suggested Answer" panel with chevron, and a disabled "Start Drill" button before camera permission is granted.
result: [pending]

### 2. Collapsible suggested answer panel
expected: Click the chevron next to "Suggested Answer". The panel expands to show answer text and the chevron rotates 180 degrees. Click again — panel collapses and chevron returns to original position.
result: [pending]

### 3. Camera permission gate
expected: When camera permission is granted (browser prompt accepted), the "Start Drill" button becomes enabled and the camera preview shows a live feed.
result: [pending]

### 4. Listening phase — audio level bars
expected: Click "Start Drill". The view transitions to a listening state showing 5 animated audio level bars (reflecting microphone input level) and a camera preview. No score or feedback is shown yet.
result: [pending]

### 5. Short answer validation
expected: Speak fewer than 15 words into the microphone, then go silent. A validation error message appears (e.g. "Please provide a more complete answer") — this does NOT count as an attempt toward the 5-attempt limit.
result: [pending]

### 6. Valid answer → feedback with ScoreRing and STAR
expected: Speak a full answer (15+ words), then go silent. A processing spinner appears briefly, then a feedback screen shows: a ScoreRing with a numeric score, and a STAR breakdown (Situation, Task, Action, Result) with section-level feedback.
result: [pending]

### 7. Goal reached (80+ score)
expected: Score 80 or higher on any attempt. The view transitions to a goal-reached screen showing "Goal Reached!" (or similar), and a button to navigate to the next question.
result: [pending]

### 8. Max attempts exhausted (5 attempts, no 80+ score)
expected: Complete 5 drill attempts without reaching 80+. The done screen appears showing the best score achieved across attempts, and navigation options (next question or return to results).
result: [pending]

## Summary

total: 8
passed: 0
issues: 0
pending: 8
skipped: 0

## Gaps

[none yet]
