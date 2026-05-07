"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMetricsStore } from "@/entities/metrics";
import { useSessionStore } from "@/entities/session";
import { useAvatar } from "@/features/avatar";
import { useMediaPipe } from "@/features/body-language";
import { useInterviewEngine } from "@/features/interview-engine";
import { useWebSpeech } from "@/features/interview-engine/use-web-speech";
import { useRecording } from "@/features/recording";
import { useDevices } from "@/features/setup/use-devices";
import { cn } from "@/shared/lib/cn";
import { DevicePanel } from "./device-panel";
import { PauseOverlay } from "./pause-overlay";

interface InterviewScreenProps {
  researchStatus?: "idle" | "loading" | "done";
}

const MIN_PIP_WIDTH = 180;
const MAX_PIP_WIDTH = 900;
const DEFAULT_PIP_WIDTH = 420;
const PIP_WIDTH_STORAGE_KEY = "ultracoach:pipWidth";

export function InterviewScreen({
  researchStatus = "done",
}: InterviewScreenProps) {
  const t = useTranslations("interview");
  const router = useRouter();
  const {
    fetchNextQuestion,
    startListening,
    stopListening,
    submitTextAnswer,
    keepListeningAlive,
    forceSpeechEnd,
    audioLevel,
    silenceProgress,
  } = useInterviewEngine();
  const { liveCaption, start: startSpeech, stop: stopSpeech } = useWebSpeech();
  const avatarId = useSessionStore((s) => s.avatarId);
  const {
    connect: connectAvatar,
    speak: avatarSpeak,
    disconnect: disconnectAvatar,
    isConnected: avatarConnected,
    isSpeaking: avatarIsSpeaking,
  } = useAvatar({ avatarId });
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
  const jobTitle = useSessionStore((s) => s.jobTitle);
  const audioInputId = useSessionStore((s) => s.audioInputId);
  const audioOutputId = useSessionStore((s) => s.audioOutputId);
  const videoInputId = useSessionStore((s) => s.videoInputId);
  const setDevices = useSessionStore((s) => s.setDevices);
  const userPaused = useSessionStore((s) => s.userPaused);
  const setUserPaused = useSessionStore((s) => s.setUserPaused);
  const {
    mics,
    speakers,
    cams,
    refresh: refreshDevices,
    supportsSinkId,
  } = useDevices();

  const streamRef = useRef<MediaStream | null>(null);
  const streamReadyRef = useRef<(() => void) | null>(null);
  const webcamRef = useRef<HTMLVideoElement>(null);
  const avatarVideoRef = useRef<HTMLVideoElement>(null);
  const avatarAudioRef = useRef<HTMLAudioElement>(null);
  const loopAbortRef = useRef(false);
  const landmarkCanvasRef = useRef<HTMLCanvasElement>(null);
  /** true while a live stream is attached after successful getUserMedia */
  const mediaInitializedRef = useRef(false);
  const pauseStartRef = useRef<number | null>(null);
  const pausedDurationRef = useRef(0);
  const replayBusyRef = useRef(false);
  const [elapsed, setElapsed] = useState(0);
  const [micMuted, setMicMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [showLandmarks, setShowLandmarks] = useState(false);
  const [preparing, setPreparing] = useState(true);
  const [pinQuestion, setPinQuestion] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [devicePanelOpen, setDevicePanelOpen] = useState(false);
  const [deviceToast, setDeviceToast] = useState<string | null>(null);
  const [isSwapped, setIsSwapped] = useState(false);
  const [pipWidth, setPipWidth] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_PIP_WIDTH;
    const saved = window.localStorage.getItem(PIP_WIDTH_STORAGE_KEY);
    const n = saved ? Number(saved) : Number.NaN;
    if (!Number.isFinite(n)) return DEFAULT_PIP_WIDTH;
    return Math.min(MAX_PIP_WIDTH, Math.max(MIN_PIP_WIDTH, n));
  });
  const pipWidthRef = useRef(pipWidth);
  pipWidthRef.current = pipWidth;
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PIP_WIDTH_STORAGE_KEY, String(pipWidth));
  }, [pipWidth]);
  const textInputRef = useRef<HTMLInputElement>(null);
  const [prepSteps, setPrepSteps] = useState<
    { label: string; status: "pending" | "loading" | "done" }[]
  >([
    {
      label: t("prep.jobAnalysis"),
      status: researchStatus === "done" ? "done" : "loading",
    },
    { label: t("prep.questionOpt"), status: "pending" },
    { label: t("prep.deviceConnect"), status: "loading" },
    { label: t("prep.interviewerReady"), status: "pending" },
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
      const now = Date.now();
      const liveOffset = pauseStartRef.current
        ? now - pauseStartRef.current
        : 0;
      const total = now - startTime - pausedDurationRef.current - liveOffset;
      setElapsed(Math.max(0, Math.floor(total / 1000)));
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
      const prefs = useSessionStore.getState();
      const audioConstraint: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };
      if (prefs.audioInputId) {
        audioConstraint.deviceId = { exact: prefs.audioInputId };
      }
      const videoConstraint: MediaTrackConstraints | true = prefs.videoInputId
        ? { deviceId: { exact: prefs.videoInputId } }
        : true;

      try {
        return await navigator.mediaDevices.getUserMedia({
          video: videoConstraint,
          audio: audioConstraint,
        });
      } catch (err) {
        if (!(err instanceof DOMException) || err.name !== "NotFoundError") {
          throw err;
        }

        // 일부 환경에서는 카메라가 잠시 사라져도 오디오는 사용 가능하므로 폴백한다.
        return navigator.mediaDevices.getUserMedia({
          video: false,
          audio: audioConstraint,
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
        const isDom = err instanceof DOMException;
        const code = isDom ? err.name : "unknown";
        const message = isDom ? err.message : "unknown error";
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
        while (useSessionStore.getState().userPaused && !loopAbortRef.current) {
          await new Promise((r) => setTimeout(r, 200));
        }
        if (loopAbortRef.current) break;

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

        // 면접관 발화 끝난 시점에 사용자가 일시정지를 눌렀다면 listening 진입 전에 멈춘다
        while (useSessionStore.getState().userPaused && !loopAbortRef.current) {
          await new Promise((r) => setTimeout(r, 200));
        }
        if (loopAbortRef.current) break;

        // 답변 받기 전에 마이크 다시 켜기
        for (const track of stream.getAudioTracks()) {
          track.enabled = true;
        }

        startSpeech();
        await startListening(
          stream,
          useSessionStore.getState().calibratedVadThreshold ?? undefined,
        );
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
          avatarId: state.avatarId,
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

  const showDeviceToast = useCallback((message: string) => {
    setDeviceToast(message);
    setTimeout(() => setDeviceToast(null), 2400);
  }, []);

  const changeMic = useCallback(
    async (deviceId: string) => {
      const stream = streamRef.current;
      if (!stream) return;
      try {
        const next = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: deviceId ? { exact: deviceId } : undefined,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        const newTrack = next.getAudioTracks()[0];
        if (!newTrack) return;
        for (const t of stream.getAudioTracks()) {
          t.stop();
          stream.removeTrack(t);
        }
        stream.addTrack(newTrack);
        stopListening();
        disposeRecording();
        startRecording(stream);
        setDevices({ audioInputId: deviceId || null });
        setMicMuted(!newTrack.enabled);
        showDeviceToast(t("toasts.micChanged"));
      } catch (err) {
        console.warn("change mic failed:", err);
        showDeviceToast(t("toasts.micChangeFailed"));
      }
    },
    [
      stopListening,
      disposeRecording,
      startRecording,
      setDevices,
      showDeviceToast,
    ],
  );

  const changeCam = useCallback(
    async (deviceId: string) => {
      const stream = streamRef.current;
      if (!stream) return;
      try {
        const next = await navigator.mediaDevices.getUserMedia({
          video: deviceId ? { deviceId: { exact: deviceId } } : true,
        });
        const newTrack = next.getVideoTracks()[0];
        if (!newTrack) return;
        for (const t of stream.getVideoTracks()) {
          t.stop();
          stream.removeTrack(t);
        }
        stream.addTrack(newTrack);
        if (webcamRef.current) {
          webcamRef.current.srcObject = stream;
          startMediaPipe(webcamRef.current);
        }
        setDevices({ videoInputId: deviceId || null });
        setCamOff(!newTrack.enabled);
        showDeviceToast(t("toasts.camChanged"));
      } catch (err) {
        console.warn("change cam failed:", err);
        showDeviceToast(t("toasts.camChangeFailed"));
      }
    },
    [startMediaPipe, setDevices, showDeviceToast],
  );

  const changeSpeaker = useCallback(
    async (deviceId: string) => {
      const audio = avatarAudioRef.current;
      if (audio && typeof audio.setSinkId === "function") {
        try {
          await audio.setSinkId(deviceId || "");
        } catch (err) {
          console.warn("setSinkId failed:", err);
          showDeviceToast(t("toasts.speakerChangeFailed"));
          return;
        }
      }
      setDevices({ audioOutputId: deviceId || null });
      showDeviceToast(t("toasts.speakerChanged"));
    },
    [setDevices, showDeviceToast],
  );

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const handler = () => {
      void refreshDevices();
      showDeviceToast(t("toasts.deviceListChanged"));
    };
    navigator.mediaDevices?.addEventListener?.("devicechange", handler);
    return () => {
      navigator.mediaDevices?.removeEventListener?.("devicechange", handler);
    };
  }, [refreshDevices, showDeviceToast]);

  useEffect(() => {
    function isFormFocused() {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        return true;
      }
      return el instanceof HTMLElement && el.isContentEditable;
    }
    function handleKey(e: KeyboardEvent) {
      if (e.code !== "Space") return;
      if (silenceProgress <= 0) return;
      if (phase !== "listening") return;
      if (useSessionStore.getState().userPaused) return;
      if (isFormFocused()) return;
      e.preventDefault();
      keepListeningAlive();
    }
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
    };
  }, [silenceProgress, phase, keepListeningAlive]);

  const handlePause = useCallback(() => {
    if (useSessionStore.getState().userPaused) return;
    pauseStartRef.current = Date.now();
    setUserPaused(true);
    // listening 중이면 현재 답변을 그대로 마무리 (transcribe 거침). speaking 중이면 노op.
    const phaseNow = useSessionStore.getState().phase;
    if (phaseNow === "listening") {
      void forceSpeechEnd();
    }
  }, [setUserPaused, forceSpeechEnd]);

  const handleResume = useCallback(() => {
    if (!useSessionStore.getState().userPaused) return;
    if (pauseStartRef.current) {
      pausedDurationRef.current += Date.now() - pauseStartRef.current;
      pauseStartRef.current = null;
    }
    setUserPaused(false);
  }, [setUserPaused]);

  const handleForceEnd = useCallback(() => {
    void forceSpeechEnd();
  }, [forceSpeechEnd]);

  const handleReplay = useCallback(async () => {
    if (replayBusyRef.current) return;
    if (avatarIsSpeaking) {
      // 면접관 발화 중에는 무시해 큐 충돌을 막는다
      return;
    }
    const question = useSessionStore.getState().currentQuestion;
    if (!question) return;
    replayBusyRef.current = true;

    const phaseBefore = useSessionStore.getState().phase;
    const wasListening = phaseBefore === "listening";

    let aliveTimer: ReturnType<typeof setInterval> | null = null;
    if (wasListening) {
      // listening 중인데 곧 speaking으로 보여줘야 캡션이 어긋나지 않음
      useSessionStore.getState().setPhase("speaking");
      // mute 중에는 VAD가 silence를 잡아 카운트다운이 끝나버리니 keepAlive로 막는다
      aliveTimer = setInterval(() => keepListeningAlive(), 200);
    }

    const stream = streamRef.current;
    const tracks = stream?.getAudioTracks() ?? [];
    for (const t of tracks) t.enabled = false;

    try {
      await avatarSpeak(question);
    } catch (err) {
      console.warn("replay failed:", err);
    }

    for (const t of tracks) t.enabled = true;

    if (aliveTimer) clearInterval(aliveTimer);
    if (wasListening) {
      useSessionStore.getState().setPhase("listening");
      keepListeningAlive();
    }
    replayBusyRef.current = false;
  }, [avatarSpeak, avatarIsSpeaking, keepListeningAlive]);

  const handleSwapView = useCallback(() => {
    setIsSwapped((v) => !v);
  }, []);

  const handlePipResizeStart = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startY = e.clientY;
      const startWidth = pipWidthRef.current;
      const handleMove = (ev: PointerEvent) => {
        const dx = startX - ev.clientX;
        const dy = startY - ev.clientY;
        const delta = Math.max(dx, dy * 1.6);
        const next = Math.max(
          MIN_PIP_WIDTH,
          Math.min(MAX_PIP_WIDTH, startWidth + delta),
        );
        setPipWidth(next);
      };
      const handleUp = () => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
      };
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [],
  );

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
        <h2 className="text-2xl font-bold mb-2">{t("analyzing")}</h2>
        <p className="text-muted">{t("analyzingDesc")}</p>
      </div>
    );
  }

  const phaseLabel: Record<string, string> = {
    listening: t("phases.listening"),
    speaking: t("phases.speaking"),
    generating: t("phases.generating"),
    processing: t("phases.processing"),
    ended: t("phases.ended"),
    idle: t("phases.idle"),
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      {/* ── video area ── */}
      <div className="flex-1 relative min-h-0 overflow-hidden">
        {/* avatar surface */}
        <div
          className={cn(
            "absolute",
            isSwapped
              ? "rounded-xl overflow-hidden border border-border-subtle shadow-2xl z-10 bottom-20 right-4 lg:right-6 bg-background"
              : "inset-0 bg-background overflow-hidden flex items-center justify-center",
          )}
          style={
            isSwapped ? { width: pipWidth, aspectRatio: "1 / 1" } : undefined
          }
        >
          <video
            ref={avatarVideoRef}
            autoPlay
            playsInline
            className={cn(
              isSwapped
                ? "w-full h-full object-contain"
                : "h-full aspect-square max-w-full object-contain",
            )}
          />
          {!avatarConnected && (
            <div className="absolute inset-0 bg-background flex items-center justify-center">
              <div
                className={cn(
                  "rounded-full bg-white/[0.04] border border-border flex items-center justify-center font-bold text-muted",
                  isSwapped ? "w-10 h-10 text-xs" : "w-20 h-20 text-2xl",
                )}
              >
                AI
              </div>
            </div>
          )}
        </div>

        <audio ref={avatarAudioRef} autoPlay />

        {/* webcam surface */}
        <div
          className={cn(
            "absolute",
            isSwapped
              ? "inset-0 bg-background overflow-hidden"
              : "rounded-xl overflow-hidden border border-border-subtle shadow-2xl z-10 bottom-20 right-4 lg:right-6",
          )}
          style={
            !isSwapped ? { width: pipWidth, aspectRatio: "16 / 9" } : undefined
          }
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
                {t("camOff")}
              </span>
            </div>
          )}
        </div>

        {/* pip overlay controls (always positioned at the pip slot) */}
        <div
          className="absolute bottom-20 right-4 lg:right-6 z-20 rounded-xl"
          style={{
            width: pipWidth,
            aspectRatio: isSwapped ? "1 / 1" : "16 / 9",
          }}
        >
          <button
            type="button"
            onClick={() => setShowLandmarks((v) => !v)}
            aria-pressed={showLandmarks}
            aria-label={t("controls.toggleLandmarks")}
            className="absolute inset-0 cursor-pointer rounded-xl"
          />
          <button
            type="button"
            onPointerDown={handlePipResizeStart}
            aria-label={t("controls.resizePip")}
            className="absolute top-0 left-0 w-5 h-5 cursor-nwse-resize bg-transparent"
          />
        </div>

        {/* question/caption overlay — bottom of video */}
        <div className="absolute bottom-0 inset-x-0 pointer-events-none z-[15]">
          <div className="bg-gradient-to-t from-background via-background/60 to-transparent pt-20 pb-6 px-6">
            {pinQuestion &&
              currentQuestion &&
              (phase === "speaking" || phase === "listening") && (
                <p className="text-foreground/50 text-center text-sm max-w-2xl mx-auto mb-2">
                  {currentQuestion}
                </p>
              )}
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
                ((phase === "speaking" && avatarIsSpeaking) ||
                  (phase === "listening" && !pinQuestion)) ? (
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
            className="flex items-center gap-2 max-w-2xl mx-auto glass rounded-xl p-2"
          >
            <input
              ref={textInputRef}
              type="text"
              value={textInput}
              onChange={(e) => {
                setTextInput(e.target.value);
                keepListeningAlive();
              }}
              placeholder={t("controls.textInputPlaceholder")}
              className="flex-1 h-9 px-4 rounded-lg bg-white/[0.04] border border-border-subtle text-foreground text-sm placeholder:text-muted focus:outline-none focus:border-foreground/30"
            />
            <button
              type="submit"
              disabled={!textInput.trim()}
              className="h-9 px-4 rounded-lg bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              {t("controls.send")}
            </button>
          </form>
        </div>
      )}

      {/* ── silence countdown bar ── */}
      <button
        type="button"
        onClick={() => keepListeningAlive()}
        disabled={silenceProgress <= 0 || phase !== "listening"}
        aria-label={t("controls.extendThinking")}
        title={`${t("controls.extendThinking")} (Space)`}
        className={cn(
          "shrink-0 h-2.5 w-full flex items-center transition-opacity cursor-pointer disabled:cursor-default",
          silenceProgress > 0 && phase === "listening"
            ? "opacity-100"
            : "opacity-0 pointer-events-none",
        )}
      >
        <div className="w-full h-[2px] bg-white/[0.04] overflow-hidden">
          <div
            className={cn(
              "h-full",
              silenceProgress >= 0.7 ? "bg-red" : "bg-yellow",
            )}
            style={{
              width: `${Math.min(silenceProgress, 1) * 100}%`,
              transition: "width 80ms linear, background-color 200ms",
            }}
          />
        </div>
      </button>

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
            onClick={() => setDevicePanelOpen((v) => !v)}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer",
              devicePanelOpen
                ? "bg-indigo/15 text-indigo border border-indigo/30"
                : "bg-card border border-border text-foreground hover:bg-card-hover",
            )}
            aria-label={t("device.title")}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h.01a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v.01a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </button>

          <button
            type="button"
            onClick={handlePause}
            disabled={userPaused || phase === "ended"}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
              "bg-card border border-border text-foreground hover:bg-card-hover",
            )}
            aria-label={t("controls.pause")}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          </button>

          {(phase === "listening" || phase === "speaking") && (
            <button
              type="button"
              onClick={handleReplay}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer bg-card border border-border text-foreground hover:bg-card-hover"
              aria-label={t("controls.replay")}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
              </svg>
            </button>
          )}

          {phase === "listening" && (
            <button
              type="button"
              onClick={handleForceEnd}
              className="h-10 px-4 rounded-full flex items-center gap-1.5 bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors cursor-pointer"
              aria-label={t("controls.forceEnd")}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {t("controls.forceEnd")}
            </button>
          )}

          <button
            type="button"
            onClick={handleSwapView}
            aria-pressed={isSwapped}
            aria-label={t("controls.swapView")}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer",
              isSwapped
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
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="17 1 21 5 17 9" />
              <path d="M3 11V9a4 4 0 014-4h14" />
              <polyline points="7 23 3 19 7 15" />
              <path d="M21 13v2a4 4 0 01-4 4H3" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => setPinQuestion((v) => !v)}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer",
              pinQuestion
                ? "bg-indigo/15 text-indigo border border-indigo/30"
                : "bg-card border border-border text-foreground hover:bg-card-hover",
            )}
            aria-label={t("controls.pinQuestion")}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
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
            {t("controls.end")}
          </button>
        </div>

        <div className="w-40 text-right">
          <span className="text-sm text-muted">{phaseLabel[phase] ?? ""}</span>
        </div>
      </div>

      {/* ── device panel ── */}
      <AnimatePresence>
        {devicePanelOpen && (
          <DevicePanel
            open={devicePanelOpen}
            onClose={() => setDevicePanelOpen(false)}
            mics={mics}
            speakers={speakers}
            cams={cams}
            audioInputId={audioInputId}
            audioOutputId={audioOutputId}
            videoInputId={videoInputId}
            supportsSinkId={supportsSinkId}
            onChangeMic={(id) => void changeMic(id)}
            onChangeSpeaker={(id) => void changeSpeaker(id)}
            onChangeCam={(id) => void changeCam(id)}
          />
        )}
      </AnimatePresence>

      {/* ── user pause overlay ── */}
      <AnimatePresence>
        {userPaused && <PauseOverlay onResume={handleResume} />}
      </AnimatePresence>

      {/* ── device toast ── */}
      <AnimatePresence>
        {deviceToast && (
          <motion.div
            key={deviceToast}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="absolute top-6 left-1/2 -translate-x-1/2 z-40 glass rounded-full px-4 py-2 text-xs text-secondary"
          >
            {deviceToast}
          </motion.div>
        )}
      </AnimatePresence>

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
                  ? t("prep.starting")
                  : t("prep.preparing")}
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
