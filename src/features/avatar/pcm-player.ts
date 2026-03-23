const SAMPLE_RATE = 16000;
const BUFFER_DURATION = 0.1; // 100ms buffer to smooth out chunk arrival jitter
const BUFFER_SAMPLES = Math.floor(SAMPLE_RATE * BUFFER_DURATION);

export function createPcmPlayer() {
  const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
  let nextStartTime = 0;
  let pendingBytes: Uint8Array[] = [];
  let pendingLength = 0;
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  function flush() {
    flushTimer = null;
    if (pendingLength === 0) return;

    // Merge pending chunks
    const merged = new Uint8Array(pendingLength);
    let offset = 0;
    for (const chunk of pendingBytes) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    pendingBytes = [];
    pendingLength = 0;

    // Ensure even byte count (PCM16 = 2 bytes per sample)
    const usableLength = merged.length & ~1;
    if (usableLength === 0) return;

    const samples = usableLength / 2;
    const buffer = ctx.createBuffer(1, samples, SAMPLE_RATE);
    const channel = buffer.getChannelData(0);

    for (let i = 0; i < samples; i++) {
      const lo = merged[i * 2];
      const hi = merged[i * 2 + 1];
      const sample = (hi << 8) | lo;
      channel[i] = (sample > 32767 ? sample - 65536 : sample) / 32768;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const now = ctx.currentTime;
    if (nextStartTime < now) nextStartTime = now + 0.02; // small lead time
    source.start(nextStartTime);
    nextStartTime += buffer.duration;
  }

  function play(pcm16: Uint8Array) {
    pendingBytes.push(pcm16);
    pendingLength += pcm16.length;

    // Flush when we have enough samples, or after a short delay
    if (pendingLength / 2 >= BUFFER_SAMPLES) {
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      flush();
    } else if (!flushTimer) {
      flushTimer = setTimeout(flush, 50);
    }
  }

  function stop() {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    pendingBytes = [];
    pendingLength = 0;
    nextStartTime = 0;
    ctx.close();
  }

  return { play, stop };
}
