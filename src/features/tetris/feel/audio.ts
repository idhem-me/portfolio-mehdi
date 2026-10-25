import type { GameEvent } from "../engine/game";
/** Original synthesized sounds; no assets, tracking or engine dependency. */
export const soundConfig = {
  gain: 0.055,
  maxVoices: 8,
  moveCooldown: 65,
  duration: 0.13,
  notes: {
    move: 220,
    rotate: 440,
    hold: 330,
    lock: 160,
    hardDrop: 110,
    levelUp: 660,
    gameOver: 80,
  },
};
export class GameAudio {
  private context: AudioContext | null = null;
  private voices = new Set<OscillatorNode>();
  private lastMove = -Infinity;
  unlock() {
    try {
      this.context ??= new AudioContext();
      void this.context.resume().catch(() => {});
    } catch {
      /* Unsupported or blocked audio never blocks play. */
    }
  }
  emit(event: GameEvent) {
    const c = this.context;
    if (
      !c ||
      c.state !== "running" ||
      event.type === "tetris" ||
      event.type === "combo"
    )
      return;
    if (
      event.type === "move" &&
      c.currentTime * 1000 - this.lastMove < soundConfig.moveCooldown
    )
      return;
    if (event.type === "move") this.lastMove = c.currentTime * 1000;
    const notes =
      event.type === "lineClear"
        ? Array.from({ length: event.n + 1 }, (_, i) => 330 * 2 ** (i / 4))
        : [soundConfig.notes[event.type as keyof typeof soundConfig.notes]];
    notes.filter(Boolean).forEach((frequency, i) => {
      if (this.voices.size >= soundConfig.maxVoices) return;
      const oscillator = c.createOscillator(),
        gain = c.createGain(),
        time = c.currentTime + i * 0.07;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency * 1.5, time);
      oscillator.frequency.exponentialRampToValueAtTime(
        frequency,
        time + soundConfig.duration,
      );
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(soundConfig.gain, time + 0.008);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        time + soundConfig.duration,
      );
      oscillator.connect(gain);
      gain.connect(c.destination);
      this.voices.add(oscillator);
      oscillator.onended = () => {
        this.voices.delete(oscillator);
        oscillator.disconnect();
        gain.disconnect();
      };
      oscillator.start(time);
      oscillator.stop(time + soundConfig.duration);
    });
  }
  mute() {
    for (const voice of this.voices) {
      try {
        voice.stop();
      } catch {}
    }
    this.voices.clear();
    if (this.context?.state === "running")
      void this.context.suspend().catch(() => {});
  }
  close() {
    this.mute();
    if (this.context) void this.context.close().catch(() => {});
    this.context = null;
  }
}
