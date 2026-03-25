---
phase: 11
slug: dashboard-layout-data-layer-refactor
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (if available) / manual browser verification |
| **Config file** | none — primarily UI + routing, manual verification |
| **Quick run command** | `pnpm build` |
| **Full suite command** | `pnpm build && pnpm lint` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm build`
- **After every plan wave:** Run `pnpm build && pnpm lint`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | LAYOUT-01 | build | `pnpm build` | N/A | pending |
| 11-02-01 | 02 | 1 | LAYOUT-02 | build+lint | `pnpm build && pnpm lint` | N/A | pending |
| 11-03-01 | 03 | 2 | LAYOUT-03 | build | `pnpm build` | N/A | pending |
| 11-04-01 | 04 | 2 | LAYOUT-04 | build | `pnpm build` | N/A | pending |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

- [ ] `lucide-react` — must be installed before sidebar implementation

*Existing build infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sidebar renders with all section links | LAYOUT-01 | Visual UI layout | Navigate to /dashboard, verify 7 sidebar items visible |
| NavBar shows "대시보드" | LAYOUT-02 | Visual text change | Check header navigation label |
| Post-login redirect to /dashboard | LAYOUT-03 | OAuth flow | Sign out, sign in via Google, verify landing page |
| CTA button navigates to /interview | LAYOUT-04 | Click interaction | Click "면접 시작하기", verify URL |
| Mobile hamburger at <768px | LAYOUT-01 | Responsive UI | Resize browser below 768px |
| /history redirects to /dashboard | Refactoring | Redirect behavior | Navigate to /history, verify URL change |
| Active indigo bar on current route | LAYOUT-01 | Visual state | Navigate between sub-routes |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
