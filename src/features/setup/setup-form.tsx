"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { type InterviewType, useSessionStore } from "@/entities/session";
import { cn } from "@/shared/lib/cn";
import { Button, FormError, Input } from "@/shared/ui";
import { AvatarPicker } from "./avatar-picker";
import { requestMediaPermission } from "./use-devices";

interface SetupFormProps {
  onStart: () => void;
}

export function SetupForm({ onStart }: SetupFormProps) {
  const t = useTranslations("setup");
  const setSetup = useSessionStore((s) => s.setSetup);
  const jobTitleId = useId();
  const companyNameId = useId();
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
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-2">{t("title")}</h1>
        <p className="text-muted text-lg">{t("subtitle")}</p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            id={jobTitleId}
            label={t("jobTitle")}
            placeholder={t("jobTitlePlaceholder")}
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
          />
          <Input
            id={companyNameId}
            label={t("companyName")}
            placeholder={t("companyNamePlaceholder")}
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            maxLength={100}
          />
        </div>

        <div>
          <p className="text-sm text-secondary mb-2">{t("interviewType")}</p>
          <div
            className="grid grid-cols-1 sm:grid-cols-3 gap-2"
            role="radiogroup"
            aria-label={t("interviewType")}
          >
            {interviewTypes.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={interviewType === opt.value}
                onClick={() => setInterviewType(opt.value)}
                className={cn(
                  "text-left rounded-xl px-4 py-4 border transition-all cursor-pointer",
                  interviewType === opt.value
                    ? "border-foreground/30 bg-white/[0.04]"
                    : "border-border-default bg-card hover:border-border-strong",
                )}
              >
                <p className="text-sm font-semibold">{opt.label}</p>
                <p className="text-xs text-muted mt-1">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <AvatarPicker label={t("interviewer")} />

        <div>
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-sm text-secondary">{t("resume")}</p>
            <p className="text-xs text-muted">{t("resumeHint")}</p>
          </div>
          <label className="flex items-center gap-2 px-5 py-4 rounded-xl bg-card border border-border-default cursor-pointer hover:border-border-strong transition-colors">
            <svg
              width="18"
              height="18"
              viewBox="0 0 16 16"
              fill="none"
              className="text-muted shrink-0"
              aria-hidden="true"
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
          <FormError>{resumeError}</FormError>
        </div>
      </div>

      <div className="mt-10 space-y-2">
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
          className="w-full py-4"
          disabled={!jobTitle.trim() || uploading}
          onClick={handleStart}
        >
          {uploading ? t("uploading") : t("start")}
        </Button>
      </div>
    </motion.div>
  );
}
