"use client";

import {
  useEffect,
  useRef,
  type FormEventHandler,
  type ReactNode,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function GiftFormDialog({
  title,
  description,
  locked,
  onClose,
  onSubmit,
  children,
  actions,
  error,
}: {
  title: string;
  description: string;
  locked: boolean;
  onClose: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  children: ReactNode;
  actions: ReactNode;
  error?: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const viewport = window.visualViewport;
    const content = panel.current;
    if (!viewport || !content) return;
    const update = () => {
      content.style.setProperty("--gift-dialog-height", `${viewport.height}px`);
      content.style.setProperty(
        "--gift-dialog-center",
        `${viewport.offsetTop + viewport.height / 2}px`,
      );
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);

  return (
    <Dialog open onOpenChange={(open) => !open && !locked && onClose()}>
      <DialogContent
        ref={panel}
        className="top-[var(--gift-dialog-center,50%)] flex max-h-[calc(var(--gift-dialog-height,100dvh)-1rem)] max-w-lg flex-col gap-0 overflow-hidden p-0"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          opener.current =
            document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null;
          heading.current?.focus({ preventScroll: true });
        }}
        onCloseAutoFocus={(event) => {
          if (!opener.current?.isConnected) return;
          event.preventDefault();
          opener.current.focus({ preventScroll: true });
        }}
      >
        <DialogHeader className="mb-0 shrink-0 px-4 pb-3 pt-4 sm:px-6">
          <DialogTitle
            ref={heading}
            tabIndex={-1}
            className="text-xl font-semibold outline-none"
          >
            {title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {description}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div
            data-slot="gift-form-body"
            className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 pb-4 pt-1 sm:px-6"
          >
            {children}
          </div>
          <DialogFooter
            data-slot="gift-form-actions"
            className="mt-0 shrink-0 border-t border-border bg-background px-4 py-3 sm:px-6"
          >
            {error && <div className="basis-full">{error}</div>}
            {actions}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
