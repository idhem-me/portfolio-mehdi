import { Application } from "pixi.js";

export type PixiInitOptions = {
  width: number;
  height: number;
};

export async function createPixiApp(
  options: PixiInitOptions
): Promise<Application> {
  const app = new Application();
  await app.init({
    width: options.width,
    height: options.height,
    resolution: Math.min(
      typeof window !== "undefined" ? window.devicePixelRatio : 1,
      2
    ),
    autoDensity: true,
    antialias: true,
    backgroundAlpha: 0,
    preference: "webgl",
  });
  return app;
}
