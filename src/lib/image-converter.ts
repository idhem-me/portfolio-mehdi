export type ImageOutputFormat = "image/webp" | "image/png" | "image/jpeg";
export type ImageConversionOptions = {
  format: ImageOutputFormat;
  quality: number;
};
export type ImageConversionErrorCode =
  "unsupported" | "invalid" | "externalSvg" | "tooLarge" | "encodeFailed";

export class ImageConversionError extends Error {
  constructor(public code: ImageConversionErrorCode) {
    super(code);
    this.name = "ImageConversionError";
  }
}

export function isHeic(file: File): boolean {
  return (
    /image\/(heic|heif)(-sequence)?$/i.test(file.type) ||
    /\.(heic|heif)$/i.test(file.name)
  );
}

export function isSupportedImage(file: File): boolean {
  return (
    isHeic(file) ||
    /^image\/(png|jpeg|webp|svg\+xml)$/i.test(file.type) ||
    /\.(png|jpe?g|webp|svg)$/i.test(file.name)
  );
}

/** SVGs stay in an image decoder; external resources are never fetched. */
async function validateSvg(file: File): Promise<void> {
  const source = await file.text();
  if (/<!DOCTYPE|<!ENTITY|<\?xml-stylesheet/i.test(source))
    throw new ImageConversionError("externalSvg");
  const doc = new DOMParser().parseFromString(source, "image/svg+xml");
  if (
    doc.querySelector("parsererror") ||
    doc.documentElement.localName !== "svg"
  )
    throw new ImageConversionError("invalid");
  if (doc.querySelector("script, foreignObject, style"))
    throw new ImageConversionError("externalSvg");
  for (const element of doc.querySelectorAll("*")) {
    for (const attribute of Array.from(element.attributes)) {
      const value = attribute.value.trim();
      if (
        /^on/i.test(attribute.name) ||
        (/^(href|src)$/i.test(attribute.localName) &&
          value &&
          !value.startsWith("#"))
      )
        throw new ImageConversionError("externalSvg");
      // Reject CSS escapes and imports to prevent obscured external references.
      if (/\\|@import/i.test(value))
        throw new ImageConversionError("externalSvg");
      for (const match of value.matchAll(/url\(\s*['"]?([^)'"\s]+)/gi)) {
        if (!match[1].startsWith("#"))
          throw new ImageConversionError("externalSvg");
      }
    }
  }
}

async function decodeImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } catch {
    throw new ImageConversionError("invalid");
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function convertImage(
  file: File,
  options: ImageConversionOptions,
): Promise<Blob> {
  if (!isSupportedImage(file)) throw new ImageConversionError("unsupported");
  if (file.size > 100 * 1024 * 1024) throw new ImageConversionError("tooLarge");
  let source: Blob = file;
  if (file.type === "image/svg+xml" || /\.svg$/i.test(file.name)) {
    await validateSvg(file);
    source = new Blob([await file.arrayBuffer()], { type: "image/svg+xml" });
  }
  if (isHeic(file)) {
    try {
      const heic2any = (await import("heic2any")).default;
      const decoded = await heic2any({ blob: file, toType: "image/png" });
      source = Array.isArray(decoded) ? decoded[0] : decoded;
      if (!source) throw new Error("Empty HEIC");
    } catch {
      throw new ImageConversionError("invalid");
    }
  }
  const image = await decodeImage(source);
  const { naturalWidth: width, naturalHeight: height } = image;
  if (!width || !height) {
    image.src = "";
    throw new ImageConversionError("invalid");
  }
  if (width * height > 64_000_000 || width > 16384 || height > 16384) {
    image.src = "";
    throw new ImageConversionError("tooLarge");
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  try {
    const context = canvas.getContext("2d");
    if (!context) throw new ImageConversionError("encodeFailed");
    if (options.format === "image/jpeg") {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
    }
    context.drawImage(image, 0, 0);
    const blob = await new Promise<Blob | null>((resolve, reject) => {
      try {
        canvas.toBlob(
          resolve,
          options.format,
          Math.min(1, Math.max(0.1, options.quality)),
        );
      } catch (error) {
        reject(error);
      }
    });
    if (!blob || blob.type !== options.format)
      throw new ImageConversionError("encodeFailed");
    return blob;
  } finally {
    canvas.width = 0;
    canvas.height = 0;
    image.src = "";
  }
}

export function convertedFilename(
  name: string,
  format: ImageOutputFormat,
): string {
  const extension = format === "image/jpeg" ? "jpg" : format.split("/")[1];
  const basename =
    name.replace(/\.[^.]*$/, "").replace(/[\\/\u0000-\u001f]/g, "_") || "image";
  return `${basename}.${extension}`;
}
