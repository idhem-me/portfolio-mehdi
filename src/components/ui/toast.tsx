"use client";
import { useEffect } from "react";
export function Toast({
  message,
  onDismiss,
  error = false,
}: {
  message: string | null;
  onDismiss: () => void;
  error?: boolean;
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
      className="fixed bottom-6 left-1/2 z-[100] max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-xl border bg-popover px-5 py-3 text-sm text-popover-foreground shadow-lg"
    >
      {message}
    </div>
  ) : null;
}
