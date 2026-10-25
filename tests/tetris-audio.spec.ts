import { expect, test } from "@playwright/test";
import { onboardingConfig } from "../src/features/tetris/engine/opening";

declare global {
  interface Window {
    __tetrisAudioTest: {
      sources: { duration: number; loop: boolean }[];
      contexts: AudioContext[];
      gains: GainNode[];
      outputs: DynamicsCompressorNode[];
    };
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__tetrisAudioTest = {
      sources: [],
      contexts: [],
      gains: [],
      outputs: [],
    };
    const createOutput = AudioContext.prototype.createDynamicsCompressor;
    AudioContext.prototype.createDynamicsCompressor = function () {
      const output = createOutput.call(this);
      window.__tetrisAudioTest.outputs.push(output);
      return output;
    };
    const createGain = AudioContext.prototype.createGain;
    AudioContext.prototype.createGain = function () {
      const gain = createGain.call(this);
      window.__tetrisAudioTest.gains.push(gain);
      return gain;
    };
    const createSource = AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource = function () {
      const source = createSource.call(this);
      const probe = window.__tetrisAudioTest;
      if (!probe.contexts.includes(this)) probe.contexts.push(this);
      const start = source.start.bind(source);
      source.start = (...args) => {
        probe.sources.push({
          duration: source.buffer?.duration ?? 0,
          loop: source.loop,
        });
        start(...args);
      };
      return source;
    };
  });
});

test("full sliders scale above the midpoint while peak control keeps a loud mix below clipping", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "lava-settings",
      JSON.stringify({
        audioScaleVersion: 2,
        sound: true,
        effectsVolume: 100,
        musicVolume: 100,
        voiceVolume: 100,
      }),
    ),
  );
  await page.goto("/jeux/tetris");
  await page.getByRole("button", { name: "Jouer", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__tetrisAudioTest.sources.filter((s) => s.loop).length,
      ),
    )
    .toBe(1);
  expect(
    await page.evaluate(() =>
      window.__tetrisAudioTest.gains
        .slice(0, 3)
        .map((g) => Math.round(g.gain.value * 100)),
    ),
  ).toEqual([140, 70, 140]);
  const peak = await page.evaluate(async () => {
    const live = window.__tetrisAudioTest.outputs[0];
    const offline = new OfflineAudioContext(1, 44100, 44100);
    const limiter = offline.createDynamicsCompressor();
    for (const key of [
      "threshold",
      "knee",
      "ratio",
      "attack",
      "release",
    ] as const) {
      limiter[key].value = live[key].value;
    }
    const oscillator = offline.createOscillator();
    oscillator.frequency.value = 180;
    const gain = offline.createGain();
    gain.gain.value = 2;
    oscillator.connect(gain);
    gain.connect(limiter);
    limiter.connect(offline.destination);
    oscillator.start();
    const buffer = await offline.startRendering();
    return buffer
      .getChannelData(0)
      .reduce((max, sample) => Math.max(max, Math.abs(sample)), 0);
  });
  expect(peak).toBeLessThan(0.99);
  expect(peak).toBeGreaterThan(0.5);
});

