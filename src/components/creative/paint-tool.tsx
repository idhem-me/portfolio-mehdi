"use client";
import { track as usage } from "@/lib/tracking/client";

import "./paint-tool.css";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type RefObject,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Undo2, BrushCleaning } from "lucide-react";
import { createPortal } from "react-dom";
import Matter from "matter-js";
import { trackHomeInteraction } from "@/lib/analytics/home-events";
import { useTranslations } from "next-intl";
import { Button } from "@/components/design-system/mehdi-button";
import { PaintBrush } from "./paint-brush";
import {
  createPaintBody,
  PAINT_WIDTH,
  samplePaintPoint,
  type PaintPoint,
} from "./paint-geometry";
export type PaintBridge = { reset: () => void; resume: () => void };
type PaintPair = {
  body: Matter.Body;
  el: HTMLElement;
  width: number;
  height: number;
  offset?: PaintPoint;
  drawing?: boolean;
};
type PaintSession = {
  engine: Matter.Engine;
  pairs: PaintPair[];
  mouseConstraint: Matter.MouseConstraint;
};
type Stroke = {
  points: PaintPoint[];
  el: HTMLDivElement;
  pair?: PaintPair;
  engine?: Matter.Engine;
  release?: () => void;
};
const COLORS = ["primary", "accent", "warning", "success", "danger"] as const;
const token = (color: string) =>
  `var(--${color === "danger" ? "destructive" : color})`;
