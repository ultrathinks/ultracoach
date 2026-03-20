const VOICE_ID = "pNInz6obpgDQGcFmaJgB";
const MODEL_ID = "eleven_multilingual_v2";
const TTS_TIMEOUT = 30000;

interface TTSCallbacks {
  onAudioChunk: (pcm16: Uint8Array) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

export function createElevenLabsTTS(apiKey: string) {
  let ws: WebSocket | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  function speak(text: string, callbacks: TTSCallbacks) {
    let resolved = false;

    function finish() {
      if (resolved) return;
      resolved = true;
      if (timeoutId) clearTimeout(timeoutId);
      callbacks.onDone();
    }

    function fail(msg: string) {
      if (resolved) return;
      resolved = true;
      if (timeoutId) clearTimeout(timeoutId);
      callbacks.onError(msg);
    }

    // timeout fallback
    timeoutId = setTimeout(() => fail("tts timeout"), TTS_TIMEOUT);

    const url = `wss://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream-input?model_id=${MODEL_ID}&output_format=pcm_16000`;

    ws = new WebSocket(url);

    ws.onopen = () => {
      ws?.send(
        JSON.stringify({
          text: " ",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
          xi_api_key: apiKey,
        }),
      );

      ws?.send(
        JSON.stringify({
          text: text,
          try_trigger_generation: true,
        }),
      );

      ws?.send(
        JSON.stringify({
          text: "",
        }),
      );
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.audio) {
        const binary = atob(data.audio);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        callbacks.onAudioChunk(bytes);
      }
      if (data.isFinal) {
        finish();
      }
    };

    ws.onerror = () => fail("elevenlabs websocket error");

    // if server closes without isFinal, treat as done
    ws.onclose = () => finish();
  }

  function stop() {
    if (timeoutId) clearTimeout(timeoutId);
    ws?.close();
    ws = null;
  }

  return { speak, stop };
}
