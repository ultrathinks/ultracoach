# Requirements: UltraCoach

**Defined:** 2026-03-25
**Core Value:** 사용자가 반복 연습을 통해 면접 실력이 향상되고 있다는 것을 데이터로 확인할 수 있다

## v1.3 Requirements

Requirements for Dashboard restructure. Each maps to roadmap phases.

### Layout

- [x] **LAYOUT-01**: 사용자가 /dashboard에서 사이드바 네비게이션으로 각 섹션을 이동할 수 있다
- [x] **LAYOUT-02**: 헤더 네비게이션에서 "기록" 대신 "대시보드" 링크를 볼 수 있다
- [x] **LAYOUT-03**: 로그인 완료 시 자동으로 /dashboard로 이동한다
- [x] **LAYOUT-04**: 사이드바 하단에서 "면접 시작하기" CTA를 클릭해 면접을 시작할 수 있다

### Dashboard

- [x] **DASH-01**: Overview 페이지에서 통계 카드, 점수 추이, 최근 세션 요약을 한눈에 볼 수 있다
- [x] **DASH-02**: 면접 기록 페이지에서 전체 세션 목록과 유형별 비교 차트를 볼 수 있다
- [x] **DASH-03**: 약점 분석 페이지에서 STAR 레이더, 바디랭귀지, 추임새 히트맵을 볼 수 있다
- [x] **DASH-04**: 액션 플랜 페이지에서 액션 트래커와 AI 추천을 볼 수 있다

### Learn

- [ ] **LEARN-01**: 학습하기 페이지에서 면접 팁 글 목록을 볼 수 있다
- [ ] **LEARN-02**: 글을 클릭하면 MDX로 렌더링된 상세 페이지를 읽을 수 있다
- [ ] **LEARN-03**: 면접 팁 MDX 콘텐츠 ~10개가 제공된다

### Profile

- [ ] **PROF-01**: 프로필 페이지에서 내 정보(이름, 이메일, 프로필 사진)를 확인할 수 있다
- [ ] **PROF-02**: 프로필 정보를 수정할 수 있다

### Billing

- [ ] **BILL-01**: Billing 페이지에서 플랜 카드(Free/Pro)를 볼 수 있다
- [ ] **BILL-02**: 현재 플랜(Free)이 표시된다

## Future Requirements

### Billing (Real)

- **BILL-03**: 사용자가 Pro 플랜으로 업그레이드할 수 있다 (실제 결제)
- **BILL-04**: 월/연간 결제 주기를 선택할 수 있다

### Profile (Extended)

- **PROF-03**: 직무/경력 정보를 프로필에 저장할 수 있다
- **PROF-04**: 알림 설정을 관리할 수 있다

## Out of Scope

| Feature | Reason |
|---------|--------|
| 실제 결제 연동 | v1.3은 UI만, 결제는 추후 |
| 온보딩 위자드 | v1.3 범위 초과 |
| 팀/조직 기능 | 개인 코칭 도구로 유지 |
| 사용량 제한 (Free 3회/월) | 결제 연동 없이 의미 없음 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| LAYOUT-01   | 11    | Not started |
| LAYOUT-02   | 11    | Not started |
| LAYOUT-03   | 11    | Not started |
| LAYOUT-04   | 11    | Not started |
| DASH-01     | 12    | Not started |
| DASH-02     | 12    | Not started |
| DASH-03     | 12    | Not started |
| DASH-04     | 12    | Not started |
| LEARN-01    | 13    | Not started |
| LEARN-02    | 13    | Not started |
| LEARN-03    | 13    | Not started |
| PROF-01     | 14    | Not started |
| PROF-02     | 14    | Not started |
| BILL-01     | 14    | Not started |
| BILL-02     | 14    | Not started |

**Coverage:**
- v1.3 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0

---
*Requirements defined: 2026-03-25*
*Last updated: 2026-03-25 after initial definition*
