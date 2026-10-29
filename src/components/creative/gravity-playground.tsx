"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import Matter from "matter-js";
import { trackHomeInteraction } from "@/lib/analytics/home-events";
import { useTranslations } from "next-intl";
import { setAvatarWink } from "@/components/creative/gaze-avatar";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";

import { PaintTool, type PaintBridge } from "./paint-tool";

const GravityActiveContext = createContext(false);

export function useGravityActive() {
  return useContext(GravityActiveContext);
}

/** Sidebar width transition is duration-200 — wait before measuring chips. */
const SIDEBAR_COLLAPSE_MS = 220;

/** Match Button default horizontal padding (px-2.5 ≈ 10px). */
const CHIP_PAD_PX = 10;
/** Compact chips (e.g. intro words): smaller type + tighter pad. */
const CHIP_COMPACT_PAD_PX = 6;
const CHIP_COMPACT_FONT_PX = 12;
const WALL_THICKNESS = 80;
type PhysicsTuning = {
  gravity: number;
  /** Degrees: 0 = down, 90 = right, 180 = up, 270 = left. */
  gravityAngle: number;
  restitution: number;
  friction: number;
  frictionAir: number;
  grabStiffness: number;
};

const DEFAULT_TUNING: PhysicsTuning = {
  gravity: 1.35,
  gravityAngle: 0,
  restitution: 0.08,
  friction: 0.6,
  frictionAir: 0.035,
  grabStiffness: 0.2,
};

const RANGE_CLASS =
  "h-6 w-full min-w-0 flex-1 cursor-pointer appearance-none border-0 bg-transparent accent-accent outline-none touch-manipulation [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-muted [&::-webkit-slider-thumb]:-mt-1.5 [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-accent [&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-muted [&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-accent";

function gravityVector(tuning: PhysicsTuning): { x: number; y: number } {
  const g = tuning.gravity;
  const rad = (tuning.gravityAngle * Math.PI) / 180;
  return {
    x: Math.sin(rad) * g,
    y: Math.cos(rad) * g,
  };
}

type PhysicsPair = {
  body: Matter.Body;
  el: HTMLElement;
  width: number;
  height: number;
  visualScale?: number;
  offset?: { x: number; y: number };
  silhouette?: Matter.Body[];
  drawing?: boolean;
};

type SpawnTarget = {
  source: HTMLElement;
  /** Content box used for spawn position (hug / line rect) */
  anchor: DOMRect;
  /** When set, spawn a text chip with this string instead of cloning */
  lineText?: string;
};

type Walls = {
  ground: Matter.Body;
  ceiling: Matter.Body;
  left: Matter.Body;
  right: Matter.Body;
};

type PlaySnapshot = {
  className: string;
  text: string;
  width: number;
  height: number;
  cx: number;
  cy: number;
};

type Session = {
  engine: Matter.Engine;
  runner: Matter.Runner;
  mouseConstraint: Matter.MouseConstraint;
  mouseEl: HTMLElement;
  layerEl: HTMLElement;
  pairs: PhysicsPair[];
  sources: HTMLElement[];
  walls: Walls;
  raf: number;
  onAfterUpdate: () => void;
  onCollision: (event: Matter.IEventCollision<Matter.Engine>) => void;
};

function neutralizeClone(root: HTMLElement) {
  root.querySelectorAll("a, button").forEach((node) => {
    const el = node as HTMLElement;
    el.removeAttribute("href");
    el.removeAttribute("tabindex");
    el.setAttribute("aria-hidden", "true");
    el.style.pointerEvents = "none";
    el.style.cursor = "inherit";
  });
  root.style.pointerEvents = "none";
  root.style.userSelect = "none";
  root.style.cursor = "inherit";
}

/** Avoid duplicating nested physics chips inside an exact parent clone (e.g. BrowserWindow). */
function stripNestedPhysicsItems(clone: HTMLElement) {
  clone.querySelectorAll("[data-physics-item]").forEach((node) => {
    node.remove();
  });
}

/** Bounding box that hugs rendered content (not a stretched block box). */
function getHugRect(el: HTMLElement): DOMRect {
  const range = document.createRange();
  range.selectNodeContents(el);
  const rects = Array.from(range.getClientRects()).filter(
    (r) => r.width > 0 || r.height > 0,
  );
  if (rects.length === 0) {
    return el.getBoundingClientRect();
  }
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const r of rects) {
    left = Math.min(left, r.left);
    top = Math.min(top, r.top);
    right = Math.max(right, r.right);
    bottom = Math.max(bottom, r.bottom);
  }
  return new DOMRect(
    left,
    top,
    Math.max(right - left, 8),
    Math.max(bottom - top, 8),
  );
}

