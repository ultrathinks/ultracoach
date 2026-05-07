const TTS_TIMEOUT_MS = 30_000;

export interface TtsClient {
  speak: (text: string) => Promise<ArrayBuffer>;
  stop: () => void;
}

export function createElevenLabsTts(options: { avatarId: string }): TtsClient {
  let abortController: AbortController | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  async function speak(text: string): Promise<ArrayBuffer> {
    abortController = new AbortController();

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        abortController?.abort();
        reject(new Error("tts timeout"));
      }, TTS_TIMEOUT_MS);
    });

    try {
      const res = await Promise.race([
        fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, avatarId: options.avatarId }),
          signal: abortController.signal,
        }),
        timeoutPromise,
      ]);

      if (!res.ok) throw new Error("tts request failed");
      return await res.arrayBuffer();
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    }
  }

  function stop() {
    if (timeoutId) clearTimeout(timeoutId);
    abortController?.abort();
    abortController = null;
  }

  return { speak, stop };
}
