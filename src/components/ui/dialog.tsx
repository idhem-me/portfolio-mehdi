"use client";
import { Dialog as PrimerDialog, Text } from "@primer/react";
import { useDesignSystem } from "@/components/design-system/provider";
import { useScopedTheme } from "./scoped-theme";
import * as React from "react";
import { Dialog as Primitive } from "radix-ui";
import { cn } from "@/lib/utils";
export const Dialog = Primitive.Root;
export function DialogTitle(
  props: React.ComponentProps<typeof Primitive.Title>,
) {
  const { designSystem } = useDesignSystem();
  return designSystem === "github" ? (
    <Primitive.Title {...props} asChild>
      <PrimerDialog.Title>{props.children}</PrimerDialog.Title>
    </Primitive.Title>
  ) : (
    <Primitive.Title {...props} />
  );
}
export function DialogDescription(
  props: React.ComponentProps<typeof Primitive.Description>,
) {
  const { designSystem } = useDesignSystem();
  return designSystem === "github" ? (
    <Primitive.Description {...props} asChild>
      <Text as="p">{props.children}</Text>
    </Primitive.Description>
  ) : (
    <Primitive.Description {...props} />
  );
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
  const { designSystem } = useDesignSystem();
  return (
    <Primitive.Portal>
      <Primitive.Overlay
        className={cn(
          "fixed inset-0 z-[100] bg-black/40 backdrop-blur-xs",
          overlayClassName,
        )}
      />
      <Primitive.Content
        data-cards-theme={scopedTheme}
        className={cn(
          "fixed left-1/2 top-1/2 z-[101] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-background p-6 text-foreground shadow-xl outline-none",
          designSystem === "github" && "ds-dialog",
          className,
        )}
        {...props}
      >
        {designSystem === "github" ? (
          <PrimerDialog.Body>{children}</PrimerDialog.Body>
        ) : (
          children
        )}
      </Primitive.Content>
    </Primitive.Portal>
  );
}

export function DialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { designSystem } = useDesignSystem();
  if (designSystem === "github")
    return <PrimerDialog.Header className={className} {...props} />;
  return <div className={cn("mb-5 space-y-2", className)} {...props} />;
}
export function DialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { designSystem } = useDesignSystem();
  if (designSystem === "github")
    return <PrimerDialog.Footer className={className} {...props} />;
  return (
    <div
      className={cn("mt-6 flex flex-wrap justify-end gap-2", className)}
      {...props}
    />
  );
}
