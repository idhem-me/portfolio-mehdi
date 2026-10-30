"use client";
import { Select as PrimerSelect } from "@primer/react";
import { useDesignSystem } from "@/components/design-system/provider";
import { useLocale } from "next-intl";
import { Select as Primitive } from "radix-ui";
import { Check, ChevronDown } from "lucide-react";
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
  const { designSystem } = useDesignSystem();
  if (designSystem === "github")
    return (
      <PrimerSelect
        id={id}
        aria-label={label}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        block
      >
        {options.map((option) => (
          <PrimerSelect.Option key={option.value} value={option.value}>
            {option.label}
          </PrimerSelect.Option>
        ))}
      </PrimerSelect>
    );
  return (
    <Primitive.Root
      dir={locale === "ar" ? "rtl" : "ltr"}
      value={value}
      onValueChange={onValueChange}
    >
      <Primitive.Trigger
        id={id}
        aria-label={label}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Primitive.Value />
        <Primitive.Icon>
          <ChevronDown className="size-4" />
        </Primitive.Icon>
      </Primitive.Trigger>
      <Primitive.Portal>
        <Primitive.Content
          position="popper"
          sideOffset={5}
          className="z-50 max-h-80 min-w-(--radix-select-trigger-width) overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          <Primitive.Viewport>
            {options.map((o) => (
              <Primitive.Item
                key={o.value}
                value={o.value}
                className="relative flex min-h-10 cursor-default items-center rounded-md py-2 ps-8 pe-3 text-sm outline-none data-highlighted:bg-muted"
              >
                <Primitive.ItemIndicator className="absolute start-2">
                  <Check className="size-4" />
                </Primitive.ItemIndicator>
                <Primitive.ItemText>{o.label}</Primitive.ItemText>
              </Primitive.Item>
            ))}
          </Primitive.Viewport>
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
