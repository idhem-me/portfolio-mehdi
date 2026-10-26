import { audioGain, type FeedbackKind } from "./config";

const NOTES: Record<FeedbackKind, number | number[]> = {
  cook: 380,
  buy: [440, 550],
  novelty: [520, 660],
  levelUp: [440, 554, 659],
};

export class BurgerAudio {
  private context: AudioContext | null = null;
  private bus: GainNode | null = null;
  private voices = new Set<OscillatorNode>();
  private volume = 50;

  setVolume(slider: number) {
    this.volume = Math.max(0, Math.min(100, slider));
    if (this.context && this.bus) {
      this.bus.gain.cancelScheduledValues(this.context.currentTime);
      this.bus.gain.setTargetAtTime(
        audioGain(this.volume),
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
        this.bus.gain.value = audioGain(this.volume);
        this.bus.connect(this.context.destination);
      }
      void this.context.resume().catch(() => {});
    } catch {
      /* Unsupported audio never blocks play. */
    }
  }

  emit(kind: FeedbackKind) {
    const c = this.context;
    if (!c || c.state !== "running" || this.volume === 0 || !this.bus) return;
    const notes = NOTES[kind];
    const list = Array.isArray(notes) ? notes : [notes];
    const gainPeak = kind === "cook" ? 0.035 : kind === "novelty" ? 0.045 : 0.055;
    const duration = kind === "levelUp" ? 0.18 : 0.12;
    list.forEach((frequency, i) => {
      if (this.voices.size >= 8) return;
      const oscillator = c.createOscillator();
      const gain = c.createGain();
      const time = c.currentTime + i * 0.07;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency * 1.35, time);
      oscillator.frequency.exponentialRampToValueAtTime(
        frequency,
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

  mute() {
    for (const voice of this.voices) {
      try {
        voice.stop();
      } catch {
        /* Already stopped. */
      }
    }
    this.voices.clear();
    if (this.context?.state === "running")
      void this.context.suspend().catch(() => {});
  }

  close() {
    this.mute();
    this.bus?.disconnect();
    this.bus = null;
    if (this.context) void this.context.close().catch(() => {});
    this.context = null;
  }
}
