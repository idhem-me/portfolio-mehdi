"use client";

import type { ReactElement, ReactNode } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type SettingsModalVariant = "center" | "right";

export function SettingsModal({
  open,
  onOpenChange,
  trigger,
  triggerRef,
  title,
  description,
  children,
  className,
  variant = "center",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: ReactElement;
  triggerRef?: { current: HTMLElement | null };
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
  variant?: SettingsModalVariant;
}) {
  const t = useTranslations("ui");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        className={cn("settings-modal", className)}
        data-variant={variant}
        overlayClassName="z-(--settings-modal-overlay-layer)"
        onCloseAutoFocus={(event) => {
          if (triggerRef?.current?.isConnected) {
            event.preventDefault();
            triggerRef.current.focus();
          }
        }}
      >
        <header className="settings-modal-header">
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {description}
          </DialogDescription>
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="settings-modal-close"
              aria-label={t("close")}
            >
              <X aria-hidden />
            </Button>
          </DialogClose>
        </header>
        <div className="settings-modal-body">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
