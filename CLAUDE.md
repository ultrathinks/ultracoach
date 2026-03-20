# UltraCoach

AI 면접 코칭 플랫폼. Next.js 16 + React 19 + Tailwind v4.

## 명령어

- `docker compose up -d` — Postgres 시작
- `pnpm dev` — 개발 서버 (Turbopack)
- `pnpm build` — 프로덕션 빌드
- `pnpm lint` — biome check
- `pnpm format` — biome format
- `pnpm db:generate` — Drizzle 마이그레이션 생성
- `pnpm db:migrate` — 마이그레이션 실행

## 스택

- Next.js 16.1.6 (App Router, React Compiler)
- React 19 + Tailwind CSS 4 (`@tailwindcss/postcss`)
- Biome 2 (린트 + 포맷)
- TypeScript 5 (strict)
- Zustand 5 (상태 관리)
- Drizzle ORM + Postgres (Docker Compose)
- Dexie 4 (IndexedDB, 비디오 Blob)
- Motion 12 (애니메이션)
- MediaPipe Tasks Vision 0.10 (Web Worker)
- OpenAI SDK 6 (GPT-4o-mini 질문, GPT-4o 피드백, Whisper)
- Simli Client 3 (WebRTC 아바타)
- ElevenLabs WebSocket (TTS)
- NextAuth v5 (Google OAuth, JWT)
- path alias: `@/*` → `./src/*`

## 아키텍처: FSD 간소화

의존성 규칙: `app/ → widgets → features → entities → shared`

## 프로젝트 구조

```
src/
├── app/                    # Next.js 라우팅 (thin shell)
│   ├── api/                # API routes
│   │   ├── auth/[...nextauth]/
│   │   ├── feedback/
│   │   ├── next-question/
│   │   ├── sessions/
│   │   ├── tts/
│   │   ├── upload-resume/
│   │   └── whisper/
│   ├── interview/
│   ├── results/[id]/
│   └── history/
│
├── widgets/                # 페이지 컴포지션
│   ├── interview/
│   ├── landing/
│   ├── report/
│   ├── history/
│   └── nav/
│
├── features/               # 사용자 액션
│   ├── interview-engine/   # 상태머신 + VAD + Web Speech
│   ├── body-language/      # MediaPipe Web Worker
│   ├── voice-coach/        # 4중 필터 코칭 엔진
│   ├── avatar/             # Simli + ElevenLabs
│   ├── recording/          # MediaRecorder
│   └── setup/              # 셋업 폼 + 카운트다운
│
├── entities/               # 도메인 객체
│   ├── session/
│   ├── metrics/
│   └── feedback/
│
└── shared/                 # 인프라
    ├── ui/                 # Button, Card, Input, Chip
    ├── lib/                # cn, auth, openai, providers
    ├── db/                 # Drizzle 스키마 + 쿼리
    └── config/             # Dexie
```

## 디자인

- 다크 모드 only, 배경 `#09090b`
- Pretendard 폰트
- 그라디언트: 인디고 → 퍼플 → 핑크
- glassmorphism (`backdrop-filter: blur`)
- 점수 색상: 초록 (80+) / 노랑 (60+) / 빨강 (<60)

## 코드 규칙

- Biome 설정 따름
- `as` 타입 단언 금지
- 에러 메시지: 소문자 시작, 마침표 없음
- 컴포넌트: named export (page/layout 제외)
- 파일명: kebab-case
- KISS 원칙

## Git

- 커밋 메시지: 영어, 소문자, `type: description`
