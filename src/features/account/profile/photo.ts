export async function encodePhoto(
  file: File,
  options: { maxDimension?: number } = {},
) {
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
    const maxDimension = options.maxDimension ?? 256;
    const sourceDimension = Math.max(bitmap.width, bitmap.height);
    const dimensions = [
      maxDimension,
      Math.round(maxDimension * 0.8),
      Math.round(maxDimension * 0.65),
      Math.round(maxDimension * 0.5),
    ];
    let blob: Blob | undefined;
    for (const dimension of dimensions) {
      const scale = Math.min(1, dimension / sourceDimension);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context)
        throw Error("La photo ne peut pas être préparée sur ce navigateur.");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      for (const quality of [0.82, 0.72, 0.62, 0.52]) {
        const candidate = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (result) =>
              result
                ? resolve(result)
                : reject(
                    Error("Impossible de préparer cette photo. Réessaie."),
                  ),
            "image/webp",
            quality,
          ),
        );
        if (candidate.type !== "image/webp")
          throw Error("Ce navigateur ne peut pas préparer les photos WebP.");
        blob = candidate;
        if (blob.size <= 180_000) break;
      }
      if (blob && blob.size <= 180_000) break;
    }
    if (!blob || blob.size > 180_000)
      throw Error(
        "Cette photo ne peut pas être réduite suffisamment. Choisis-en une autre.",
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
