"use client";

import { NativeButton } from "@/components/design-system/native-controls";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type TouchEvent as ReactTouchEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { Minus, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const keyboardPan: Partial<Record<string, { x: number; y: number }>> = {
  ArrowLeft: { x: -32, y: 0 },
  ArrowRight: { x: 32, y: 0 },
  ArrowUp: { x: 0, y: -32 },
  ArrowDown: { x: 0, y: 32 },
};

type LightboxTarget = { src: string; alt: string };

type ImageLightboxContextValue = {
  open: (target: LightboxTarget, trigger: HTMLButtonElement) => void;
};

const ImageLightboxContext = createContext<ImageLightboxContextValue | null>(
  null,
);

export function useImageLightbox() {
  return useContext(ImageLightboxContext);
}

export function ImageLightboxProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<(LightboxTarget & { trigger: HTMLButtonElement }) | null>(null);
  const open = useCallback((next: LightboxTarget, trigger: HTMLButtonElement) => setTarget({ ...next, trigger }), []);
  const close = useCallback(() => setTarget(null), []);

  return (
    <ImageLightboxContext.Provider value={{ open }}>
      {children}
      {target ? (
        <LightboxOverlay {...target} onClose={close} />
      ) : null}
    </ImageLightboxContext.Provider>
  );
}

function LightboxOverlay({
  src,
  alt,
  trigger,
  onClose,
}: {
  src: string;
  alt: string;
  trigger: HTMLButtonElement;
  onClose: () => void;
}) {
  const t = useTranslations("caseStudyControls");
  const ui = useTranslations("ui");
  const closeRef = useRef<HTMLButtonElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const pinchRef = useRef<{
    distance: number;
    scale: number;
  } | null>(null);

  const zoomBy = (delta: number) => {
    setScale((s) => {
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, s + delta));
      if (next === MIN_SCALE) setOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const onWheel = (e: ReactWheelEvent) => {
    e.preventDefault();
    zoomBy(e.deltaY < 0 ? 0.15 : -0.15);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (scale <= MIN_SCALE || e.button !== 0) return;
    dragging.current = true;
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: offset.x,
      originY: offset.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    setOffset({
      x: drag.originX + (e.clientX - drag.startX),
      y: drag.originY + (e.clientY - drag.startY),
    });
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    dragRef.current = null;
    dragging.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  };

  const onTouchStart = (e: ReactTouchEvent) => {
    if (e.touches.length === 2) {
      const a = e.touches[0]!;
      const b = e.touches[1]!;
      const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      pinchRef.current = { distance, scale };
    }
  };

  const onTouchMove = (e: ReactTouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const a = e.touches[0]!;
      const b = e.touches[1]!;
      const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const ratio = distance / pinchRef.current.distance;
      const next = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, pinchRef.current.scale * ratio),
      );
      setScale(next);
      if (next === MIN_SCALE) setOffset({ x: 0, y: 0 });
    }
  };

  const onTouchEnd = () => {
    pinchRef.current = null;
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className="left-0 top-0 flex h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col rounded-none border-0 bg-background/90 p-0 backdrop-blur-sm"
        overlayClassName="bg-transparent backdrop-blur-none"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          closeRef.current?.focus();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          trigger.focus();
        }}
        onKeyDown={(event) => {
          if (event.key === "+" || event.key === "=") zoomBy(0.25);
          if (event.key === "-" || event.key === "_") zoomBy(-0.25);
          if (scale <= MIN_SCALE) return;

          const pan = keyboardPan[event.key];
          if (pan) {
            event.preventDefault();
            setOffset(({ x, y }) => ({ x: x + pan.x, y: y + pan.y }));
          }
        }}
      >
        <div className="flex items-center justify-between gap-2 px-3 py-3 sm:px-4">
          <DialogTitle
            className="min-w-0 flex-1 truncate text-sm text-muted-foreground"
          >
            {alt}
          </DialogTitle>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="secondary"
              size="icon-sm"
              aria-label={t("zoomOut")}
              disabled={scale <= MIN_SCALE}
              onClick={() => zoomBy(-0.35)}
            >
              <Minus className="size-4" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon-sm"
              aria-label={t("zoomIn")}
              disabled={scale >= MAX_SCALE}
              onClick={() => zoomBy(0.35)}
            >
              <Plus className="size-4" aria-hidden />
            </Button>
            <DialogClose asChild>
              <Button ref={closeRef} type="button" variant="secondary" size="icon-sm" aria-label={ui("close")}>
                <X className="size-4" aria-hidden />
              </Button>
            </DialogClose>
          </div>
        </div>

        <div
          className={cn(
            "relative min-h-0 flex-1 touch-none overflow-hidden",
            scale > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in",
          )}
          onDoubleClick={() => {
            if (scale > 1) {
              setScale(1);
              setOffset({ x: 0, y: 0 });
            } else {
              setScale(2);
            }
          }}
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            draggable={false}
            className="pointer-events-none absolute top-1/2 left-1/2 max-h-[min(100%,90dvh)] max-w-[min(100%,96vw)] select-none object-contain"
            style={{
              transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${scale})`,
              // Existing imperative DOM bridge; refs do not determine React state.
              // eslint-disable-next-line react-hooks/refs
              transition: dragging.current
                ? undefined
                : "transform 160ms ease-out",
            }}
          />
        </div>

        <DialogDescription className="px-4 pb-4 text-center text-xs text-muted-foreground">
          {t("lightboxHelp")}
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
}

/** Rend une image cliquable pour ouvrir la lightbox. */
export function LightboxTrigger({
  src,
  alt,
  className,
  children,
}: {
  src: string;
  alt: string;
  className?: string;
  children: ReactNode;
}) {
  const lightbox = useImageLightbox();
  const t = useTranslations("caseStudyControls");

  if (!lightbox) return <>{children}</>;

  return (
    <NativeButton
      type="button"
      className={cn(
        "block w-full cursor-zoom-in rounded-lg text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      onClick={(event) => lightbox.open({ src, alt }, event.currentTarget)}
      aria-label={t("enlarge", { name: alt })}
    >
      {children}
    </NativeButton>
  );
}
