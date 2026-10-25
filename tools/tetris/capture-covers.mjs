import { chromium } from "@playwright/test";
const browser = await chromium.launch();
try {
  for (const theme of ["light", "dark"]) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1100 },
    });
    await page.addInitScript((t) => {
      localStorage.setItem("theme", t);
      localStorage.setItem("analytics_consent", "denied");
    }, theme);
    await page.goto("http://localhost:3000/fr/realisations/tetris");
    await page.getByRole("button", { name: "Jouer", exact: true }).click();
    for (const offset of [-4, 0, 4, -2, 2, -3, 3, 0, -4, 4, 1, -1]) {
      for (let i = 0; i < Math.abs(offset); i++)
        await page.keyboard.press(offset < 0 ? "ArrowLeft" : "ArrowRight");
      await page.keyboard.press("Space");
    }
    await page.waitForTimeout(600);
    const board = await page.locator(".lava-board").screenshot();
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.evaluate(
      ({ data }) => {
        document.body.innerHTML = `<main class="lava-cover-art"><div><span class="lava-label">PLAYFUL BY DESIGN / 01</span><h1>lava<span>.</span></h1><p>Un classique.<br/>Une nouvelle matière.</p><small>Product design · WebGL · Game feel</small></div><img src="${data}" alt="Plateau de Lava"/></main>`;
        const style = document.createElement("style");
        style.textContent = `body{margin:0;overflow:hidden;background:var(--muted)}.lava-cover-art{width:1280px;height:720px;padding:64px 100px;display:flex;align-items:center;justify-content:space-between;font-family:var(--font-sans);background:radial-gradient(ellipse at 80% 50%,color-mix(in oklch,var(--tetris-piece-t),transparent 92%),transparent 60%)}.lava-cover-art h1{font-size:184px;line-height:1;letter-spacing:-.085em;font-weight:600;margin:32px 0}.lava-cover-art h1 span{color:var(--muted-foreground)}.lava-cover-art p{font-size:36px;line-height:1.2;letter-spacing:-.04em;margin:0 0 32px}.lava-cover-art small{font-size:15px;color:var(--muted-foreground)}.lava-cover-art img{height:620px;width:310px;border-radius:var(--radius);box-shadow:var(--tetris-shadow);transform:rotate(6deg)}`;
        document.head.append(style);
      },
      { data: `data:image/png;base64,${board.toString("base64")}` },
    );
    await page.screenshot({ path: `public/img/tetris/cover-${theme}.png` });
    await page.close();
  }
} finally {
  await browser.close();
}
process.exit(0);
