"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
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

/**
 * Fenêtre flottante (accueil) : ancrée en bas au centre, déplaçable librement
 * par-dessus le contenu. Masquée pendant la session « Touche-moi ».
 */
export function DraggableHomeWindow({
  children,
  className,
}: DraggableHomeWindowProps) {
  const gravityActive = useGravityActive();
  const { isMobile, state } = useSidebar();
  const shellRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
  } | null>(null);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (gravityActive || e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (target.closest("a, button, input, textarea")) return;

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

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    setOffset({
      x: drag.baseX + (e.clientX - drag.startX),
      y: drag.baseY + (e.clientY - drag.startY),
    });
  }, []);

  const endDrag = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const prev = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    return () => {
      document.body.style.userSelect = prev;
    };
  }, [dragging]);

  return (
    <div
      className={cn(
        "pointer-events-none fixed z-20 flex justify-center px-6",
        "bottom-6 md:bottom-8",
        gravityActive && "invisible",
        className,
      )}
      style={
        isMobile
          ? { left: 0, right: 0 }
          : {
              left:
                state === "collapsed"
                  ? "var(--sidebar-width-icon)"
                  : "var(--sidebar-width)",
              right: 0,
            }
      }
    >
      <div
        ref={shellRef}
        role="presentation"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={cn(
          "pointer-events-auto w-full max-w-md touch-none sm:max-w-lg",
          dragging ? "cursor-grabbing" : "cursor-grab",
        )}
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px)`,
          willChange: dragging ? "transform" : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