test("separate volume sliders migrate old settings, persist and control the audio mix", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("lava-settings")) {
      localStorage.setItem(
        "lava-settings",
        JSON.stringify({ sound: true, haptics: false }),
      );
    }
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/jeux/tetris");
  await page.getByRole("button", { name: "Réglages", exact: true }).click();
  const effects = page.getByRole("slider", {
    name: "Effets sonores",
    exact: true,
  });
  const music = page.getByRole("slider", { name: "Musique", exact: true });
  const voice = page.getByRole("slider", { name: "Voix", exact: true });
  await expect(effects).toHaveValue("50");
  await expect(music).toHaveValue("50");
  await expect(voice).toHaveValue("50");
  await effects.focus();
  await page.keyboard.press("Home");
  await music.focus();
  await page.keyboard.press("Home");
  for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowRight");
  await voice.focus();
  await page.keyboard.press("End");
  for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowLeft");
  await expect(effects).toHaveValue("0");
  await expect(music).toHaveValue("25");
  await expect(voice).toHaveValue("80");
  const sound = page.getByRole("switch", { name: "Son", exact: true });
  await sound.click();
  await expect(page.getByRole("slider")).toHaveCount(0);
  await sound.click();
  await expect(music).toHaveValue("25");
  await page.reload();
  await page.getByRole("button", { name: "Réglages", exact: true }).click();
  await expect(effects).toHaveValue("0");
  await expect(music).toHaveValue("25");
  await expect(voice).toHaveValue("80");
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("lava-settings")!).haptics,
    ),
  ).toBe(false);
  await page.screenshot({ path: "/private/tmp/tetris-volume-mobile.png" });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Jouer", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__tetrisAudioTest.sources.filter((s) => s.loop).length,
      ),
    )
    .toBe(1);
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__tetrisAudioTest.gains
          .slice(0, 3)
          .map((gain) => Math.round(gain.gain.value * 1000) / 1000),
      ),
    )
    .toEqual([0, 0.175, 1.12]);
});

test("sound starts by default with a five-minute loop and respects pause/resume", async ({
  page,
}) => {
  await page.goto("/jeux/tetris");
  await page.getByRole("button", { name: "Jouer", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__tetrisAudioTest.sources.filter((source) => source.loop),
      ),
    )
    .toEqual([{ duration: 300, loop: true }]);
  await page.keyboard.press("p");
  await expect
    .poll(() =>
      page.evaluate(() => window.__tetrisAudioTest.contexts[0]?.state),
    )
    .toBe("suspended");
  await page.getByRole("button", { name: "Reprendre", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => window.__tetrisAudioTest.contexts[0]?.state),
    )
    .toBe("running");
  expect(
    await page.evaluate(
      () =>
        window.__tetrisAudioTest.sources.filter((source) => source.loop).length,
    ),
  ).toBe(1);
});

for (const lines of [2, 4]) {
  test(`real ${lines}-line clear plays ${lines === 4 ? "wow" : "nice"} once over the music`, async ({
    page,
  }) => {
    await page.goto("/jeux/tetris");
    await page.getByRole("button", { name: "Jouer", exact: true }).click();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            window.__tetrisAudioTest.sources.filter((source) => source.loop)
              .length,
        ),
      )
      .toBe(1);
    const expected = await page.evaluate(
      async (name) => {
        const response = await fetch(`/audio/tetris/${name}.wav`);
        return (
          await window.__tetrisAudioTest.contexts[0].decodeAudioData(
            await response.arrayBuffer(),
          )
        ).duration;
      },
      lines === 4 ? "wow" : "nice",
    );
    for (let i = 0; i < onboardingConfig.reference.length; i++) {
      const { x } = onboardingConfig.reference[i];
      const rot =
        lines === 2 && i === 5 ? 1 : onboardingConfig.reference[i].rot;
      for (let r = 0; r < rot; r++) await page.keyboard.press("x");
      for (let m = 0; m < Math.abs(x - 3); m++)
        await page.keyboard.press(x < 3 ? "ArrowLeft" : "ArrowRight");
      await page.keyboard.press("Space");
    }
    await expect(page.locator(".lava-reward-type")).toHaveText(
      lines === 4 ? "Tetris" : "2 lignes",
    );
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.__tetrisAudioTest.sources.filter((source) => !source.loop),
        ),
      )
      .toEqual([{ duration: expected, loop: false }]);
    expect(
      await page.evaluate(() => window.__tetrisAudioTest.contexts[0].state),
    ).toBe("running");
    expect(
      await page.evaluate(
        () =>
          window.__tetrisAudioTest.sources.filter((source) => source.loop)
            .length,
      ),
    ).toBe(1);
  });
}
