let submitAudioContext: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  if (!submitAudioContext) {
    const AudioContextCtor =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextCtor) return null;
    submitAudioContext = new AudioContextCtor();
  }
  return submitAudioContext;
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  startAt: number,
  duration: number,
  gainPeak: number,
) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(frequency, startAt);

  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(gainPeak, startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.02);
}

export function playSubmitAudio() {
  const schedule = (ctx: AudioContext) => {
    const now = ctx.currentTime + 0.01;
    // Bright, pop-y lock-in cue in a higher register: mid -> high -> mid.
    playTone(ctx, 783.99, now, 0.14, 0.13); // G5 (mid)
    playTone(ctx, 1174.66, now + 0.09, 0.17, 0.15); // D6 (high)
    playTone(ctx, 987.77, now + 0.21, 0.22, 0.14); // B5 (mid)
  };

  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === "closed") {
    submitAudioContext = null;
    const nextCtx = getAudioContext();
    if (!nextCtx) return;
    if (nextCtx.state === "suspended") {
      void nextCtx
        .resume()
        .then(() => schedule(nextCtx))
        .catch(() => {
          // Ignore browser audio-context resume errors.
        });
      return;
    }
    schedule(nextCtx);
    return;
  }

  if (ctx.state === "suspended") {
    void ctx
      .resume()
      .then(() => schedule(ctx))
      .catch(() => {
        // Ignore browser audio-context resume errors.
      });
    return;
  }

  schedule(ctx);
}
