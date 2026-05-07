"use client";

import { useTranslations } from "next-intl";

interface ProblemDetails {
  type?: string;
  title?: string;
  detail?: string;
}

export function useErrorMessage() {
  const t = useTranslations("errors.code");
  return (problem: ProblemDetails | null | undefined): string => {
    if (!problem) return "";
    const code = problem.type?.split("/").pop();
    if (!code) return problem.detail ?? problem.title ?? "";
    try {
      return t(code);
    } catch {
      return problem.detail ?? problem.title ?? "";
    }
  };
}
