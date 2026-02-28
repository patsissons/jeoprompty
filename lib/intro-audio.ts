let introAudio: HTMLAudioElement | null = null;

export function playIntroAudio() {
  if (typeof window === "undefined") return;

  if (!introAudio) {
    introAudio = new Audio("/audio/intro.mp3");
    introAudio.preload = "auto";
  }

  introAudio.currentTime = 0;
  void introAudio.play().catch(() => {
    // Ignore play errors (for example if the browser blocks autoplay).
  });
}
