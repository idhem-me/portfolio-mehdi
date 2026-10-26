export function validateNickname(value: string) {
  const name = value.normalize("NFKC").trim();
  if (!name) throw Error("Choisis un pseudo pour continuer.");
  if (!/^[\p{L}\p{N} ._-]{2,20}$/u.test(name))
    throw Error(
      "Choisis un pseudo de 2 à 20 caractères : lettres, chiffres, espaces, points ou tirets.",
    );
  return name;
}
