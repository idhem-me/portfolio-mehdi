import sanitizeHtml from "sanitize-html";
/**
 * Sanitise du markup SVG pour bloquer l’exécution de code (XSS) et réduire
 * le risque d’injection de consignes cachées (commentaires / métadonnées).
 *
 * Usage : fichiers servis depuis /public, ou markup passé à SafeSvg.
 */

const MAX_SVG_CHARS = 512_000;
const SVG_TAGS = [
  "svg",
  "g",
  "path",
  "circle",
  "ellipse",
  "rect",
  "line",
  "polyline",
  "polygon",
  "text",
  "tspan",
  "defs",
  "use",
  "symbol",
  "clipPath",
  "mask",
  "linearGradient",
  "radialGradient",
  "stop",
  "pattern",
  "filter",
  "feGaussianBlur",
  "feOffset",
  "feBlend",
  "feColorMatrix",
  "feComponentTransfer",
  "feFuncR",
  "feFuncG",
  "feFuncB",
  "feFuncA",
  "feMerge",
  "feMergeNode",
  "feFlood",
  "feComposite",
  "feDropShadow",
];
const SVG_ATTRIBUTES = [
  "style",
  "xmlns",
  "xmlns:xlink",
  "viewBox",
  "width",
  "height",
  "x",
  "y",
  "x1",
  "x2",
  "y1",
  "y2",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "d",
  "points",
  "id",
  "class",
  "fill",
  "fill-rule",
  "fill-opacity",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-opacity",
  "opacity",
  "transform",
  "clip-path",
  "clip-rule",
  "mask",
  "filter",
  "href",
  "xlink:href",
  "preserveAspectRatio",
  "gradientUnits",
  "gradientTransform",
  "offset",
  "stop-color",
  "stop-opacity",
  "patternUnits",
  "patternTransform",
  "maskUnits",
  "maskContentUnits",
  "clipPathUnits",
  "font-size",
  "font-family",
  "font-weight",
  "text-anchor",
  "dominant-baseline",
  "dx",
  "dy",
  "color",
  "stdDeviation",
  "in",
  "in2",
  "result",
  "mode",
  "type",
  "values",
  "operator",
  "k1",
  "k2",
  "k3",
  "k4",
  "flood-color",
  "flood-opacity",
];

export type SanitizeSvgResult =
  { ok: true; svg: string } | { ok: false; reason: string };

function stripBom(input: string): string {
  return input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
}

/**
 * Vérifie qu’un chemin relatif sous `public/` est sûr (pas de traversal).
 * Retourne les segments normalisés, ou `null` si le chemin est invalide.
 */
export function normalizePublicSvgPath(segments: string[]): string[] | null {
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
  if (typeof raw !== "string" || !raw.trim() || raw.length > MAX_SVG_CHARS)
    return { ok: false, reason: "SVG vide ou trop volumineux" };
  // Never resolve custom entities/DTDs; this parser does not load external resources.
  if (/<!DOCTYPE|<!ENTITY/i.test(raw))
    return { ok: false, reason: "Déclaration XML interdite" };
  const svg = sanitizeHtml(stripBom(raw), {
    allowedTags: SVG_TAGS,
    allowedAttributes: { "*": SVG_ATTRIBUTES },
    allowedStyles: {
      "*": {
        "mask-type": [/^(?:alpha|luminance)$/],
        display: [/^(?:block|inline|none)$/],
        "color-scheme": [/^only light$/],
      },
    },
    allowedSchemes: [],
    allowProtocolRelative: false,
    parser: { lowerCaseTags: false, lowerCaseAttributeNames: false },
    transformTags: {
      "*": (tagName, attribs) => {
        for (const [name, value] of Object.entries(attribs)) {
          if (
            (name === "href" || name === "xlink:href") &&
            !/^#[A-Za-z_][\w.-]*$/.test(value)
          )
            delete attribs[name];
          if (
            /url\s*\(/i.test(value) &&
            !/^url\(#[A-Za-z_][\w.-]*\)$/.test(value)
          )
            delete attribs[name];
        }
        return { tagName, attribs };
      },
    },
    enforceHtmlBoundary: false,
  }).trim();
  if (!/^<svg(?:\s|>)/.test(svg) || !svg.endsWith("</svg>"))
    return { ok: false, reason: "Racine SVG invalide" };
  return { ok: true, svg };
}

/** CSP recommandée pour une réponse `image/svg+xml`. */
export const SVG_CONTENT_SECURITY_POLICY =
  "default-src 'none'; script-src 'none'; sandbox; style-src 'unsafe-inline'";
