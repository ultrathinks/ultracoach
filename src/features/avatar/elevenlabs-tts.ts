const TTS_TIMEOUT = 30000;

interface TTSCallbacks {
  onAudioChunk: (pcm16: Uint8Array) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

export function createElevenLabsTTS() {
  let abortController: AbortController | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  function speak(text: string, callbacks: TTSCallbacks) {
    abortController = new AbortController();

    timeoutId = setTimeout(() => {
      abortController?.abort();
      callbacks.onError("tts timeout");
    }, TTS_TIMEOUT);

    (async () => {
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
          signal: abortController!.signal,
        });

        if (!res.ok || !res.body) {
          if (timeoutId) clearTimeout(timeoutId);
          callbacks.onError("tts request failed");
          return;
        }

        const reader = res.body.getReader();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          callbacks.onAudioChunk(value);
        }

        if (timeoutId) clearTimeout(timeoutId);
        callbacks.onDone();
      } catch (err) {
        if (timeoutId) clearTimeout(timeoutId);
        if (err instanceof Error && err.name === "AbortError") {
          callbacks.onDone();
        } else {
          callbacks.onError("tts stream error");
        }
      }
    })();
  }

  function stop() {
    if (timeoutId) clearTimeout(timeoutId);
    abortController?.abort();
    abortController = null;
  }

  return { speak, stop };
}
