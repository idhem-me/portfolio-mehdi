"use client";
import * as React from "react";
import { Switch as Primitive } from "radix-ui";
import { cn } from "@/lib/utils";
export function Switch({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof Primitive.Root>) {
  return (
    <Primitive.Root
      ref={ref}
      data-slot="switch"
      className={cn(
        "peer group inline-flex min-h-(--touch-target-size) w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <span className="pointer-events-none inline-flex h-6 w-full items-center rounded-full border border-transparent bg-input shadow-xs group-data-[state=checked]:bg-primary">
        <Primitive.Thumb className="block size-5 rounded-full bg-background shadow-sm transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0" />
      </span>
    </Primitive.Root>
  );
}
