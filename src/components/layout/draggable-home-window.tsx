"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { useGravityActive } from "@/components/creative/gravity-playground";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

type DraggableHomeWindowProps = {
  children: ReactNode;
  className?: string;
};

/** Marge minimale avec le bord du panel / viewport (px). */
const EDGE_MARGIN = 8;
/** Distance (px) sous laquelle l’offset colle magnétiquement au bord. */
const MAGNET_THRESHOLD = 28;
/** Durée de la transition sidebar (durée-200) avant re-mesure. */
const SIDEBAR_SETTLE_MS = 220;

const MIN_WIDTH = 260;
const MIN_HEIGHT = 168;
const MAX_WIDTH = 720;
const MAX_HEIGHT = 560;

type Bounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

type PlayableRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

type Size = { w: number; h: number };

type ResizeHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const HANDLES: ResizeHandle[] = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];

const HANDLE_CURSOR: Record<ResizeHandle, string> = {
  n: "ns-resize",
  s: "ns-resize",
  e: "ew-resize",
  w: "ew-resize",
  ne: "nesw-resize",
  sw: "nesw-resize",
  nw: "nwse-resize",
  se: "nwse-resize",
};

function clamp(n: number, min: number, max: number) {
  if (min > max) return (min + max) / 2;
  return Math.min(Math.max(n, min), max);
}

function magnetize(n: number, min: number, max: number) {
  const c = clamp(n, min, max);
  if (c - min <= MAGNET_THRESHOLD) return min;
  if (max - c <= MAGNET_THRESHOLD) return max;
  return c;
}

/**
 * Zone utile : SidebarInset, hors header mobile sticky et hors sidebar desktop.
 * La fenêtre ne doit jamais passer derrière ces panels (z-10).
 */
function getPlayableRect(): PlayableRect {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const inset = document.querySelector<HTMLElement>(
    '[data-slot="sidebar-inset"]',
  );

  if (!inset) {
    return {
      left: EDGE_MARGIN,
      top: EDGE_MARGIN,
      right: vw - EDGE_MARGIN,
      bottom: vh - EDGE_MARGIN,
    };
  }

  const insetRect = inset.getBoundingClientRect();
  const header = inset.querySelector("header");
  const headerBottom = header
    ? header.getBoundingClientRect().bottom
    : insetRect.top;

  return {
    left: insetRect.left + EDGE_MARGIN,
    top: Math.max(headerBottom, 0) + EDGE_MARGIN,
    right: Math.min(insetRect.right, vw) - EDGE_MARGIN,
    bottom: vh - EDGE_MARGIN,
  };
}

function getBounds(
  el: HTMLElement,
  offsetX: number,
  offsetY: number,
  size?: Size | null,
): Bounds {
  const rect = el.getBoundingClientRect();
  const naturalLeft = rect.left - offsetX;
  const naturalTop = rect.top - offsetY;
  const width = size?.w ?? rect.width;
  const height = size?.h ?? rect.height;
  const area = getPlayableRect();

  return {
    minX: area.left - naturalLeft,
    maxX: area.right - width - naturalLeft,
    minY: area.top - naturalTop,
    maxY: area.bottom - height - naturalTop,
  };
}

function constrainOffset(
  el: HTMLElement,
  x: number,
  y: number,
  currentX: number,
  currentY: number,
  magnetic: boolean,
  size?: Size | null,
) {
  const { minX, maxX, minY, maxY } = getBounds(
    el,
    currentX,
    currentY,
    size,
  );
  if (magnetic) {
    return {
      x: magnetize(x, minX, maxX),
      y: magnetize(y, minY, maxY),
    };
  }
  return {
    x: clamp(x, minX, maxX),
    y: clamp(y, minY, maxY),
  };
}

