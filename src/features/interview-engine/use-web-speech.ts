"use client";

import { useCallback, useRef, useState } from "react";

export function useWebSpeech() {
  const [liveCaption, setLiveCaption] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const start = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "ko-KR";
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        interim += event.results[i][0].transcript;
      }
      setLiveCaption(interim);
    };

    recognition.onerror = () => {};
    recognition.onend = () => {
      // auto-restart if still needed
      if (recognitionRef.current === recognition) {
        try {
          recognition.start();
        } catch {
          // already started
        }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const stop = useCallback(() => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    recognition?.stop();
    setLiveCaption("");
  }, []);

  return { liveCaption, start, stop };
}
