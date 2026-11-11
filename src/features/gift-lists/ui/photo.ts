import { isHeic } from "@/features/image-conversion/engine/image-converter";

export const giftPhotoAccept =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif";

export class GiftPhotoError extends Error {
  constructor(public code: "photoFormat" | "photoSize" | "photoInvalid") {
    super(code);
  }
}

async function decode(source: Blob) {
  const url = URL.createObjectURL(source);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = reject;
      image.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function decodeHeic(file: File) {
  const buffer = await file.arrayBuffer();
  const worker = new Worker("/vendor/gift-heic-worker.js");
  try {
    const pixels = await new Promise<ImageData>((resolve, reject) => {
      const timeout = window.setTimeout(
        () => reject(new GiftPhotoError("photoInvalid")),
        15_000,
      );
      worker.onmessage = ({
        data,
      }: MessageEvent<{ pixels?: ImageData; error?: string }>) => {
        window.clearTimeout(timeout);
        if (data.pixels) resolve(data.pixels);
        else
          reject(
            new GiftPhotoError(
              data.error === "photoSize" ? "photoSize" : "photoInvalid",
            ),
          );
      };
      worker.onerror = () => {
        window.clearTimeout(timeout);
        reject(new GiftPhotoError("photoInvalid"));
      };
      worker.postMessage(buffer, [buffer]);
    });
    return await createImageBitmap(pixels);
  } finally {
    worker.terminate();
  }
}

async function loadPhoto(file: File, heic: boolean) {
  try {
    const image = await decode(file);
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  } catch {
    if (!heic) throw new GiftPhotoError("photoInvalid");
    const bitmap = await decodeHeic(file);
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      close: () => bitmap.close(),
    };
  }
}

export async function prepareGiftPhoto(file: File) {
  const heic = isHeic(file);
  if (
    !heic &&
    !/^image\/(jpeg|png|webp)$/i.test(file.type) &&
    !(
      ["", "application/octet-stream"].includes(file.type) &&
      /\.(jpe?g|png|webp)$/i.test(file.name)
    )
  )
    throw new GiftPhotoError("photoFormat");
  if (file.size > 20_000_000) throw new GiftPhotoError("photoSize");

  const { source, width, height, close } = await loadPhoto(file, heic);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  let format = "image/webp";
  const encode = (quality: number) =>
    new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, format, quality),
    );

  const fillBackground = (ctx: CanvasRenderingContext2D) => {
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "source-over";
  };

  try {
    if (width * height > 50_000_000) throw new GiftPhotoError("photoSize");
    if (!context || !width || !height) throw new GiftPhotoError("photoInvalid");
    for (const dimension of [960, 768, 624, 480]) {
      const scale = Math.min(1, dimension / Math.max(width, height));
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      context.drawImage(source, 0, 0, canvas.width, canvas.height);

      if (format === "image/jpeg") fillBackground(context);
      for (const quality of [0.82, 0.72, 0.62, 0.52]) {
        let blob = await encode(quality);
        if (format === "image/webp" && blob?.type !== format) {
          format = "image/jpeg";
          fillBackground(context);
          blob = await encode(quality);
        }
        if (blob?.type === format && blob.size > 0 && blob.size <= 180_000) {
          return await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }
      }
    }
    throw new GiftPhotoError("photoInvalid");
  } finally {
    close?.();
    canvas.width = canvas.height = 1;
  }
}
