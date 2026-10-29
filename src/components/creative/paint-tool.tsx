"use client";
import {
  useEffect,
  useRef,
  useState,
  type RefObject,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Matter from "matter-js";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
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
  el.className = "pointer-events-none fixed left-0 top-0 z-[6]";
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
  document.body.append(el);
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
  isPlaying,
  getSession,
  bounds,
  options,
}: {
  bridgeRef: RefObject<PaintBridge | null>;
  isPlaying: boolean;
  getSession: () => PaintSession;
  bounds: () => { left: number; right: number; top: number; bottom: number };
  options: () => Matter.IChamferableBodyDefinition;
}) {
  const t = useTranslations("home.paint");
  const [color, setColor] = useState<string>("primary");
  const [position, setPosition] = useState<PaintPoint | null>(null);
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
    const fit = () =>
      setPosition((p) =>
        p
          ? {
              x: Math.max(0, Math.min(p.x, window.innerWidth - 80)),
              y: Math.max(0, Math.min(p.y, window.innerHeight - 80)),
            }
          : p,
      );
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
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
  function removeLast(all = false) {
    const removed = all
      ? strokesRef.current.splice(0)
      : strokesRef.current.splice(-1);
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
    return !Array.from(
      document.querySelectorAll<HTMLElement>(
        'button, input, [role="dialog"], [data-paint-controls]',
      ),
    ).some((el) => {
      if (el === brushRef.current || el.closest("[data-paint-brush]"))
        return false;
      const r = el.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    });
  }
  function move(e: ReactPointerEvent<HTMLButtonElement>) {
    const g = gestureRef.current;
    if (!g || e.pointerId !== g.id) return;
    e.preventDefault();
    const x = Math.max(
      0,
      Math.min(window.innerWidth - 80, e.clientX - g.offset.x),
    );
    const y = Math.max(
      0,
      Math.min(window.innerHeight - 80, e.clientY - g.offset.y),
    );
    const point = { x: x + 8.5, y: y + 68.5 };
    if (!pointAt(point.x, point.y)) return;
    const previous = g.points.at(-1);
    if (previous) {
      const steps = Math.ceil(
        Math.hypot(point.x - previous.x, point.y - previous.y) / 3,
      );
      for (let i = 1; i < steps; i++) {
        if (
          !pointAt(
            previous.x + ((point.x - previous.x) * i) / steps,
            previous.y + ((point.y - previous.y) * i) / steps,
          )
        )
          return;
      }
    }
    setPosition({ x, y });
    samplePaintPoint(g.points, point);
    g.endpoint = point;
    const preview = g.points.at(-1) === point ? g.points : [...g.points, point];
    if (!g.el) g.el = renderStroke(preview, g.color);
    else updatePath(g.el, preview);
  }
  function finish(e: ReactPointerEvent<HTMLButtonElement>, cancel = false) {
    const g = gestureRef.current;
    if (!g || g.id !== e.pointerId) return;
    gestureRef.current = null;
    document.documentElement.style.overflow = g.scroll;
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    if (cancel) {
      g.el?.remove();
      return;
    }
    if (!g.el || !g.points.length) return;
    if (g.endpoint && g.points.at(-1) !== g.endpoint) g.points.push(g.endpoint);
    updatePath(g.el, g.points);
    strokesRef.current.push({ points: g.points, el: g.el });
    setCount(strokesRef.current.length);
    if (latestRef.current.isPlaying) addBodies();
  }
  const brushButton = (
    <button
      ref={brushRef}
      type="button"
      data-paint-brush
      aria-label={t("brush")}
      title={t("hint")}
      className="pointer-events-auto touch-none cursor-grab active:cursor-grabbing rounded-lg focus-visible:outline-2 focus-visible:outline-ring"
      style={
        position
          ? { position: "fixed", left: position.x, top: position.y, zIndex: 40 }
          : { width: 80, height: 80 }
      }
      onPointerDown={(e) => {
        if (gestureRef.current || !e.isPrimary || e.button !== 0) return;
        e.preventDefault();
        const r = e.currentTarget.getBoundingClientRect();
        gestureRef.current = {
          id: e.pointerId,
          offset: { x: e.clientX - r.left, y: e.clientY - r.top },
          points: [],
          color,
          scroll: document.documentElement.style.overflow,
        };
        document.documentElement.style.overflow = "hidden";
        e.currentTarget.setPointerCapture(e.pointerId);
        move(e);
      }}
      onPointerMove={move}
      onPointerUp={(e) => finish(e)}
      onPointerCancel={(e) => finish(e, true)}
      onLostPointerCapture={(e) => finish(e, true)}
    >
      <PaintBrush />
    </button>
  );
  return (
    <div className="pointer-events-auto relative z-[40] flex flex-col items-center gap-2">
      <div className="h-20 w-20">{brushButton}</div>
      <div className="fixed right-4 top-[max(1rem,env(safe-area-inset-top))] z-40 flex flex-col items-center gap-1">
        <div
          data-paint-controls
          role="group"
          aria-label={t("palette")}
          className="flex gap-1 rounded-full border bg-background p-1"
        >
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={t(c)}
              aria-pressed={color === c}
              onClick={() => setColor(c)}
              className="size-8 rounded-full p-1 focus-visible:outline-2 focus-visible:outline-ring"
              style={{
                outline:
                  color === c ? "2px solid var(--foreground)" : undefined,
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
        <div data-paint-controls className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            disabled={!count}
            onClick={() => removeLast()}
          >
            {t("undo")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={!count}
            onClick={() => removeLast(true)}
          >
            {t("clear")}
          </Button>
        </div>
      </div>
      <span className="sr-only" aria-live="polite">
        {t("count", { count })}
      </span>
    </div>
  );
}