/** Group character boxes into visual lines (for wrap-aware physics chips). */
function getTextLines(el: HTMLElement): { text: string; rect: DOMRect }[] {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const textNode = walker.nextNode();
  if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
    return [{ text: (el.textContent ?? "").trim(), rect: getHugRect(el) }];
  }

  const full = textNode.textContent ?? "";
  if (!full) {
    return [{ text: "", rect: getHugRect(el) }];
  }

  const range = document.createRange();
  type Acc = {
    text: string;
    top: number;
    left: number;
    right: number;
    bottom: number;
  };
  const lines: Acc[] = [];

  for (let i = 0; i < full.length; i++) {
    range.setStart(textNode, i);
    range.setEnd(textNode, i + 1);
    const r = range.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;

    const last = lines[lines.length - 1];
    if (!last || Math.abs(r.top - last.top) > 2) {
      lines.push({
        text: full[i]!,
        top: r.top,
        left: r.left,
        right: r.right,
        bottom: r.bottom,
      });
    } else {
      last.text += full[i]!;
      last.left = Math.min(last.left, r.left);
      last.right = Math.max(last.right, r.right);
      last.bottom = Math.max(last.bottom, r.bottom);
    }
  }

  return lines
    .map((l) => ({
      text: l.text.replace(/\s+$/g, ""),
      rect: new DOMRect(
        l.left,
        l.top,
        Math.max(l.right - l.left, 8),
        Math.max(l.bottom - l.top, 8),
      ),
    }))
    .filter((l) => l.text.length > 0);
}

function collectSpawnTargets(sources: HTMLElement[]): SpawnTarget[] {
  const targets: SpawnTarget[] = [];

  for (const source of sources) {
    const isButton = source.hasAttribute("data-physics-button");
    const isExact = source.hasAttribute("data-physics-exact");

    if (source.hasAttribute("data-physics-split-lines")) {
      const lines = getTextLines(source);
      if (lines.length === 0) {
        targets.push({ source, anchor: getHugRect(source) });
      } else {
        for (const line of lines) {
          targets.push({
            source,
            anchor: line.rect,
            lineText: line.text,
          });
        }
      }
      continue;
    }

    targets.push({
      source,
      anchor:
        isButton || isExact
          ? source.getBoundingClientRect()
          : getHugRect(source),
    });
  }

  return targets;
}

function applyTypography(el: HTMLElement, computed: CSSStyleDeclaration) {
  el.style.fontFamily = computed.fontFamily;
  el.style.fontSize = computed.fontSize;
  el.style.fontWeight = computed.fontWeight;
  el.style.fontStyle = computed.fontStyle;
  el.style.letterSpacing = computed.letterSpacing;
  el.style.lineHeight = computed.lineHeight;
  el.style.color = computed.color;
  el.style.textAlign = computed.textAlign;
}

/**
 * Build a chip, append it, measure, lock size.
 * Buttons: freeze the exact on-screen box (no padding reset — keeps accent shape).
 */
