# Dashboard Features Research

## Context

Existing data available without new collection:
- `sessions`: deliveryScore, contentScore, interviewType, mode, jobTitle, durationSec, createdAt
- `feedback.questionAnalysesJson`: per-question STAR fulfillment (S/T/A/R booleans), fillerWords array, contentScore, durationSec
- `feedback.keyMomentsJson`: positive/negative moments with timestamps
- `feedback.actionItemsJson`: up to 3 items per session
- `feedback.summaryJson`: nextSessionSuggestion, growthComparison (deliveryChange, contentChange)
- `metricSnapshots`: up to 600 snapshots/session with gaze (pitch/yaw/isFrontFacing), posture (shoulderTilt/headOffset/isUpright), expression (frownScore/isPositiveOrNeutral), gesture (wristMovement/isModerate)

Constraint: no new data collection. All features must derive from the above.

---

## Table Stakes (must-have to feel like a product)

These are what every coaching/analytics platform has. Absence makes the app feel like a demo.

### 1. Score Trend Chart (enhanced)

**What it is:** Line chart showing deliveryScore + contentScore over time, with per-session dots and hover tooltips.

**Current state:** Mini SVG chart exists but has no interactivity, no tooltips, no fill, and no axis labels.

**UX reference:** Duolingo's XP streak chart — colored fill under the line, distinct color per metric. Grammarly's weekly writing score shows a smooth curve with current-vs-previous-week delta badge.

**Differentiating detail:** Show a 7-session rolling average as a dimmed line underneath the actual score line. This filters noise and shows real trend vs. variance.

**Complexity:** Low. Data already in `sessions` table. Requires replacing SVG with a proper chart (Recharts or custom SVG with area fill + tooltip).

**Dependencies:** sessions.deliveryScore, sessions.contentScore, sessions.createdAt.

---

### 2. STAR Weakness Radar Chart

**What it is:** Radar/spider chart with 4 axes: Situation, Task, Action, Result. Each axis value = % of questions in last N sessions where that element was fulfilled.

**UX reference:** Pramp's skill radar shows communication/problem-solving/etc. axes. The key insight is that a radar makes weakness visible at a glance — a lopsided shape immediately communicates "you always skip Result."

**Why this matters:** Users consistently miss the same STAR element across sessions (typically Task or Result). A list per session doesn't surface this. The aggregate radar does.

**Complexity:** Medium. Requires aggregating `questionAnalysesJson` across sessions, computing per-element hit rates. Chart itself is a simple SVG polygon (no library needed, or lightweight with Recharts RadarChart).

**Dependencies:** `feedback.questionAnalysesJson[].starFulfillment` (S/T/A/R booleans). Requires querying all feedback rows for a user, not just most recent.

---

### 3. Filler Word Frequency Chart

**What it is:** Bar chart or ranked list showing top filler words across all sessions, with counts and a per-session breakdown available on hover/expand.

**UX reference:** Grammarly's "Clarity" score breakdown shows specific problem words highlighted. Nike Run Club cadence analysis shows a bar chart with a "personal best" marker.

**Anti-pattern to avoid:** Showing raw counts across all time is misleading — a user with 20 sessions will look worse than one with 3. Normalize to count-per-minute or count-per-question.

**Complexity:** Low-Medium. Aggregation is straightforward: flatten all `fillerWords` arrays across `questionAnalysesJson`, group by word, sum counts. Normalization adds one step.

**Dependencies:** `feedback.questionAnalysesJson[].fillerWords` (word + count per question). `sessions.durationSec` for normalization.

---

### 4. Body Language Score Aggregation

**What it is:** 4 sub-scores displayed as a 2x2 grid or horizontal bar set: Gaze %, Posture %, Expression %, Gesture %. Each = % of snapshots where the "good" boolean was true.

**UX reference:** Strava's effort breakdown (cadence/heartrate/power) as a grid of metric tiles. Each tile shows current average + trend arrow (up/down from previous session).

**Computation:**
- Gaze score = % snapshots where `isFrontFacing === true`
- Posture score = % snapshots where `isUpright === true`
- Expression score = % snapshots where `isPositiveOrNeutral === true`
- Gesture score = % snapshots where `isModerate === true`

**Complexity:** Medium. Requires loading `metricSnapshots.snapshotsJson` per session and aggregating. The data is already being stored; no change to collection needed. Main cost is the query (join sessions + metricSnapshots, aggregate in JS or SQL).

**Dependencies:** `metricSnapshots.snapshotsJson` (600 snapshots/session). Need to decide: aggregate server-side in API route vs. send raw to client. Server-side aggregation strongly preferred.

---

## Differentiators (what makes this stand out)

These exist on few or no interview prep platforms. They turn the dashboard into a coaching tool rather than a report viewer.

### 5. Interview Type Comparison

**What it is:** A side-by-side breakdown showing average scores per interview type (personality / technical / culture-fit). Displayed as a grouped bar chart or a 3-column comparison table with delta from overall average.

**UX reference:** Strava's "Run Type" comparison (race / workout / long run) — each type has its own stats block. The key is not just showing the numbers but surfacing the insight: "You score 12 points higher on personality than technical."

**Why differentiating:** No interview prep platform (Pramp, InterviewBit) shows per-type performance breakdown. They treat all sessions as equivalent.

**Complexity:** Low. Pure aggregation on `sessions` table: GROUP BY interviewType, AVG(deliveryScore), AVG(contentScore). Render as grouped bars or comparison tiles.

**Dependencies:** `sessions.interviewType`, `sessions.deliveryScore`, `sessions.contentScore`. Meaningful only with 3+ sessions across types.

