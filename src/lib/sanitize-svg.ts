/**
 * Sanitise du markup SVG pour bloquer l’exécution de code (XSS) et réduire
 * le risque d’injection de consignes cachées (commentaires / métadonnées).
 *
 * Usage : fichiers servis depuis /public, ou markup passé à SafeSvg.
 */

const MAX_SVG_CHARS = 512_000;

const XML_COMMENT = /<!--[\s\S]*?-->/g;
const CDATA = /<!\[CDATA\[[\s\S]*?\]\]>/gi;
const PROCESSING_INSTRUCTION = /<\?[\s\S]*?\?>/g;
const DOCTYPE = /<!DOCTYPE[\s\S]*?>/gi;

/** Éléments capables d’exécuter du code ou d’embarquer du HTML. */
const DANGEROUS_PAIRED_ELEMENTS =
  /<\s*(script|foreignObject|iframe|object|embed|link|meta|base|handler)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi;

const DANGEROUS_SELF_CLOSING =
  /<\s*(script|foreignObject|iframe|object|embed|link|meta|base|handler)\b[^>]*\/\s*>/gi;

/**
 * Vecteurs fréquents d’injection de consignes / texte caché dans un SVG
 * (métadonnées, descriptions non affichées).
 */
const PROMPT_VECTOR_ELEMENTS =
  /<\s*(metadata|title|desc)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi;

const EVENT_HANDLER_ATTR =
  /\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;

const DANGEROUS_URI_ATTR =
  /\s+(?:xlink:)?(?:href|src|action|formaction|data|poster)\s*=\s*(?:"\s*(?:javascript|vbscript|data\s*:\s*text\/html)[^"]*"|'\s*(?:javascript|vbscript|data\s*:\s*text\/html)[^']*'|(?:javascript|vbscript|data\s*:\s*text\/html)[^\s>]*)/gi;

/** Bloque les références externes (SSRF / XSS via <use> / <image>). */
const EXTERNAL_RESOURCE_ATTR =
  /\s+(?:xlink:)?(?:href|src)\s*=\s*(?:"\s*https?:\/\/[^"]*"|'\s*https?:\/\/[^']*'|https?:\/\/[^\s>]*)/gi;

const NULL_BYTES = /\u0000/g;

export type SanitizeSvgResult =
  | { ok: true; svg: string }
  | { ok: false; reason: string };

function stripBom(input: string): string {
  return input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
}

/**
 * Vérifie qu’un chemin relatif sous `public/` est sûr (pas de traversal).
 * Retourne les segments normalisés, ou `null` si le chemin est invalide.
 */
export function normalizePublicSvgPath(
  segments: string[],
): string[] | null {
  if (!segments.length) return null;

  const normalized: string[] = [];

  for (const raw of segments) {
    if (!raw || raw === "." || raw === "..") return null;
    if (raw.includes("\0") || raw.includes("/") || raw.includes("\\")) {
      return null;
    }
    if (/^[a-zA-Z]:$/.test(raw)) return null;
    normalized.push(raw);
  }

  const last = normalized[normalized.length - 1];
  if (!last.toLowerCase().endsWith(".svg")) {
    normalized[normalized.length - 1] = `${last}.svg`;
  }

  const fileName = normalized[normalized.length - 1];
  if (!/^[a-zA-Z0-9._-]+\.svg$/i.test(fileName)) return null;

  for (const segment of normalized.slice(0, -1)) {
    if (!/^[a-zA-Z0-9._-]+$/.test(segment)) return null;
  }

  return normalized;
}

export function sanitizeSvg(raw: string): SanitizeSvgResult {
  if (typeof raw !== "string") {
    return { ok: false, reason: "Entrée invalide" };
  }

  const withoutBom = stripBom(raw).replace(NULL_BYTES, "");
  if (!withoutBom.trim()) {
    return { ok: false, reason: "SVG vide" };
  }

  if (withoutBom.length > MAX_SVG_CHARS) {
    return { ok: false, reason: "SVG trop volumineux" };
  }

  if (!/<svg[\s>]/i.test(withoutBom)) {
    return { ok: false, reason: "Racine <svg> manquante" };
  }

  let svg = withoutBom
    .replace(XML_COMMENT, "")
    .replace(CDATA, "")
    .replace(PROCESSING_INSTRUCTION, "")
    .replace(DOCTYPE, "")
    .replace(PROMPT_VECTOR_ELEMENTS, "")
    .replace(DANGEROUS_PAIRED_ELEMENTS, "")
    .replace(DANGEROUS_SELF_CLOSING, "")
    .replace(EVENT_HANDLER_ATTR, "")
    .replace(DANGEROUS_URI_ATTR, "")
    .replace(EXTERNAL_RESOURCE_ATTR, "");

  svg = svg.replace(/\s+style\s*=\s*(?:"[^"]*"|'[^']*')/gi, (attr) => {
    if (
      /expression\s*\(|javascript\s*:|url\s*\(\s*['"]?\s*javascript/i.test(attr)
    ) {
      return "";
    }
    return attr;
  });

  if (!/<svg[\s>]/i.test(svg)) {
    return { ok: false, reason: "SVG invalide après sanitisation" };
  }

  return { ok: true, svg: svg.trim() };
}

/** CSP recommandée pour une réponse `image/svg+xml`. */
export const SVG_CONTENT_SECURITY_POLICY =
  "default-src 'none'; script-src 'none'; sandbox; style-src 'unsafe-inline'";
