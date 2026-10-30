"use client";
import { SkeletonBox } from "@primer/react";
import { useDesignSystem } from "@/components/design-system/provider";
import { cn } from "cn";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  const { designSystem } = useDesignSystem();
  if (designSystem === "github")
    return (
      <SkeletonBox {...props} data-slot="skeleton" className={className} />
    );
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export { Skeleton };
