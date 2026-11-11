import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const vendor = new URL("../public/vendor/", import.meta.url);
const source = await readFile(require.resolve("heic2any"), "utf8");
const encodedWorker = /^var workerString = ("(?:[^"\\]|\\.)*");$/m.exec(
  source,
)?.[1];
if (!encodedWorker) throw new Error("Cannot locate the heic2any decoder.");

const worker = JSON.parse(encodedWorker);
const entry = worker.indexOf("function processSingleImage");
if (entry < 0)
  throw new Error("Cannot locate the heic2any worker entry point.");

// Keep libheif's decoder in its own worker, where its generated code can run.
const handler = `
self.onmessage = ({ data }) => {
  try {
    const [image] = new libheif.HeifDecoder().decode(data);
    if (!image) throw new Error("Invalid photo");
    const width = image.get_width();
    const height = image.get_height();
    if (width * height > 50_000_000) {
      self.postMessage({ error: "photoSize" });
      return;
    }
    const pixels = new ImageData(width, height);
    image.display(pixels, (result) => {
      if (!result) {
        self.postMessage({ error: "photoInvalid" });
        return;
      }
      self.postMessage({ pixels: result }, [result.data.buffer]);
    });
  } catch {
    self.postMessage({ error: "photoInvalid" });
  }
};
`;

await mkdir(vendor, { recursive: true });
await writeFile(
  new URL("gift-heic-worker.js", vendor),
  worker.slice(0, entry) + handler,
);
await copyFile(
  new URL("../node_modules/heic2any/LICENSE.md", import.meta.url),
  new URL("gift-heic-worker.LICENSE", vendor),
);
