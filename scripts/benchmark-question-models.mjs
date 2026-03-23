import { performance } from "node:perf_hooks";
import process from "node:process";
import OpenAI from "openai";

function parseEnv(text) {
  const env = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

async function loadEnvFile(path) {
  const fs = await import("node:fs/promises");
  try {
    const raw = await fs.readFile(path, "utf8");
    const parsed = parseEnv(raw);
    for (const [k, v] of Object.entries(parsed)) {
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {
    // ignore missing files
  }
}

function mean(values) {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[idx];
}

function stddev(values) {
  if (values.length <= 1) return 0;
  const m = mean(values);
  const variance =
    values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function formatMs(v) {
  return `${v.toFixed(1)}ms`;
}

function extractQuestionText(content) {
  if (!content) return "";
  try {
    const parsed = JSON.parse(content);
    if (typeof parsed.question === "string") return parsed.question;
  } catch {
    return content;
  }
  return "";
}

async function runOne(client, model, payload) {
  const start = performance.now();
  const completion = await client.chat.completions.create({
    model,
    ...payload,
  });
  const elapsedMs = performance.now() - start;
  const content = completion.choices[0]?.message?.content ?? "";
  const question = extractQuestionText(content);

  return {
    elapsedMs,
    outputChars: content.length,
    questionChars: question.length,
    looksLikeJson: content.trim().startsWith("{"),
  };
}

async function benchmarkModel({ client, model, runs, payload, warmupRuns }) {
  const warmups = [];
  for (let i = 0; i < warmupRuns; i += 1) {
    // warmup is excluded from stats to reduce cold-start bias
    warmups.push(await runOne(client, model, payload));
  }

  const results = [];
  for (let i = 0; i < runs; i += 1) {
    results.push(await runOne(client, model, payload));
  }

  const elapsed = results.map((r) => r.elapsedMs);
  const outputChars = results.map((r) => r.outputChars);
  const questionChars = results.map((r) => r.questionChars);
  const jsonRate =
    results.filter((r) => r.looksLikeJson).length / Math.max(1, results.length);

  return {
    model,
    warmupCount: warmups.length,
    runCount: results.length,
    avgMs: mean(elapsed),
    p50Ms: percentile(elapsed, 50),
    p95Ms: percentile(elapsed, 95),
    minMs: Math.min(...elapsed),
    maxMs: Math.max(...elapsed),
    stdMs: stddev(elapsed),
    avgOutputChars: mean(outputChars),
    avgQuestionChars: mean(questionChars),
    jsonRate,
  };
}

function printSummary(rowA, rowB) {
  const rows = [rowA, rowB];
  const line = "-".repeat(108);
  const header =
    "model".padEnd(20) +
    "runs".padStart(6) +
    "avg".padStart(12) +
    "p50".padStart(12) +
    "p95".padStart(12) +
    "min".padStart(12) +
    "max".padStart(12) +
    "json".padStart(10) +
    "qChars".padStart(12);

  console.log("\nLatency benchmark (excluding warmup):");
  console.log(line);
  console.log(header);
  console.log(line);
  for (const r of rows) {
    const data =
      r.model.padEnd(20) +
      `${r.runCount}`.padStart(6) +
      formatMs(r.avgMs).padStart(12) +
      formatMs(r.p50Ms).padStart(12) +
      formatMs(r.p95Ms).padStart(12) +
      formatMs(r.minMs).padStart(12) +
      formatMs(r.maxMs).padStart(12) +
      `${(r.jsonRate * 100).toFixed(0)}%`.padStart(10) +
      `${r.avgQuestionChars.toFixed(1)}`.padStart(12);
    console.log(data);
  }
  console.log(line);

  const faster =
    rowA.avgMs < rowB.avgMs
      ? [rowA, rowB]
      : rowB.avgMs < rowA.avgMs
        ? [rowB, rowA]
        : null;

  if (!faster) {
    console.log("Speed result: average latency is effectively tied.");
    return;
  }

  const diff = faster[1].avgMs - faster[0].avgMs;
  const pct = (diff / faster[1].avgMs) * 100;
  console.log(
    `Speed result: ${faster[0].model} is faster by ${formatMs(diff)} (${pct.toFixed(1)}% vs slower model avg).`,
  );
}

async function main() {
  await loadEnvFile(".env.local");
  await loadEnvFile(".env");

  if (!process.env.OPENAI_API_KEY) {
    console.error("missing OPENAI_API_KEY in environment");
    process.exit(1);
  }

  const runs = Number(process.env.BENCH_RUNS ?? "12");
  const warmupRuns = Number(process.env.BENCH_WARMUP_RUNS ?? "1");
  const modelA = process.env.BENCH_MODEL_A ?? "gpt-5.4-mini";
  const modelB = process.env.BENCH_MODEL_B ?? "gpt-4o-mini";

  const payload = {
    temperature: 0.7,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "너는 한국어 모의면접 면접관이다. 반드시 JSON으로만 답변한다: {\"question\": string, \"type\": string, \"shouldEnd\": boolean}",
      },
      {
        role: "user",
        content: [
          "직무: 백엔드 엔지니어",
          "면접 유형: 기술면접",
          "대화 이력 (2회):",
          "면접관: 자기소개 부탁드립니다.",
          "지원자: 3년차 백엔드 개발자로 결제 시스템을 주로 개발했습니다.",
          "다음 면접 질문 1개를 생성하세요.",
        ].join("\n"),
      },
    ],
  };

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  console.log(
    `Running benchmark: ${modelA} vs ${modelB} | runs=${runs}, warmup=${warmupRuns}`,
  );

  const first = await benchmarkModel({
    client,
    model: modelA,
    runs,
    payload,
    warmupRuns,
  });
  const second = await benchmarkModel({
    client,
    model: modelB,
    runs,
    payload,
    warmupRuns,
  });

  printSummary(first, second);
}

main().catch((error) => {
  console.error("benchmark failed:", error?.message ?? error);
  process.exit(1);
});