function applyResize(
  handle: ResizeHandle,
  start: { w: number; h: number; x: number; y: number; left: number; top: number },
  dx: number,
  dy: number,
): { size: Size; offset: { x: number; y: number } } {
  const area = getPlayableRect();
  const moveW = handle.includes("w");
  const moveE = handle.includes("e");
  const moveN = handle.includes("n");
  const moveS = handle.includes("s");

  let { w, h, x, y, left, top } = start;
  const right = left + w;
  const bottom = top + h;

  if (moveE) {
    const maxW = Math.min(MAX_WIDTH, area.right - left);
    w = clamp(start.w + dx, MIN_WIDTH, maxW);
  }
  if (moveW) {
    const maxW = Math.min(MAX_WIDTH, right - area.left);
    w = clamp(start.w - dx, MIN_WIDTH, maxW);
    x = start.x + (start.w - w);
  }
  if (moveS) {
    const maxH = Math.min(MAX_HEIGHT, area.bottom - top);
    h = clamp(start.h + dy, MIN_HEIGHT, maxH);
  }
  if (moveN) {
    const maxH = Math.min(MAX_HEIGHT, bottom - area.top);
    h = clamp(start.h - dy, MIN_HEIGHT, maxH);
    y = start.y + (start.h - h);
  }

  return { size: { w, h }, offset: { x, y } };
}

function handleClass(handle: ResizeHandle) {
  const edge = "absolute z-20 touch-none";
  const bar = "bg-transparent";
  switch (handle) {
    case "n":
      return cn(edge, bar, "inset-x-3 top-0 h-2 cursor-ns-resize");
    case "s":
      return cn(edge, bar, "inset-x-3 bottom-0 h-2 cursor-ns-resize");
    case "e":
      return cn(edge, bar, "inset-y-3 right-0 w-2 cursor-ew-resize");
    case "w":
      return cn(edge, bar, "inset-y-3 left-0 w-2 cursor-ew-resize");
    case "ne":
      return cn(edge, "right-0 top-0 size-3 cursor-nesw-resize");
    case "nw":
      return cn(edge, "left-0 top-0 size-3 cursor-nwse-resize");
    case "se":
      return cn(edge, "bottom-0 right-0 size-3 cursor-nwse-resize");
    case "sw":
      return cn(edge, "bottom-0 left-0 size-3 cursor-nesw-resize");
  }
}

/**
 * Fenêtre (accueil) : drag + resize façon OS.
 * Contrainte à la zone contenu (hors sidebar / header) ; min/max pour éviter les bugs.
 */
