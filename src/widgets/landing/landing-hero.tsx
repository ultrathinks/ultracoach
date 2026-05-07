"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui";

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block px-4 py-1.5 text-sm text-muted rounded-full border border-white/[0.08] mb-6">
      {children}
    </span>
  );
}

export function LandingHero() {
  const t = useTranslations("landing");
  const { data: session } = useSession();

  const features = [
    {
      emoji: "🧠",
      category: t("features.interview"),
      title: t("features.interviewDesc"),
    },
    {
      emoji: "🎙️",
      category: t("features.voice"),
      title: t("features.voiceDesc"),
    },
    {
      emoji: "👁️",
      category: t("features.analysis"),
      title: t("features.analysisDesc"),
    },
    {
      emoji: "🗣️",
      category: t("features.coaching"),
      title: t("features.coachingDesc"),
    },
    {
      emoji: "📝",
      category: t("features.report"),
      title: t("features.reportDesc"),
    },
    {
      emoji: "🔄",
      category: t("features.dynamic"),
      title: t("features.dynamicDesc"),
    },
    {
      emoji: "🎭",
      category: t("features.avatar"),
      title: t("features.avatarDesc"),
    },
    {
      emoji: "📄",
      category: t("features.resume"),
      title: t("features.resumeDesc"),
    },
  ];

  const steps = [
    {
      label: t("steps.resumeUpload"),
      description: t("steps.resumeUploadDesc"),
    },
    {
      label: t("steps.modeSelect"),
      description: t("steps.modeSelectDesc"),
    },
    {
      label: t("steps.interview"),
      description: t("steps.interviewDesc"),
    },
    {
      label: t("steps.feedback"),
      description: t("steps.feedbackDesc"),
    },
  ];

  return (
    <div>
      {/* ── Hero ── */}
      <section className="py-24 sm:py-36 lg:py-52">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            className="inline-flex items-center gap-2.5 px-4 py-2 mb-9 rounded-full text-sm sm:text-base font-medium text-foreground bg-white/[0.04] border border-white/[0.1]"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <span
              aria-hidden="true"
              className="inline-flex w-2 h-2 rounded-full bg-indigo animate-pulse"
            />
            <span>{t("announcement")}</span>
            <span className="text-muted">·</span>
            <span className="text-secondary">{t("announcementKo")}</span>
          </motion.div>

          <motion.h1
            className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight leading-[1.1] mb-7"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {t("heroTitle")}
            <br />
            {t("heroTitleSub")}
          </motion.h1>

          <motion.p
            className="text-secondary text-lg sm:text-xl mb-12 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
          >
            {t("heroDescription")}
          </motion.p>

          <motion.div
            className="flex items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16 }}
          >
            {session?.user ? (
              <Link href="/interview">
                <Button size="lg">{t("startButton")}</Button>
              </Link>
            ) : (
              <Button size="lg" onClick={() => signIn("google")}>
                {t("startButton")}
              </Button>
            )}
            {session?.user && (
              <Link href="/history">
                <Button variant="secondary" size="lg">
                  {t("viewHistory")}
                </Button>
              </Link>
            )}
          </motion.div>
        </div>
      </section>

      {/* ── Interview Process ── */}
      <section className="py-28 lg:py-40">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
          >
            <Pill>{t("steps.resumeUpload")}</Pill>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              {t("stepsHeader")}
            </h2>
            <p className="text-secondary text-lg mb-16">{t("stepsLead")}</p>
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

      {/* ── Key Features ── */}
      <section className="py-28 lg:py-40">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
          >
            <Pill>{t("features.interview")}</Pill>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold whitespace-pre-line">
              {t("featuresHeader")}
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
            {t("ctaHeader")}
          </h2>
          <p className="text-secondary text-lg mb-10">{t("ctaLead")}</p>
          {session?.user ? (
            <Link href="/interview">
              <Button size="lg">{t("startButton")}</Button>
            </Link>
          ) : (
            <Button size="lg" onClick={() => signIn("google")}>
              {t("startButton")}
            </Button>
          )}
        </motion.div>
      </section>
    </div>
  );
}
