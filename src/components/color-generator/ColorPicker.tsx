"use client";

import { NativeButton } from "@/components/design-system/native-controls";

import { useTranslations } from "next-intl";
import { Popover } from "radix-ui";
import { HexColorPicker } from "react-colorful";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import "./color-picker.css";

export function ColorPicker({
  color,
  onChange,
}: {
  color: string;
  onChange: (color: string) => void;
}) {
  const t = useTranslations("colorGenerator");
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <NativeButton
          type="button"
          aria-label={t("picker")}
          className="size-9 shrink-0 rounded-full border border-foreground/15 shadow-sm outline-none transition-shadow hover:ring-4 hover:ring-ring/15 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          style={{ backgroundColor: color }}
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          aria-label={t("picker")}
          align="start"
          sideOffset={12}
          collisionPadding={16}
          className="z-50 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-popover p-4 text-popover-foreground shadow-xl outline-none"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm font-medium">{t("picker")}</p>
            <Popover.Close asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("closePicker")}
              >
                <X aria-hidden="true" />
              </Button>
            </Popover.Close>
          </div>
          <div className="color-generator-picker">
            <HexColorPicker
              color={color}
              onChange={onChange}
              style={{ width: "100%", height: 232, gap: 16 }}
            />
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
