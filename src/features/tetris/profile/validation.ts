export function validateProfileName(value: string) {
  const name = value.normalize("NFKC").trim();
  if (!/^[\p{L}\p{N} ._-]{2,20}$/u.test(name)) {
    throw Error(
      "Pseudo : 2 à 20 lettres, chiffres, espaces, points ou tirets.",
    );
  }
  return name;
}

export function validateProfileAvatar(avatar: string | null) {
  if (avatar === null) return null;
  try {
    const url = new URL(avatar);
    if (
      url.protocol === "https:" &&
      (url.hostname === "googleusercontent.com" ||
        url.hostname.endsWith(".googleusercontent.com")) &&
      avatar.length < 2048
    )
      return avatar;
  } catch {}
  const match = /^data:image\/(webp|png|jpeg);base64,([A-Za-z0-9+/]+=*)$/.exec(
    avatar,
  );
  if (!match || avatar.length > 250000)
    throw Error("Image non valide (WebP, PNG ou JPEG, 180 Ko max).");
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length > 180000)
    throw Error("Image non valide (WebP, PNG ou JPEG, 180 Ko max).");
  const valid =
    match[1] === "png"
      ? bytes
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : match[1] === "jpeg"
        ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : bytes.subarray(0, 4).toString() === "RIFF" &&
          bytes.subarray(8, 12).toString() === "WEBP";
  if (!valid)
    throw Error("Le contenu de la photo ne correspond pas à son format.");
  return avatar;
}