export function DraggableHomeWindow({
  children,
  className,
}: DraggableHomeWindowProps) {
  const gravityActive = useGravityActive();
  const { state, width, isMobile, isResizing } = useSidebar();
  const shellRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState<Size | null>(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const offsetRef = useRef(offset);
  const sizeRef = useRef(size);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
  } | null>(null);
  const resizeRef = useRef<{
    pointerId: number;
    handle: ResizeHandle;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    startOffX: number;
    startOffY: number;
    startLeft: number;
    startTop: number;
  } | null>(null);

  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  useEffect(() => {
    sizeRef.current = size;
  }, [size]);

  useLayoutEffect(() => {
    const el = shellRef.current;
    if (!el || size) return;
    const rect = el.getBoundingClientRect();
    setSize({
      w: clamp(rect.width, MIN_WIDTH, MAX_WIDTH),
      h: clamp(rect.height, MIN_HEIGHT, MAX_HEIGHT),
    });
  }, [size]);

  const reclamp = useCallback(() => {
    const el = shellRef.current;
    if (!el) return;
    const { x, y } = offsetRef.current;
    let nextSize = sizeRef.current;
    if (nextSize) {
      const area = getPlayableRect();
      const maxW = Math.min(MAX_WIDTH, area.right - area.left);
      const maxH = Math.min(MAX_HEIGHT, area.bottom - area.top);
      const w = clamp(nextSize.w, MIN_WIDTH, maxW);
      const h = clamp(nextSize.h, MIN_HEIGHT, maxH);
      if (w !== nextSize.w || h !== nextSize.h) {
        nextSize = { w, h };
        setSize(nextSize);
        sizeRef.current = nextSize;
      }
    }
    const next = constrainOffset(el, x, y, x, y, false, nextSize);
    if (next.x !== x || next.y !== y) {
      setOffset(next);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("resize", reclamp);
    return () => window.removeEventListener("resize", reclamp);
  }, [reclamp]);

  useEffect(() => {
    if (isResizing) {
      reclamp();
      return;
    }
    const id = window.setTimeout(reclamp, SIDEBAR_SETTLE_MS);
    return () => window.clearTimeout(id);
  }, [state, width, isMobile, isResizing, reclamp]);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (gravityActive || e.button !== 0 || resizeRef.current) return;
      const target = e.target as HTMLElement;
      if (target.closest("a, button, input, textarea, [data-resize-handle]")) {
        return;
      }

      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        baseX: offset.x,
        baseY: offset.y,
      };
      setDragging(true);
    },
    [gravityActive, offset.x, offset.y],
  );

  const onResizePointerDown = useCallback(
    (handle: ResizeHandle) => (e: ReactPointerEvent<HTMLDivElement>) => {
      if (gravityActive || e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();
      const el = shellRef.current;
      if (!el || !size) return;

      el.setPointerCapture(e.pointerId);
      const rect = el.getBoundingClientRect();
      resizeRef.current = {
        pointerId: e.pointerId,
        handle,
        startX: e.clientX,
        startY: e.clientY,
        startW: size.w,
        startH: size.h,
        startOffX: offset.x,
        startOffY: offset.y,
        startLeft: rect.left,
        startTop: rect.top,
      };
      setResizing(true);
      document.body.style.cursor = HANDLE_CURSOR[handle];
    },
    [gravityActive, offset.x, offset.y, size],
  );

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const resize = resizeRef.current;
    if (resize && resize.pointerId === e.pointerId) {
      const next = applyResize(
        resize.handle,
        {
          w: resize.startW,
          h: resize.startH,
          x: resize.startOffX,
          y: resize.startOffY,
          left: resize.startLeft,
          top: resize.startTop,
        },
        e.clientX - resize.startX,
        e.clientY - resize.startY,
      );
      setSize(next.size);
      setOffset(next.offset);
      return;
    }

    const drag = dragRef.current;
    const el = shellRef.current;
    if (!drag || drag.pointerId !== e.pointerId || !el) return;

    const rawX = drag.baseX + (e.clientX - drag.startX);
    const rawY = drag.baseY + (e.clientY - drag.startY);
    const { x: curX, y: curY } = offsetRef.current;
    setOffset(
      constrainOffset(el, rawX, rawY, curX, curY, true, sizeRef.current),
    );
  }, []);

  const endInteraction = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const resize = resizeRef.current;
    if (resize && resize.pointerId === e.pointerId) {
      resizeRef.current = null;
      setResizing(false);
      document.body.style.cursor = "";
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      const el = shellRef.current;
      if (el) {
        const { x, y } = offsetRef.current;
        setOffset(
          constrainOffset(el, x, y, x, y, true, sizeRef.current),
        );
      }
      return;
    }

    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    const el = shellRef.current;
    if (el) {
      const { x, y } = offsetRef.current;
      setOffset(
        constrainOffset(el, x, y, x, y, true, sizeRef.current),
      );
    }
  }, []);

  useEffect(() => {
    if (!dragging && !resizing) return;
    const prev = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    return () => {
      document.body.style.userSelect = prev;
    };
  }, [dragging, resizing]);

  const shellStyle: CSSProperties = {
    transform: `translate(${offset.x}px, ${offset.y}px)`,
    willChange: dragging || resizing ? "transform, width, height" : undefined,
    ...(size
      ? {
          width: size.w,
          height: size.h,
          maxWidth: "none",
        }
      : undefined),
  };

  return (
    <div
      className={cn(
        "flex justify-center",
        gravityActive && "invisible",
        className,
      )}
    >
      <div
        ref={shellRef}
        role="presentation"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endInteraction}
        onPointerCancel={endInteraction}
        className={cn(
          "relative w-full max-w-md touch-none sm:max-w-lg",
          dragging ? "cursor-grabbing" : "cursor-grab",
          resizing && "select-none",
        )}
        style={shellStyle}
      >
        <div className="h-full w-full min-h-0">{children}</div>

        {HANDLES.map((handle) => (
          <div
            key={handle}
            data-resize-handle={handle}
            role="separator"
            aria-orientation={
              handle === "e" || handle === "w"
                ? "vertical"
                : handle === "n" || handle === "s"
                  ? "horizontal"
                  : undefined
            }
            aria-label={`Redimensionner (${handle})`}
            className={handleClass(handle)}
            onPointerDown={onResizePointerDown(handle)}
          />
        ))}
      </div>
    </div>
  );
}