function spawnChipElement(
  target: SpawnTarget,
  layerEl: HTMLElement,
): ChipSpawn {
  const { source, anchor, lineText } = target;
  const isButton = source.hasAttribute("data-physics-button");
  const isExact = source.hasAttribute("data-physics-exact");
  const isAvatar = source.hasAttribute("data-avatar");
  const isCompact = source.hasAttribute("data-physics-compact");
  const chipPadPx = isCompact ? CHIP_COMPACT_PAD_PX : CHIP_PAD_PX;
  const computed = window.getComputedStyle(source);

  let el: HTMLElement;
  let width: number;
  let height: number;
  let cx: number;
  let cy: number;

  const pureText =
    lineText !== undefined ||
    (!isButton && !isExact && source.children.length === 0);

  if (isButton || isExact) {
    // Exact visual snapshot — never alter padding/radius (fixes Touche-moi morphing)
    const rect = source.getBoundingClientRect();
    width = Math.max(rect.width, 8);
    height = Math.max(rect.height, 8);
    cx = rect.left + width / 2;
    cy = rect.top + height / 2;

    el = source.cloneNode(true) as HTMLElement;
    neutralizeClone(el);
    if (isExact) {
      stripNestedPhysicsItems(el);
    }
    el.removeAttribute("data-physics-item");
    el.removeAttribute("data-physics-button");
    el.removeAttribute("data-physics-exact");
    el.removeAttribute("data-physics-circle");
    el.className = [source.className, "fixed z-[6] m-0"]
      .filter(Boolean)
      .join(" ");
    el.style.position = "fixed";
    el.style.left = "0";
    el.style.top = "0";
    el.style.margin = "0";
    el.style.boxSizing = "border-box";
    el.style.width = `${width}px`;
    el.style.height = `${height}px`;
    el.style.transition = "none";
    el.style.animation = "none";
    el.style.transform = "none";
    el.style.transformOrigin = "center center";
    el.style.willChange = "transform";
    el.style.pointerEvents = "none";
    el.style.visibility = "visible";
    el.setAttribute("aria-hidden", "true");
    layerEl.appendChild(el);
    return {
      el,
      width,
      height,
      cx,
      cy,

      silhouette: isAvatar
        ? avatarParts(source, width, height, cx, cy)
        : undefined,
    };
  }

  if (pureText) {
    el = document.createElement("span");
    el.textContent = lineText ?? source.textContent ?? "";
    el.className =
      "fixed z-[6] m-0 inline-flex items-center rounded-lg border border-border bg-card shadow-sm";
    applyTypography(el, computed);
    if (isCompact) {
      el.style.fontSize = `${CHIP_COMPACT_FONT_PX}px`;
      el.style.lineHeight = "1.25";
    }
    el.style.padding = `${chipPadPx}px`;
    el.style.whiteSpace = "nowrap";
  } else {
    el = source.cloneNode(true) as HTMLElement;
    neutralizeClone(el);
    el.removeAttribute("data-physics-item");
    el.removeAttribute("data-physics-split-lines");
    el.removeAttribute("data-physics-compact");
    el.className = [
      source.className,
      "fixed z-[6] m-0 inline-flex items-center border border-border bg-card shadow-sm",
    ]
      .filter(Boolean)
      .join(" ");
    applyTypography(el, computed);
    if (isCompact) {
      el.style.fontSize = `${CHIP_COMPACT_FONT_PX}px`;
      el.style.lineHeight = "1.25";
    }
    el.style.padding = `${chipPadPx}px`;
    el.style.whiteSpace = "nowrap";
    el.style.display = "inline-flex";
    el.style.alignItems = "center";
    el.style.gap = computed.gap || "0.375rem";
  }

  el.style.position = "fixed";
  el.style.left = "0";
  el.style.top = "0";
  el.style.margin = "0";
  el.style.boxSizing = "border-box";
  el.style.width = "max-content";
  el.style.height = "auto";
  el.style.maxWidth = "none";
  el.style.transformOrigin = "center center";
  el.style.willChange = "transform";
  el.style.pointerEvents = "none";
  el.style.visibility = "visible";
  el.setAttribute("aria-hidden", "true");

  layerEl.appendChild(el);
  const box = el.getBoundingClientRect();
  width = Math.max(box.width, 8);
  height = Math.max(box.height, 8);
  el.style.width = `${width}px`;
  el.style.height = `${height}px`;
  el.style.flexShrink = "0";

  cx = anchor.left + anchor.width / 2;
  cy = anchor.top + anchor.height / 2;

  return {
    el,
    width,
    height,
    cx,
    cy,

    silhouette: isAvatar
      ? avatarParts(source, width, height, cx, cy)
      : undefined,
  };
}

/** Rebuild Touche-moi from a pre-click snapshot (exact look + box). */
function spawnPlaySnapshot(
  snapshot: PlaySnapshot,
  layerEl: HTMLElement,
): ChipSpawn {
  const el = document.createElement("button");
  el.type = "button";
  el.textContent = snapshot.text;
  el.className = [snapshot.className, "fixed z-[6] m-0"]
    .filter(Boolean)
    .join(" ");
  el.style.position = "fixed";
  el.style.left = "0";
  el.style.top = "0";
  el.style.margin = "0";
  el.style.boxSizing = "border-box";
  el.style.width = `${snapshot.width}px`;
  el.style.height = `${snapshot.height}px`;
  el.style.transition = "none";
  el.style.animation = "none";
  el.style.transform = "none";
  el.style.transformOrigin = "center center";
  el.style.willChange = "transform";
  el.style.pointerEvents = "none";
  el.style.visibility = "visible";
  el.setAttribute("aria-hidden", "true");
  el.tabIndex = -1;
  layerEl.appendChild(el);
  return {
    el,
    width: snapshot.width,
    height: snapshot.height,
    cx: snapshot.cx,
    cy: snapshot.cy,
  };
}

