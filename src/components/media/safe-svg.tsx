import { sanitizeSvg } from "@/lib/sanitize-svg";
import { cn } from "@/lib/utils";

type SafeSvgProps = {
  /** Markup SVG brut (sera sanitise avant injection). */
  markup: string;
  className?: string;
  title?: string;
};

/**
 * Affiche un SVG inline après sanitisation.
 * Ne jamais passer du markup non contrôlé sans ce composant.
 */
export function SafeSvg({ markup, className, title }: SafeSvgProps) {
  const result = sanitizeSvg(markup);

  if (!result.ok) {
    return null;
  }

  return (
    // An SVG image has no scripting/document privileges, even if a parser regresses.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(result.svg)}`}
      alt={title ?? ""}
      aria-hidden={title ? undefined : true}
      className={cn("inline-block", className)}
    />
  );
}
