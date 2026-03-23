"use client";

import { useSessionStore } from "@/entities/session";
import { useCallback, useRef, useState } from "react";

type ResearchStatus = "idle" | "loading" | "done";

export function useJobResearch() {
  const [status, setStatus] = useState<ResearchStatus>("idle");
  const abortRef = useRef<AbortController | null>(null);
  const setJobResearch = useSessionStore((s) => s.setJobResearch);
  const jobTitle = useSessionStore((s) => s.jobTitle);
  const companyName = useSessionStore((s) => s.companyName);
  const interviewType = useSessionStore((s) => s.interviewType);

  const start = useCallback(async () => {
    setStatus("loading");
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/research-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle,
          companyName: companyName || undefined,
          interviewType,
        }),
        signal: AbortSignal.any([
          abortRef.current.signal,
          AbortSignal.timeout(15_000),
        ]),
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

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { status, start, abort };
}
