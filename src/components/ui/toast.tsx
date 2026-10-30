"use client";

import { NativeButton } from "@/components/design-system/native-controls";
import { useEffect } from "react";
import { XIcon } from "lucide-react";
import { cn } from "cn";

const placements = {
  bottom: "bottom-6 left-1/2 -translate-x-1/2",
  "top-end":
    "top-[calc(env(safe-area-inset-top)+4.75rem)] right-4 left-auto translate-x-0",
} as const;

export function Toast({
  message,
  onDismiss,
  error = false,
  placement = "bottom",
}: {
  message: string | null;
  onDismiss: () => void;
  error?: boolean;
  placement?: keyof typeof placements;
}) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);
  return message ? (
    <div
      role={error ? "alert" : "status"}
      aria-live={error ? "assertive" : "polite"}
      className={cn(
        "fixed z-[100] flex max-w-[calc(100%-2rem)] items-center gap-3 rounded-xl border bg-popover py-3 pl-5 pr-3 text-sm text-popover-foreground shadow-lg",
        placements[placement],
      )}
    >
      <p className="min-w-0 flex-1">{message}</p>
      <NativeButton
        type="button"
        aria-label="Fermer"
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        onClick={onDismiss}
      >
        <XIcon className="size-4" />
      </NativeButton>
    </div>
  ) : null;
}