**Edge case:** If user has only done one type, show a CTA to try another type ("You've only done personality interviews. Try a technical session to see your comparison.").

---

### 6. Action Item Tracking Across Sessions

**What it is:** A persistent list of action items from all sessions, with a "resolved" state that users manually toggle. Optionally, AI auto-marks items as likely resolved if recent sessions show improvement in the relevant area.

**UX reference:** Duolingo's mistake review (lingots you've missed before come back). Grammarly Premium's "recurring issue" badge — shows when the same problem appears in multiple documents.

**The core insight:** Action items in report view are forgotten immediately. Cross-session tracking makes them sticky and creates a loop: coach gives advice → user practices → dashboard confirms improvement.

**Complexity:** Medium-High. Simple version: just aggregate all action items across sessions with session date as context (read-only, no state). Full version: add a `completed` boolean, either stored client-side (localStorage) or in a new `action_item_tracking` table. Given the "no new data collection" constraint, localStorage or a simple new table (one migration) is the lowest-friction option.

**Dependencies:** `feedback.actionItemsJson` from all sessions. If tracking completion state, needs either localStorage or a new DB table (1 column migration).

**Recommendation:** Start with read-only aggregated view (low complexity), add completion tracking as a v2 within this milestone.

---

### 7. AI Next Session Recommendation (Enhanced)

**What it is:** A personalized recommendation block: "Your STAR completion rate for 'Result' is 40%. Your next session should focus on closing strong. Recommended type: personality." Shown at top of dashboard, updated after each session.

**Current state:** `nextSessionSuggestion` exists per session as a freeform string. The dashboard does not surface it at all.

**UX reference:** Nike Run Club's "Guided Run" suggestion based on your last performance. Strava's "Recovery Run" recommendation after a hard effort. The key pattern is specificity — not "practice more" but "do X because of Y data."

**Why this is differentiating:** No interview prep platform surfaces a cross-session AI recommendation. This is the feature most likely to drive return visits.

**Complexity:** Medium. Two implementation options:
- Option A (Low): Surface the most recent `nextSessionSuggestion` in the dashboard prominently, and add the top STAR weakness as context. Zero new AI calls.
- Option B (Medium): Generate a fresh cross-session recommendation by sending a summary of last 5 sessions to GPT. One API call per dashboard load (can be cached).

**Recommendation:** Ship Option A immediately. Option B is a follow-up once Option A is validated.

**Dependencies:** `feedback.summaryJson.nextSessionSuggestion` (latest session). `feedback.questionAnalysesJson` (STAR rates for context).

---

## Anti-Features (do not build)

These are patterns from other platforms that feel impressive but are wrong for this product.

| Anti-Feature | Why it fails here |
|---|---|
| Streak counter (Duolingo-style) | This is interview prep, not daily language learning. A "7-day streak" creates anxiety rather than motivation. Users should practice when they have real interviews, not daily. |
| Detailed session timeline scrubber | Replaying a 20-min session at specific timestamps requires storing audio. Storage cost is out of scope; also the per-session report already covers key moments. |
| Social/leaderboard features | Pramp uses peer comparison. Interview prep is deeply personal — comparison adds shame, not motivation. |
| Percentile ranking | "You're in the top 30%" requires a large user base with normalized scores. Misleading with small N. |
| Confetti / celebration animations | Grammarly does this. For a job-seeking context, it reads as tone-deaf. Subtle color changes (score turns green) are sufficient. |
| Detailed body language video heatmap | Requires video storage. Out of scope. Score aggregation is sufficient. |

---

## Complexity Summary

| Feature | Complexity | Data Source | New DB? |
|---|---|---|---|
| Score trend chart (enhanced) | Low | sessions | No |
| STAR radar chart | Medium | feedback.questionAnalysesJson | No |
| Filler word frequency | Low-Medium | feedback.questionAnalysesJson | No |
| Body language score grid | Medium | metricSnapshots.snapshotsJson | No |
| Interview type comparison | Low | sessions | No |
| Action item tracking (read-only) | Medium | feedback.actionItemsJson | No |
| Action item tracking (with completion) | Medium-High | feedback.actionItemsJson | Optional (1 table) |
| AI recommendation (Option A, surfaces existing) | Low | feedback.summaryJson | No |
| AI recommendation (Option B, fresh generation) | Medium | all sessions | No |

---

## Recommended Build Order

1. Score trend chart (enhanced) — highest visibility, lowest effort
2. Interview type comparison — pure SQL aggregation, high signal
3. STAR radar chart — core coaching value, medium effort
4. Body language score grid — unique to this product, medium effort
5. Filler word frequency — fills out the habit-tracking story
6. Action item tracking (read-only) — closes the coaching loop
7. AI recommendation (Option A) — surfaces data already generated

Items 1-3 alone are enough to feel like a product. Items 4-7 are what make it feel differentiated.

---

## UX Pattern Summary

| Pattern | Source | Application |
|---|---|---|
| Colored fill under trend line | Duolingo XP chart | Score trend area chart |
| Metric tiles with trend arrows | Strava effort breakdown | Body language 2x2 grid |
| Skill radar with labeled axes | Pramp skill assessment | STAR radar |
| Recurring issue badge | Grammarly Premium | Action items from past sessions |
| Guided next session with data rationale | Nike Run Club | AI recommendation block |
| Per-type performance breakdown | Strava run type comparison | Interview type comparison |
| Normalized rate (per-minute) not raw count | Strava pace vs distance | Filler word normalization |
