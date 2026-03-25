/**
 * Demo seed script — inserts realistic interview session data.
 *
 * Usage:
 *   node scripts/seed-demo.mjs            # uses first user in DB
 *   node scripts/seed-demo.mjs <userId>   # uses specific user
 *
 * Requires DATABASE_URL in .env.local or .env
 */

import { config } from "dotenv";
import postgres from "postgres";
import { randomUUID } from "node:crypto";

config({ path: ".env.local" });
config({ path: ".env" });

const sql = postgres(process.env.DATABASE_URL);

// ── helpers ──────────────────────────────────────────────────────────
const uid = () => randomUUID();
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(rand(9, 21), rand(0, 59), 0, 0);
  return d;
};

// ── demo data definitions ────────────────────────────────────────────
const interviewTypes = ["personality", "technical", "culture-fit"];
const modes = ["practice", "real"];
const questionTypes = ["behavioral", "technical", "situational", "follow-up"];

const jobTitles = [
  "프론트엔드 개발자",
  "백엔드 개발자",
  "풀스택 개발자",
  "데이터 엔지니어",
  "ML 엔지니어",
  "DevOps 엔지니어",
  "iOS 개발자",
  "PM",
];

const companies = [
  "네이버",
  "카카오",
  "토스",
  "쿠팡",
  "라인",
  "배달의민족",
  "당근마켓",
  null,
];

const sampleQuestions = {
  personality: [
    "자기소개를 해주세요.",
    "본인의 강점과 약점은 무엇인가요?",
    "팀에서 갈등이 생겼을 때 어떻게 해결하나요?",
    "가장 도전적이었던 프로젝트를 소개해주세요.",
    "왜 이 회사에 지원했나요?",
    "5년 후 자신의 모습은 어떨 것 같나요?",
    "리더십을 발휘한 경험이 있나요?",
    "실패를 통해 배운 점은 무엇인가요?",
    "스트레스를 어떻게 관리하나요?",
    "동료와 의견이 다를 때 어떻게 하나요?",
  ],
  technical: [
    "React의 Virtual DOM이 무엇이고 왜 사용하나요?",
    "REST API와 GraphQL의 차이점을 설명해주세요.",
    "데이터베이스 인덱싱이 왜 중요한가요?",
    "TypeScript의 장점은 무엇인가요?",
    "CI/CD 파이프라인 경험을 말씀해주세요.",
    "동시성(concurrency)과 병렬성(parallelism)의 차이는?",
    "캐싱 전략에 대해 설명해주세요.",
    "마이크로서비스 아키텍처의 장단점은?",
  ],
  "culture-fit": [
    "어떤 개발 문화를 선호하나요?",
    "코드 리뷰에 대해 어떻게 생각하나요?",
    "원격 근무 경험이 있나요?",
    "사이드 프로젝트를 하고 있나요?",
    "기술 트렌드를 어떻게 따라가나요?",
    "회사에서 가장 중요하게 생각하는 가치는?",
    "애자일 방법론 경험이 있나요?",
    "멘토링 경험이 있나요?",
    "이상적인 팀 문화는 어떤 건가요?",
    "워라밸에 대한 생각은?",
  ],
};

const sampleAnswers = [
  "저는 3년간 프론트엔드 개발을 해왔고, React와 TypeScript를 주로 사용합니다. 이전 회사에서 디자인 시스템을 구축한 경험이 있습니다.",
  "해당 프로젝트에서 팀원들과 스프린트 회고를 통해 소통을 개선했고, 결과적으로 배포 주기를 2주에서 1주로 단축할 수 있었습니다.",
  "어... 그 부분은 잘 모르겠는데... 그래도 공부해서 빠르게 적응하겠습니다.",
  "네, 그 기술은 프로젝트에서 실제로 사용해봤습니다. 특히 성능 최적화 부분에서 큰 효과를 봤고요, 번들 사이즈를 40% 줄였습니다.",
  "저는 그때 일단 상황을 파악하고, 관련 문서를 찾아본 후에 해결 방안을 제시했습니다. 결과적으로 장애 시간을 30분 내로 줄일 수 있었습니다.",
  "음... 그... 사실 그 부분은 경험이 부족합니다만, 비슷한 프로젝트를 개인적으로 진행하면서 학습하고 있습니다.",
  null,
];

