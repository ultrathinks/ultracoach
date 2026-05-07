# UltraCoach

AI 면접 코칭 플랫폼.

## 명령어

- `docker compose up -d` — Postgres 시작
- `pnpm dev` — 개발 서버 (Turbopack)
- `pnpm build` — 프로덕션 빌드
- `pnpm lint` — Biome 린트 (`biome check`)
- `pnpm format` — Biome 포맷 (`biome format --write`)
- `pnpm db:generate` — Drizzle 마이그레이션 생성
- `pnpm db:migrate` — 마이그레이션 실행

## 아키텍처

FSD 간소화. 의존성: `app/ → widgets → features → entities → shared`. 상위 레이어가 하위를 import하는 것만 허용.

- `app/` — Next.js 라우팅 thin shell. 페이지는 widget을 렌더링만 함
- `app/api/` — API route handlers. 각 route는 독립적
- `widgets/` — 페이지 단위 컴포지션. feature를 조합
- `features/` — 사용자 시나리오 단위. hook + 로직 + UI
- `entities/` — 도메인 모델. Zustand store + 타입
- `shared/` — UI 컴포넌트, DB, 유틸리티. 비즈니스 로직 없음

## 코드 규칙

- Biome 2 설정을 따름 (double quotes, semicolons, space indent 2)
- `as` 타입 단언 금지 (`as const`만 허용). 올바른 타입을 찾아 사용
- 에러 메시지: 소문자 시작, 마침표 없음
- 컴포넌트: named export (page/layout만 default export)
- 파일명: kebab-case
- index.ts는 re-export만. 로직 넣지 않음
- path alias: `@/*` → `./src/*`

## 네이밍 규칙

- **boolean**: `is*` / `has*` / `can*` / `should*`
- **ref**: `*Ref` suffix 1회만 (`xxxTimerRef` 같은 이중 suffix 금지)
- **이벤트**: 컴포넌트 내부 `handle*`, props로 받을 때 `on*`
- **비동기 함수**: 동사 원형 (`fetchQuestion`, NOT `fetchingQuestion`)
- **vendor 이름은 `providers/<vendor>.ts` 안에서만**: 함수명·타입명 외부 노출 금지 (`createSimliAvatar` 같은 이름 X)
- **store action alias 변경 금지**: `useStore(s => s.setDevices)`를 `setStoreDevices`로 받지 말 것. 같은 이름 유지
- **DB column suffix(`*Json`)는 도메인 타입에 노출 금지**: queries 레이어에서 `summaryJson` → `summary`로 매핑
- **gap/padding**: Tailwind 숫자 단계 사용. `gap-2/4/6/8` 위주, `gap-3/5/7` 사용 금지

## API 라우트 규칙

- 컬렉션은 복수 명사: `/api/sessions`, `/api/payment-methods`
- URL 경로 kebab-case, JSON body camelCase
- 표준 동사 우선 (POST/GET/PATCH/DELETE), 액션은 POST + 동사 서브리소스 (`/subscriptions/current/resume`)
- 모든 에러 응답: RFC 9457 Problem Details 형식 + `Content-Type: application/problem+json`
- 멱등성 필요한 POST: `Idempotency-Key` 헤더 처리 (예: 토스 결제는 orderId)
- pagination: cursor 기반 (`?limit=20&starting_after=:id`), offset/skip 금지
- timestamp: ISO 8601 UTC (`Z` suffix)
- admin 전용: `/api/admin/*` 네임스페이스. proxy.ts에서 role 검사 일괄 적용

## 디자인 시스템

- 다크 모드 only. 배경 `#09090b`
- Pretendard 폰트 (CDN)
- 그라디언트: indigo → purple → pink. `gradient-text` 클래스 사용
- glassmorphism: `glass` 클래스 사용
- 점수 색상: green (80+) / yellow (60+) / red (<60)
- 커스텀 색상은 `globals.css`의 `@theme inline` 블록에 정의됨

## 핵심 패턴

### 면접 루프

interview-screen에서 while 루프로 `질문 생성 → TTS → VAD 대기 → Whisper 전사`를 반복. `loopAbortRef`로 중단 제어.

### VAD (Voice Activity Detection)

RMS 기반. threshold 0.035, 무음 시 발화 종료 판정 (기본 3.5초, 짧은 발화 후엔 7초). 최소 발화 1초. `keepAlive()`로 silence 타이머 리셋.

### API route 인증

프록시(`src/proxy.ts`)가 `/api/auth` 외 모든 API에 JWT 인증 적용. `auth.config.ts`(Edge 호환)와 `auth.ts`(DB adapter 포함) 분리 구조. 소유권 확인이 필요한 route(`/api/sessions`, `/api/sessions/[id]/feedback`)는 handler 내부에서 추가로 `auth()` 호출.

## Git

- 커밋 메시지: 영어, 소문자, `type: description`
- type: feat, fix, refactor, chore, docs, test
