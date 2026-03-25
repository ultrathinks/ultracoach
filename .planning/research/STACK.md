# Stack Research: Dashboard Analytics

**Date:** 2026-03-24
**Scope:** New capabilities only. Next.js 15 / Tailwind 4 / Drizzle / PostgreSQL already confirmed.

---

## 1. Charting Library

### Decision: Recharts 2.15.4 (v2 latest, not v3)

**Why v2, not v3:**
Recharts 3.x (`3.8.0`) introduced `@reduxjs/toolkit` + `react-redux` as runtime dependencies for internal state management. This adds ~30KB gzip on top of the chart bundle and pulls a full Redux store into a UI library — unnecessary overhead for a dashboard. Recharts 2.x has no Redux dependency and a lighter dep tree (`lodash`, `react-smooth`, `victory-vendor`).

**Why Recharts over alternatives:**

| Library | Version | React 19 | SSR | Bundle (gzip) | Verdict |
|---------|---------|----------|-----|---------------|---------|
| **Recharts 2.x** | 2.15.4 | Yes (explicit peerDep) | SVG — renders server-side | ~50KB | **Use this** |
| Recharts 3.x | 3.8.0 | Yes | SVG | ~90KB (+ Redux) | Avoid: Redux bloat |
| Nivo | 0.99.0 | Yes (^19.0 ok) | SSR requires `@nivo/core` + per-chart packages | ~80-100KB for radar alone | Overkill: heavy D3 tree |
| Chart.js | 4.5.1 | Yes | Canvas — no SSR, needs `dynamic()` wrapper for every chart | ~65KB | Canvas ≠ dark-mode glassmorphism |
| Tremor | 3.18.7 | **No** (peerDep: `^18.0.0`) | Wraps Recharts, adds Tailwind class coupling | Recharts + Tremor overhead | Blocked: React 19 incompatible |

**Recharts 2.x with this stack:**
- SVG output composable with existing `motion/react` animations
- CSS variable colors (`var(--color-indigo)` etc.) work directly as `stroke`/`fill` props — same pattern as existing `ScoreRing` and `MiniChart`
- Named exports support `dynamic()` for client-only rendering (needed because Recharts uses `window` internally)
- `react-is@^18.3.1` peerDep: React 19 ships `react-is@19.2.4` — compatible

**Install:**
```
pnpm add recharts@2.15.4 react-is
```

**Required chart types mapped to Recharts components:**

| Dashboard feature | Recharts component |
|---|---|
| 점수 추이 (score trend) | `LineChart` + `Line` |
| STAR 레이더 차트 | `RadarChart` + `Radar` + `PolarGrid` |
| 추임새 히트맵 | Raw SVG grid (no Recharts needed — see §4) |
| 바디랭귀지 점수 | `RadarChart` or `BarChart` |
| 면접유형별 비교 | `BarChart` (grouped) |

**SSR note:** Wrap all Recharts components in `dynamic(() => import(...), { ssr: false })`. The server-rendered page shells can load instantly; charts hydrate on client.

---

## 2. Data Aggregation from JSONB Columns

### Pattern: Server component queries, typed extraction, pass to client charts

The existing schema has three relevant data sources for the dashboard:

**`sessions` table** — direct columns, no JSONB needed:
```sql
SELECT created_at, delivery_score, content_score, interview_type, mode
FROM sessions
WHERE user_id = $1
ORDER BY created_at ASC
```
Drizzle: straightforward `.select().from(sessions).where(eq(...)).orderBy(asc(sessions.createdAt))`. No JSON parsing required for trend charts.

**`feedback.summary_json` (JSONB)** — contains `questionAnalyses` with `fillerWords`, `starFulfillment`, `contentScore` per question. Access pattern:

```ts
// In a Next.js server component or API route:
import { sessionFeedbackSchema } from "@/entities/feedback/schema";

const rows = await db
  .select({ summaryJson: feedback.summaryJson, sessionId: feedback.sessionId })
  .from(feedback)
  .innerJoin(sessions, eq(feedback.sessionId, sessions.id))
  .where(eq(sessions.userId, userId));

const parsed = rows.map(r => ({
  sessionId: r.sessionId,
  data: sessionFeedbackSchema.parse(r.summaryJson),
}));
```

The `sessionFeedbackSchema` (already in `src/entities/feedback/schema.ts`) covers `deliveryScore`, `contentScore`, `questionAnalyses[].fillerWords`, `questionAnalyses[].starFulfillment`, `growthComparison`. No new schema needed.

**`metricSnapshots.snapshots_json` (JSONB)** — per-frame data for gaze/posture/expression/gesture. Structure confirmed in `src/app/api/sessions/route.ts`:
```ts
{ timestamp, gaze.isFrontFacing, posture.isUpright, expression.isPositiveOrNeutral, gesture.isModerate }
```

For dashboard aggregation, compute boolean averages per session (% of frames where condition = true). This aggregation is best done in the server component, not the DB, since the data volume per session is moderate and PostgreSQL JSONB aggregate functions (`jsonb_array_elements`) add query complexity without meaningful perf benefit at this scale.

