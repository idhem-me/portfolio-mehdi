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
    <span
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn("inline-flex [&_svg]:size-full", className)}
      dangerouslySetInnerHTML={{ __html: result.svg }}
    />
  );
}
