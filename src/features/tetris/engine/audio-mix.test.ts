import assert from "node:assert/strict";
import { test } from "node:test";
import { audioGain, defaultAudioVolumes, loadSettings } from "../feel/config";

test("audio sliders have calibrated midpoints and scale linearly to full volume", () => {
  assert.deepEqual(defaultAudioVolumes, {
    effectsVolume: 50,
    musicVolume: 50,
    voiceVolume: 50,
  });
  for (const [key, midpoint] of Object.entries({
    effectsVolume: 0.7,
    musicVolume: 0.35,
    voiceVolume: 0.7,
  })) {
    const channel = key as keyof typeof defaultAudioVolumes;
    assert.equal(audioGain(channel, 0), 0);
    assert.equal(audioGain(channel, 25), midpoint / 2);
    assert.equal(audioGain(channel, 50), midpoint);
    assert.equal(audioGain(channel, 100), midpoint * 2);
    assert.equal(audioGain(channel, 500), midpoint * 2);
    assert.equal(audioGain(channel, NaN), midpoint);
  }
});

test("old 70/35/70 settings become 50/50/50 once while preserving the sound preference", () => {
  const descriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "localStorage",
  );
  let saved = JSON.stringify({
    effectsVolume: 70,
    musicVolume: 35,
    voiceVolume: 70,
    sound: false,
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: () => saved,
      setItem: (_key: string, value: string) => {
        saved = value;
      },
    },
  });
  try {
    const settings = loadSettings();
    assert.equal(settings.effectsVolume, 50);
    assert.equal(settings.musicVolume, 50);
    assert.equal(settings.voiceVolume, 50);
    assert.equal(settings.sound, false);
    assert.equal(settings.audioScaleVersion, 2);
    assert.deepEqual(loadSettings(), settings);
    saved = JSON.stringify({ ...settings, voiceVolume: 100 });
    assert.equal(loadSettings().voiceVolume, 100);
  } finally {
    if (descriptor)
      Object.defineProperty(globalThis, "localStorage", descriptor);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
