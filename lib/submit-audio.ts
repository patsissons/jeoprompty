let submitAudioContext: AudioContext | null = null;
let listenersAttached = false;
let submitFallbackAudio: HTMLAudioElement | null = null;
let submitFallbackAudioSrc: string | null = null;

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

function resumeContext(ctx: AudioContext) {
  if (ctx.state === "running") {
    return Promise.resolve();
  }
  return ctx.resume();
}

function shouldUseElementAudio() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isAppleMobile =
    /iPad|iPhone|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return isAppleMobile;
}

function buildSubmitFallbackAudioSrc() {
  if (submitFallbackAudioSrc) return submitFallbackAudioSrc;
  if (typeof window === "undefined") return null;

  const sampleRate = 22_050;
  const durationSeconds = 0.5;
  const frameCount = Math.floor(sampleRate * durationSeconds);
  const pcm = new Int16Array(frameCount);
  const notes = [
    { frequency: 783.99, startAt: 0, duration: 0.14, gain: 0.45 },
    { frequency: 1174.66, startAt: 0.09, duration: 0.17, gain: 0.5 },
    { frequency: 987.77, startAt: 0.21, duration: 0.22, gain: 0.47 },
  ];

  for (let i = 0; i < frameCount; i += 1) {
    const t = i / sampleRate;
    let sample = 0;
    for (const note of notes) {
      const localT = t - note.startAt;
      if (localT < 0 || localT > note.duration) continue;
      const attack = Math.min(localT / 0.01, 1);
      const release = Math.max((note.duration - localT) / 0.04, 0);
      const envelope = Math.min(attack, release) * note.gain;
      sample += Math.sin(2 * Math.PI * note.frequency * localT) * envelope;
    }
    const clamped = Math.max(-1, Math.min(1, sample));
    pcm[i] = Math.round(clamped * 0x7fff);
  }

  const dataBytes = pcm.length * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);
  const writeAscii = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(36, "data");
  view.setUint32(40, dataBytes, true);

  let dataOffset = 44;
  for (let i = 0; i < pcm.length; i += 1) {
    view.setInt16(dataOffset, pcm[i], true);
    dataOffset += 2;
  }

  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  submitFallbackAudioSrc = `data:audio/wav;base64,${btoa(binary)}`;
  return submitFallbackAudioSrc;
}

function playElementSubmitAudio() {
  if (typeof window === "undefined") return;
  const src = buildSubmitFallbackAudioSrc();
  if (!src) return;

  if (!submitFallbackAudio) {
    submitFallbackAudio = new Audio(src);
    submitFallbackAudio.preload = "auto";
  }

  submitFallbackAudio.currentTime = 0;
  void submitFallbackAudio.play().catch(() => {
    // Ignore play errors (for example if the browser blocks autoplay).
  });
}

function primeElementSubmitAudio() {
  if (typeof window === "undefined") return;
  const src = buildSubmitFallbackAudioSrc();
  if (!src || submitFallbackAudio) return;
  submitFallbackAudio = new Audio(src);
  submitFallbackAudio.preload = "auto";
  submitFallbackAudio.load();
}

export function primeSubmitAudio() {
  if (typeof window === "undefined" || listenersAttached) return;
  listenersAttached = true;

  const unlock = () => {
    if (shouldUseElementAudio()) {
      primeElementSubmitAudio();
      return;
    }

    const ctx = getAudioContext();
    if (!ctx) return;
    void resumeContext(ctx).catch(() => {
      // Ignore browser audio-context resume errors.
    });
  };

  const opts: AddEventListenerOptions = {
    passive: true,
    once: true,
    capture: true,
  };
  window.addEventListener("pointerdown", unlock, opts);
  window.addEventListener("touchstart", unlock, opts);
  window.addEventListener("keydown", unlock, opts);
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
  primeSubmitAudio();

  if (shouldUseElementAudio()) {
    playElementSubmitAudio();
    return;
  }

  const schedule = (ctx: AudioContext) => {
    const now = ctx.currentTime + 0.01;
    // Bright, pop-y lock-in cue in a higher register: mid -> high -> mid.
    playTone(ctx, 783.99, now, 0.14, 0.18); // G5 (mid)
    playTone(ctx, 1174.66, now + 0.09, 0.17, 0.2); // D6 (high)
    playTone(ctx, 987.77, now + 0.21, 0.22, 0.19); // B5 (mid)
  };

  const ctx = getAudioContext();
  if (!ctx) {
    playElementSubmitAudio();
    return;
  }

  if (ctx.state === "closed") {
    submitAudioContext = null;
    const nextCtx = getAudioContext();
    if (!nextCtx) {
      playElementSubmitAudio();
      return;
    }
    void resumeContext(nextCtx)
      .then(() => schedule(nextCtx))
      .catch(() => {
        playElementSubmitAudio();
      });
    return;
  }

  void resumeContext(ctx)
    .then(() => schedule(ctx))
    .catch(() => {
      playElementSubmitAudio();
    });
}
