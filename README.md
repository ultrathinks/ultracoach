# UltraCoach

AI 면접 코칭 플랫폼. 산업심리학 기반 구조화 면접을 AI가 진행하고, 표정·자세·시선·제스처를 실시간으로 분석해 맞춤 피드백을 제공합니다.

## 주요 기능

- **AI 면접관** — GPT-4o-mini가 I/O Psychology 기반 구조화 면접을 동적 생성 (행동 질문 60%, 상황 질문 25%, 압박 시나리오)
- **실시간 아바타** — Simli 립싱크 아바타 + ElevenLabs TTS로 실제 면접처럼 음성 질문
- **비언어 분석** — MediaPipe (Face/Pose/Hand Landmarker)가 시선, 자세, 표정, 제스처를 5fps로 추적
- **음성 코칭** — 연습 모드에서 비언어 문제 감지 시 4중 필터(쿨다운/최소 간격/발화 중 금지/심각도 순위)를 거쳐 즉시 음성 코칭
- **STAR 분석** — 질문별 Situation/Task/Action/Result 충족도, 추임새 분석, 개별 피드백
- **성장 추적** — 세션별 전달력/답변력 점수 추이, 이전 액션 아이템 개선 여부 확인

## 기술 스택

| 영역 | 기술 |
|------|------|
| Framework | Next.js 16 (App Router, React Compiler) |
| UI | React 19, Tailwind CSS 4, Motion 12 |
| State | Zustand 5 |
| DB | Drizzle ORM + PostgreSQL (Docker Compose) |
| Local Storage | Dexie 4 (IndexedDB, 비디오 Blob) |
| AI | OpenAI SDK 6 (GPT-4o-mini, GPT-4o, Whisper) |
| Avatar | Simli Client 3 (WebRTC), ElevenLabs (WebSocket TTS) |
| Vision | MediaPipe Tasks Vision 0.10 (Web Worker) |
| Auth | NextAuth v5 (Google OAuth, JWT) |
| Tooling | Biome 2, TypeScript 5 (strict) |

## 시작하기

### 사전 요구사항

- Node.js 22+
- pnpm
- Docker (PostgreSQL)

### 설치

```bash
pnpm install
cp .env.example .env  # API 키 입력
```

### 실행

```bash
docker compose up -d   # PostgreSQL
pnpm db:migrate        # 마이그레이션
pnpm dev               # http://localhost:3000
```

### 환경 변수

| 변수 | 설명 |
|------|------|
| `DATABASE_URL` | PostgreSQL 연결 문자열 |
| `AUTH_SECRET` | NextAuth 시크릿 (`openssl rand -base64 32`) |
| `AUTH_GOOGLE_ID` | Google OAuth Client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth Client Secret |
| `OPENAI_API_KEY` | OpenAI API 키 |
| `ELEVENLABS_API_KEY` | ElevenLabs API 키 |
| `SIMLI_API_KEY` | Simli API 키 |

## 아키텍처

[Feature-Sliced Design](https://feature-sliced.design/) 간소화 버전. 의존성은 항상 아래 방향으로만 흐릅니다.

```
app → widgets → features → entities → shared
```

```
src/
├── app/            # 라우팅 (thin shell) + API routes
├── widgets/        # 페이지 컴포지션 (interview, landing, report, history, nav)
├── features/       # 사용자 시나리오 (interview-engine, body-language, voice-coach, avatar, recording, setup)
├── entities/       # 도메인 모델 (session, metrics, feedback)
└── shared/         # UI 컴포넌트, DB, 유틸리티
```

## 면접 흐름

```
셋업 → 카운트다운 → [질문 생성 → TTS 발화 → VAD 대기 → Whisper 전사]×N → 세션 저장 → GPT-4o 피드백 → 리포트
```

## 스크립트

| 명령어 | 설명 |
|--------|------|
| `pnpm dev` | 개발 서버 (Turbopack) |
| `pnpm build` | 프로덕션 빌드 |
| `pnpm lint` | Biome 린트 |
| `pnpm format` | Biome 포맷 |
| `pnpm db:generate` | Drizzle 마이그레이션 생성 |
| `pnpm db:migrate` | 마이그레이션 실행 |
| `pnpm db:studio` | Drizzle Studio |