type ChipSpawn = {
  el: HTMLElement;
  width: number;
  height: number;
  cx: number;
  cy: number;
  visualScale?: number;
  offset?: { x: number; y: number };
  silhouette?: Matter.Body[];
};

/** Sample the visible SVG alpha into thin, non-overlapping collision strips. */
function avatarParts(
  source: HTMLElement,
  width: number,
  height: number,
  cx: number,
  cy: number,
) {
  const images = Array.from(source.querySelectorAll("img"));
  const image = images.sort(
    (a, b) =>
      Number(getComputedStyle(b).opacity) - Number(getComputedStyle(a).opacity),
  )[0];
  if (!image?.complete || !image.naturalWidth) return undefined;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width);
  canvas.height = Math.ceil(height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return undefined;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const parts: Matter.Body[] = [];
  for (let y = 0; y < canvas.height; y += 2) {
    let left = canvas.width,
      right = -1;
    for (let row = y; row < Math.min(y + 2, canvas.height); row++) {
      for (let x = 0; x < canvas.width; x++) {
        if (data[(row * canvas.width + x) * 4 + 3]! > 127) {
          left = Math.min(left, x);
          right = Math.max(right, x);
        }
      }
    }
    if (right >= left)
      parts.push(
        Matter.Bodies.rectangle(
          cx - width / 2 + (left + right + 1) / 2,
          cy - height / 2 + y + 1,
          right - left + 1,
          Math.min(2, canvas.height - y),
        ),
      );
  }
  return parts.length ? parts : undefined;
}

function bodyOptions(tuning: PhysicsTuning): Matter.IChamferableBodyDefinition {
  return {
    restitution: tuning.restitution,
    friction: tuning.friction,
    frictionStatic: 0.5,
    frictionAir: tuning.frictionAir,
    density: 0.004,
    slop: 0.05,
    sleepThreshold: 45,
  };
}

/** Rectangles for chips and a compound silhouette for the avatar. */
function addFallingBody(
  Bodies: typeof Matter.Bodies,
  Body: typeof Matter.Body,
  World: typeof Matter.World,
  engine: Matter.Engine,
  pairs: PhysicsPair[],
  chip: ChipSpawn,
  tuning: PhysicsTuning,
) {
  const { el, width, height, cx, cy, silhouette } = chip;
  const opts = bodyOptions(tuning);

  let body: Matter.Body;
  if (silhouette) {
    body = Body.create({ ...opts, parts: silhouette });
  } else {
    body = Bodies.rectangle(cx, cy, width, height, opts);
  }
  const offset = { x: cx - body.position.x, y: cy - body.position.y };

  // Mild random kick — same distribution for every body
  Body.setVelocity(body, {
    x: (Math.random() - 0.5) * 5,
    y: (Math.random() - 0.5) * 2,
  });
  Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.06);
  World.add(engine.world, body);
  pairs.push({ body, el, width, height, offset });
}

function playBounds() {
  const surface = document.querySelector<HTMLElement>(
    '[data-slot="sidebar-container"]',
  );
  const sidebar = surface?.getBoundingClientRect();
  const header = document.querySelector("header")?.getBoundingClientRect();
  const left = sidebar && sidebar.left <= 0 ? Math.max(0, sidebar.right) : 0;
  return {
    left: left + 8,
    top: Math.max(0, header?.bottom ?? 0) + 8,
    right: window.innerWidth - 8,
    bottom: window.innerHeight - 8,
  };
}

function createWalls(vw: number, vh: number): Walls {
  const wallOpts = { isStatic: true, render: { visible: false } };
  const t = WALL_THICKNESS;
  const bounds = playBounds();
  return {
    ground: Matter.Bodies.rectangle(
      vw / 2,
      bounds.bottom + t / 2,
      vw + t * 2,
      t,
      wallOpts,
    ),
    ceiling: Matter.Bodies.rectangle(
      vw / 2,
      bounds.top - t / 2,
      vw + t * 2,
      t,
      wallOpts,
    ),
    left: Matter.Bodies.rectangle(
      bounds.left - t / 2,
      vh / 2,
      t,
      vh * 2,
      wallOpts,
    ),
    right: Matter.Bodies.rectangle(
      bounds.right + t / 2,
      vh / 2,
      t,
      vh * 2,
      wallOpts,
    ),
  };
}

