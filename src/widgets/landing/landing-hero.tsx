"use client";

import { Button } from "@/shared/ui";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { motion } from "motion/react";

const features = [
  { emoji: "🧠", category: "면접", title: "산업심리학 기반 구조화 면접" },
  { emoji: "🎙️", category: "음성", title: "실시간 음성 인식 & TTS" },
  { emoji: "👁️", category: "분석", title: "시선·자세·표정 실시간 추적" },
  { emoji: "🗣️", category: "코칭", title: "비언어적 문제 즉시 피드백" },
  { emoji: "📝", category: "리포트", title: "상세 분석 리포트 & 점수" },
  { emoji: "🔄", category: "반복", title: "매번 새로운 질문 동적 생성" },
  { emoji: "🎭", category: "아바타", title: "Simli 립싱크 실전 면접관" },
  { emoji: "📄", category: "이력서", title: "이력서 기반 맞춤 질문" },
];

const steps = [
  {
    label: "이력서 업로드",
    description: "PDF 이력서를 업로드하면 AI가 직무와 경험을 분석합니다",
  },
  {
    label: "면접 모드 선택",
    description: "실전 모드 또는 연습 모드를 선택합니다",
  },
  {
    label: "AI 면접 진행",
    description: "아바타 면접관이 음성으로 질문하고 답변을 평가합니다",
  },
  {
    label: "피드백 확인",
    description: "언어·비언어 분석 리포트와 개선점을 확인합니다",
  },
];

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block px-4 py-1.5 text-sm text-muted rounded-full border border-white/[0.08] mb-6">
      {children}
    </span>
  );
}

export function LandingHero() {
  const { data: session } = useSession();

  return (
    <div>
      {/* ── Hero ── */}
      <section className="py-36 lg:py-52">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.h1
            className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight leading-[1.1] mb-7"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            AI 면접관과 함께
            <br />
            실전처럼 준비하세요
          </motion.h1>

          <motion.p
            className="text-secondary text-lg sm:text-xl mb-12 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
          >
            면접 예상 질문부터 표정·자세 분석, 맞춤 피드백까지
          </motion.p>

          <motion.div
            className="flex items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16 }}
          >
            {session?.user ? (
              <Link href="/interview">
                <Button size="lg">면접 시작하기</Button>
              </Link>
            ) : (
              <Button size="lg" onClick={() => signIn("google")}>
                시작하기
              </Button>
            )}
            <Link href="/history">
              <Button variant="secondary" size="lg">
                기록 보기
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── 면접 과정 ── */}
      <section className="py-28 lg:py-40">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
          >
            <Pill>면접 과정</Pill>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              간단한 4단계
            </h2>
            <p className="text-secondary text-lg mb-16">
              복잡한 설정 없이, 바로 시작할 수 있어요.
            </p>
          </motion.div>

          {steps.map((step, i) => (
            <motion.div
              key={step.label}
              className="flex gap-8 py-7 border-b border-white/[0.06] last:border-b-0"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              <span className="text-indigo text-base font-semibold shrink-0 w-14">
                0{i + 1}
              </span>
              <div>
                <p className="text-lg font-semibold mb-1">{step.label}</p>
                <p className="text-muted">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── 주요 기능 ── */}
      <section className="py-28 lg:py-40">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
          >
            <Pill>주요 기능</Pill>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
              면접의 모든 것을
              <br />
              AI가 코칭합니다
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-10 gap-y-12">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="flex items-center gap-4"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
              >
                <span
                  className="w-12 h-12 shrink-0 flex items-center justify-center text-2xl rounded-xl bg-white/[0.04]"
                  style={{ fontFamily: "Tossface, sans-serif" }}
                >
                  {f.emoji}
                </span>
                <div>
                  <p className="text-muted text-sm mb-1">{f.category}</p>
                  <p className="font-medium leading-snug">{f.title}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-28 lg:py-40">
        <motion.div
          className="text-center max-w-3xl mx-auto px-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-5">
            지금 바로 시작하세요
          </h2>
          <p className="text-secondary text-lg mb-10">
            AI와 함께 면접을 준비하고, 자신감을 키우세요.
          </p>
          {session?.user ? (
            <Link href="/interview">
              <Button size="lg">면접 시작하기</Button>
            </Link>
          ) : (
            <Button size="lg" onClick={() => signIn("google")}>
              무료로 시작하기
            </Button>
          )}
        </motion.div>
      </section>
    </div>
  );
}
