"use client";

import { motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { type InterviewType, useSessionStore } from "@/entities/session";
import { cn } from "@/shared/lib/cn";
import { Button, Input } from "@/shared/ui";
import { requestMediaPermission } from "./use-devices";

const LOCALE_COOKIE = "ultracoach:language";

interface SetupFormProps {
  onStart: () => void;
}

export function SetupForm({ onStart }: SetupFormProps) {
  const t = useTranslations("setup");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const setSetup = useSessionStore((s) => s.setSetup);
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [interviewType, setInterviewType] =
    useState<InterviewType>("personality");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [checkStatus, setCheckStatus] = useState<
    "idle" | "checking" | "ok" | "denied"
  >("idle");

  const interviewTypes: {
    value: InterviewType;
    label: string;
    desc: string;
  }[] = [
    {
      value: "personality",
      label: t("types.personality"),
      desc: t("types.personalityDesc"),
    },
    {
      value: "technical",
      label: t("types.technical"),
      desc: t("types.technicalDesc"),
    },
    {
      value: "culture-fit",
      label: t("types.cultureFit"),
      desc: t("types.cultureFitDesc"),
    },
  ];

  function setLocale(next: "ko" | "en") {
    if (next === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleCheck() {
    setCheckStatus("checking");
    const ok = await requestMediaPermission();
    setCheckStatus(ok ? "ok" : "denied");
  }

  async function handleStart() {
    if (!jobTitle.trim()) return;

    let resumeFileId: string | null = null;

    if (resumeFile) {
      setUploading(true);
      setResumeError(null);
      try {
        const formData = new FormData();
        formData.append("file", resumeFile);
        const res = await fetch("/api/upload-resume", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (res.ok) {
          resumeFileId = data.fileId;
        } else {
          setResumeError(data.error ?? t("resumeUploadFailed"));
          setUploading(false);
          return;
        }
      } catch {
        setResumeError(t("resumeUploadFailed"));
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    setSetup({
      jobTitle: jobTitle.trim(),
      interviewType,
      resumeFileId,
      companyName: companyName.trim() || null,
    });
    onStart();
  }

  return (
    <motion.div
      className="w-full max-w-xl"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex justify-end mb-4">
        <div className="inline-flex rounded-full bg-card border border-white/[0.06] p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setLocale("ko")}
            className={cn(
              "px-3 py-1 rounded-full transition-colors cursor-pointer",
              locale === "ko"
                ? "bg-white/[0.08] text-foreground"
                : "text-muted hover:text-foreground",
            )}
          >
            {tCommon("ko")}
          </button>
          <button
            type="button"
            onClick={() => setLocale("en")}
            className={cn(
              "px-3 py-1 rounded-full transition-colors cursor-pointer",
              locale === "en"
                ? "bg-white/[0.08] text-foreground"
                : "text-muted hover:text-foreground",
            )}
          >
            {tCommon("en")}
          </button>
        </div>
      </div>

      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-3">{t("title")}</h1>
        <p className="text-muted text-lg">{t("subtitle")}</p>
      </div>

      <div className="space-y-7">
        <div className="grid grid-cols-2 gap-3">
          <Input
            id="jobTitle"
            label={t("jobTitle")}
            placeholder={t("jobTitlePlaceholder")}
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
          />
          <Input
            id="companyName"
            label={t("companyName")}
            placeholder={t("companyNamePlaceholder")}
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            maxLength={100}
          />
        </div>

        <div>
          <p className="text-sm text-secondary mb-3">{t("interviewType")}</p>
          <div className="grid grid-cols-3 gap-3">
            {interviewTypes.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setInterviewType(opt.value)}
                className={cn(
                  "text-left rounded-xl px-4 py-3.5 border transition-all cursor-pointer",
                  interviewType === opt.value
                    ? "border-foreground/30 bg-white/[0.04]"
                    : "border-white/[0.1] bg-card hover:border-white/[0.15]",
                )}
              >
                <p className="text-sm font-semibold">{opt.label}</p>
                <p className="text-xs text-muted mt-1">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm text-secondary mb-3">{t("resume")}</p>
          <label className="flex items-center gap-3 px-5 py-4 rounded-xl bg-card border border-white/[0.1] cursor-pointer hover:border-white/[0.15] transition-colors">
            <svg
              width="18"
              height="18"
              viewBox="0 0 16 16"
              fill="none"
              className="text-muted shrink-0"
            >
              <path
                d="M8 1v10M4 5l4-4 4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 11v2a2 2 0 002 2h8a2 2 0 002-2v-2"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-sm text-muted truncate">
              {resumeFile ? resumeFile.name : t("resumePlaceholder")}
            </span>
            <input
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setResumeError(null);
                if (file && file.size > 50 * 1024 * 1024) {
                  setResumeError(t("resumeTooLarge"));
                  e.target.value = "";
                  setResumeFile(null);
                  return;
                }
                setResumeFile(file);
              }}
            />
          </label>
          {resumeError && (
            <p className="text-sm text-red mt-2">{resumeError}</p>
          )}
        </div>
      </div>

      <div className="mt-10 space-y-3">
        <button
          type="button"
          onClick={handleCheck}
          disabled={checkStatus === "checking"}
          className="w-full text-xs text-secondary hover:text-foreground transition-colors py-2 cursor-pointer disabled:opacity-50"
        >
          {checkStatus === "checking"
            ? t("checkChecking")
            : checkStatus === "ok"
              ? t("checkOk")
              : checkStatus === "denied"
                ? t("checkDenied")
                : t("checkIdle")}
        </button>
        <Button
          size="lg"
          className="w-full py-3.5"
          disabled={!jobTitle.trim() || uploading}
          onClick={handleStart}
        >
          {uploading ? t("uploading") : t("start")}
        </Button>
      </div>
    </motion.div>
  );
}
