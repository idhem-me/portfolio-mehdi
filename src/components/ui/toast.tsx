"use client";
import { useEffect } from "react";
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
        "fixed z-[100] max-w-[calc(100%-2rem)] rounded-xl border bg-popover px-5 py-3 text-sm text-popover-foreground shadow-lg",
        placements[placement],
      )}
    >
      {message}
    </div>
  ) : null;
}
