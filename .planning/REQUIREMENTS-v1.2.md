# Requirements: UltraCoach v1.2 Coaching Loop

**Defined:** 2026-03-24
**Core Value:** 사용자가 반복 연습을 통해 면접 실력이 향상되고 있다는 것을 데이터로 확인할 수 있다

## v1.2 Requirements

"채점표"에서 "진짜 코칭"으로 전환. 아쉬운 답변에 모범 답안을 제공하고, 해당 질문을 재연습할 수 있게 한다.

### 모범 답안 생성

- [ ] **REWRT-01**: 피드백 API에서 질문별 suggestedAnswer를 생성한다 (별도 배치 LLM 콜, gpt-5.4-mini)
- [ ] **REWRT-02**: 피드백 분석 시 아쉬운 답변 리스트를 식별한다 (contentScore 기준 하위 항목)
- [ ] **REWRT-03**: 결과 화면에 "아쉬운 답변" 섹션을 표시하고 각 항목에 모범 답안을 보여준다
- [ ] **REWRT-04**: 아쉬운 답변 항목 클릭 시 재연습 드릴 화면으로 이동한다
- [ ] **REWRT-05**: v1.2 이전 세션에서는 모범 답안 미제공 안내를 표시한다

### 재연습 드릴

- [ ] **DRILL-01**: 드릴 모드에서 카메라 + VAD + Whisper로 음성 답변을 수집한다
- [ ] **DRILL-02**: 드릴 피드백 API가 단일 질문 답변에 대해 LLM 분석을 반환한다 (ephemeral, DB 미저장)
- [ ] **DRILL-03**: 드릴 종료 조건을 적용한다 (최대 5회 시도 또는 80점+ 달성 시 완료)
- [ ] **DRILL-04**: 드릴 시작 전 카메라/마이크 권한 확인 준비 화면을 보여준다

## Future Requirements (v1.3+)

### 실시간 내용 코칭

- **RTCCH-01**: 답변 전사를 실시간 분석하여 구조적 피드백 제공 ("핵심부터 말하세요")
- **RTCCH-02**: 답변 시간 초과 알림 (30초 이상 핵심 미등장 시)

### 드릴 고도화

- **DRLEX-01**: 드릴 시도 기록을 DB에 저장하여 개선 추이 추적
- **DRLEX-02**: Before/After 비교 뷰 (원래 답변 vs 재연습 답변 나란히)
- **DRLEX-03**: 핵심 키워드 하이라이트 (모범 답안의 핵심 포인트가 재연습 답변에 포함되었는지)

## Out of Scope

| Feature | Reason |
|---------|--------|
| 답변 암기 유도 UI | 모범 답안은 참고용. "외우기 모드" 같은 UX는 면접 역량 향상에 역효과 |
| 드릴 결과 DB 저장 | v1.2는 ephemeral. 히스토리 오염 방지. 저장은 v1.3+ |
| 아바타(Simli) 드릴 | 드릴은 가벼운 UX. 아바타 호출 불필요 |
| MediaPipe 바디랭귀지 | 드릴은 답변 내용에 집중. 바디랭귀지 분석은 전체 면접에서만 |
| 전체 면접 재연습 | 기존 새 세션 시작으로 충분 |
| 게이미피케이션 (뱃지, 스코어보드) | 취업 준비 맥락에서 톤 부적절 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| REWRT-01 | Phase 8 | Pending |
| REWRT-02 | Phase 8 | Pending |
| REWRT-03 | Phase 9 | Pending |
| REWRT-04 | Phase 9 | Pending |
| REWRT-05 | Phase 9 | Pending |
| DRILL-01 | Phase 10 | Pending |
| DRILL-02 | Phase 9 | Pending |
| DRILL-03 | Phase 10 | Pending |
| DRILL-04 | Phase 10 | Pending |

**Coverage:**
- v1.2 requirements: 9 total
- Mapped to phases: 9
- Unmapped: 0

---
*Requirements defined: 2026-03-24*
*Last updated: 2026-03-24 — phase assignments from ROADMAP-v1.2.md*
