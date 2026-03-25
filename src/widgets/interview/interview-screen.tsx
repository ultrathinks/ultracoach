"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMetricsStore } from "@/entities/metrics";
import { useSessionStore } from "@/entities/session";
import { useAvatar } from "@/features/avatar";
import { useMediaPipe } from "@/features/body-language";
import { useInterviewEngine } from "@/features/interview-engine";
import { useWebSpeech } from "@/features/interview-engine/use-web-speech";
import { useRecording } from "@/features/recording";
import { CoachOverlay } from "@/features/voice-coach";
import { cn } from "@/shared/lib/cn";

interface InterviewScreenProps {
  researchStatus?: "idle" | "loading" | "done";
}

export function InterviewScreen({
  researchStatus = "done",
}: InterviewScreenProps) {
  const router = useRouter();
  const {
    fetchNextQuestion,
    startListening,
    stopListening,
    submitTextAnswer,
    keepListeningAlive,
    audioLevel,
  } = useInterviewEngine();
  const { liveCaption, start: startSpeech, stop: stopSpeech } = useWebSpeech();
  const {
    connect: connectAvatar,
    speak: avatarSpeak,
    disconnect: disconnectAvatar,
    isConnected: avatarConnected,
    isSpeaking: avatarIsSpeaking,
  } = useAvatar();
  const {
    start: startMediaPipe,
    stop: stopMediaPipe,
    landmarks,
  } = useMediaPipe();
  const {
    start: startRecording,
    stop: stopRecording,
    dispose: disposeRecording,
  } = useRecording();

  const phase = useSessionStore((s) => s.phase);
  const currentQuestion = useSessionStore((s) => s.currentQuestion);
  const questions = useSessionStore((s) => s.questions);
  const startTime = useSessionStore((s) => s.startTime);
  const mode = useSessionStore((s) => s.mode);
  const jobTitle = useSessionStore((s) => s.jobTitle);

  const streamRef = useRef<MediaStream | null>(null);
  const streamReadyRef = useRef<(() => void) | null>(null);
  const webcamRef = useRef<HTMLVideoElement>(null);
  const avatarVideoRef = useRef<HTMLVideoElement>(null);
  const avatarAudioRef = useRef<HTMLAudioElement>(null);
  const loopAbortRef = useRef(false);
  const landmarkCanvasRef = useRef<HTMLCanvasElement>(null);
  /** true while a live stream is attached after successful getUserMedia */
  const mediaInitializedRef = useRef(false);
  const [elapsed, setElapsed] = useState(0);
  const [micMuted, setMicMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [showLandmarks, setShowLandmarks] = useState(false);
  const [preparing, setPreparing] = useState(true);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState("");
  const textInputRef = useRef<HTMLInputElement>(null);
  const [prepSteps, setPrepSteps] = useState<
    { label: string; status: "pending" | "loading" | "done" }[]
  >([
    {
      label: "직무 분석",
      status: researchStatus === "done" ? "done" : "loading",
    },
    { label: "면접 질문 최적화", status: "pending" },
    { label: "카메라·마이크 연결", status: "loading" },
    { label: "AI 면접관 준비", status: "pending" },
  ]);

  // 직무 분석 완료 → 질문 최적화 완료
  useEffect(() => {
    if (researchStatus !== "done") return;
    setPrepSteps((prev) =>
      prev.map((s, i) =>
        i === 0
          ? { ...s, status: "done" as const }
          : i === 1
            ? { ...s, status: "loading" as const }
            : s,
      ),
    );
    const timer = setTimeout(() => {
      setPrepSteps((prev) =>
        prev.map((s, i) => (i === 1 ? { ...s, status: "done" as const } : s)),
      );
    }, 800);
    return () => clearTimeout(timer);
  }, [researchStatus]);

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
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let initInFlight = false;

    const hasActiveStream = () => {
      const stream = streamRef.current;
      if (!stream) return false;
      return stream.getTracks().some((track) => track.readyState === "live");
    };

    const requestMediaStream = async (): Promise<MediaStream> => {
      const preferred = {
        video: true,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      };

      try {
        return await navigator.mediaDevices.getUserMedia(preferred);
      } catch (err) {
        const mediaError = err as DOMException;
        if (mediaError?.name !== "NotFoundError") throw err;

        // 일부 환경에서는 카메라가 잠시 사라져도 오디오는 사용 가능하므로 폴백한다.
        return navigator.mediaDevices.getUserMedia({
          video: false,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      }
    };

    const initMedia = async (isRetry = false) => {
      if (initInFlight || hasActiveStream()) return;
      initInFlight = true;
      try {
        const stream = await requestMediaStream();
        if (cancelled) {
          stream.getTracks().forEach((t) => {
            t.stop();
          });
          return;
        }
        streamRef.current = stream;
        mediaInitializedRef.current = true;
        const hasVideo = stream.getVideoTracks().length > 0;
        setCamOff(!hasVideo);
        if (webcamRef.current) webcamRef.current.srcObject = stream;

        streamReadyRef.current?.();
        streamReadyRef.current = null;

        setPrepSteps((prev) =>
          prev.map((s, i) =>
            i === 2
              ? { ...s, status: "done" as const }
              : i === 3
                ? { ...s, status: "loading" as const }
                : s,
          ),
        );

        if (avatarVideoRef.current && avatarAudioRef.current) {
          try {
            await connectAvatar(avatarVideoRef.current, avatarAudioRef.current);
          } catch (err) {
            console.warn("avatar connection failed:", err);
          }
        }

        setPrepSteps((prev) =>
          prev.map((s, i) => (i === 3 ? { ...s, status: "done" as const } : s)),
        );

        if (hasVideo && webcamRef.current) {
          startMediaPipe(webcamRef.current);
        }
        startRecording(stream);
      } catch (err) {
        const mediaError = err as DOMException;
        const code = mediaError?.name ?? "unknown";
        const message = mediaError?.message ?? "unknown error";
        console.error(`camera/mic init failed: ${code} - ${message}`);

        if (
          !isRetry &&
          (code === "NotReadableError" || code === "AbortError")
        ) {
          retryTimer = setTimeout(() => {
            retryTimer = null;
            void initMedia(true);
          }, 1200);
          return;
        }

        streamReadyRef.current?.();
        streamReadyRef.current = null;
      } finally {
        initInFlight = false;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      if (hasActiveStream()) return;
      void initMedia();
    };

    void initMedia();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      stopListening();
      stopSpeech();
      disconnectAvatar();
      stopMediaPipe();
      disposeRecording();
      mediaInitializedRef.current = false;
      streamRef.current?.getTracks().forEach((t) => {
        t.stop();
      });
      streamRef.current = null;
      if (webcamRef.current) {
        webcamRef.current.srcObject = null;
      }
      const notifyStreamWaiters = streamReadyRef.current;
      streamReadyRef.current = null;
      notifyStreamWaiters?.();
    };
  }, [
    connectAvatar,
    disconnectAvatar,
    disposeRecording,
    startMediaPipe,
    startRecording,
    stopListening,
    stopMediaPipe,
    stopSpeech,
  ]);

  useEffect(() => {
    loopAbortRef.current = false;

    (async () => {
      const stream = await waitForStream();
      if (!stream) {
        useSessionStore.getState().setPhase("ended");
        return;
      }

      // wait for avatar video to have frames (up to 10s)
      const avatarDeadline = Date.now() + 10_000;
      while (Date.now() < avatarDeadline && !loopAbortRef.current) {
        const video = avatarVideoRef.current;
        if (video && video.readyState >= 2 && video.videoWidth > 0) break;
        await new Promise((r) => setTimeout(r, 300));
      }

      if (loopAbortRef.current) return;

      setPreparing(false);
      useSessionStore.getState().setStartTime(Date.now());

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
    stopMediaPipe();
    disconnectAvatar();
    disposeRecording();
    mediaInitializedRef.current = false;
    streamRef.current?.getTracks().forEach((t) => {
      t.stop();
    });
    streamRef.current = null;
    if (webcamRef.current) {
      webcamRef.current.srcObject = null;
    }
    useSessionStore.getState().setPhase("analyzing");

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
      useSessionStore.getState().setPhase("ended");
      router.push("/history");
    }
  }, [
    stopListening,
    stopSpeech,
    stopMediaPipe,
    disconnectAvatar,
    disposeRecording,
    stopRecording,
    router,
  ]);

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

  // draw landmarks on webcam PIP canvas
  useEffect(() => {
    if (!showLandmarks || !landmarks || !landmarkCanvasRef.current) return;
    const canvas = landmarkCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // face — small cyan dots
    if (landmarks.face.length > 0) {
      ctx.fillStyle = "rgba(34, 211, 238, 0.6)";
      for (let i = 0; i < landmarks.face.length; i += 3) {
        const [x, y] = landmarks.face[i];
        ctx.beginPath();
        ctx.arc(x * w, y * h, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // pose — green dots + lines for shoulders
    if (landmarks.pose.length > 0) {
      ctx.fillStyle = "rgba(52, 211, 153, 0.7)";
      const keyPoints = [0, 11, 12, 13, 14, 15, 16, 23, 24];
      for (const idx of keyPoints) {
        if (!landmarks.pose[idx]) continue;
        const [x, y] = landmarks.pose[idx];
        ctx.beginPath();
        ctx.arc(x * w, y * h, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      // shoulder line
      if (landmarks.pose[11] && landmarks.pose[12]) {
        ctx.strokeStyle = "rgba(52, 211, 153, 0.4)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(landmarks.pose[11][0] * w, landmarks.pose[11][1] * h);
        ctx.lineTo(landmarks.pose[12][0] * w, landmarks.pose[12][1] * h);
        ctx.stroke();
      }
    }

    // hands — pink dots
    for (const hand of landmarks.hands) {
      ctx.fillStyle = "rgba(244, 114, 182, 0.7)";
      for (const [x, y] of hand) {
        ctx.beginPath();
        ctx.arc(x * w, y * h, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [landmarks, showLandmarks]);

  if (phase === "analyzing") {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-foreground/30 border-t-foreground animate-spin mb-6" />
        <h2 className="text-2xl font-bold mb-2">결과 분석 중</h2>
        <p className="text-muted">AI가 면접 결과를 분석하고 있습니다</p>
      </div>
    );
  }

  const phaseLabel: Record<string, string> = {
    listening: "듣는 중",
    speaking: "면접관 발언 중",
    generating: "질문 생성 중",
    processing: "답변 처리 중",
    ended: "종료",
    idle: "준비 중",
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      {/* ── video area ── */}
      <div className="flex-1 relative min-h-0">
        <div className="relative w-full h-full overflow-hidden bg-background flex items-center justify-center">
          <video
            ref={avatarVideoRef}
            autoPlay
            playsInline
            className="h-full aspect-[3/4] max-w-full object-cover"
            style={{ objectPosition: "center 25%" }}
          />
          <audio ref={avatarAudioRef} autoPlay />

          {!avatarConnected && (
            <div className="absolute inset-0 bg-background flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-white/[0.04] border border-border flex items-center justify-center text-2xl font-bold text-muted">
                AI
              </div>
            </div>
          )}

          {/* question/caption overlay — bottom of video */}
          <div className="absolute bottom-0 inset-x-0 pointer-events-none">
            <div className="bg-gradient-to-t from-background via-background/60 to-transparent pt-20 pb-6 px-6">
              <AnimatePresence mode="wait">
                {liveCaption && phase === "listening" ? (
                  <motion.p
                    key="caption"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-secondary text-center text-[15px] max-w-2xl mx-auto"
                  >
                    {liveCaption}
                  </motion.p>
                ) : currentQuestion &&
                  ((phase === "speaking" && avatarIsSpeaking) || phase === "listening") ? (
                  <motion.p
                    key={currentQuestion}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-foreground text-center text-[15px] max-w-2xl mx-auto leading-relaxed"
                  >
                    {currentQuestion}
                  </motion.p>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* webcam PIP */}
        <div
          onClick={() => setShowLandmarks((v) => !v)}
          className="absolute bottom-20 right-4 lg:right-6 w-56 lg:w-72 aspect-video rounded-xl overflow-hidden border border-white/[0.06] shadow-2xl z-10 cursor-pointer"
        >
          <video
            ref={webcamRef}
            autoPlay
            muted
            playsInline
            className={cn("w-full h-full object-cover", camOff && "opacity-0")}
          />
          {showLandmarks && (
            <canvas
              ref={landmarkCanvasRef}
              width={320}
              height={180}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />
          )}
          {camOff && (
            <div className="absolute inset-0 bg-card flex items-center justify-center">
              <span className="text-muted text-sm font-medium">
                카메라 꺼짐
              </span>
            </div>
          )}
        </div>
      </div>

      {mode === "practice" && <CoachOverlay />}

      {/* ── text input overlay ── */}
      {showTextInput && phase === "listening" && (
        <div className="absolute bottom-16 inset-x-0 z-10 px-6 pb-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = textInput.trim();
              if (!trimmed) return;
              submitTextAnswer(trimmed);
              setTextInput("");
              setShowTextInput(false);
            }}
            className="flex items-center gap-2 max-w-2xl mx-auto bg-background/80 backdrop-blur-xl rounded-xl p-2 border border-white/[0.06]"
          >
            <input
              ref={textInputRef}
              type="text"
              value={textInput}
              onChange={(e) => {
                setTextInput(e.target.value);
                keepListeningAlive();
              }}
              placeholder="타이핑으로 답변하기..."
              className="flex-1 h-9 px-4 rounded-lg bg-white/[0.04] border border-white/[0.06] text-foreground text-sm placeholder:text-muted focus:outline-none focus:border-foreground/30"
            />
            <button
              type="submit"
              disabled={!textInput.trim()}
              className="h-9 px-4 rounded-lg bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              전송
            </button>
          </form>
        </div>
      )}

      {/* ── controls ── */}
      <div className="shrink-0 h-16 flex items-center justify-between px-6">
        <div className="flex items-center gap-2.5 w-40">
          <div className="w-1.5 h-1.5 rounded-full bg-red" />
          <span className="text-sm text-muted font-mono tabular-nums">
            {formatTime(elapsed)}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-end gap-[2px] h-4 mr-1">
            {[0.15, 0.35, 0.55, 0.75, 0.9].map((t, i) => (
              <div
                key={i}
                className={cn(
                  "w-[3px] rounded-full transition-colors duration-75",
                  normalizedLevel > t ? "bg-green" : "bg-white/[0.06]",
                )}
                style={{ height: `${6 + i * 2.5}px` }}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={toggleMic}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer",
              micMuted
                ? "bg-red text-white"
                : "bg-card border border-border text-foreground hover:bg-card-hover",
            )}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <rect x="9" y="1" width="6" height="12" rx="3" />
              <path d="M19 10v1a7 7 0 01-14 0v-1M12 19v4M8 23h8" />
              {micMuted && <line x1="2" y1="2" x2="22" y2="22" />}
            </svg>
          </button>

          <button
            type="button"
            onClick={toggleCam}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer",
              camOff
                ? "bg-red text-white"
                : "bg-card border border-border text-foreground hover:bg-card-hover",
            )}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <rect x="2" y="4" width="14" height="14" rx="2" />
              <path d="M23 7l-7 5 7 5V7z" />
              {camOff && <line x1="2" y1="2" x2="22" y2="22" />}
            </svg>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowTextInput((v) => !v);
              if (!showTextInput) {
                setTimeout(() => textInputRef.current?.focus(), 100);
              }
            }}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer",
              showTextInput
                ? "bg-indigo/15 text-indigo border border-indigo/30"
                : "bg-card border border-border text-foreground hover:bg-card-hover",
            )}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M8 16h8" />
            </svg>
          </button>

          <button
            type="button"
            onClick={handleEnd}
            className="h-10 px-5 rounded-full text-red text-sm font-medium hover:bg-red/10 transition-colors cursor-pointer"
          >
            종료
          </button>
        </div>

        <div className="w-40 text-right">
          <span className="text-sm text-muted">{phaseLabel[phase] ?? ""}</span>
        </div>
      </div>

      {/* ── preparing overlay ── */}
      <AnimatePresence>
        {preparing && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 z-20 bg-background flex flex-col items-center justify-center"
          >
            <motion.div
              className="w-full max-w-sm px-6"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <h2 className="text-2xl font-bold text-center mb-12">
                {prepSteps.every((s) => s.status === "done")
                  ? "면접을 시작합니다"
                  : "면접을 준비하고 있어요"}
              </h2>
              <div className="space-y-5">
                {prepSteps.map((step, i) => (
                  <motion.div
                    key={step.label}
                    className="flex items-center gap-4"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.15, duration: 0.3 }}
                  >
                    {step.status === "loading" ? (
                      <div className="w-5 h-5 rounded-full border-2 border-foreground/30 border-t-foreground animate-spin" />
                    ) : step.status === "done" ? (
                      <div className="w-5 h-5 rounded-full bg-green/15 flex items-center justify-center">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="var(--color-green)"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-white/[0.06]" />
                    )}
                    <span
                      className={cn(
                        "text-base transition-colors",
                        step.status === "done" && "text-foreground",
                        step.status === "loading" && "text-secondary",
                        step.status === "pending" && "text-muted",
                      )}
                    >
                      {step.label}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
