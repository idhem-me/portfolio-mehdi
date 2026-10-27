import { audioGain } from "./config";

export type CardsSound = "fall" | "tear" | "flip" | "reveal" | "exceptional";

const NOTES: Record<CardsSound, number | number[]> = {
  fall: [160, 90],
  tear: [220, 180],
  flip: 420,
  reveal: [520, 660],
  exceptional: [440, 554, 659, 880],
};

export class CardsAudio {
  private context: AudioContext | null = null;
  private bus: GainNode | null = null;
  private voices = new Set<OscillatorNode>();
  private volume = 50;
  private muted = false;
  private lastSoundAt = new Map<CardsSound, number>();

  setVolume(slider: number) {
    this.volume = Math.max(0, Math.min(100, slider));
    if (this.context && this.bus) {
      this.bus.gain.cancelScheduledValues(this.context.currentTime);
      this.bus.gain.setTargetAtTime(
        this.muted ? 0 : audioGain(this.volume),
        this.context.currentTime,
        0.015,
      );
    }
  }

  unlock() {
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.bus = this.context.createGain();
        this.bus.gain.value = this.muted ? 0 : audioGain(this.volume);
        this.bus.connect(this.context.destination);
      }
      void this.context.resume().catch(() => {});
    } catch {
      /* Unsupported audio never blocks play. */
    }
  }

  emit(kind: CardsSound) {
    const c = this.context;
    if (
      !c ||
      c.state !== "running" ||
      this.volume === 0 ||
      this.muted ||
      !this.bus
    )
      return;
    if (c.currentTime - (this.lastSoundAt.get(kind) ?? -1) < 0.08) return;
    this.lastSoundAt.set(kind, c.currentTime);
    const notes = NOTES[kind];
    const list = Array.isArray(notes) ? notes : [notes];
    const gainPeak =
      kind === "tear" ? 0.04 : kind === "exceptional" ? 0.06 : 0.045;
    const duration = kind === "exceptional" ? 0.22 : 0.12;
    list.forEach((frequency, i) => {
      if (this.voices.size >= 10) return;
      const oscillator = c.createOscillator();
      const gain = c.createGain();
      const time = c.currentTime + i * 0.06;
      oscillator.type = kind === "tear" ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(frequency * 1.25, time);
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(40, frequency),
        time + duration,
      );
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(gainPeak, time + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      oscillator.connect(gain);
      gain.connect(this.bus!);
      this.voices.add(oscillator);
      oscillator.onended = () => {
        this.voices.delete(oscillator);
        oscillator.disconnect();
        gain.disconnect();
      };
      oscillator.start(time);
      oscillator.stop(time + duration);
    });
  }

  stop() {
    for (const voice of this.voices) {
      try {
        voice.stop();
      } catch {
        /* Already stopped. */
      }
    }
    this.voices.clear();
  }

  mute() {
    this.muted = true;
    this.stop();
    if (this.context?.state === "running")
      void this.context.suspend().catch(() => {});
  }

  unmute() {
    this.muted = false;
    this.unlock();
    this.setVolume(this.volume);
  }

  close() {
    this.mute();
    this.bus?.disconnect();
    this.bus = null;
    if (this.context) void this.context.close().catch(() => {});
    this.context = null;
    this.lastSoundAt.clear();
  }
}