const feedbackSummaries = [
  "전반적으로 기술적 역량을 잘 보여주었으나, STAR 기법 활용이 부족합니다. 답변 구조화에 더 신경 쓰면 좋겠습니다.",
  "자신감 있는 태도가 인상적이었습니다. 다만 기술적 깊이가 부족한 부분이 있었고, 구체적인 수치나 사례를 더 활용하면 좋겠습니다.",
  "답변이 다소 장황했습니다. 핵심을 먼저 말하고 부연 설명하는 연습이 필요합니다. 시선 처리와 자세는 양호했습니다.",
  "기술 면접에 강하지만 인성 면접에서 다소 딱딱한 인상을 줍니다. 자연스러운 대화체로 답변하는 연습을 권합니다.",
  "전체적으로 훌륭한 면접이었습니다. 구체적 사례와 수치를 적절히 활용했고, 논리적인 답변 구조가 좋았습니다.",
];

const actionItemTexts = [
  "STAR 기법으로 답변 구조화 연습하기",
  "기술 면접 예상 질문 20개 준비하기",
  "답변 시 구체적 수치와 성과 포함하기",
  "시선을 카메라에 고정하는 연습하기",
  "답변 길이를 2분 이내로 줄이기",
  "필러 워드(음, 어, 그) 줄이기",
  "자기소개 60초 버전 준비하기",
  "프로젝트 경험 3개를 깊이 있게 준비하기",
  "회사 리서치를 바탕으로 지원 동기 정리하기",
  "모의 면접 주 2회 이상 연습하기",
];

