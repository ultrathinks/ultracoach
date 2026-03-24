"use client";

import { useMetricsStore } from "@/entities/metrics";
import { useSessionStore } from "@/entities/session";
import { useAvatar } from "@/features/avatar";
import { useMediaPipe } from "@/features/body-language";
import { useInterviewEngine } from "@/features/interview-engine";
import { useWebSpeech } from "@/features/interview-engine/use-web-speech";
import { useRecording } from "@/features/recording";
import { CoachOverlay } from "@/features/voice-coach";
import { cn } from "@/shared/lib/cn";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export function InterviewScreen() {
  const router = useRouter();
  const { fetchNextQuestion, startListening, stopListening, audioLevel } =
    useInterviewEngine();
  const { liveCaption, start: startSpeech, stop: stopSpeech } = useWebSpeech();
  const {
    connect: connectAvatar,
    speak: avatarSpeak,
    disconnect: disconnectAvatar,
    isConnected: avatarConnected,
    isSpeaking: avatarIsSpeaking,
  } = useAvatar();
  const { start: startMediaPipe, stop: stopMediaPipe } = useMediaPipe();
  const { start: startRecording, stop: stopRecording } = useRecording();

  const phase = useSessionStore((s) => s.phase);
  const currentQuestion = useSessionStore((s) => s.currentQuestion);
  const questions = useSessionStore((s) => s.questions);
  const startTime = useSessionStore((s) => s.startTime);
  const mode = useSessionStore((s) => s.mode);
  const jobTitle = useSessionStore((s) => s.jobTitle);
  const companyName = useSessionStore((s) => s.companyName);
  const jobResearch = useSessionStore((s) => s.jobResearch);

  const streamRef = useRef<MediaStream | null>(null);
  const streamReadyRef = useRef<(() => void) | null>(null);
  const webcamRef = useRef<HTMLVideoElement>(null);
  const avatarVideoRef = useRef<HTMLVideoElement>(null);
  const avatarAudioRef = useRef<HTMLAudioElement>(null);
  const loopAbortRef = useRef(false);
  const [elapsed, setElapsed] = useState(0);
  const [micMuted, setMicMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);

  useEffect(() => {
    if (!startTime || phase === "ended") return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, phase]);

  const waitForStream = useCallback((): Promise<MediaStream | null> => {
    if (streamRef.current) return Promise.resolve(streamRef.current);
    return new Promise((resolve) => {
      streamReadyRef.current = () => resolve(streamRef.current);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (webcamRef.current) webcamRef.current.srcObject = stream;

        streamReadyRef.current?.();
        streamReadyRef.current = null;

        if (avatarVideoRef.current && avatarAudioRef.current) {
          try {
            await connectAvatar(avatarVideoRef.current, avatarAudioRef.current);
          } catch (err) {
            console.warn("avatar connection failed:", err);
          }
        }

        if (webcamRef.current) startMediaPipe(webcamRef.current);
        startRecording(stream);
      } catch {
        console.error("camera/mic access denied");
        streamReadyRef.current?.();
        streamReadyRef.current = null;
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      disconnectAvatar();
      stopMediaPipe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loopAbortRef.current = false;
    useSessionStore.getState().setStartTime(Date.now());

    (async () => {
      const stream = await waitForStream();
      if (!stream) {
        useSessionStore.getState().setPhase("ended");
        return;
      }

      while (!loopAbortRef.current) {
        let data: { question: string; type: string; shouldEnd: boolean };
        try {
          data = await fetchNextQuestion();
        } catch (err) {
          console.error("question fetch failed:", err);
          break;
        }

        if (data.shouldEnd || loopAbortRef.current) break;

        // 면접관이 말하는 동안 마이크 뮤트 (스피커→마이크 에코 차단)
        for (const track of stream.getAudioTracks()) {
          track.enabled = false;
        }

        useSessionStore.getState().setPhase("speaking");
        try {
          await avatarSpeak(data.question);
        } catch (err) {
          console.warn("tts failed:", err);
        }

        if (loopAbortRef.current) break;

        // 답변 받기 전에 마이크 다시 켜기
        for (const track of stream.getAudioTracks()) {
          track.enabled = true;
        }

        startSpeech();
        await startListening(stream);
        stopSpeech();

        if (loopAbortRef.current) break;
      }

      if (!loopAbortRef.current) {
        useSessionStore.getState().setPhase("ended");
      }
    })();

    return () => {
      loopAbortRef.current = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEnd = useCallback(async () => {
    loopAbortRef.current = true;
    stopListening();
    stopSpeech();

    const state = useSessionStore.getState();
    const metricsState = useMetricsStore.getState();
    const duration = state.startTime
      ? Math.floor((Date.now() - state.startTime) / 1000)
      : 0;

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: state.jobTitle,
          interviewType: state.interviewType,
          mode: state.mode,
          durationSec: duration,
          companyName: state.companyName,
          jobResearchJson: state.jobResearch,
          resumeFileId: state.resumeFileId,
          questions: state.questions.map((q, i) => ({
            type: q.type,
            text: q.text,
            answer: q.answer,
            order: i + 1,
          })),
          metrics: {
            snapshots: metricsState.snapshots,
            events: metricsState.events,
          },
        }),
      });

      if (!res.ok) {
        console.error("session save failed:", res.status, await res.text());
        stopMediaPipe();
        disconnectAvatar();
        useSessionStore.getState().setPhase("ended");
        router.push("/history");
        return;
      }

      const { sessionId } = await res.json();
      await stopRecording(sessionId);

      stopMediaPipe();
      disconnectAvatar();
      useSessionStore.getState().setPhase("analyzing");

      const transcript = state.history
        .map(
          (h) =>
            `${h.role === "interviewer" ? "면접관" : "지원자"}: ${h.content}`,
        )
        .join("\n");

      await fetch(`/api/sessions/${sessionId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metrics: {
            snapshots: metricsState.snapshots,
            events: metricsState.events,
          },
          transcript,
          questions: state.questions,
        }),
      });

      router.push(`/results/${sessionId}`);
    } catch (err) {
      console.error("session save failed:", err);
      stopMediaPipe();
      disconnectAvatar();
      useSessionStore.getState().setPhase("ended");
      router.push("/history");
    }
  }, [stopListening, stopSpeech, stopMediaPipe, disconnectAvatar, stopRecording, router]);

  const toggleMic = useCallback(() => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setMicMuted(!track.enabled);
    }
  }, []);

  const toggleCam = useCallback(() => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setCamOff(!track.enabled);
    }
  }, []);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const normalizedLevel = Math.min(audioLevel / 0.1, 1);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const video = avatarVideoRef.current;
    if (!video) return;

    const logDimensions = () => {
      const iw = video.videoWidth;
      const ih = video.videoHeight;
      if (iw === 0 || ih === 0) return;
      const rect = video.getBoundingClientRect();
      const ratio = iw / ih;
      const orientation =
        ratio > 1.05 ? "landscape" : ratio < 0.95 ? "portrait" : "square";
      const scaleContain = Math.min(rect.width / iw, rect.height / ih);
      console.info(
        "[ultracoach] avatar <video>",
        `intrinsic ${iw}x${ih}`,
        `ratio ${ratio.toFixed(3)} (${orientation})`,
        `display ${Math.round(rect.width)}x${Math.round(rect.height)}px`,
        `object-contain scale ~${scaleContain.toFixed(2)}x`,
      );
    };

    video.addEventListener("loadedmetadata", logDimensions);
    video.addEventListener("resize", logDimensions);
    const ro = new ResizeObserver(logDimensions);
    ro.observe(video);

    return () => {
      video.removeEventListener("loadedmetadata", logDimensions);
      video.removeEventListener("resize", logDimensions);
      ro.disconnect();
    };
  }, []);

  if (phase === "analyzing") {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-foreground/30 border-t-foreground animate-spin mb-6" />
        <h2 className="text-2xl font-bold mb-2">결과 분석 중</h2>
        <p className="text-muted">AI가 면접 결과를 분석하고 있습니다</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      {/* top bar */}
      <div className="h-12 flex items-center justify-between px-5 border-b border-border shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-red animate-pulse" />
          <span className="text-sm text-muted font-mono tabular-nums">{formatTime(elapsed)}</span>
        </div>
        <span className="text-sm text-muted">{jobTitle}</span>
        <div className={cn(
          "px-2.5 py-1 rounded text-xs font-medium",
          phase === "listening" && "bg-green/15 text-green",
          phase === "speaking" && "bg-blue/15 text-blue",
          phase === "generating" && "bg-purple/15 text-purple",
          phase === "processing" && "bg-yellow/15 text-yellow",
          phase === "ended" && "bg-red/15 text-red",
          phase === "idle" && "bg-white/5 text-[#666]",
        )}>
          {phase === "listening" && "듣는 중"}
          {phase === "speaking" && "면접관 발언 중"}
          {phase === "generating" && "질문 생성 중"}
          {phase === "processing" && "답변 처리 중"}
          {phase === "ended" && "종료"}
          {phase === "idle" && "준비 중"}
        </div>
      </div>

      {/* main — speaker view */}
      <div className="flex-1 relative p-2 min-h-0">
        {/* interviewer (avatar) — full */}
        <div className="relative w-full h-full rounded-lg overflow-hidden bg-[#e3d9aa] flex items-center justify-center">
          <div className="relative w-full max-h-full aspect-video rounded-lg overflow-hidden bg-[#e3d9aa]">
            <video
              ref={avatarVideoRef}
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-contain bg-[#e3d9aa] scale-[1.01]"
            />
            <audio ref={avatarAudioRef} autoPlay />
            {!avatarConnected && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="w-24 h-24 rounded-full bg-card border border-white/[0.1] flex items-center justify-center text-3xl font-bold text-foreground">
                  AI
                </div>
                {phase === "speaking" && (
                  <div className="flex items-center gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-blue animate-pulse"
                        style={{ animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="absolute bottom-3 left-3 flex items-center gap-2">
              <span className="bg-card/90 border border-border text-foreground text-sm px-2.5 py-1 rounded-lg">
                AI 면접관
              </span>
              {(phase === "speaking" || avatarIsSpeaking) && (
                <span className="bg-green/10 text-green text-xs px-2 py-1 rounded-lg border border-green/20">
                  발언 중
                </span>
              )}
            </div>
            {(phase === "speaking" || avatarIsSpeaking) && (
              <div className="absolute inset-0 rounded-lg ring-2 ring-green/40 pointer-events-none" />
            )}
          </div>
        </div>

        {/* user (webcam) — PIP top-right */}
        <div className="absolute top-4 right-4 w-52 aspect-video rounded-lg overflow-hidden bg-[#202020] border border-white/10 shadow-2xl z-10">
          <video
            ref={webcamRef}
            autoPlay
            muted
            playsInline
            className={cn("w-full h-full object-cover", camOff && "opacity-0")}
          />
          {camOff && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-[#333] flex items-center justify-center text-[#888] text-sm font-bold">
                나
              </div>
            </div>
          )}
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
            <span className="bg-card/90 border border-border text-foreground text-xs px-2 py-0.5 rounded-lg">
              나
            </span>
            {micMuted && (
              <svg className="w-3.5 h-3.5 bg-red rounded-full p-0.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="9" y="1" width="6" height="12" rx="3" />
                <line x1="2" y1="2" x2="22" y2="22" />
              </svg>
            )}
          </div>
          {phase === "listening" && normalizedLevel > 0.05 && (
            <div className="absolute inset-0 rounded-lg ring-2 ring-green/40 pointer-events-none" />
          )}
          {phase === "listening" && (
            <div className="absolute bottom-0 inset-x-0 h-[3px] pointer-events-none">
              <div
                className="h-full bg-green/70 transition-all duration-75"
                style={{ width: `${normalizedLevel * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* question subtitle */}
      <AnimatePresence mode="wait">
        {currentQuestion && phase !== "ended" && (
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-14 inset-x-0 flex justify-center z-10 pointer-events-none"
          >
            <div className="bg-card border border-border rounded-xl px-5 py-3 max-w-2xl mx-4 shadow-lg">
              <p className="text-xs text-muted mb-1">Q{questions.length}</p>
              <p className="text-base text-foreground leading-relaxed">{currentQuestion}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* live caption */}
      <AnimatePresence>
        {liveCaption && phase === "listening" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-20 inset-x-0 flex justify-center z-10 pointer-events-none"
          >
            <div className="bg-card border border-border rounded-xl px-5 py-2.5 max-w-xl mx-4 shadow-lg">
              <p className="text-sm text-secondary text-center">{liveCaption}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* voice coach */}
      {mode === "practice" && <CoachOverlay />}

      {/* bottom toolbar — Zoom style */}
      <div className="h-16 flex items-center justify-center gap-3 border-t border-border shrink-0 relative">
        <div className="absolute left-5 flex items-center gap-2">
          <span className="text-sm text-muted">
            Q{questions.length}
          </span>
        </div>

        {/* center controls */}
        <button
          onClick={toggleMic}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
            micMuted ? "bg-red text-white" : "bg-card border border-border text-foreground hover:bg-card-hover",
          )}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            {micMuted ? (
              <>
                <rect x="9" y="1" width="6" height="12" rx="3" />
                <path d="M19 10v1a7 7 0 01-14 0v-1M12 19v4M8 23h8" />
                <line x1="2" y1="2" x2="22" y2="22" />
              </>
            ) : (
              <>
                <rect x="9" y="1" width="6" height="12" rx="3" />
                <path d="M19 10v1a7 7 0 01-14 0v-1M12 19v4M8 23h8" />
              </>
            )}
          </svg>
        </button>

        <button
          onClick={toggleCam}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
            camOff ? "bg-red text-white" : "bg-card border border-border text-foreground hover:bg-card-hover",
          )}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            {camOff ? (
              <>
                <rect x="2" y="4" width="14" height="14" rx="2" />
                <path d="M23 7l-7 5 7 5V7z" />
                <line x1="2" y1="2" x2="22" y2="22" />
              </>
            ) : (
              <>
                <rect x="2" y="4" width="14" height="14" rx="2" />
                <path d="M23 7l-7 5 7 5V7z" />
              </>
            )}
          </svg>
        </button>

        <button
          onClick={handleEnd}
          className="h-11 px-6 rounded-full bg-red text-white text-sm font-medium hover:bg-red/90 transition-colors cursor-pointer"
        >
          면접 종료
        </button>

        {/* right: timer */}
        <div className="absolute right-5">
          <span className="text-sm text-muted font-mono tabular-nums">
            {formatTime(elapsed)}
          </span>
        </div>
      </div>
    </div>
  );
}
