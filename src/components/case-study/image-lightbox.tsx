"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type TouchEvent as ReactTouchEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { createPortal } from "react-dom";
import { Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MIN_SCALE = 1;
const MAX_SCALE = 4;

type LightboxTarget = { src: string; alt: string };

type ImageLightboxContextValue = {
  open: (target: LightboxTarget) => void;
};

const ImageLightboxContext = createContext<ImageLightboxContextValue | null>(
  null
);

export function useImageLightbox() {
  return useContext(ImageLightboxContext);
}

export function ImageLightboxProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<LightboxTarget | null>(null);
  const open = useCallback((next: LightboxTarget) => setTarget(next), []);
  const close = useCallback(() => setTarget(null), []);

  return (
    <ImageLightboxContext.Provider value={{ open }}>
      {children}
      {target ? (
        <LightboxOverlay src={target.src} alt={target.alt} onClose={close} />
      ) : null}
    </ImageLightboxContext.Provider>
  );
}

function LightboxOverlay({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
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

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") {
        setScale((s) => Math.min(MAX_SCALE, s + 0.25));
      }
      if (e.key === "-" || e.key === "_") {
        setScale((s) => {
          const next = Math.max(MIN_SCALE, s - 0.25);
          if (next === MIN_SCALE) setOffset({ x: 0, y: 0 });
          return next;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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
        Math.max(MIN_SCALE, pinchRef.current.scale * ratio)
      );
      setScale(next);
      if (next === MIN_SCALE) setOffset({ x: 0, y: 0 });
    }
  };

  const onTouchEnd = () => {
    pinchRef.current = null;
  };

  if (!mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex flex-col bg-background/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-3 sm:px-4">
        <p
          id={titleId}
          className="min-w-0 flex-1 truncate text-sm text-muted-foreground"
        >
          {alt}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            aria-label="Zoom arrière"
            disabled={scale <= MIN_SCALE}
            onClick={(e) => {
              e.stopPropagation();
              zoomBy(-0.35);
            }}
          >
            <Minus className="size-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            aria-label="Zoom avant"
            disabled={scale >= MAX_SCALE}
            onClick={(e) => {
              e.stopPropagation();
              zoomBy(0.35);
            }}
          >
            <Plus className="size-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            aria-label="Fermer"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            <X className="size-4" aria-hidden />
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "relative min-h-0 flex-1 touch-none overflow-hidden",
          scale > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"
        )}
        onClick={(e) => e.stopPropagation()}
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
            transition: dragging.current ? undefined : "transform 160ms ease-out",
          }}
        />
      </div>

      <p className="px-4 pb-4 text-center text-xs text-muted-foreground">
        Pincez ou utilisez + / − pour zoomer · Esc pour fermer
      </p>
    </div>,
    document.body
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

  if (!lightbox) return <>{children}</>;

  return (
    <button
      type="button"
      className={cn(
        "block w-full cursor-zoom-in rounded-lg text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
      onClick={() => lightbox.open({ src, alt })}
      aria-label={`Agrandir : ${alt}`}
    >
      {children}
    </button>
  );
}
