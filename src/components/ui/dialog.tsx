"use client";
import { useDesignSystemPortalHost } from "@/components/design-system/provider";
import { useScopedTheme } from "./scoped-theme";
import * as React from "react";
import { Dialog as Primitive } from "radix-ui";
import { cn } from "@/lib/utils";
export const Dialog = Primitive.Root;
export const DialogTrigger = Primitive.Trigger;
export const DialogClose = Primitive.Close;
export function DialogTitle(
  props: React.ComponentProps<typeof Primitive.Title>,
) {
  return <Primitive.Title {...props} />;
}
export function DialogDescription(
  props: React.ComponentProps<typeof Primitive.Description>,
) {
  return <Primitive.Description {...props} />;
}
export function DialogContent({
  className,
  children,
  overlayClassName,
  ...props
}: React.ComponentProps<typeof Primitive.Content> & {
  overlayClassName?: string;
}) {
  const scopedTheme = useScopedTheme();
  const container = useDesignSystemPortalHost();
  return (
    <Primitive.Portal container={container}>
      <Primitive.Overlay
        className={cn(
          "fixed inset-0 z-[100] bg-(--dialog-scrim) backdrop-blur-xs",
          overlayClassName,
        )}
      />
      <Primitive.Content
        data-slot="dialog-content"
        data-cards-theme={scopedTheme}
        className={cn(
          "fixed left-1/2 top-1/2 z-[101] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-background p-6 text-foreground shadow-xl outline-none",
          className,
        )}
        {...props}
      >
        {children}
      </Primitive.Content>
    </Primitive.Portal>
  );
}

export function DialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("mb-5 space-y-2", className)} {...props} />;
}
export function DialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mt-6 flex flex-wrap justify-end gap-2", className)}
      {...props}
    />
  );
}
