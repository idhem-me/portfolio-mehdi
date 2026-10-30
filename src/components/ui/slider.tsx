"use client";
import type { ComponentProps } from "react";
import { Slider as Primitive } from "radix-ui";
import { cn } from "@/lib/utils";
export function Slider({
  className,
  style,
  "aria-label": ariaLabel,
  ...props
}: ComponentProps<typeof Primitive.Root>) {
  return (
    <Primitive.Root
      data-slot="slider"
      className={cn(
        "relative flex h-8 w-full touch-none items-center select-none",
        className,
      )}
      {...props}
    >
      <Primitive.Track
        style={style}
        className="relative h-2 w-full grow overflow-hidden rounded-full bg-muted"
      >
        <Primitive.Range
          data-slot="slider-range"
          className="absolute h-full bg-foreground/15"
        />
      </Primitive.Track>
      <Primitive.Thumb
        data-slot="slider-thumb"
        aria-label={ariaLabel}
        className="block size-5 rounded-full border border-border bg-background shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </Primitive.Root>
  );
}
