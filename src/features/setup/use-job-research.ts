"use client";

import { useCallback, useState } from "react";
import { useSessionStore } from "@/entities/session";

type ResearchStatus = "idle" | "loading" | "done";

export function useJobResearch() {
  const [status, setStatus] = useState<ResearchStatus>("idle");
  const setJobResearch = useSessionStore((s) => s.setJobResearch);
  const jobTitle = useSessionStore((s) => s.jobTitle);
  const companyName = useSessionStore((s) => s.companyName);
  const interviewType = useSessionStore((s) => s.interviewType);

  const start = useCallback(async () => {
    setStatus("loading");

    try {
      const res = await fetch("/api/research-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle,
          companyName: companyName || undefined,
          interviewType,
        }),
        signal: AbortSignal.timeout(15_000),
      });

      if (res.ok) {
        const data = await res.json();
        setJobResearch(data.research ?? null);
      } else {
        setJobResearch(null);
      }
    } catch {
      setJobResearch(null);
    } finally {
      setStatus("done");
    }
  }, [jobTitle, companyName, interviewType, setJobResearch]);

  return { status, start };
}
