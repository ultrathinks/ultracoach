"use client";

import { motion } from "motion/react";
import { useState } from "react";
import {
  type InterviewMode,
  type InterviewType,
  useSessionStore,
} from "@/entities/session";
import { cn } from "@/shared/lib/cn";
import { Button, Input } from "@/shared/ui";

const interviewTypes: {
  value: InterviewType;
  label: string;
  desc: string;
}[] = [
  { value: "personality", label: "인성", desc: "가치관 · 동기 · 갈등 해결" },
  { value: "technical", label: "기술", desc: "기술 스택 · 문제 해결 · 설계" },
  {
    value: "culture-fit",
    label: "컬처핏",
    desc: "조직 문화 · 협업 · 리더십",
  },
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
  const [companyName, setCompanyName] = useState("");
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
        <h1 className="text-4xl font-bold mb-3">면접 준비</h1>
        <p className="text-muted text-lg">직무와 면접 유형을 선택하세요</p>
      </div>

      <div className="space-y-7">
        {/* 직무 + 회사 */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            id="jobTitle"
            label="지원 직무"
            placeholder="예: 프론트엔드 개발자"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
          />
          <Input
            id="companyName"
            label="지원 회사 (선택)"
            placeholder="예: 네이버"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            maxLength={100}
          />
        </div>

        {/* 면접 유형 */}
        <div>
          <p className="text-sm text-secondary mb-3">면접 유형</p>
          <div className="grid grid-cols-3 gap-3">
            {interviewTypes.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setInterviewType(t.value)}
                className={cn(
                  "text-left rounded-xl px-4 py-3.5 border transition-all cursor-pointer",
                  interviewType === t.value
                    ? "border-foreground/30 bg-white/[0.04]"
                    : "border-white/[0.1] bg-card hover:border-white/[0.15]",
                )}
              >
                <p className="text-sm font-semibold">{t.label}</p>
                <p className="text-xs text-muted mt-1">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 모드 */}
        <div>
          <p className="text-sm text-secondary mb-3">모드</p>
          <div className="grid grid-cols-2 gap-3">
            {modes.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMode(m.value)}
                className={cn(
                  "text-left rounded-xl px-4 py-3.5 border transition-all cursor-pointer",
                  mode === m.value
                    ? "border-foreground/30 bg-white/[0.04]"
                    : "border-white/[0.1] bg-card hover:border-white/[0.15]",
                )}
              >
                <p className="text-sm font-semibold">{m.label}</p>
                <p className="text-xs text-muted mt-1">{m.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 이력서 */}
        <div>
          <p className="text-sm text-secondary mb-3">이력서 (선택)</p>
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
            <p className="text-sm text-red mt-2">{resumeError}</p>
          )}
        </div>

        {/* 연습 모드 안내 */}
        {mode === "practice" && (
          <div className="rounded-xl border border-white/[0.1] bg-white/[0.02] px-5 py-4">
            <p className="text-sm text-secondary leading-relaxed">
              연습 모드에서는 이어폰 착용을 권장합니다. 코칭 음성이 마이크에
              잡힐 수 있습니다.
            </p>
          </div>
        )}
      </div>

      <div className="mt-10">
        <Button
          size="lg"
          className="w-full py-3.5"
          disabled={!jobTitle.trim() || uploading}
          onClick={handleStart}
        >
          {uploading ? "이력서 업로드 중..." : "면접 시작"}
        </Button>
      </div>
    </motion.div>
  );
}
