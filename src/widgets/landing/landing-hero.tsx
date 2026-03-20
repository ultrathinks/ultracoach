"use client";

import { Button, Card } from "@/shared/ui";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { motion } from "motion/react";

const features = [
  {
    title: "AI 면접관",
    description: "산업심리학 기반 구조화 면접. 매번 다른 질문을 동적으로 생성",
  },
  {
    title: "실시간 아바타",
    description: "Simli 립싱크 아바타가 음성으로 질문. 실전 면접 환경 제공",
  },
  {
    title: "비언어 분석",
    description: "시선, 자세, 표정, 제스처를 실시간으로 추적하고 분석",
  },
  {
    title: "음성 코칭",
    description: "연습 모드에서 비언어적 문제를 즉시 음성으로 코칭",
  },
];

export function LandingHero() {
  const { data: session } = useSession();

  return (
    <div className="relative overflow-hidden">
      {/* background effects */}
      <div className="hero-glow bg-indigo top-[-200px] left-1/2 -translate-x-1/2" />
      <div className="hero-glow bg-purple top-[-100px] left-[30%]" />
      <div className="hero-glow bg-pink top-[-100px] right-[30%]" />
      <div className="absolute inset-0 grid-pattern" />

      <div className="relative max-w-5xl mx-auto px-6">
        <section className="flex flex-col items-center text-center pt-28 pb-20">
          <motion.p
            className="text-[13px] text-muted mb-8 tracking-widest uppercase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            AI-Powered Interview Coaching
          </motion.p>

          <motion.h1
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.15] mb-5"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            면접, <span className="gradient-text">AI와 함께</span>
            <br />
            완벽하게 준비하세요
          </motion.h1>

          <motion.p
            className="text-secondary text-base max-w-md mb-10 leading-relaxed"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            AI 면접관이 실전처럼 질문하고,
            표정·자세·시선까지 분석해 맞춤 피드백을 제공합니다.
          </motion.p>

          <motion.div
            className="flex gap-3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
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
              <Button variant="ghost" size="lg">
                기록 보기
              </Button>
            </Link>
          </motion.div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pb-28">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 + i * 0.08 }}
            >
              <Card className="h-full shimmer hover:border-white/[0.08] transition-colors">
                <h3 className="text-sm font-medium mb-1.5">{feature.title}</h3>
                <p className="text-[13px] text-muted leading-relaxed">{feature.description}</p>
              </Card>
            </motion.div>
          ))}
        </section>
      </div>
    </div>
  );
}
