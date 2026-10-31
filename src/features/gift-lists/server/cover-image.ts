import sharp from "sharp";

export async function normalizeListImage(
  value: string | null,
): Promise<string | null> {
  if (!value) return null;
  if (
    value.length > 250000 ||
    !/^data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)
  )
    throw new Error("invalid_image");
  const bytes = Buffer.from(value.slice(value.indexOf(",") + 1), "base64");
  const image = sharp(bytes, { limitInputPixels: 36_000_000, animated: false });
  const metadata = await image.metadata();
  if (!["jpeg", "png", "webp"].includes(metadata.format ?? ""))
    throw new Error("invalid_image");
  const output = await image
    .rotate()
    .resize({
      width: 960,
      height: 640,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 80 })
    .toBuffer();
  if (output.length > 180000) throw new Error("invalid_image");
  return `data:image/webp;base64,${output.toString("base64")}`;
}