function replaceWalls(session: Session, vw: number, vh: number) {
  Matter.World.remove(session.engine.world, [
    session.walls.ground,
    session.walls.ceiling,
    session.walls.left,
    session.walls.right,
  ]);
  session.walls = createWalls(vw, vh);
  Matter.World.add(session.engine.world, [
    session.walls.ground,
    session.walls.ceiling,
    session.walls.left,
    session.walls.right,
  ]);
}

function clampBodiesToViewport(pairs: PhysicsPair[]) {
  const bounds = playBounds();
  for (const pair of pairs) {
    const { body } = pair;
    // Fit the full diagonal so rotation cannot make a large chip exceed the arena.
    const available = Math.min(
      bounds.right - bounds.left,
      bounds.bottom - bounds.top,
    );
    const diagonal = Math.hypot(pair.width, pair.height);
    if (diagonal > available && !pair.drawing) {
      const scale = available / diagonal;
      Matter.Body.scale(body, scale, scale);
      pair.width *= scale;
      pair.height *= scale;
      if (pair.offset) {
        pair.offset.x *= scale;
        pair.offset.y *= scale;
      }
      pair.visualScale = (pair.visualScale ?? 1) * scale;
    }
    const { min, max } = body.bounds;
    const dx =
      min.x < bounds.left
        ? bounds.left - min.x
        : max.x > bounds.right
          ? bounds.right - max.x
          : 0;
    const dy =
      min.y < bounds.top
        ? bounds.top - min.y
        : max.y > bounds.bottom
          ? bounds.bottom - max.y
          : 0;
    if (dx || dy) {
      Matter.Body.translate(body, { x: dx, y: dy });
      Matter.Body.setVelocity(body, {
        x: dx ? 0 : body.velocity.x,
        y: dy ? 0 : body.velocity.y,
      });
    }
  }
}

type TuningSliderKey = keyof PhysicsTuning;

const TUNING_SLIDERS: {
  key: TuningSliderKey;
  labelKey:
    | "gravityTuneAngle"
    | "gravityTuneGravity"
    | "gravityTuneBounce"
    | "gravityTuneFriction"
    | "gravityTuneAir"
    | "gravityTuneGrab";
  min: number;
  max: number;
  step: number;
}[] = [
  {
    key: "gravityAngle",
    labelKey: "gravityTuneAngle",
    min: 0,
    max: 360,
    step: 1,
  },
  {
    key: "gravity",
    labelKey: "gravityTuneGravity",
    min: 0.2,
    max: 2.8,
    step: 0.05,
  },
];

function formatTuningValue(key: TuningSliderKey, value: number): string {
  if (key === "gravityAngle") return `${Math.round(value)}°`;
  if (key === "frictionAir") return value.toFixed(3);
  if (key === "gravity" || key === "restitution" || key === "grabStiffness") {
    return value.toFixed(2);
  }
  return value.toFixed(2);
}

function applyTuningToSession(session: Session, tuning: PhysicsTuning) {
  const { x, y } = gravityVector(tuning);
  session.engine.gravity.x = x;
  session.engine.gravity.y = y;
  for (const { body } of session.pairs) {
    Matter.Sleeping.set(body, false);
    body.restitution = tuning.restitution;
    body.friction = tuning.friction;
    body.frictionAir = tuning.frictionAir;
  }
  session.mouseConstraint.constraint.stiffness = tuning.grabStiffness;
}

