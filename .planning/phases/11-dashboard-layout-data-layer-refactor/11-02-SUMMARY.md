---
phase: 11
plan: "02"
status: complete
---
# Summary: 11-02 Navigation + auth redirect changes

## What was built
- Changed nav header from "기록" to "대시보드" pointing to /dashboard
- Fixed active state detection for dashboard sub-routes using startsWith
- Updated ProfileDropdown link to /dashboard
- Added post-login redirect to /dashboard via callbackUrl

## Key files
### Modified
- src/widgets/nav/nav-bar.tsx

## Decisions
- None (followed plan exactly)

## Issues
- None
