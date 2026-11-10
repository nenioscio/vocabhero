let active: HTMLAudioElement | null = null;

export function playAudio(url: string): void {
  if (active) {
    active.pause();
  }
  const element = new Audio(url);
  active = element;
  void element.play().catch(() => {
    // Autoplay may be blocked until the user interacts; the replay button covers this.
  });
}

export function stopAudio(): void {
  if (active) {
    active.pause();
    active = null;
  }
}
