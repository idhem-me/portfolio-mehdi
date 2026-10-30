"use client";

import { useLocale } from "next-intl";
import { Select as Primitive } from "radix-ui";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { useDesignSystemAttributes } from "@/components/design-system/provider";
import { useScopedTheme } from "./scoped-theme";

export function Select({
  value,
  onValueChange,
  label,
  options,
  id,
}: {
  value: string;
  onValueChange: (value: string) => void;
  label: string;
  options: readonly { value: string; label: string }[];
  id?: string;
}) {
  const locale = useLocale();
  const attributes = useDesignSystemAttributes();
  const scopedTheme = useScopedTheme();
  return (
    <Primitive.Root
      dir={locale === "ar" ? "rtl" : "ltr"}
      value={value}
      onValueChange={onValueChange}
    >
      <Primitive.Trigger
        id={id}
        aria-label={label}
        data-slot="select-trigger"
        className="flex h-(--control-height) w-full min-w-0 items-center justify-between gap-3 rounded-lg border border-input bg-background ps-3 pe-3 text-start text-[length:var(--control-text)] text-foreground outline-none transition-colors hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=open]:border-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="min-w-0 flex-1 truncate">
          <Primitive.Value />
        </span>
        <Primitive.Icon className="shrink-0 text-muted-foreground">
          <ChevronDown className="size-4" aria-hidden />
        </Primitive.Icon>
      </Primitive.Trigger>
      <Primitive.Portal>
        <Primitive.Content
          {...attributes}
          data-cards-theme={scopedTheme}
          data-slot="select-content"
          position="popper"
          align="start"
          sideOffset={6}
          collisionPadding={8}
          className="ds-scope z-50 max-h-[min(20rem,var(--radix-select-content-available-height))] w-(--radix-select-trigger-width) min-w-32 max-w-[calc(100vw-1rem)] overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md"
        >
          <Primitive.ScrollUpButton className="flex h-6 items-center justify-center bg-popover">
            <ChevronUp className="size-4" aria-hidden />
          </Primitive.ScrollUpButton>
          <Primitive.Viewport>
            {options.map((option) => (
              <Primitive.Item
                key={option.value}
                value={option.value}
                className="relative flex min-h-(--control-height) cursor-pointer items-center rounded-md py-2 ps-3 pe-9 text-[length:var(--control-text)] outline-none select-none data-[state=checked]:bg-muted/60 data-highlighted:bg-muted data-highlighted:text-foreground"
              >
                <Primitive.ItemText className="break-words">
                  {option.label}
                </Primitive.ItemText>
                <Primitive.ItemIndicator className="absolute end-3 flex items-center">
                  <Check className="size-4" aria-hidden />
                </Primitive.ItemIndicator>
              </Primitive.Item>
            ))}
          </Primitive.Viewport>
          <Primitive.ScrollDownButton className="flex h-6 items-center justify-center bg-popover">
            <ChevronDown className="size-4" aria-hidden />
          </Primitive.ScrollDownButton>
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
