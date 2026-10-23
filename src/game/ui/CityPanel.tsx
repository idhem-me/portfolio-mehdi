"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCity } from "./useCity";

const LEVELS: { n: 1 | 2 | 3; label: string }[] = [
  { n: 1, label: "Énergie, emplois, commerce" },
  { n: 2, label: "Éducation" },
  { n: 3, label: "Culture & loisirs" },
];

export function CityPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const isMobile = useIsMobile();
  const city = useCity();

  if (!open) return null;

  return (
    <div
      id="village-city-panel"
      className={cn(
        "pointer-events-auto absolute z-30 border border-border bg-popover text-popover-foreground shadow-lg",
        isMobile
          ? "inset-x-0 bottom-0 max-h-[50dvh] overflow-y-auto rounded-t-xl"
          : "bottom-4 right-4 w-80 rounded-lg"
      )}
      role="dialog"
      aria-label="État de la ville"
    >
      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Ville — besoins</h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-11"
            onClick={onClose}
          >
            Fermer
          </Button>
        </div>

        <ol className="flex flex-col gap-2">
          {LEVELS.map(({ n, label }) => {
            const ok = city.needLevel >= n;
            return (
              <li
                key={n}
                className={cn(
                  "flex items-start gap-2 rounded-md border px-2.5 py-2 text-sm",
                  ok
                    ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40"
                    : "border-border bg-muted/40"
                )}
              >
                <span aria-hidden className="text-base leading-none">
                  {ok ? "✅" : "❌"}
                </span>
                <div>
                  <p className="font-medium">N{n}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </li>
            );
          })}
        </ol>

        {city.advice.length > 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            <p className="mb-1 font-medium">Conseil</p>
            <ul className="list-inside list-disc space-y-0.5">
              {city.advice.slice(0, 3).map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Niveau actuel : N{city.needLevel}
        </p>
      </div>
    </div>
  );
}
