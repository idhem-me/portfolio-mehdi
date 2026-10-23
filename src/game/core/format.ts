/**
 * Formatage fr-FR pour grands nombres : k, M, Md, puis notation scientifique.
 */

export function formatCompact(n: number): string {
  const v = Math.floor(Math.abs(n));
  const sign = n < 0 ? "-" : "";
  if (v < 1_000) return sign + String(v);
  if (v < 1_000_000) {
    return sign + trim1(v / 1_000) + " k";
  }
  if (v < 1_000_000_000) {
    return sign + trim1(v / 1_000_000) + " M";
  }
  if (v < 1_000_000_000_000) {
    return sign + trim1(v / 1_000_000_000) + " Md";
  }
  return sign + v.toExponential(2).replace("e+", "e");
}

function trim1(x: number): string {
  const s = x.toFixed(1);
  return s.endsWith(".0") ? s.slice(0, -2) : s;
}

export function formatInteger(n: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(
    Math.floor(n)
  );
}

/** Durée lisible en français (ex. « 1 min 30 s », « 2 h »). */
export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  if (s < 60) return `${s} s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rem = s % 60;
  if (h > 0) {
    if (m === 0) return `${h} h`;
    return `${h} h ${m} min`;
  }
  if (rem === 0) return `${m} min`;
  return `${m} min ${rem} s`;
}
