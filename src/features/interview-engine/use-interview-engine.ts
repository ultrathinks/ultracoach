"use client";

import type { InterviewConfig } from "@/entities/session";
import { useSessionStore } from "@/entities/session";
import { useCallback, useRef, useState } from "react";
import { z } from "zod";
import { createVad } from "./vad";

const questionResponseSchema = z.object({
  question: z.string(),
  type: z.string(),
  shouldEnd: z.boolean().optional(),
});

const transcribeResponseSchema = z.object({
  text: z.string(),
});

export function useInterviewEngine(config?: InterviewConfig) {
  const vadRef = useRef<ReturnType<typeof createVad> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const questionCountRef = useRef(0);
  const listenResolveRef = useRef<(() => void) | null>(null);
  const gracePeriodTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [audioLevel, setAudioLevel] = useState(0);

  const gracePeriod = config?.gracePeriod ?? 1500;
  const vadThreshold = config?.vadThreshold ?? 0.035;
  const silenceDelay = config?.silenceDelay ?? 2500;
  const minSpeechDuration = config?.minSpeechDuration ?? 1000;
  const targetQuestionCount = config?.targetQuestionCount ?? 15;
  const maxQuestionCount = config?.maxQuestionCount ?? 20;

  const fetchNextQuestion = useCallback(async () => {
    const store = useSessionStore.getState();
    store.setPhase("generating");

    const res = await fetch("/api/next-question", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobTitle: store.jobTitle,
        interviewType: store.interviewType,
        resumeFileId: store.resumeFileId,
        jobResearch: store.jobResearch,
        history: store.history,
        questionCount: questionCountRef.current,
        targetQuestionCount,
        maxQuestionCount,
      }),
    });

    if (!res.ok) throw new Error("failed to fetch question");
    const raw = await res.json();
    const data = questionResponseSchema.parse(raw);

    questionCountRef.current++;
    const s = useSessionStore.getState();
    s.addHistory({ role: "interviewer", content: data.question });
    s.addQuestion({
      id: questionCountRef.current,
      type: data.type,
      text: data.question,
      answer: null,
      startTime: Date.now(),
      endTime: null,
    });
    s.setCurrentQuestion(data.question);

    return {
      question: data.question,
      type: data.type,
      shouldEnd: data.shouldEnd ?? false,
    };
  }, [targetQuestionCount, maxQuestionCount]);

  const transcribeAudio = useCallback(async (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append("audio", audioBlob, "answer.webm");

    const res = await fetch("/api/whisper", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("failed to transcribe");
    const data = transcribeResponseSchema.parse(await res.json());
    return data.text;
  }, []);

  const startListening = useCallback(
    (stream: MediaStream, calibratedThreshold?: number): Promise<void> => {
      vadRef.current?.stop();
      mediaRecorderRef.current?.stop();

      return new Promise((resolve) => {
        listenResolveRef.current = resolve;

        gracePeriodTimerRef.current = setTimeout(() => {
          gracePeriodTimerRef.current = null;
          useSessionStore.getState().setPhase("listening");
          audioChunksRef.current = [];

          const audioStream = new MediaStream(stream.getAudioTracks());

          const mimeType = MediaRecorder.isTypeSupported(
            "audio/webm;codecs=opus",
          )
            ? "audio/webm;codecs=opus"
            : "audio/webm";

          const mediaRecorder = new MediaRecorder(audioStream, { mimeType });
          mediaRecorderRef.current = mediaRecorder;

          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) audioChunksRef.current.push(e.data);
          };

          mediaRecorder.start(1000);

          let peakRms = 0;

          vadRef.current = createVad({
            threshold: calibratedThreshold ?? Math.max(vadThreshold, 0.05),
            silenceDelay,
            minSpeechDuration: Math.max(minSpeechDuration, 2000),
            onLevel: (rms) => {
              if (rms > peakRms) peakRms = rms;
              setAudioLevel(rms);
            },
            onSpeechStart: () => {},
            onSpeechEnd: async () => {
              mediaRecorder.stop();
              vadRef.current?.stop();
              setAudioLevel(0);
              useSessionStore.getState().setPhase("processing");

              const audioBlob = new Blob(audioChunksRef.current, {
                type: "audio/webm",
              });

              const noRealSpeech = audioBlob.size < 1000 || peakRms < 0.06;

              if (noRealSpeech) {
                const store = useSessionStore.getState();
                store.addHistory({
                  role: "interviewee",
                  content: "(응답 없음)",
                });
                store.updateLastAnswer("(응답 없음)");
              } else {
                const store = useSessionStore.getState();
                try {
                  const text = await transcribeAudio(audioBlob);
                  store.addHistory({ role: "interviewee", content: text });
                  store.updateLastAnswer(text);
                } catch {
                  store.addHistory({
                    role: "interviewee",
                    content: "(음성 인식 실패)",
                  });
                  store.updateLastAnswer("(음성 인식 실패)");
                }
              }

              listenResolveRef.current?.();
              listenResolveRef.current = null;
            },
          });

          vadRef.current.start(stream);
        }, gracePeriod);
      });
    },
    [
      transcribeAudio,
      vadThreshold,
      silenceDelay,
      minSpeechDuration,
      gracePeriod,
    ],
  );

  const stopListening = useCallback(() => {
    if (gracePeriodTimerRef.current) {
      clearTimeout(gracePeriodTimerRef.current);
      gracePeriodTimerRef.current = null;
    }
    vadRef.current?.stop();
    vadRef.current = null;
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setAudioLevel(0);
    listenResolveRef.current?.();
    listenResolveRef.current = null;
  }, []);

  const keepListeningAlive = useCallback(() => {
    vadRef.current?.keepAlive();
  }, []);

  const submitTextAnswer = useCallback((text: string) => {
    if (gracePeriodTimerRef.current) {
      clearTimeout(gracePeriodTimerRef.current);
      gracePeriodTimerRef.current = null;
    }
    vadRef.current?.stop();
    vadRef.current = null;
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setAudioLevel(0);

    const store = useSessionStore.getState();
    store.setPhase("processing");
    store.addHistory({ role: "interviewee", content: text });
    store.updateLastAnswer(text);

    listenResolveRef.current?.();
    listenResolveRef.current = null;
  }, []);

  return {
    fetchNextQuestion,
    startListening,
    stopListening,
    submitTextAnswer,
    keepListeningAlive,
    audioLevel,
  };
}
