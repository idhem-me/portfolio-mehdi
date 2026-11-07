import {
  Boxes,
  ChartLine,
  Crosshair,
  FlaskConical,
  PenTool,
  Search,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Search,
  Crosshair,
  PenTool,
  FlaskConical,
  ChartLine,
  Boxes,
};

export type RolePillar = {
  icon: string;
  title: string;
  description: string;
};

export function RolePillars({ pillars }: { pillars: RolePillar[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {pillars.map((pillar) => {
        const Icon = ICONS[pillar.icon] ?? Crosshair;
        return (
          <li key={pillar.title} className="flex gap-3">
            <span
              className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-foreground/70 ring-1 ring-foreground/5"
              aria-hidden
            >
              <Icon className="size-4" strokeWidth={1.75} />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-medium tracking-tight">{pillar.title}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {pillar.description}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
