import assert from "node:assert/strict";
import { test } from "node:test";
import { cutRelease, releaseAction } from "../ui/opening/gesture-config";
import { cardsHaptic } from "../feel/haptics";
import { CardsAudio } from "../feel/audio";
import { defaults } from "../feel/config";

test("cut ejects the strip in gesture direction and cancels short/vertical gestures", () => {
  assert.equal(cutRelease(100, 5), "right");
  assert.equal(cutRelease(-100, 5), "left");
  assert.equal(cutRelease(20, 0), null);
  assert.equal(cutRelease(100, 150), null);
});
test("tap, swipe and cancelled drag are mutually exclusive release actions", () => {
  assert.equal(releaseAction(2, 3, 100, 4), "tap");
  assert.equal(releaseAction(150, 5, 200, 150), "right");
  assert.equal(releaseAction(-150, 5, 200, 150), "left");
  assert.equal(releaseAction(30, 5, 300, 30), "cancel");
  assert.equal(releaseAction(0, 0, 300, 100), "cancel");
  assert.equal(releaseAction(100, 150, 100, 180), "cancel");
});
test("disabled haptics and unsupported vibration never call the iOS fallback", () => {
  let count = 0;
  const input = {
    click() {
      count++;
    },
  } as HTMLInputElement;
  cardsHaptic("diamond", { ...defaults, haptics: false, ios: true }, input);
  cardsHaptic("light", { ...defaults, ios: true }, input);
  assert.equal(count, 0);
  assert.doesNotThrow(() => cardsHaptic("rare", defaults));
});
test("muted or unavailable audio never creates voices or crashes", () => {
  const audio = new CardsAudio();
  audio.mute();
  audio.setVolume(0);
  for (const event of [
    "tear",
    "fall",
    "flip",
    "reveal",
    "exceptional",
  ] as const) {
    assert.doesNotThrow(() => audio.emit(event));
  }
  assert.doesNotThrow(() => audio.close());
});

test("existing audio bus honors volume, mute and stops pending voices", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "AudioContext");
  let voices = 0,
    stopped = 0,
    busGain = 0;
  const parameter = {
    value: 0,
    cancelScheduledValues() {},
    setTargetAtTime(value: number) {
      busGain = value;
    },
    setValueAtTime() {},
    exponentialRampToValueAtTime() {},
    linearRampToValueAtTime() {},
  };
  class AudioStub {
    currentTime = 1;
    state = "running";
    destination = {};
    createGain() {
      return { gain: { ...parameter }, connect() {}, disconnect() {} };
    }
    createOscillator() {
      voices++;
      return {
        type: "sine",
        frequency: parameter,
        onended: null as (() => void) | null,
        connect() {},
        disconnect() {},
        start() {},
        stop() {
          stopped++;
          this.onended?.();
        },
      };
    }
    resume() {
      this.state = "running";
      return Promise.resolve();
    }
    suspend() {
      this.state = "suspended";
      return Promise.resolve();
    }
    close() {
      return Promise.resolve();
    }
  }
  Object.defineProperty(globalThis, "AudioContext", {
    configurable: true,
    value: AudioStub,
  });
  try {
    const audio = new CardsAudio();
    audio.unlock();
    audio.setVolume(25);
    assert.equal(busGain, 0.35);
    audio.emit("reveal");
    assert.equal(voices, 2);
    audio.mute();
    audio.emit("exceptional");
    assert.equal(voices, 2);
    assert.ok(stopped >= 2);
    audio.unmute();
    audio.setVolume(0);
    audio.emit("flip");
    assert.equal(voices, 2);
    assert.equal(busGain, 0);
    audio.close();
  } finally {
    if (original) Object.defineProperty(globalThis, "AudioContext", original);
    else Reflect.deleteProperty(globalThis, "AudioContext");
  }
});
