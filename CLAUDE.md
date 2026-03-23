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
- `as` 타입 단언 금지. 올바른 타입을 찾아 사용
- 에러 메시지: 소문자 시작, 마침표 없음
- 컴포넌트: named export (page/layout만 default export)
- 파일명: kebab-case
- index.ts는 re-export만. 로직 넣지 않음
- path alias: `@/*` → `./src/*`

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

RMS 기반. threshold 0.035, 2.5초 무음 시 발화 종료 판정. 최소 발화 1초.

### 코칭 엔진 4중 필터

1. 발화 중 금지 (isSpeaking)
2. 최소 간격 20초
3. 쿨다운 20초
4. 심각도 순위로 최악 1개만 알림

### API route 인증

프록시(`src/proxy.ts`)가 `/api/auth` 외 모든 API에 JWT 인증 적용. `auth.config.ts`(Edge 호환)와 `auth.ts`(DB adapter 포함) 분리 구조. 소유권 확인이 필요한 route(`/api/sessions`, `/api/sessions/[id]/feedback`)는 handler 내부에서 추가로 `auth()` 호출.

## Git

- 커밋 메시지: 영어, 소문자, `type: description`
- type: feat, fix, refactor, chore, docs, test
