"use client";

import { useCallback, useRef, useState } from "react";
import { z } from "zod";
import { createVad } from "@/features/interview-engine/vad";

export type DrillPhase =
  | "prep"
  | "speaking"
  | "listening"
  | "processing"
  | "feedback"
  | "done";

export interface DrillResult {
  contentScore: number;
  feedback: string;
  starFulfillment: {
    situation: boolean;
    task: boolean;
    action: boolean;
    result: boolean;
  };
}

interface DrillEngineConfig {
  sessionId: string;
  questionId: number;
  question: string;
}

const transcribeResponseSchema = z.object({ text: z.string() });
const drillResponseSchema = z.object({
  contentScore: z.number(),
  feedback: z.string(),
  starFulfillment: z.object({
    situation: z.boolean(),
    task: z.boolean(),
    action: z.boolean(),
    result: z.boolean(),
  }),
});

const MAX_ATTEMPTS = 5;
const GOAL_SCORE = 80;
const MIN_WORD_COUNT = 1;

export function useDrillEngine({ sessionId, questionId, question }: DrillEngineConfig) {
  const [drillPhase, setDrillPhase] = useState<DrillPhase>("prep");
  const [transcript, setTranscript] = useState<string>("");
  const [result, setResult] = useState<DrillResult | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [goalAchieved, setGoalAchieved] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const vadRef = useRef<ReturnType<typeof createVad> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const loopAbortRef = useRef(false);
  const ttsAbortRef = useRef<AbortController | null>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);

  // Refs to fix stale closures in onSpeechEnd callback
  const attemptCountRef = useRef(0);
  const bestScoreRef = useRef(0);

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

  const playTTS = useCallback(async (text: string): Promise<void> => {
    const controller = new AbortController();
    ttsAbortRef.current = controller;

    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error("tts failed");

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    await new Promise<void>((resolve, reject) => {
      const audio = new Audio(url);
      ttsAudioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        ttsAudioRef.current = null;
        resolve();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        ttsAudioRef.current = null;
        reject(new Error("audio playback failed"));
      };
      audio.play().catch(reject);
    });

    ttsAbortRef.current = null;
  }, []);

  const startDrill = useCallback(async () => {
    loopAbortRef.current = false;
    setValidationError(null);
    setTranscript("");
    setResult(null);
    setAudioLevel(0);

    const stream = streamRef.current;
    if (!stream) return;

    // Mute mic during TTS to prevent echo
    for (const track of stream.getAudioTracks()) {
      track.enabled = false;
    }

    setDrillPhase("speaking");

    try {
      await playTTS(question);
    } catch (err) {
      console.warn("tts failed:", err);
    }

    if (loopAbortRef.current) return;

    // Unmute mic after TTS
    for (const track of stream.getAudioTracks()) {
      track.enabled = true;
    }

    setDrillPhase("listening");

    audioChunksRef.current = [];

    const audioStream = new MediaStream(stream.getAudioTracks());

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";

    const mediaRecorder = new MediaRecorder(audioStream, { mimeType });
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };

    mediaRecorder.start(1000);

    vadRef.current = createVad({
      threshold: 0.05,
      silenceDelay: 2500,
      minSpeechDuration: 2000,
      onLevel: (rms) => setAudioLevel(rms),
      onSpeechStart: () => {},
      onSpeechEnd: async () => {
        mediaRecorder.stop();
        vadRef.current?.stop();
        setAudioLevel(0);

        if (loopAbortRef.current) return;

        setDrillPhase("processing");

        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });

        if (audioBlob.size < 1000) {
          setTranscript("");
          setValidationError("음성이 감지되지 않았습니다");
          setDrillPhase("feedback");
          return;
        }

        try {
          const text = await transcribeAudio(audioBlob);
          setTranscript(text);

          // 15-word gate
          const wordCount = text.trim().split(/\s+/).length;
          if (wordCount < MIN_WORD_COUNT) {
            setValidationError(
              "답변이 너무 짧습니다. 더 구체적으로 답변해 주세요",
            );
            setDrillPhase("feedback");
            return;
          }

          setValidationError(null);

          // Call drill API
          const res = await fetch(`/api/sessions/${sessionId}/drill`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ questionId, transcript: text }),
          });

          if (!res.ok) throw new Error("drill feedback failed");

          const data = drillResponseSchema.parse(await res.json());

          const newAttempt = attemptCountRef.current + 1;
          attemptCountRef.current = newAttempt;
          setAttemptCount(newAttempt);
          setResult(data);

          if (data.contentScore > bestScoreRef.current) {
            bestScoreRef.current = data.contentScore;
            setBestScore(data.contentScore);
          }

          if (data.contentScore >= GOAL_SCORE) {
            setGoalAchieved(true);
            setDrillPhase("done");
          } else if (newAttempt >= MAX_ATTEMPTS) {
            setDrillPhase("done");
          } else {
            setDrillPhase("feedback");
          }
        } catch (err) {
          console.error("drill processing failed:", err);
          setValidationError("분석 중 오류가 발생했습니다. 다시 시도해 주세요");
          setDrillPhase("feedback");
        }
      },
    });
    vadRef.current.start(stream);
  }, [sessionId, questionId, question, transcribeAudio, playTTS]);

  const stopDrill = useCallback(() => {
    loopAbortRef.current = true;
    ttsAbortRef.current?.abort();
    ttsAbortRef.current = null;
    ttsAudioRef.current?.pause();
    ttsAudioRef.current = null;
    vadRef.current?.stop();
    vadRef.current = null;
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setAudioLevel(0);
    setDrillPhase("prep");
  }, []);

  const cleanup = useCallback(() => {
    stopDrill();
    streamRef.current?.getTracks().forEach((t) => {
      t.stop();
    });
    streamRef.current = null;
  }, [stopDrill]);

  return {
    drillPhase,
    transcript,
    result,
    audioLevel,
    attemptCount,
    bestScore,
    goalAchieved,
    validationError,
    startDrill,
    stopDrill,
    cleanup,
    streamRef,
  };
}
