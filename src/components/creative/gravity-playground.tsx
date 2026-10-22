"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Matter from "matter-js";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

/** Match Button default horizontal padding (px-2.5 ≈ 10px). */
const CHIP_PAD_PX = 10;
const WALL_THICKNESS = 80;

type PhysicsPair = {
  body: Matter.Body;
  el: HTMLElement;
  width: number;
  height: number;
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
  left: Matter.Body;
  right: Matter.Body;
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
      anchor: isButton ? source.getBoundingClientRect() : getHugRect(source),
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
 * Build a chip, append it, let the browser measure hug+padding, then lock size.
 * CTA buttons skip extra padding (they already have button padding).
 */
function spawnChipElement(
  target: SpawnTarget,
  layerEl: HTMLElement,
): { el: HTMLElement; width: number; height: number; cx: number; cy: number } {
  const { source, anchor, lineText } = target;
  const isButton = source.hasAttribute("data-physics-button");
  const computed = window.getComputedStyle(source);

  let el: HTMLElement;

  const pureText =
    lineText !== undefined ||
    (!isButton && source.children.length === 0);

  if (isButton) {
    el = source.cloneNode(true) as HTMLElement;
    neutralizeClone(el);
    el.removeAttribute("data-physics-item");
    el.removeAttribute("data-physics-button");
    el.className = [
      source.className,
      "fixed z-[6] m-0 border border-border bg-card shadow-sm",
    ]
      .filter(Boolean)
      .join(" ");
    el.style.display = "inline-flex";
    el.style.padding = "0";
  } else if (pureText) {
    // Rebuild text chips (title, intro words, subtitle lines) for reliable typography + hug
    el = document.createElement("span");
    el.textContent = lineText ?? source.textContent ?? "";
    el.className =
      "fixed z-[6] m-0 inline-flex items-center rounded-lg border border-border bg-card shadow-sm";
    applyTypography(el, computed);
    el.style.padding = `${CHIP_PAD_PX}px`;
    el.style.whiteSpace = "nowrap";
  } else {
    // Status / platform links: keep logo + label, add chip chrome
    el = source.cloneNode(true) as HTMLElement;
    neutralizeClone(el);
    el.removeAttribute("data-physics-item");
    el.removeAttribute("data-physics-split-lines");
    el.className = [
      source.className,
      "fixed z-[6] m-0 inline-flex items-center border border-border bg-card shadow-sm",
    ]
      .filter(Boolean)
      .join(" ");
    applyTypography(el, computed);
    el.style.padding = `${CHIP_PAD_PX}px`;
    el.style.whiteSpace = "nowrap";
    el.style.display = "inline-flex";
    el.style.alignItems = "center";
    el.style.gap = computed.gap || "0.375rem";
  }

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

  // Measure after layout: hug content + padding + border
  layerEl.appendChild(el);
  const box = el.getBoundingClientRect();
  const width = Math.max(box.width, 8);
  const height = Math.max(box.height, 8);
  el.style.width = `${width}px`;
  el.style.height = `${height}px`;
  el.style.flexShrink = "0";

  const cx = anchor.left + anchor.width / 2;
  const cy = anchor.top + anchor.height / 2;

  return { el, width, height, cx, cy };
}

function createWalls(vw: number, vh: number): Walls {
  const wallOpts = { isStatic: true, render: { visible: false } };
  const t = WALL_THICKNESS;
  return {
    ground: Matter.Bodies.rectangle(
      vw / 2,
      vh + t / 2,
      vw + t * 2,
      t,
      wallOpts,
    ),
    left: Matter.Bodies.rectangle(-t / 2, vh / 2, t, vh * 2, wallOpts),
    right: Matter.Bodies.rectangle(vw + t / 2, vh / 2, t, vh * 2, wallOpts),
  };
}

function replaceWalls(session: Session, vw: number, vh: number) {
  Matter.World.remove(session.engine.world, [
    session.walls.ground,
    session.walls.left,
    session.walls.right,
  ]);
  session.walls = createWalls(vw, vh);
  Matter.World.add(session.engine.world, [
    session.walls.ground,
    session.walls.left,
    session.walls.right,
  ]);
}

function clampBodiesToViewport(pairs: PhysicsPair[], vw: number, vh: number) {
  for (const { body, width, height } of pairs) {
    const halfW = width / 2;
    const halfH = height / 2;
    const minX = halfW;
    const maxX = Math.max(halfW, vw - halfW);
    const minY = halfH;
    const maxY = Math.max(halfH, vh - halfH);
    const x = Math.min(Math.max(body.position.x, minX), maxX);
    const y = Math.min(Math.max(body.position.y, minY), maxY);
    if (x !== body.position.x || y !== body.position.y) {
      Matter.Body.setPosition(body, { x, y });
      Matter.Body.setVelocity(body, {
        x: body.velocity.x * 0.5,
        y: Math.min(body.velocity.y, 0),
      });
    }
  }
}

export function GravityPlayground({ children }: { children: React.ReactNode }) {
  const t = useTranslations("home");
  const reducedMotion = usePrefersReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<Session | null>(null);
  const [active, setActive] = useState(false);
  const [impacts, setImpacts] = useState(0);

  const teardown = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;

    cancelAnimationFrame(session.raf);
    Matter.Events.off(session.engine, "collisionStart", session.onCollision);
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
    setActive(false);
  }, []);

  const start = useCallback(() => {
    const root = rootRef.current;
    if (!root || sessionRef.current) return;

    const sources = Array.from(
      root.querySelectorAll<HTMLElement>("[data-physics-item]"),
    ).filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    if (sources.length === 0) return;

    const targets = collectSpawnTargets(sources);
    const { Engine, Bodies, World, Runner, Mouse, MouseConstraint, Body, Events } =
      Matter;

    const engine = Engine.create({
      gravity: { x: 0, y: 1, scale: 0.001 },
    });

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const walls = createWalls(vw, vh);
    World.add(engine.world, [walls.ground, walls.left, walls.right]);

    const layerEl = document.createElement("div");
    layerEl.setAttribute("aria-hidden", "true");
    layerEl.className = "pointer-events-none fixed inset-0 z-[6]";
    document.body.appendChild(layerEl);

    const mouseEl = document.createElement("div");
    mouseEl.setAttribute("aria-hidden", "true");
    mouseEl.className = "fixed inset-0 z-[5]";
    document.body.appendChild(mouseEl);

    const pairs: PhysicsPair[] = [];
    const hiddenSources = new Set<HTMLElement>();

    for (const target of targets) {
      const { el, width, height, cx, cy } = spawnChipElement(target, layerEl);

      const body = Bodies.rectangle(cx, cy, width, height, {
        restitution: 0.35,
        friction: 0.2,
        frictionAir: 0.02,
        density: 0.002,
        chamfer: {
          radius: Math.min(8, Math.floor(width / 4), Math.floor(height / 4)),
        },
      });
      Body.setVelocity(body, {
        x: (Math.random() - 0.5) * 6,
        y: Math.random() * -2,
      });
      Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.08);

      World.add(engine.world, body);
      pairs.push({ body, el, width, height });
      hiddenSources.add(target.source);
    }

    hiddenSources.forEach((el) => {
      el.style.visibility = "hidden";
    });

    const mouse = Mouse.create(mouseEl);
    mouse.pixelRatio = 1;
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse,
      constraint: {
        stiffness: 0.18,
        damping: 0.1,
        render: { visible: false },
      },
    });
    World.add(engine.world, mouseConstraint);

    const onCollision = (event: Matter.IEventCollision<Matter.Engine>) => {
      let hits = 0;
      for (const pair of event.pairs) {
        if (!pair.bodyA.isStatic && !pair.bodyB.isStatic) {
          hits += 1;
        }
      }
      if (hits > 0) {
        setImpacts((n) => n + hits);
      }
    };
    Events.on(engine, "collisionStart", onCollision);

    const runner = Runner.create();
    Runner.run(runner, engine);

    const sync = () => {
      for (const { body, el, width, height } of pairs) {
        const { x, y } = body.position;
        el.style.transform = `translate(${x - width / 2}px, ${y - height / 2}px) rotate(${body.angle}rad)`;
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
    };
    setActive(true);
  }, []);

  useEffect(() => {
    return () => {
      teardown();
    };
  }, [teardown]);

  useEffect(() => {
    if (!active) return;

    const onResize = () => {
      const session = sessionRef.current;
      if (!session) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      replaceWalls(session, vw, vh);
      clampBodiesToViewport(session.pairs, vw, vh);
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [active]);

  if (reducedMotion) {
    return <div ref={rootRef}>{children}</div>;
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="pointer-events-none fixed inset-x-0 top-14 z-50 flex flex-col items-center gap-1.5 md:top-4">
        <Button
          type="button"
          variant={active ? "secondary" : "accent"}
          size="sm"
          className="pointer-events-auto"
          onClick={() => (active ? teardown() : start())}
          aria-pressed={active}
        >
          {active ? t("gravityReset") : t("gravityPlay")}
        </Button>
        {active ? (
          <p
            className="text-xs tabular-nums text-muted-foreground"
            aria-live="polite"
          >
            {t("gravityImpacts", { count: impacts })}
          </p>
        ) : null}
      </div>
      {children}
    </div>
  );
}