// ── seed logic ───────────────────────────────────────────────────────
async function seed() {
  let userId = process.argv[2];

  if (!userId) {
    const rows = await sql`SELECT id FROM users LIMIT 1`;
    if (rows.length === 0) {
      console.error("DB에 유저가 없습니다. userId를 인자로 넘기거나, 먼저 로그인하세요.");
      process.exit(1);
    }
    userId = rows[0].id;
  }

  console.log(`seeding for userId: ${userId}`);

  const sessionCount = 8;
  const sessionsData = [];
  const questionsData = [];
  const feedbackData = [];
  const metricsData = [];

  for (let i = 0; i < sessionCount; i++) {
    const sessionId = uid();
    const interviewType = interviewTypes[i % interviewTypes.length];
    const mode = modes[i % modes.length];
    const dayOffset = sessionCount - i; // oldest first
    const durationSec = rand(300, 1800);
    const deliveryScore = rand(45, 95);
    const contentScore = rand(40, 92);
    const company = pick(companies);

    sessionsData.push({
      id: sessionId,
      user_id: userId,
      job_title: pick(jobTitles),
      interview_type: interviewType,
      mode,
      status: "completed",
      duration_sec: durationSec,
      delivery_score: deliveryScore,
      content_score: contentScore,
      company_name: company,
      created_at: daysAgo(dayOffset),
    });

    // questions
    const pool = sampleQuestions[interviewType];
    const qCount = rand(5, Math.min(10, pool.length));
    for (let q = 0; q < qCount; q++) {
      questionsData.push({
        id: uid(),
        session_id: sessionId,
        type: pick(questionTypes),
        text: pool[q % pool.length],
        answer: pick(sampleAnswers),
        order: q + 1,
      });
    }

    // feedback
    const questionAnalyses = questionsData
      .filter((q) => q.session_id === sessionId)
      .map((q, idx) => ({
        questionId: idx + 1,
        questionText: q.text,
        answer: q.answer || "",
        starFulfillment: {
          situation: Math.random() > 0.3,
          task: Math.random() > 0.4,
          action: Math.random() > 0.2,
          result: Math.random() > 0.5,
        },
        fillerWords: [
          { word: "음", count: rand(0, 5) },
          { word: "어", count: rand(0, 3) },
          { word: "그", count: rand(0, 4) },
        ].filter((f) => f.count > 0),
        durationSec: rand(30, 180),
        contentScore: rand(40, 95),
        feedback: pick(feedbackSummaries),
      }));

    const keyMoments = [];
    const momentCount = rand(2, 5);
    for (let m = 0; m < momentCount; m++) {
      keyMoments.push({
        timestamp: rand(10, durationSec - 30),
        duration: rand(5, 30),
        description: pick([
          "STAR 기법을 잘 활용한 답변",
          "구체적 수치를 활용한 성과 설명",
          "필러 워드가 많았던 구간",
          "시선이 자주 흔들린 구간",
          "자신감 있는 목소리 톤",
          "답변이 두서없이 길어진 부분",
          "기술적 깊이가 돋보인 답변",
        ]),
        type: pick(["positive", "negative"]),
      });
    }

    const actionCount = rand(2, 4);
    const shuffled = [...actionItemTexts].sort(() => Math.random() - 0.5);
    const actionItems = shuffled.slice(0, actionCount).map((text, idx) => ({
      id: idx + 1,
      text,
    }));

    feedbackData.push({
      id: uid(),
      session_id: sessionId,
      summary_json: {
        deliveryScore,
        contentScore,
        summary: pick(feedbackSummaries),
        growthComparison:
          i > 0
            ? {
                deliveryChange: rand(-10, 15),
                contentChange: rand(-8, 12),
              }
            : null,
        keyMoments,
        actionItems,
        nextSessionSuggestion: "기술 면접 심화 연습을 추천합니다.",
        questionAnalyses,
      },
      key_moments_json: keyMoments,
      action_items_json: actionItems,
      question_analyses_json: questionAnalyses,
    });

    // metric snapshots
    const snapshots = [];
    const snapshotCount = Math.floor(durationSec / 5);
    for (let s = 0; s < Math.min(snapshotCount, 100); s++) {
      snapshots.push({
        timestamp: s * 5,
        gaze: {
          pitch: (Math.random() - 0.5) * 20,
          yaw: (Math.random() - 0.5) * 30,
          isFrontFacing: Math.random() > 0.2,
        },
        posture: {
          shoulderTilt: (Math.random() - 0.5) * 10,
          headOffset: (Math.random() - 0.5) * 8,
          isUpright: Math.random() > 0.15,
        },
        expression: {
          frownScore: Math.random() * 0.5,
          isPositiveOrNeutral: Math.random() > 0.25,
        },
        gesture: {
          wristMovement: Math.random() * 50,
          isModerate: Math.random() > 0.3,
        },
      });
    }

    const events = [];
    const eventCount = rand(3, 10);
    for (let e = 0; e < eventCount; e++) {
      events.push({
        timestamp: rand(5, durationSec - 5),
        type: pick(["gaze", "posture", "expression", "gesture"]),
        message: pick([
          "시선이 카메라에서 벗어났습니다",
          "자세가 기울어졌습니다",
          "표정이 경직되었습니다",
          "손동작이 과도합니다",
          "좋은 자세를 유지하고 있습니다",
          "자연스러운 표정입니다",
        ]),
      });
    }

    metricsData.push({
      id: uid(),
      session_id: sessionId,
      snapshots_json: snapshots,
      events_json: events,
    });
  }

  // ── insert ──
  await sql.begin(async (tx) => {
    for (const s of sessionsData) {
      await tx`INSERT INTO sessions ${tx(s)}`;
    }
    for (const q of questionsData) {
      await tx`INSERT INTO questions ${tx(q)}`;
    }
    for (const f of feedbackData) {
      await tx`INSERT INTO feedback ${tx(f)}`;
    }
    for (const m of metricsData) {
      await tx`INSERT INTO metric_snapshots ${tx(m)}`;
    }
  });

  console.log(`inserted ${sessionsData.length} sessions, ${questionsData.length} questions, ${feedbackData.length} feedback, ${metricsData.length} metric snapshots`);
  await sql.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
