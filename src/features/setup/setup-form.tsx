"use client";

import {
  type InterviewMode,
  type InterviewType,
  useSessionStore,
} from "@/entities/session";
import { Button, Card, Chip, Input } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";
import { useState } from "react";
import { motion } from "motion/react";

const interviewTypes: { value: InterviewType; label: string }[] = [
  { value: "personality", label: "인성" },
  { value: "technical", label: "기술" },
  { value: "culture-fit", label: "컬처핏" },
];

const modes: { value: InterviewMode; label: string; desc: string }[] = [
  { value: "real", label: "실전 모드", desc: "코칭 없이 실전처럼 진행" },
  { value: "practice", label: "연습 모드", desc: "실시간 음성 코칭 제공" },
];

interface SetupFormProps {
  onStart: () => void;
}

export function SetupForm({ onStart }: SetupFormProps) {
  const setSetup = useSessionStore((s) => s.setSetup);
  const [jobTitle, setJobTitle] = useState("");
  const [interviewType, setInterviewType] =
    useState<InterviewType>("personality");
  const [mode, setMode] = useState<InterviewMode>("real");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

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
          setResumeError(data.error ?? "이력서 업로드에 실패했습니다");
          setUploading(false);
          return;
        }
      } catch {
        setResumeError("이력서 업로드에 실패했습니다");
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    setSetup({
      jobTitle: jobTitle.trim(),
      interviewType,
      mode,
      resumeFileId,
    });
    onStart();
  }

  return (
    <motion.div
      className="max-w-md mx-auto py-16 space-y-8"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div>
        <h1 className="text-xl font-semibold mb-1">면접 준비</h1>
        <p className="text-sm text-muted">직무와 면접 유형을 선택하세요</p>
      </div>

      <div className="space-y-5">
        <Input
          id="jobTitle"
          label="지원 직무"
          placeholder="예: 프론트엔드 개발자"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
        />

        <div>
          <p className="text-[13px] text-muted mb-2">면접 유형</p>
          <div className="flex gap-2">
            {interviewTypes.map((t) => (
              <Chip
                key={t.value}
                active={interviewType === t.value}
                onClick={() => setInterviewType(t.value)}
              >
                {t.label}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[13px] text-muted mb-2">모드</p>
          <div className="grid grid-cols-2 gap-2">
            {modes.map((m) => (
              <button
                key={m.value}
                onClick={() => setMode(m.value)}
                className={cn(
                  "text-left rounded-xl px-4 py-3 border transition-all",
                  mode === m.value
                    ? "border-indigo/40 bg-indigo/[0.06]"
                    : "border-border bg-card hover:border-white/[0.08]",
                )}
              >
                <p className="text-sm font-medium">{m.label}</p>
                <p className="text-[12px] text-muted mt-0.5">{m.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[13px] text-muted mb-2">이력서 (선택)</p>
          <label className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border cursor-pointer hover:border-white/[0.08] transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-muted shrink-0">
              <path d="M8 1v10M4 5l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 11v2a2 2 0 002 2h8a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-[13px] text-muted truncate">
              {resumeFile ? resumeFile.name : "PDF 또는 DOCX 파일"}
            </span>
            <input
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setResumeError(null);
                if (file && file.size > 50 * 1024 * 1024) {
                  setResumeError("파일 크기가 50MB를 초과합니다");
                  e.target.value = "";
                  setResumeFile(null);
                  return;
                }
                setResumeFile(file);
              }}
            />
          </label>
          {resumeError && (
            <p className="text-[13px] text-red-400 mt-1.5">{resumeError}</p>
          )}
        </div>

        {mode === "practice" && (
          <div className="rounded-xl border border-indigo/20 bg-indigo/[0.04] px-4 py-3">
            <p className="text-[13px] text-indigo/80 leading-relaxed">
              연습 모드에서는 이어폰 착용을 권장합니다.
              코칭 음성이 마이크에 잡힐 수 있습니다.
            </p>
          </div>
        )}
      </div>

      <Button
        size="lg"
        className="w-full"
        disabled={!jobTitle.trim() || uploading}
        onClick={handleStart}
      >
        {uploading ? "이력서 업로드 중..." : "면접 시작"}
      </Button>
    </motion.div>
  );
}