export function GravityPlayground({ children }: { children: React.ReactNode }) {
  const t = useTranslations("home");
  const { open, setOpen, isMobile, openMobile, setOpenMobile, state } =
    useSidebar();
  const rootRef = useRef<HTMLDivElement>(null);
  const playButtonRef = useRef<HTMLButtonElement>(null);
  const playSnapshotRef = useRef<PlaySnapshot | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const paintBridge = useRef<PaintBridge | null>(null);
  const startTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tuningRef = useRef<PhysicsTuning>(DEFAULT_TUNING);
  const [active, setActive] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [impacts, setImpacts] = useState(0);
  const [tuning, setTuning] = useState<PhysicsTuning>(DEFAULT_TUNING);
  useEffect(() => {
    tuningRef.current = tuning;
  }, [tuning]);

  const teardown = useCallback(() => {
    if (startTimerRef.current !== null) {
      clearTimeout(startTimerRef.current);
      startTimerRef.current = null;
    }
    playSnapshotRef.current = null;
    paintBridge.current?.reset();
    const session = sessionRef.current;
    if (!session) {
      setActive(false);
      setConfigOpen(false);
      setTuning(DEFAULT_TUNING);
      return;
    }

    cancelAnimationFrame(session.raf);
    Matter.Events.off(session.engine, "collisionStart", session.onCollision);
    Matter.Events.off(session.engine, "afterUpdate", session.onAfterUpdate);
    Matter.Runner.stop(session.runner);
    Matter.World.remove(session.engine.world, session.mouseConstraint);
    Matter.World.clear(session.engine.world, false);
    Matter.Engine.clear(session.engine);
    session.mouseEl.remove();
    session.layerEl.remove();
    session.sources.forEach((el) => {
      el.style.visibility = "";
    });
    sessionRef.current = null;
    setImpacts(0);
    setTuning(DEFAULT_TUNING);
    setConfigOpen(false);
    setActive(false);
  }, []);

  const runPhysics = useCallback((drawingsOnly = false) => {
    const root = rootRef.current;
    const playSnapshot = playSnapshotRef.current;
    if (!root) return;
    const existing = sessionRef.current;
    if (existing) {
      if (!drawingsOnly && existing.sources.length === 0) {
        const sources = Array.from(
          root.querySelectorAll<HTMLElement>("[data-physics-item]"),
        );
        for (const target of collectSpawnTargets(sources)) {
          addFallingBody(
            Matter.Bodies,
            Matter.Body,
            Matter.World,
            existing.engine,
            existing.pairs,
            spawnChipElement(target, existing.layerEl),
            tuningRef.current,
          );
          target.source.style.visibility = "hidden";
          if (!existing.sources.includes(target.source))
            existing.sources.push(target.source);
        }
        if (playSnapshot)
          addFallingBody(
            Matter.Bodies,
            Matter.Body,
            Matter.World,
            existing.engine,
            existing.pairs,
            spawnPlaySnapshot(playSnapshot, existing.layerEl),
            tuningRef.current,
          );
        existing.mouseEl.style.pointerEvents = "auto";
      }
      return;
    }

    const sources = Array.from(
      root.querySelectorAll<HTMLElement>("[data-physics-item]"),
    ).filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    if (sources.length === 0 && !playSnapshot) return;

    const targets = drawingsOnly ? [] : collectSpawnTargets(sources);
    const {
      Engine,
      Bodies,
      World,
      Runner,
      Mouse,
      MouseConstraint,
      Body,
      Events,
    } = Matter;
    const tuningNow = tuningRef.current;

    const g0 = gravityVector(tuningNow);
    const engine = Engine.create({
      enableSleeping: true,
      gravity: { x: g0.x, y: g0.y, scale: 0.001 },
    });
    engine.positionIterations = 12;
    engine.velocityIterations = 10;
    engine.constraintIterations = 4;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const walls = createWalls(vw, vh);
    World.add(engine.world, [
      walls.ground,
      walls.ceiling,
      walls.left,
      walls.right,
    ]);

    const layerEl = document.createElement("div");
    layerEl.setAttribute("aria-hidden", "true");
    layerEl.className = "pointer-events-none fixed inset-0 z-[6]";
    document.body.appendChild(layerEl);

    const mouseEl = document.createElement("div");
    mouseEl.setAttribute("aria-hidden", "true");
    // Below HUD (z-[9]) so Reset + sliders stay clickable
    mouseEl.className = "fixed inset-0 z-[5]";
    // Prevent scroll/zoom from stealing touches while dragging chips
    mouseEl.style.touchAction = "none";
    if (drawingsOnly) mouseEl.style.pointerEvents = "none";
    mouseEl.style.userSelect = "none";
    document.body.appendChild(mouseEl);

    const pairs: PhysicsPair[] = [];
    const hiddenSources = new Set<HTMLElement>();

    if (playSnapshot && !drawingsOnly) {
      addFallingBody(
        Bodies,
        Body,
        World,
        engine,
        pairs,
        spawnPlaySnapshot(playSnapshot, layerEl),
        tuningNow,
      );
    }

    for (const target of targets) {
      addFallingBody(
        Bodies,
        Body,
        World,
        engine,
        pairs,
        spawnChipElement(target, layerEl),
        tuningNow,
      );
      hiddenSources.add(target.source);
    }

    hiddenSources.forEach((el) => {
      el.style.visibility = "hidden";
    });

    const mouse = Mouse.create(mouseEl);
    // CSS-pixel space matches getBoundingClientRect spawns
    mouse.pixelRatio = 1;
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse,
      constraint: {
        stiffness: tuningNow.grabStiffness,
        damping: 0.15,
        ...{ angularStiffness: 0 },
        render: { visible: false },
      },
    });
    World.add(engine.world, mouseConstraint);
    Events.on(mouseConstraint, "startdrag", () =>
      trackHomeInteraction("physics_grab", { target: "content" }),
    );

    const onCollision = (event: Matter.IEventCollision<Matter.Engine>) => {
      const hits = new Set<string>();
      for (const pair of event.pairs) {
        const a = pair.bodyA.parent,
          b = pair.bodyB.parent;
        const relativeSpeed = Math.hypot(
          a.velocity.x - b.velocity.x,
          a.velocity.y - b.velocity.y,
        );
        if (!a.isStatic && !b.isStatic && relativeSpeed > 1) {
          hits.add([a.id, b.id].sort((x, y) => x - y).join(":"));
        }
      }
      if (hits.size > 0) setImpacts((n) => n + hits.size);
    };
    Events.on(engine, "collisionStart", onCollision);

    const quietFrames = new Map<Matter.Body, number>();
    const onAfterUpdate = () => {
      clampBodiesToViewport(pairs);
      const touching = new Set<Matter.Body>();
      for (const contact of engine.pairs.list) {
        if (!contact.isActive) continue;
        touching.add(contact.bodyA.parent);
        touching.add(contact.bodyB.parent);
      }
      for (const { body } of pairs) {
        if (
          body.isSleeping ||
          mouseConstraint.body === body ||
          body.plugin.paintDragging
        ) {
          quietFrames.delete(body);
          continue;
        }
        const quiet =
          touching.has(body) && body.speed < 0.8 && body.angularSpeed < 0.025;
        const frames = quiet ? (quietFrames.get(body) ?? 0) + 1 : 0;
        quietFrames.set(body, frames);
        if (frames >= 20) {
          Matter.Body.setVelocity(body, { x: 0, y: 0 });
          Matter.Body.setAngularVelocity(body, 0);
          Matter.Sleeping.set(body, true);
        }
      }
    };
    Events.on(engine, "afterUpdate", onAfterUpdate);
    clampBodiesToViewport(pairs);
    const runner = Runner.create();
    Runner.run(runner, engine);

    const sync = () => {
      for (const {
        body,
        el,
        width,
        height,
        offset,
        visualScale = 1,
      } of pairs) {
        const cos = Math.cos(body.angle),
          sin = Math.sin(body.angle);
        const x =
          body.position.x + (offset?.x ?? 0) * cos - (offset?.y ?? 0) * sin;
        const y =
          body.position.y + (offset?.x ?? 0) * sin + (offset?.y ?? 0) * cos;
        el.style.transform = `translate(${x - width / visualScale / 2}px, ${y - height / visualScale / 2}px) rotate(${body.angle}rad) scale(${visualScale})`;
      }
      const session = sessionRef.current;
      if (session) {
        session.raf = requestAnimationFrame(sync);
      }
    };

    setImpacts(0);
    sessionRef.current = {
      engine,
      runner,
      mouseConstraint,
      mouseEl,
      layerEl,
      pairs,
      sources: Array.from(hiddenSources),
      walls,
      raf: requestAnimationFrame(sync),
      onCollision,
      onAfterUpdate,
    };
  }, []);

  const start = useCallback(() => {
    if (startTimerRef.current !== null || active) return;

    const playBtn = playButtonRef.current;
    if (!playBtn) return;

    // Snapshot before UI swaps to Reset (keeps exact accent look + spawn position)
    const rect = playBtn.getBoundingClientRect();
    playSnapshotRef.current = {
      className: playBtn.className,
      text: playBtn.textContent?.trim() ?? "",
      width: Math.max(rect.width, 8),
      height: Math.max(rect.height, 8),
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
    };

    // Show Reset + counter immediately
    setActive(true);

    const needsCollapse = isMobile ? openMobile : open;
    if (isMobile) {
      if (openMobile) setOpenMobile(false);
    } else if (open) {
      setOpen(false);
    }

    const launch = () => {
      startTimerRef.current = null;
      runPhysics();
      paintBridge.current?.resume();
    };

    if (needsCollapse) {
      startTimerRef.current = setTimeout(launch, SIDEBAR_COLLAPSE_MS);
      return;
    }

    // Let Reset paint, then spawn physics
    startTimerRef.current = setTimeout(launch, 0);
  }, [active, isMobile, open, openMobile, runPhysics, setOpen, setOpenMobile]);

  useEffect(() => {
    return () => {
      teardown();
    };
  }, [teardown]);

  useEffect(() => {
    const onResize = () => {
      const session = sessionRef.current;
      if (!session) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      replaceWalls(session, vw, vh);
      clampBodiesToViewport(session.pairs);
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const session = sessionRef.current;
    if (!session) return;
    applyTuningToSession(session, tuning);
  }, [active, tuning]);

  return (
    <GravityActiveContext.Provider value={active}>
      <div ref={rootRef} className="relative">
        {/* HUD in content column only — below sidebar (z-10), above physics (z-6). */}
        <div
          className="pointer-events-none fixed top-[calc(max(1rem,env(safe-area-inset-top))+6.5rem)] z-[9] flex flex-col items-center gap-1.5 end-0"
          style={
            isMobile
              ? { left: 0 }
              : {
                  left:
                    state === "collapsed"
                      ? "var(--sidebar-width-icon)"
                      : "var(--sidebar-width)",
                }
          }
        >
          {active ? (
            <>
              <div className="pointer-events-auto flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  data-analytics-action="gravity_reset"
                  onClick={teardown}
                >
                  {t("gravityReset")}
                </Button>
                <Button
                  type="button"
                  variant={configOpen ? "secondary" : "outline"}
                  size="sm"
                  aria-expanded={configOpen}
                  data-analytics-action="gravity_config"
                  aria-controls="gravity-tune-panel"
                  onClick={() => setConfigOpen((open) => !open)}
                >
                  {t("gravityConfig")}
                </Button>
              </div>
              <p
                className="text-xs tabular-nums text-muted-foreground"
                aria-live="polite"
              >
                {t("gravityImpacts", { count: impacts })}
              </p>
              {configOpen ? (
                <fieldset
                  id="gravity-tune-panel"
                  className="pointer-events-auto mt-1 w-[min(100%,16rem)] rounded-lg bg-background/70 px-2.5 py-2 backdrop-blur-sm"
                  aria-label={t("gravityTuneLabel")}
                >
                  <legend className="px-0.5 text-[11px] font-medium tracking-wide text-muted-foreground">
                    {t("gravityTuneLabel")}
                  </legend>
                  <div className="flex flex-col gap-1">
                    {TUNING_SLIDERS.map(({ key, labelKey, min, max, step }) => {
                      const id = `gravity-tune-${key}`;
                      const value = tuning[key];
                      return (
                        <div key={key} className="flex items-center gap-2">
                          <label
                            htmlFor={id}
                            className="w-14 shrink-0 text-[11px] text-muted-foreground"
                          >
                            {t(labelKey)}
                          </label>
                          <input
                            id={id}
                            data-analytics-action="gravity_tune"
                            data-analytics-value={key}
                            type="range"
                            min={min}
                            max={max}
                            step={step}
                            value={value}
                            aria-valuetext={formatTuningValue(key, value)}
                            className={RANGE_CLASS}
                            onChange={(event) => {
                              const next = Number(event.target.value);
                              setTuning((prev) => ({ ...prev, [key]: next }));
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </fieldset>
              ) : null}
            </>
          ) : (
            <Button
              data-analytics-action="gravity_play"
              ref={playButtonRef}
              type="button"
              variant="accent"
              size="sm"
              className="pointer-events-auto"
              onClick={() => {
                setAvatarWink(null);
                start();
              }}
              onMouseEnter={() => setAvatarWink("AD-clin")}
              onMouseLeave={() => setAvatarWink(null)}
            >
              {t("gravityPlay")}
            </Button>
          )}
        </div>
        <div
          data-paint-toolbar
          className="pointer-events-none fixed top-[max(1rem,env(safe-area-inset-top))] end-2 md:end-0 z-[11] flex justify-center"
          style={{
            left: isMobile
              ? "3.75rem"
              : state === "collapsed"
                ? "var(--sidebar-width-icon)"
                : "var(--sidebar-width)",
          }}
        >
          <PaintTool
            bridgeRef={paintBridge}
            isPlaying={active}
            bounds={playBounds}
            getSession={() => {
              runPhysics(true);
              return sessionRef.current!;
            }}
            options={() => bodyOptions(tuningRef.current)}
          />
        </div>
        {children}
      </div>
    </GravityActiveContext.Provider>
  );
}
