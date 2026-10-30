import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const directory = new URL("../public/vendor/", import.meta.url);
await mkdir(directory, { recursive: true });
await copyFile(
  require.resolve("browser-image-compression"),
  new URL("browser-image-compression.js", directory),
);
await copyFile(
  new URL("../node_modules/browser-image-compression/LICENSE", import.meta.url),
  new URL("browser-image-compression.LICENSE", directory),
);
