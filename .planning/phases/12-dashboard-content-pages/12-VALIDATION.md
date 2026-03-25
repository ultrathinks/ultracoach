---
phase: 12
slug: dashboard-content-pages
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Next.js build + Biome lint |
| **Config file** | `biome.json`, `next.config.ts` |
| **Quick run command** | `pnpm lint` |
| **Full suite command** | `pnpm build && pnpm lint` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm lint`
- **After every plan wave:** Run `pnpm build && pnpm lint`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | DASH-01 | build | `pnpm build` | N/A | pending |
| 12-02-01 | 02 | 1 | DASH-02 | build | `pnpm build` | N/A | pending |
| 12-03-01 | 03 | 1 | DASH-03 | build | `pnpm build` | N/A | pending |
| 12-04-01 | 04 | 1 | DASH-04 | build | `pnpm build` | N/A | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. No new test framework needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Overview shows stat cards + score trend + recent sessions | DASH-01 | Visual layout verification | Visit /dashboard, check 3-col stat cards, line chart, recent sessions |
| History shows session list + charts | DASH-02 | Visual layout verification | Visit /dashboard/history, check session list, score trend, type comparison |
| Weaknesses shows radar + body language + heatmap | DASH-03 | Visual layout verification | Visit /dashboard/weaknesses, check STAR radar, body language panel, filler heatmap |
| Actions shows tracker + AI recommendation | DASH-04 | Visual layout verification | Visit /dashboard/actions, check action tracker, AI recommendation card |
| Empty state on all pages with 0 sessions | All | Visual + conditional rendering | Delete all sessions, visit each page, check empty state CTA |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
