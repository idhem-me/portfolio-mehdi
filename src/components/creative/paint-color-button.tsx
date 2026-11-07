import type { ComponentProps } from "react";

export function PaintColorButton({
  color,
  selected,
  label,
  ...props
}: Omit<ComponentProps<"button">, "color"> & {
  color: string;
  selected: boolean;
  label: string;
}) {
  return (
    <button
      {...props}
      type="button"
      aria-label={label}
      aria-pressed={selected}
      className="inline-flex size-8 min-h-(--touch-target-size) min-w-(--touch-target-size) items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-ring"
      style={{ outline: selected ? "2px solid var(--foreground)" : undefined, outlineOffset: -2 }}
    >
      <span
        className="size-6 rounded-full border border-foreground/15"
        style={{ background: color }}
      />
    </button>
  );
}
