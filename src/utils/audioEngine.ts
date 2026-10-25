/**
 * Audio manager reproducing the Android SoundPool / MediaPlayer behavior
 * using the real audio assets:
 * /assets/aistudio/light_seconds_tick_807718a6.wav, /assets/tick.wav, /assets/tock.wav, /assets/bell.mp3
 */
class TvAudioPlayer {
  private tickAudio: HTMLAudioElement | null = null;
  private tockAudio: HTMLAudioElement | null = null;
  private bellAudio: HTMLAudioElement | null = null;
  private audioCtx: AudioContext | null = null;
  private tickBuffer: AudioBuffer | null = null;
  private bellBuffer: AudioBuffer | null = null;
  private isMuted: boolean = false;
  private isUnlocked: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.tickAudio = new Audio('/assets/aistudio/light_seconds_tick_807718a6.wav');
        this.tockAudio = new Audio('/assets/aistudio/light_seconds_tick_807718a6.wav');
        this.bellAudio = new Audio('/assets/bell.mp3');
        this.bellAudio.preload = 'auto';
      } catch {
        // Fallback or server-side
      }
      this.initWebAudio();

      const autoUnlock = () => {
        this.unlock();
      };
      window.addEventListener('pointerdown', autoUnlock, { passive: true });
      window.addEventListener('keydown', autoUnlock, { passive: true });
      window.addEventListener('touchstart', autoUnlock, { passive: true });
      window.addEventListener('click', autoUnlock, { passive: true });
    }
  }

  private async initWebAudio(): Promise<void> {
    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) return;
      this.audioCtx = new AudioCtxClass();

      // Pre-fetch & decode the user's light seconds tick wav
      const tickRes = await fetch('/assets/aistudio/light_seconds_tick_807718a6.wav');
      if (tickRes.ok) {
        const tickArrayBuf = await tickRes.arrayBuffer();
        this.tickBuffer = await this.audioCtx.decodeAudioData(tickArrayBuf);
      }

      // Pre-fetch bell
      const bellRes = await fetch('/assets/bell.mp3');
      if (bellRes.ok) {
        const bellArrayBuf = await bellRes.arrayBuffer();
        this.bellBuffer = await this.audioCtx.decodeAudioData(bellArrayBuf);
      }
    } catch {
      // AudioContext fallback to HTMLAudioElement
    }
  }

  public unlock(): void {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    if (this.isUnlocked) return;
    this.isUnlocked = true;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public playTick(_alternate: boolean = false): void {
    if (this.isMuted) return;
    try {
      if (this.audioCtx && this.tickBuffer) {
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume().catch(() => {});
        }
        const source = this.audioCtx.createBufferSource();
        source.buffer = this.tickBuffer;
        const gainNode = this.audioCtx.createGain();
        gainNode.gain.value = 0.64;
        source.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);
        // Play the single tick duration (~0.08s) so it plays 1 crisp tick per second
        source.start(0, 0, 0.08);
        return;
      }

      // Fallback to HTMLAudio
      const audio = this.tickAudio || this.tockAudio;
      if (audio) {
        audio.currentTime = 0;
        audio.volume = 0.56;
        audio.play().catch(() => {});
      }
    } catch {}
  }

  private lastBellTime: number = 0;

  public playBell(): void {
    if (this.isMuted) return;
    const nowMs = Date.now();
    if (nowMs - this.lastBellTime < 1500) return;
    this.lastBellTime = nowMs;

    try {
      if (this.audioCtx && this.bellBuffer) {
        const startBellSource = () => {
          if (!this.audioCtx || !this.bellBuffer) return;
          const source = this.audioCtx.createBufferSource();
          source.buffer = this.bellBuffer;
          const gainNode = this.audioCtx.createGain();
          gainNode.gain.value = 0.9;
          source.connect(gainNode);
          gainNode.connect(this.audioCtx.destination);
          source.start(0);
        };

        if (this.audioCtx.state === 'suspended') {
          this.audioCtx
            .resume()
            .then(() => startBellSource())
            .catch(() => {
              if (this.bellAudio) {
                this.bellAudio.currentTime = 0;
                this.bellAudio.volume = 0.9;
                this.bellAudio.play().catch(() => {});
              }
            });
        } else {
          startBellSource();
        }
        return;
      }
      if (this.bellAudio) {
        this.bellAudio.currentTime = 0;
        this.bellAudio.volume = 0.9;
        this.bellAudio.play().catch(() => {});
      }
    } catch {}
  }
}

export const tvAudio = new TvAudioPlayer();
