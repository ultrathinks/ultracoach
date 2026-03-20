interface VadOptions {
  threshold?: number;
  silenceDelay?: number;
  minSpeechDuration?: number;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onLevel?: (rms: number) => void;
}

interface VadController {
  start: (stream: MediaStream) => void;
  stop: () => void;
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
      } else if (performance.now() - silenceStart > silenceDelay) {
        const duration = performance.now() - speechStart;
        isSpeaking = false;
        silenceStart = 0;
        speechStart = 0;
        // only trigger if speech lasted long enough
        if (duration >= minSpeechDuration) {
          onSpeechEnd?.();
          return; // stop processing after speech end
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
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      processFrame();
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
