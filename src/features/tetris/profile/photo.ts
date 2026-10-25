export async function encodePhoto(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw Error("Choisis une photo au format JPEG, PNG ou WebP.");
  if (file.size > 5_000_000)
    throw Error(
      "Cette photo est trop lourde. Choisis une image de moins de 5 Mo.",
    );
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw Error("Cette photo est illisible. Choisis une autre image.");
  }
  try {
    if (bitmap.width * bitmap.height > 36_000_000)
      throw Error(
        "Cette photo est trop grande. Choisis une image plus petite.",
      );
    const scale = Math.min(1, 256 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context)
      throw Error("La photo ne peut pas être préparée sur ce navigateur.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(Error("Impossible de préparer cette photo. Réessaie.")),
        "image/webp",
        0.82,
      ),
    );
    if (blob.size > 180_000)
      throw Error(
        "Cette photo reste trop lourde. Choisis une image plus simple.",
      );
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () =>
        reject(Error("Impossible de lire cette photo. Réessaie."));
      reader.readAsDataURL(blob);
    });
  } finally {
    bitmap.close();
  }
}
