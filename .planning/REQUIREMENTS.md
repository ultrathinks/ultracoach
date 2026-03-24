# Requirements: UltraCoach

**Defined:** 2026-03-24
**Core Value:** 사용자가 반복 연습을 통해 면접 실력이 향상되고 있다는 것을 데이터로 확인할 수 있다

## v1.1 Requirements

v1.1 마일스톤 요구사항. 대시보드 강화를 통해 "한 번 쓰고 끝나는 도구"에서 "계속 돌아오는 서비스"로 전환한다.

### 성장 추적

- [x] **GROW-01**: 사용자가 전체 세션의 전달력/답변력 점수 추이 차트를 볼 수 있다
- [x] **GROW-02**: 사용자가 첫 세션 대비 변화율을 확인할 수 있다
- [x] **GROW-03**: 사용자가 총 세션 수와 연습 빈도를 확인할 수 있다

### 약점 분석

- [ ] **WEAK-01**: 사용자가 전체 세션의 STAR 충족률을 레이더 차트로 볼 수 있다
- [ ] **WEAK-02**: 사용자가 추임새 빈도를 분당 기준으로 분석할 수 있다
- [ ] **WEAK-03**: 사용자가 바디랭귀지 점수를 카테고리별(시선/자세/표정/제스처)로 볼 수 있다

### 비교 분석

- [x] **COMP-01**: 사용자가 면접 유형별(인성/기술/컬처핏) 점수를 비교할 수 있다

### 액션 추적

- [ ] **ACTN-01**: 사용자가 최근 세션의 액션아이템을 대시보드에서 볼 수 있다
- [ ] **ACTN-02**: 사용자가 AI가 생성한 다음 세션 추천을 확인할 수 있다

### 인프라

- [ ] **INFR-01**: 세션이 0~2개인 사용자에게 적절한 빈 상태 화면을 보여준다
- [x] **INFR-02**: 모든 jsonb 데이터를 zod 스키마로 파싱한다 (`as` 캐스트 금지)
- [x] **INFR-03**: 차트 컴포넌트는 client-only + dynamic import로 SSR을 하지 않는다

## v2 Requirements

### 알림/리마인더

- **NOTF-01**: 사용자가 연습 리마인더를 설정할 수 있다
- **NOTF-02**: 사용자가 목표 달성 시 알림을 받을 수 있다

### 고급 분석

- **ADVN-01**: 사용자가 특정 기간(주간/월간)으로 필터링할 수 있다
- **ADVN-02**: 사용자가 세션 간 액션아이템 개선 여부를 추적할 수 있다

## Out of Scope

| Feature | Reason |
|---------|--------|
| 소셜 비교/순위 | 취업 준비 맥락에서 부적절한 동기 부여 |
| 스트릭 카운터 | 면접 연습에 "매일 해야 한다" 압박은 역효과 |
| 컨페티 애니메이션 | 취업 준비생에게 톤 부적절 |
| 새 데이터 수집 | 기존 jsonb 데이터만으로 충분, 복잡도 증가 방지 |
| 별도 /dashboard 라우트 | /history 확장으로 충분, 네비게이션 변경 불필요 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFR-02 | Phase 6 | Complete |
| INFR-03 | Phase 6 | Complete |
| GROW-01 | Phase 6 | Complete |
| GROW-02 | Phase 6 | Complete |
| GROW-03 | Phase 6 | Complete |
| COMP-01 | Phase 6 | Complete |
| WEAK-01 | Phase 7 | Pending |
| WEAK-02 | Phase 7 | Pending |
| WEAK-03 | Phase 7 | Pending |
| ACTN-01 | Phase 7 | Pending |
| ACTN-02 | Phase 7 | Pending |
| INFR-01 | Phase 7 | Pending |

**Coverage:**
- v1.1 requirements: 12 total
- Mapped to phases: 12
- Unmapped: 0

---
*Requirements defined: 2026-03-24*
*Last updated: 2026-03-24 — phase assignments confirmed in ROADMAP.md*
