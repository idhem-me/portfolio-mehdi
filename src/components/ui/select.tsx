"use client";

import { useLocale } from "next-intl";
import { Select as Primitive } from "radix-ui";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { useDesignSystemAttributes } from "@/components/design-system/provider";
import { useScopedTheme } from "./scoped-theme";
import { cn } from "@/lib/utils";

export const selectChipTriggerClassName =
  "inline-flex h-(--control-height) w-auto max-w-56 shrink-0 items-center justify-between gap-1.5 rounded-lg border border-border bg-background px-3 text-[length:var(--control-text-xs)] font-medium text-foreground outline-none transition-colors hover:bg-muted/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=open]:border-ring data-[state=open]:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50";

export function Select({
  value,
  onValueChange,
  label,
  options,
  id,
  variant = "default",
  placeholder,
}: {
  value: string;
  onValueChange: (value: string) => void;
  label: string;
  options: readonly { value: string; label: string }[];
  id?: string;
  variant?: "default" | "chip";
  /** Shown after the label when the selected option equals this value (chip). */
  placeholder?: string;
}) {
  const locale = useLocale();
  const attributes = useDesignSystemAttributes();
  const scopedTheme = useScopedTheme();
  const selected = options.find((option) => option.value === value);
  const chipEmpty = Boolean(placeholder && value === placeholder);
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
        data-variant={variant}
        className={
          variant === "chip"
            ? selectChipTriggerClassName
            : "flex h-(--control-height) w-full min-w-0 items-center justify-between gap-3 rounded-lg border border-input bg-background ps-3 pe-3 text-start text-[length:var(--control-text)] text-foreground outline-none transition-colors hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=open]:border-ring disabled:cursor-not-allowed disabled:opacity-50"
        }
      >
        <span className="min-w-0 flex-1 truncate text-start">
          {variant === "chip" ? (
            chipEmpty ? (
              label
            ) : (
              <>
                <span className="text-muted-foreground">{label}</span>
                {selected ? (
                  <>
                    <span className="text-muted-foreground">: </span>
                    <span>{selected.label}</span>
                  </>
                ) : null}
              </>
            )
          ) : (
            <Primitive.Value />
          )}
        </span>
        <Primitive.Icon className="shrink-0 text-muted-foreground">
          <ChevronDown className="size-3.5" aria-hidden />
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
          className={cn(
            "ds-scope z-50 max-h-[min(20rem,var(--radix-select-content-available-height))] min-w-32 max-w-[calc(100vw-1rem)] overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md",
            variant === "chip"
              ? "w-max min-w-(--radix-select-trigger-width)"
              : "w-(--radix-select-trigger-width)",
          )}
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
