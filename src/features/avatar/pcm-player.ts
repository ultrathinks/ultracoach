const SAMPLE_RATE = 16000;

export function createPcmPlayer() {
  const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
  let nextStartTime = 0;

  function play(pcm16: Uint8Array) {
    const samples = pcm16.length / 2;
    const buffer = ctx.createBuffer(1, samples, SAMPLE_RATE);
    const channel = buffer.getChannelData(0);

    for (let i = 0; i < samples; i++) {
      const lo = pcm16[i * 2];
      const hi = pcm16[i * 2 + 1];
      const sample = (hi << 8) | lo;
      channel[i] = (sample > 32767 ? sample - 65536 : sample) / 32768;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const now = ctx.currentTime;
    if (nextStartTime < now) nextStartTime = now;
    source.start(nextStartTime);
    nextStartTime += buffer.duration;
  }

  function stop() {
    nextStartTime = 0;
    ctx.close();
  }

  return { play, stop };
}
