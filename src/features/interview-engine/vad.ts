interface VadOptions {
  threshold?: number;
  silenceDelay?: number;
  minSpeechDuration?: number;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void | Promise<void>;
  onLevel?: (rms: number) => void;
}

interface VadController {
  start: (stream: MediaStream) => void;
  stop: () => void;
  keepAlive: () => void;
}

export function createVad(options: VadOptions = {}): VadController {
  const {
    threshold = 0.035,
    silenceDelay = 2500,
    minSpeechDuration = 1000,
    onSpeechStart,
    onSpeechEnd,
    onLevel,
  } = options;

  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let rafId: number | null = null;
  let isSpeaking = false;
  let speechStart = 0;
  let silenceStart = 0;
  let stopped = false;

  function processFrame() {
    if (!analyser || stopped) return;

    const data = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(data);

    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    const rms = Math.sqrt(sum / data.length);

    onLevel?.(rms);

    if (rms > threshold) {
      silenceStart = 0;
      if (!isSpeaking) {
        isSpeaking = true;
        speechStart = performance.now();
        onSpeechStart?.();
      }
    } else if (isSpeaking) {
      if (silenceStart === 0) {
        silenceStart = performance.now();
      }
      const speechDuration = performance.now() - speechStart;
      const effectiveDelay = speechDuration < 5000
        ? silenceDelay * 2
        : silenceDelay;
      if (silenceStart > 0 && performance.now() - silenceStart > effectiveDelay) {
        const duration = speechDuration;
        isSpeaking = false;
        silenceStart = 0;
        speechStart = 0;
        if (duration >= minSpeechDuration) {
          onSpeechEnd?.();
          return;
        }
      }
    }

    rafId = requestAnimationFrame(processFrame);
  }

  return {
    start(stream: MediaStream) {
      stopped = false;
      audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);

      // High-pass filter to reduce speaker bleed / echo
      const highpass = audioContext.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.value = 200;

      analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(highpass);
      highpass.connect(analyser);
      processFrame();
    },

    keepAlive() {
      silenceStart = 0;
    },

    stop() {
      stopped = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      audioContext?.close();
      audioContext = null;
      analyser = null;
      isSpeaking = false;
      silenceStart = 0;
      speechStart = 0;
    },
  };
}

export async function calibrate(
  stream: MediaStream,
  durationMs = 2000,
): Promise<number> {
  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);

  const samples: number[] = [];
  const data = new Float32Array(analyser.fftSize);

  return new Promise((resolve) => {
    let rafId: number;

    function measure() {
      analyser.getFloatTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        sum += data[i] * data[i];
      }
      samples.push(Math.sqrt(sum / data.length));
      rafId = requestAnimationFrame(measure);
    }

    rafId = requestAnimationFrame(measure);

    setTimeout(() => {
      cancelAnimationFrame(rafId);
      audioContext.close();

      if (samples.length === 0) {
        resolve(0.035);
        return;
      }

      const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
      resolve(Math.max(avg * 3, 0.02));
    }, durationMs);
  });
}