```ts
// Compute body language scores from snapshots
function aggregateMetrics(snapshots: MetricSnapshot[]) {
  const n = snapshots.length;
  if (n === 0) return null;
  return {
    gaze: Math.round(snapshots.filter(s => s.gaze.isFrontFacing).length / n * 100),
    posture: Math.round(snapshots.filter(s => s.posture.isUpright).length / n * 100),
    expression: Math.round(snapshots.filter(s => s.expression.isPositiveOrNeutral).length / n * 100),
    gesture: Math.round(snapshots.filter(s => s.gesture.isModerate).length / n * 100),
  };
}
```

**Do not** use raw PostgreSQL JSONB aggregation (`json_array_elements`, `json_agg`) in Drizzle queries for this. The query complexity is not worth it at <1000 rows per user, and the TypeScript types become `unknown`. Parse in application layer using existing Zod schemas.

---

## 3. Animation for Dashboard Transitions

### Decision: Use existing `motion/react` (Motion 12.35.2) — no new library

The project already has `motion` at `12.35.2` (Framer Motion's renamed package). It is actively used in `history-dashboard.tsx`, `report-view.tsx`, and `score-ring.tsx` for stagger animations and SVG path animations.

For dashboard transitions, continue this pattern:

```tsx
// Stagger chart card entrance (same pattern as history-dashboard)
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: index * 0.08 }}
>
```

For Recharts chart data animations: Recharts 2.x has built-in `isAnimationActive` prop on `Line`, `Bar`, `Radar` — use these for initial data render. Then use `motion/react` only for the card/container entrance, not the chart internals. Mixing both is fine since they operate on different DOM elements.

**Specific patterns:**
- Score counters: `motion` `useSpring` or `useMotionValue` for number tick-up animation
- Chart card entrance: stagger with `delay: i * 0.06` (matches existing pattern)
- Tab/filter switches: `AnimatePresence` for crossfade between filtered views

No additional animation library needed.

---

## 4. Filler Word Heatmap

### Decision: Raw SVG, same as existing MiniChart

The heatmap (추임새 히트맵) visualizes which filler words appeared how often across sessions. This is a grid of colored cells — GitHub-style contribution graph pattern.

Data shape needed:
```ts
// word × session_date grid
{ word: "어", sessions: [{ date: "2026-03-01", count: 3 }, ...] }[]
```

Implementation: inline SVG `<rect>` grid with Tailwind classes for color intensity. No library needed. The existing `MiniChart` in `history-dashboard.tsx` proves this pattern works and stays within the design system.

This is the one chart type where a library would add zero value over raw SVG.

---

## 5. What NOT to Add

| Library | Why not |
|---|---|
| `@nivo/*` | Each chart type is a separate npm package. Radar + Line + Bar = 3 installs, each pulling full D3. Total bundle impact is 2-3x Recharts for equivalent features. |
| `@tremor/react` | React 19 incompatible (peerDep `^18.0.0`). Also locks Tailwind class naming to Tremor's conventions, which conflicts with the custom `@theme inline` block in `globals.css`. |
| `chart.js` / `react-chartjs-2` | Canvas-based — no SVG, no Tailwind color variables, no smooth CSS animations. Accessibility is worse. The dark glassmorphism design system needs SVG. |
| `recharts@3.x` | Redux runtime dependency adds unnecessary bundle weight. The feature delta vs 2.x is not relevant to this dashboard scope. |
| `D3.js` directly | Already covered by Recharts internals for the chart types needed. Only add if building highly custom visualization (not the case here). |
| `react-spring` | Redundant with `motion/react` already in the project. Two animation libraries in one codebase causes conflicts and increases bundle size. |
| Separate "analytics SDK" (PostHog, Mixpanel, etc.) | The task is visualizing the app's own stored data, not product telemetry. These SDKs are for a different purpose. |

---

## 6. Summary: Additions to package.json

```json
"recharts": "2.15.4",
"react-is": "^19.0.0"
```

That's the only new runtime dependency. Everything else — animation, CSS, data fetching, types — is covered by the existing stack.

**react-is note:** Recharts 2.x has `react-is@^18.3.1` as a peerDep. React 19 ships `react-is@19.2.4`. pnpm resolves this correctly without a forced install, but explicitly listing it as `^19.0.0` avoids any version ambiguity in the lockfile.

---

## 7. Integration Checklist

- [ ] All Recharts components wrapped in `dynamic(() => import(...), { ssr: false })` — prevents `window` reference errors in RSC/SSR
- [ ] Colors passed as `stroke="var(--color-indigo)"` / `fill="var(--color-purple)"` to match `globals.css` theme tokens
- [ ] `ResponsiveContainer` used for all chart wrappers — do not set fixed px widths
- [ ] `isAnimationActive={true}` on first render, then consider disabling on re-renders if filtering causes janky redraws
- [ ] Dashboard data fetched in server components (`.../page.tsx`), aggregated, then passed as serializable props to client chart components — no client-side DB calls
- [ ] `sessionFeedbackSchema.parse()` used for all JSONB reads — never cast as `unknown` directly to chart data
