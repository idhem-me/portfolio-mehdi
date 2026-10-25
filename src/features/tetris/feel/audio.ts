import type { GameEvent } from "../engine/game";
import { audioGain, defaultAudioVolumes, type AudioVolumes } from "./config";
/** Local music and reward samples, with lightweight synthesized action sounds. */
export const audioAssets = {
  music: "/audio/tetris/korobeiniki-cinematic.m4a",
  nice: "/audio/tetris/nice.wav",
  wow: "/audio/tetris/wow.wav",
};
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
  private buffers = new Map<string, AudioBuffer>();
  private loading: Promise<void> | null = null;
  private music: AudioBufferSourceNode | null = null;
  private musicGain: GainNode | null = null;
  private reward: AudioBufferSourceNode | null = null;
  private wantsMusic = false;
  private volumes = { ...defaultAudioVolumes };
  private channels: Partial<Record<keyof AudioVolumes, GainNode>> = {};
  private output: DynamicsCompressorNode | null = null;
  setVolumes(volumes: AudioVolumes) {
    for (const key of Object.keys(
      defaultAudioVolumes,
    ) as (keyof AudioVolumes)[]) {
      const value = Number.isFinite(volumes[key])
        ? Math.max(0, Math.min(100, volumes[key]))
        : defaultAudioVolumes[key];
      this.volumes[key] = value;
      if (this.context) {
        const gain = this.channels[key]?.gain;
        gain?.cancelScheduledValues(this.context.currentTime);
        gain?.setTargetAtTime(
          audioGain(key, value),
          this.context.currentTime,
          0.015,
        );
      }
    }
  }
  unlock() {
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.output = this.context.createDynamicsCompressor();
        // Transparent peak control for loud combinations at the top of the sliders.
        this.output.threshold.value = -3;
        this.output.knee.value = 0;
        this.output.ratio.value = 20;
        this.output.attack.value = 0;
        this.output.release.value = 0.08;
        this.output.connect(this.context.destination);
        for (const key of Object.keys(
          defaultAudioVolumes,
        ) as (keyof AudioVolumes)[]) {
          const gain = this.context.createGain();
          gain.gain.value = audioGain(key, this.volumes[key]);
          gain.connect(this.output);
          this.channels[key] = gain;
        }
      }
      void this.context.resume().catch(() => {});
      this.load();
    } catch {
      /* Unsupported or blocked audio never blocks play. */
    }
  }
  private load() {
    const c = this.context;
    if (!c || this.loading) return;
    this.loading = Promise.all(
      Object.entries(audioAssets).map(async ([name, url]) => {
        try {
          const response = await fetch(url);
          if (!response.ok) return;
          const buffer = await c.decodeAudioData(await response.arrayBuffer());
          if (this.context !== c) return;
          this.buffers.set(name, buffer);
          if (name === "music" && this.wantsMusic) this.startMusic();
        } catch {
          // Missing assets or unsupported codecs must never interrupt gameplay.
        }
      }),
    ).then(() => {});
  }
  startMusic() {
    this.wantsMusic = true;
    const c = this.context;
    if (!c) return;
    const buffer = this.buffers.get("music");
    if (!this.music && buffer) {
      this.musicGain = c.createGain();
      this.musicGain.connect(this.channels.musicVolume!);
      this.music = c.createBufferSource();
      this.music.buffer = buffer;
      this.music.loop = true;
      this.music.loopStart = 0;
      this.music.loopEnd = 300;
      this.music.connect(this.musicGain);
      this.music.start();
    }
    this.musicGain?.gain.setValueAtTime(0.42, c.currentTime);
  }
  private playReward(name: "nice" | "wow") {
    const c = this.context;
    const buffer = this.buffers.get(name);
    if (!c || !buffer || this.volumes.voiceVolume === 0) return;
    this.stopReward();
    const source = c.createBufferSource();
    const gain = c.createGain();
    source.buffer = buffer;
    gain.gain.value = 0.8;
    source.connect(gain);
    gain.connect(this.channels.voiceVolume!);
    this.reward = source;
    // Leave room for the spoken reward, then restore the gameplay mix.
    this.musicGain?.gain.cancelScheduledValues(c.currentTime);
    this.musicGain?.gain.setTargetAtTime(0.16, c.currentTime, 0.025);
    this.musicGain?.gain.setTargetAtTime(
      0.42,
      c.currentTime + buffer.duration,
      0.2,
    );
    source.onended = () => {
      if (this.reward === source) this.reward = null;
      source.disconnect();
      gain.disconnect();
    };
    source.start();
  }
  private stopReward() {
    if (this.reward) {
      try {
        this.reward.stop();
      } catch {}
      this.reward = null;
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
    if (event.type === "lineClear") {
      this.playReward(event.n === 4 ? "wow" : "nice");
      return;
    }
    if (this.volumes.effectsVolume === 0) return;
    if (
      event.type === "move" &&
      c.currentTime * 1000 - this.lastMove < soundConfig.moveCooldown
    )
      return;
    if (event.type === "move") this.lastMove = c.currentTime * 1000;
    const notes = [
      soundConfig.notes[event.type as keyof typeof soundConfig.notes],
    ];
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
      gain.connect(this.channels.effectsVolume!);
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
    this.wantsMusic = false;
    this.stopReward();
    if (this.context && this.musicGain) {
      this.musicGain.gain.cancelScheduledValues(this.context.currentTime);
      this.musicGain.gain.setValueAtTime(0, this.context.currentTime);
    }
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
    this.music?.stop();
    this.music?.disconnect();
    this.musicGain?.disconnect();
    this.music = null;
    this.musicGain = null;
    for (const channel of Object.values(this.channels)) channel.disconnect();
    this.channels = {};
    this.output?.disconnect();
    this.output = null;
    this.buffers.clear();
    this.loading = null;
    if (this.context) void this.context.close().catch(() => {});
    this.context = null;
  }
}
