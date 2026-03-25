# Phase 11: Dashboard Layout + Data Layer Refactor - Research

**Researched:** 2026-03-25
**Status:** Complete

## Current Implementation Analysis

### History Page Data Layer

`src/app/history/page.tsx` — Three parallel DB queries via `Promise.all`:

1. **getUserSessions** — selects `id, jobTitle, interviewType, mode, deliveryScore, contentScore, durationSec, createdAt` from `sessions` where `userId = user.id`, ordered `desc(createdAt)`, limit 50
2. **getUserFeedback** — selects `sessionId, summaryJson` from `feedback` inner-joined to `sessions` where `userId = user.id`
3. **getUserSnapshots** — selects `sessionId, snapshotsJson` from `metricSnapshots` inner-joined to `sessions` where `userId = user.id`, ordered `desc(createdAt)`, limit 2

After queries, `createdAt` is serialized to ISO string, then `computeAnalytics(serialized, feedbackRows)` and `computeBodyLanguage(snapshotRows)` are called. Both functions live in `features/analytics/compute-analytics.ts`.

Extraction target: `entities/session/queries.ts` — three named async functions, each taking `userId: string`.

### Navigation Structure

`src/widgets/nav/nav-bar.tsx` — Current `links` array:
```ts
const links = [
  { href: "/interview", label: "면접" },
  { href: "/history", label: "기록" },
];
```

Changes needed:
- `{ href: "/history", label: "기록" }` → `{ href: "/dashboard", label: "대시보드" }`
- `ProfileDropdown` has hardcoded `<Link href="/history">면접 기록</Link>` — must change to `/dashboard` + "대시보드"

Active state uses `pathname === link.href` (exact match). Dashboard sub-routes won't highlight — needs `pathname.startsWith("/dashboard")` for dashboard entry.

### Auth Configuration

- `auth.config.ts` — `pages: { signIn: "/" }`, no redirect callback
- `auth.ts` — spreads `authConfig`, adds DrizzleAdapter, no redirect callback

For LAYOUT-03, two options:
1. Add `redirect` callback to `authConfig` in `auth.config.ts` (cleanest)
2. Pass `callbackUrl="/dashboard"` to `signIn("google")` in `nav-bar.tsx`

### Design System Assets

Available from `globals.css`:
- `.glass` — `background: var(--color-glass)`, `backdrop-filter: blur(16px)`, `border: 1px solid var(--color-glass-border)` — directly applicable to sidebar
- `--color-glass-border: rgba(255, 255, 255, 0.08)` — sidebar right border
- `.gradient-text` — indigo → purple → pink gradient
- `motion` (framer-motion v12.35.2) — available for overlay animation
- `Button` component in `shared/ui/button.tsx`
- `cn()` utility for conditional classes

### Entity Layer

`src/entities/session/` currently has: `index.ts`, `store.ts`, `types.ts`, `interview-config.ts`. No `queries.ts` yet. Adding DB queries here is consistent with FSD (entities own domain data, import from shared is allowed).

### Dashboard Directory

`src/app/dashboard/` does NOT exist yet — must be created.

### Package Dependencies

- `lucide-react` — **NOT installed** (blocker for sidebar icons, must `pnpm add lucide-react`)
- `motion` — installed v12.35.2 (ready for overlay animation)

## Technical Approach

### Dashboard Layout Architecture

```
src/app/dashboard/
  layout.tsx     ← Server Component, auth guard + sidebar wrapper
  page.tsx       ← placeholder for Phase 12
```

`layout.tsx` — Server Component:
```tsx
export default async function DashboardLayout({ children }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <DashboardSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
```

Root layout already renders `<NavBar />` with `pt-16` main padding (64px NavBar height), so `min-h-[calc(100vh-4rem)]` fills remaining viewport.

### Sidebar Component

`DashboardSidebar` — "use client" (needs `usePathname()`). Width: `w-64`. Uses `.glass` + right border.

Sections:
- **상단 코칭**: Overview (`/dashboard`), 면접 기록 (`/dashboard/history`), 약점 분석 (`/dashboard/weaknesses`), 액션 플랜 (`/dashboard/actions`), 학습하기 (`/dashboard/learn`)
- **하단 계정**: 프로필 (`/dashboard/profile`), Billing (`/dashboard/billing`)
- **CTA**: "면접 시작하기" button → `/interview`

Active state: left 2px indigo bar via `border-l-2 border-indigo`. Exact match for `/dashboard`, `startsWith` for sub-routes.

### Mobile Responsive

- `md` (768px) breakpoint
- Below md: sidebar hidden, hamburger button in content area top-left
- Overlay: fixed with `bg-black/50` dim, sidebar slides from left via `motion/react` `x: -256 → 0`
- Close on background click

### Data Layer Extraction

New: `src/entities/session/queries.ts`
```ts
export async function getUserSessions(userId: string) { ... }
export async function getUserFeedback(userId: string) { ... }
export async function getUserSnapshots(userId: string) { ... }
```

Re-export from `entities/session/index.ts`. Compute functions stay in `features/analytics`.

### Route Migration

`src/app/history/page.tsx` → redirect to `/dashboard`:
```tsx
import { redirect } from "next/navigation";
export default function HistoryPage() { redirect("/dashboard"); }
```

## Dependencies & Risks

### Dependencies

| Item | Status | Action |
|------|--------|--------|
| `lucide-react` | NOT installed | `pnpm add lucide-react` |
| `motion` | v12.35.2 | Ready |
| `.glass` CSS | Defined | Ready |
| `Button` component | Available | Ready |
| `auth()` function | Available | Ready |
| `db` + schema | Available | Ready |

### Risks

1. **NavBar active state** — exact match `===` won't highlight "대시보드" on sub-routes. Fix: use `startsWith` for dashboard entry.
2. **Root layout `pt-16`** — sidebar must account for 64px NavBar height with `min-h-[calc(100vh-4rem)]`.
3. **No redirect callback in auth** — cleanest: add to `authConfig`, or pass `callbackUrl` to `signIn()`.
4. **`dashboard/page.tsx` placeholder** — needs minimal content to avoid empty page, Phase 12 fills it.

## Validation Architecture

### Testable Assertions

| Assertion | Verification |
|-----------|-------------|
| `/dashboard` renders sidebar | Navigate — 5 coaching + 2 account items visible |
| NavBar shows "대시보드" | `nav-bar.tsx` links array has `{ href: "/dashboard", label: "대시보드" }` |
| Post-login redirects to `/dashboard` | Sign in — lands on `/dashboard` |
| CTA navigates to `/interview` | Click CTA — URL becomes `/interview` |
| Active indigo bar on current route | Navigate sub-routes — left bar renders |
| Mobile hamburger at <768px | Resize — sidebar hidden, hamburger shows |
| Mobile overlay slides in | Click hamburger — animated sidebar + dim background |
| `/history` redirects to `/dashboard` | Navigate `/history` — URL becomes `/dashboard` |
| Auth guard redirects unauthenticated | Access `/dashboard` without session → `/` |
| Query functions return correct shapes | `getUserSessions/Feedback/Snapshots` return typed results |
