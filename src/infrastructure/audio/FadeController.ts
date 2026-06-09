import TrackPlayer from 'react-native-track-player';

// NaN-safe: a non-finite volume reaching AudioTrack.setVolume throws a native
// IllegalArgumentException that breaks playback, so guard every value.
const clamp = (v: number) => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 1);

/**
 * Centralizes RNTP volume so fade-in / fade-out / crossfade ramps and the
 * user's volume slider don't fight over `TrackPlayer.setVolume`.
 *
 * RNTP drives a single ExoPlayer, so a true overlapping crossfade isn't
 * possible — instead we fade the ending track down and fade the next one up,
 * which gives a smooth, gap-free transition.
 */
export class FadeController {
  private static instance: FadeController;
  static getInstance(): FadeController {
    if (!FadeController.instance) FadeController.instance = new FadeController();
    return FadeController.instance;
  }

  private baseVolume = 1; // the user's chosen level — the ceiling for any ramp
  private current = 1;
  private timer: ReturnType<typeof setInterval> | null = null;
  private fadingOut = false;

  getBaseVolume(): number {
    return this.baseVolume;
  }

  isFadingOut(): boolean {
    return this.fadingOut;
  }

  // The volume slider routes through here so it survives across fades.
  async setBaseVolume(v: number): Promise<void> {
    this.baseVolume = clamp(v);
    if (!this.timer) {
      this.current = this.baseVolume;
      await TrackPlayer.setVolume(this.current).catch(() => {});
    }
  }

  private stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private ramp(to: number, durationMs: number, onDone?: () => void): void {
    this.stop();
    const steps = Math.max(1, Math.round(durationMs / 40));
    const from = this.current;
    const delta = (to - from) / steps;
    let i = 0;
    this.timer = setInterval(() => {
      i++;
      this.current = i >= steps ? to : from + delta * i;
      TrackPlayer.setVolume(clamp(this.current)).catch(() => {});
      if (i >= steps) {
        this.stop();
        onDone?.();
      }
    }, 40);
  }

  async fadeIn(durationMs: number): Promise<void> {
    this.fadingOut = false;
    if (durationMs <= 0) {
      await this.setBaseVolume(this.baseVolume);
      return;
    }
    this.current = 0;
    await TrackPlayer.setVolume(0).catch(() => {});
    this.ramp(this.baseVolume, durationMs);
  }

  fadeOut(durationMs: number): void {
    if (this.fadingOut) return;
    this.fadingOut = true;
    if (durationMs <= 0) {
      this.stop();
      this.current = 0;
      TrackPlayer.setVolume(0).catch(() => {});
      return;
    }
    this.ramp(0, durationMs, () => {
      this.fadingOut = false;
    });
  }

  // Cancel any ramp and snap back to the user's level (manual skip / seek).
  async reset(): Promise<void> {
    this.stop();
    this.fadingOut = false;
    this.current = this.baseVolume;
    await TrackPlayer.setVolume(this.baseVolume).catch(() => {});
  }
}
