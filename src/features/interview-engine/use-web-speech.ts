"use client";

import { useLocale } from "next-intl";
import { useCallback, useRef, useState } from "react";

const SPEECH_LANG: Record<string, string> = {
  ko: "ko-KR",
  en: "en-US",
};

export function useWebSpeech() {
  const locale = useLocale();
  const [liveCaption, setLiveCaption] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const start = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = SPEECH_LANG[locale] ?? SPEECH_LANG.en;
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
  }, [locale]);

  const stop = useCallback(() => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    recognition?.stop();
    setLiveCaption("");
  }, []);

  return { liveCaption, start, stop };
}