const NS = "http://www.w3.org/2000/svg";
function renderStroke(points: PaintPoint[], color: string) {
  const el = document.createElement("div");
  el.dataset.paintStroke = "";
  el.className =
    "paint-original-theme pointer-events-none fixed left-0 top-0 z-[6]";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("width", "1");
  svg.setAttribute("height", "1");
  svg.style.overflow = "visible";
  const path = document.createElementNS(NS, "path");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", token(color));
  path.setAttribute("stroke-width", String(PAINT_WIDTH));
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  path.style.pointerEvents = "none";
  path.style.touchAction = "none";
  svg.append(path);
  el.append(svg);
  // Keep strokes in the transformed page layer so fixed viewport coordinates
  // match the pointer on mobile Safari too.
  const host = document.querySelector<HTMLElement>(
    ".page-tear-paper > :first-child",
  );
  (host ?? document.body).append(el);
  updatePath(el, points);
  return el;
}
function updatePath(el: HTMLElement, points: PaintPoint[]) {
  const p = points[0];
  el.querySelector("path")!.setAttribute(
    "d",
    `M${p.x},${p.y}` +
      (points.length === 1
        ? `l0.001,0`
        : points
            .slice(1)
            .map((p) => `L${p.x},${p.y}`)
            .join(" ")),
  );
}
export function PaintTool({
  bridgeRef,
  onClear,
  isPlaying,
  getSession,
  bounds,
  options,
}: {
  bridgeRef: RefObject<PaintBridge | null>;
  onClear: () => void;
  isPlaying: boolean;
  getSession: () => PaintSession;
  bounds: () => { left: number; right: number; top: number; bottom: number };
  options: () => Matter.IChamferableBodyDefinition;
}) {
  const t = useTranslations("home.paint");
  const [color, setColor] = useState<string>("primary");
  const [position, setPosition] = useState<PaintPoint | null>(null);
  const [paintMode, setPaintMode] = useState(false);
  const [exitPosition, setExitPosition] = useState({ x: 0, y: 0 });
  const paletteRef = useRef<HTMLDivElement>(null);
  const [palettePosition, setPalettePosition] = useState({ left: 0, top: 0 });
  const [count, setCount] = useState(0);
  const strokesRef = useRef<Stroke[]>([]);
  const gestureRef = useRef<{
    id: number;
    offset: PaintPoint;
    points: PaintPoint[];
    endpoint?: PaintPoint;
    el?: HTMLDivElement;
    color: string;
    scroll: string;
  } | null>(null);
  const brushRef = useRef<HTMLButtonElement>(null);
  const latestRef = useRef({ getSession, options, isPlaying });
  useEffect(() => {
    latestRef.current = { getSession, options, isPlaying };
  }, [getSession, options, isPlaying]);
  const detach = (stroke: Stroke) => {
    stroke.release?.();
    stroke.el.onpointerdown = null;
    if (stroke.pair && stroke.engine) {
      Matter.Composite.remove(stroke.engine.world, stroke.pair.body);
      stroke.pair = undefined;
    }
  };
  useEffect(() => {
    const ownedStrokes = strokesRef.current;
    bridgeRef.current = {
      resume: () => addBodies(),
      reset: () => {
        const gesture = gestureRef.current;
        if (gesture) {
          gestureRef.current = null;
          gesture.el?.remove();
          document.documentElement.style.overflow = gesture.scroll;
        }
        setPaintMode(false);
        for (const stroke of strokesRef.current) {
          detach(stroke);
          stroke.el.remove();
        }
        strokesRef.current.length = 0;
        setCount(0);
      },
    };
    return () => {
      bridgeRef.current = null;
      for (const stroke of ownedStrokes) {
        detach(stroke);
        stroke.el.remove();
      }
      if (gestureRef.current) {
        gestureRef.current.el?.remove();
        document.documentElement.style.overflow = gestureRef.current.scroll;
      }
    };
  }, [bridgeRef]);
  useEffect(() => {
    if (!paintMode) return;
    const palette = paletteRef.current;
    if (!palette) return;
    const align = () => {
      const rect = palette.getBoundingClientRect();
      const toolbarRect = palette
        .closest<HTMLElement>("[data-paint-toolbar]")
        ?.getBoundingClientRect();
      setExitPosition({
        x: toolbarRect
          ? toolbarRect.left + toolbarRect.width / 2
          : rect.left + rect.width / 2,
        y: rect.bottom + 8,
      });
      setPalettePosition({ left: rect.left, top: rect.top });
    };
    align();
    const observer = new ResizeObserver(align);
    observer.observe(palette.closest("[data-paint-toolbar]") ?? palette);
    window.addEventListener("resize", align);
    window.addEventListener("scroll", align, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", align);
      window.removeEventListener("scroll", align, true);
    };
  }, [paintMode]);
  const finishOnLeave = useEffectEvent(() => commitGesture());
  useEffect(() => {
    if (!paintMode) return;
    function leave() {
      finishOnLeave();
      setPaintMode(false);
      trackHomeInteraction("paint_exit");
    }
    function key(event: KeyboardEvent) {
      if (event.key === "Escape") leave();
    }
    window.addEventListener("keydown", key);
    window.addEventListener("blur", leave);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("blur", leave);
    };
  }, [paintMode]);
  function addBodies() {
    const session = latestRef.current.getSession();
    for (const stroke of strokesRef.current) {
      if (stroke.pair) continue;
      const body = createPaintBody(stroke.points, latestRef.current.options());
      // Rendering uses the same original coordinates as the compound's parts.
      const center = { ...body.position };
      const pair: PaintPair = {
        body,
        el: stroke.el,
        width: 0,
        height: 0,
        offset: { x: -center.x, y: -center.y },
        drawing: true,
      };
      session.pairs.push(pair);
      Matter.Composite.add(session.engine.world, body);
      stroke.pair = pair;
      stroke.engine = session.engine;
      stroke.el.querySelector("path")!.style.pointerEvents = "stroke";
      stroke.el.onpointerdown = (event) => {
        if (!event.isPrimary || event.button !== 0 || gestureRef.current)
          return;
        event.preventDefault();
        event.stopPropagation();
        const point = { x: event.clientX, y: event.clientY };
        const dx = point.x - body.position.x,
          dy = point.y - body.position.y;
        const constraint = Matter.Constraint.create({
          bodyB: body,
          pointB: { x: dx, y: dy },
          pointA: point,
          length: 0,
          stiffness: session.mouseConstraint.constraint.stiffness,
          damping: 0.15,
        });
        trackHomeInteraction("physics_grab", {
          target: "drawing",
          input: event.pointerType,
        });
        body.plugin.paintDragging = true;
        Matter.Sleeping.set(body, false);
        Matter.Composite.add(session.engine.world, constraint);
        const pointerId = event.pointerId;
        const scroll = document.documentElement.style.overflow;
        document.documentElement.style.overflow = "hidden";
        const move = (e: PointerEvent) => {
          if (e.pointerId === pointerId) {
            e.preventDefault();
            constraint.pointA = { x: e.clientX, y: e.clientY };
            Matter.Sleeping.set(body, false);
          }
        };
        const release = (e?: PointerEvent) => {
          if (e && e.pointerId !== pointerId) return;
          body.plugin.paintDragging = false;
          Matter.Composite.remove(session.engine.world, constraint);
          document.documentElement.style.overflow = scroll;
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", release);
          window.removeEventListener("pointercancel", release);
          stroke.release = undefined;
        };
        stroke.release = release;
        window.addEventListener("pointermove", move, { passive: false });
        window.addEventListener("pointerup", release);
        window.addEventListener("pointercancel", release);
      };
    }
  }
  function removeLast() {
    const removed = strokesRef.current.splice(-1);
    for (const stroke of removed) {
      if (stroke.pair) {
        const session = latestRef.current.getSession();
        const index = session.pairs.indexOf(stroke.pair);
        if (index >= 0) session.pairs.splice(index, 1);
        if (session.mouseConstraint.body === stroke.pair.body) {
          session.mouseConstraint.constraint.bodyB = null;
        }
      }
      detach(stroke);
      stroke.el.remove();
    }
    setCount(strokesRef.current.length);
  }
  function pointAt(x: number, y: number) {
    const b = bounds();
    if (x < b.left + 6 || x > b.right - 6 || y < b.top + 6 || y > b.bottom - 6)
      return false;
    return true;
  }
  function move(e: ReactPointerEvent<HTMLElement>) {
    const g = gestureRef.current;
    if (!g || e.pointerId !== g.id) return;
    e.preventDefault();
    const point = {
      x: e.clientX - g.offset.x + 4.675,
      y: e.clientY - g.offset.y + 37.675,
    };
    const previous = g.points.at(-1);
    // Keep the live preview continuous across fast touch events. The old
    // pointAt checks dropped the entire segment when any interpolated point
    // crossed a toolbar/control edge, even though the pointer kept moving.
    const steps = previous
      ? Math.ceil(Math.hypot(point.x - previous.x, point.y - previous.y) / 3)
      : 1;
    const samples: PaintPoint[] = [];
    for (let i = 1; i <= steps; i++) {
      const sample = previous
        ? {
            x: previous.x + ((point.x - previous.x) * i) / steps,
            y: previous.y + ((point.y - previous.y) * i) / steps,
          }
        : point;
      if (pointAt(sample.x, sample.y)) samples.push(sample);
    }
    if (!previous && !samples.length) samples.push(point);
    for (const sample of samples) samplePaintPoint(g.points, sample);
    g.endpoint = point;
    const preview = [...g.points, point];
    if (!g.el) g.el = renderStroke(preview, g.color);
    else updatePath(g.el, preview);
  }
  function finish(e: ReactPointerEvent<HTMLElement>) {
    if (gestureRef.current?.id !== e.pointerId) return;
    // A fast release can arrive before the final pointermove.
    if (e.type === "pointerup") move(e);
    commitGesture();
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  }
  function commitGesture() {
    const g = gestureRef.current;
    if (!g) return;
    gestureRef.current = null;
    document.documentElement.style.overflow = g.scroll;
    if (!g.el || !g.points.length) return;
    if (g.endpoint && g.points.at(-1) !== g.endpoint) g.points.push(g.endpoint);
    updatePath(g.el, g.points);
    trackHomeInteraction("paint_stroke", {
      color: g.color,
      point_count: g.points.length,
      playing: latestRef.current.isPlaying,
    });
    usage.increment("brush_strokes");
    usage.color(color);
    strokesRef.current.push({ points: g.points, el: g.el });
    setCount(strokesRef.current.length);
    if (latestRef.current.isPlaying) addBodies();
  }
  const brushButton = (
    <button
      ref={brushRef}
      type="button"
      data-analytics-gesture="paint_brush"
      data-paint-brush
      aria-label={t("brush")}
      title={t("hint")}
      className="pointer-events-auto touch-none cursor-pointer rounded-lg focus-visible:outline-2 focus-visible:outline-ring"
      style={{
        width: 44,
        height: 44,
        visibility: paintMode ? "hidden" : "visible",
      }}
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setPosition({
          x: e.detail ? e.clientX - 4.675 : rect.left,
          y: e.detail ? e.clientY - 37.675 : rect.top,
        });
        setPaintMode(true);
        trackHomeInteraction("paint_grab", { color });
      }}
    >
      <PaintBrush color={token(color)} />
    </button>
  );
  const palette = (
    <div
      data-paint-controls
      role="group"
      aria-label={t("palette")}
      className="flex gap-1 rounded-full border bg-background p-1"
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => {
        if (paintMode)
          setPosition({ x: e.clientX - 4.675, y: e.clientY - 37.675 });
      }}
    >
      {COLORS.map((c) => (
        <button
          key={c}
          type="button"
          data-analytics-action="paint_color"
          data-analytics-value={c}
          aria-label={t(c)}
          aria-pressed={color === c}
          onClick={() => setColor(c)}
          className="size-7 sm:size-8 rounded-full p-1 focus-visible:outline-2 focus-visible:outline-ring"
          style={{
            outline: color === c ? "2px solid var(--foreground)" : undefined,
            outlineOffset: -2,
          }}
        >
          <span
            className="block size-full rounded-full border border-foreground/15"
            style={{ background: token(c) }}
          />
        </button>
      ))}
    </div>
  );
  return (
    <div className="paint-original-theme pointer-events-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
      <div className="size-11 shrink-0">{brushButton}</div>
      {paintMode && position
        ? createPortal(
            <div
              data-paint-mode
              data-analytics-gesture="paint_mode"
              className="paint-original-theme fixed inset-0 z-[45] touch-none cursor-none"
              onContextMenu={(e) => e.preventDefault()}
              onPointerMove={(e) => {
                setPosition({ x: e.clientX - 4.675, y: e.clientY - 37.675 });
                move(e);
              }}
              onPointerDown={(e) => {
                if (!e.isPrimary) return;
                e.preventDefault();
                e.stopPropagation();
                if (e.pointerType === "mouse" && e.button === 2) {
                  const preventMenu = (event: Event) => event.preventDefault();
                  document.addEventListener("contextmenu", preventMenu, {
                    capture: true,
                    once: true,
                  });
                  window.setTimeout(
                    () =>
                      document.removeEventListener(
                        "contextmenu",
                        preventMenu,
                        true,
                      ),
                    1000,
                  );
                  if (gestureRef.current) finish(e);
                  setPaintMode(false);
                  trackHomeInteraction("paint_exit");
                  return;
                }
                if (
                  gestureRef.current ||
                  (e.pointerType === "mouse" && e.button !== 0)
                )
                  return;
                gestureRef.current = {
                  id: e.pointerId,
                  offset: { x: 4.675, y: 37.675 },
                  points: [],
                  color,
                  scroll: document.documentElement.style.overflow,
                };
                document.documentElement.style.overflow = "hidden";
                e.currentTarget.setPointerCapture(e.pointerId);
                move(e);
              }}
              onPointerUp={(e) => finish(e)}
              onPointerCancel={(e) => finish(e)}
              onLostPointerCapture={(e) => finish(e)}
            >
              {createPortal(
                <div
                  data-paint-cursor
                  className="paint-original-theme pointer-events-none fixed z-[47]"
                  style={{ left: position.x, top: position.y }}
                >
                  <PaintBrush color={token(color)} />
                </div>,
                document.body,
              )}
              <Button
                type="button"
                variant="primary"
                className="fixed -translate-x-1/2 cursor-pointer whitespace-nowrap"
                style={{ left: exitPosition.x, top: exitPosition.y }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => {
                  setPaintMode(false);
                  trackHomeInteraction("paint_exit");
                }}
              >
                {t("exit")}
              </Button>
            </div>,
            document.body,
          )
        : null}
      <div ref={paletteRef} className="relative shrink-0">
        <div
          style={{ visibility: paintMode ? "hidden" : "visible" }}
          inert={paintMode}
        >
          {paintMode ? (
            <div className="h-[38px] w-[166px] sm:h-[42px] sm:w-[186px]" />
          ) : (
            palette
          )}
        </div>
        {paintMode
          ? createPortal(
              <div
                className="paint-original-theme fixed z-[46] cursor-none"
                style={palettePosition}
              >
                {palette}
              </div>,
              document.body,
            )
          : null}
      </div>
      <div data-paint-controls className="flex gap-1">
        <Button
          size="icon"
          variant="outline"
          className="size-10 shrink-0"
          disabled={!count}
          aria-label={t("undo")}
          title={t("undo")}
          data-analytics-action="paint_undo"
          onClick={() => removeLast()}
        >
          <Undo2 aria-hidden="true" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          className="size-10 shrink-0"
          disabled={!count && !isPlaying}
          aria-label={t("clear")}
          title={t("clear")}
          data-analytics-action="paint_clear"
          onClick={onClear}
        >
          <BrushCleaning aria-hidden="true" />
        </Button>
      </div>
      <span className="sr-only" aria-live="polite">
        {t("count", { count })}
      </span>
    </div>
  );
}
