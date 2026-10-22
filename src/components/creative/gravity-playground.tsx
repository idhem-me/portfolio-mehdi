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
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

const GravityActiveContext = createContext(false);

export function useGravityActive() {
  return useContext(GravityActiveContext);
}

/** Sidebar width transition is duration-200 — wait before measuring chips. */
const SIDEBAR_COLLAPSE_MS = 220;

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
): { el: HTMLElement; width: number; height: number; cx: number; cy: number } {
  const { source, anchor, lineText } = target;
  const isButton = source.hasAttribute("data-physics-button");
  const isExact = source.hasAttribute("data-physics-exact");
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
    el.className = [source.className, "fixed z-[6] m-0"].filter(Boolean).join(" ");
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
    return { el, width, height, cx, cy };
  }

  if (pureText) {
    el = document.createElement("span");
    el.textContent = lineText ?? source.textContent ?? "";
    el.className =
      "fixed z-[6] m-0 inline-flex items-center rounded-lg border border-border bg-card shadow-sm";
    applyTypography(el, computed);
    el.style.padding = `${CHIP_PAD_PX}px`;
    el.style.whiteSpace = "nowrap";
  } else {
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

  layerEl.appendChild(el);
  const box = el.getBoundingClientRect();
  width = Math.max(box.width, 8);
  height = Math.max(box.height, 8);
  el.style.width = `${width}px`;
  el.style.height = `${height}px`;
  el.style.flexShrink = "0";

  cx = anchor.left + anchor.width / 2;
  cy = anchor.top + anchor.height / 2;

  return { el, width, height, cx, cy };
}

/** Rebuild Touche-moi from a pre-click snapshot (exact look + box). */
function spawnPlaySnapshot(
  snapshot: PlaySnapshot,
  layerEl: HTMLElement,
): { el: HTMLElement; width: number; height: number; cx: number; cy: number } {
  const el = document.createElement("button");
  el.type = "button";
  el.textContent = snapshot.text;
  el.className = [snapshot.className, "fixed z-[6] m-0"].filter(Boolean).join(" ");
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

/** Shared body recipe — identical for every chip (no chamfer = no tunneling). */
function addFallingBody(
  Bodies: typeof Matter.Bodies,
  Body: typeof Matter.Body,
  World: typeof Matter.World,
  engine: Matter.Engine,
  pairs: PhysicsPair[],
  chip: { el: HTMLElement; width: number; height: number; cx: number; cy: number },
) {
  const { el, width, height, cx, cy } = chip;
  const body = Bodies.rectangle(cx, cy, width, height, {
    restitution: 0.22,
    friction: 0.35,
    frictionStatic: 0.5,
    frictionAir: 0.012,
    density: 0.004,
    slop: 0.01,
  });
  // Mild random kick — same distribution for every body
  Body.setVelocity(body, {
    x: (Math.random() - 0.5) * 5,
    y: (Math.random() - 0.5) * 2,
  });
  Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.06);
  World.add(engine.world, body);
  pairs.push({ body, el, width, height });
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
  const { open, setOpen, isMobile, openMobile, setOpenMobile, state } =
    useSidebar();
  const rootRef = useRef<HTMLDivElement>(null);
  const playButtonRef = useRef<HTMLButtonElement>(null);
  const playSnapshotRef = useRef<PlaySnapshot | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const startTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [active, setActive] = useState(false);
  const [impacts, setImpacts] = useState(0);

  const teardown = useCallback(() => {
    if (startTimerRef.current !== null) {
      clearTimeout(startTimerRef.current);
      startTimerRef.current = null;
    }
    playSnapshotRef.current = null;
    const session = sessionRef.current;
    if (!session) {
      setActive(false);
      return;
    }

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

  const runPhysics = useCallback(() => {
    const root = rootRef.current;
    const playSnapshot = playSnapshotRef.current;
    if (!root || sessionRef.current) return;

    const sources = Array.from(
      root.querySelectorAll<HTMLElement>("[data-physics-item]"),
    ).filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    if (sources.length === 0 && !playSnapshot) return;

    const targets = collectSpawnTargets(sources);
    const { Engine, Bodies, World, Runner, Mouse, MouseConstraint, Body, Events } =
      Matter;

    const engine = Engine.create({
      gravity: { x: 0, y: 1.35, scale: 0.001 },
    });
    engine.positionIterations = 12;
    engine.velocityIterations = 10;
    engine.constraintIterations = 4;

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
    // Below HUD (z-[100]) so Reset stays clickable
    mouseEl.className = "fixed inset-0 z-[5]";
    document.body.appendChild(mouseEl);

    const pairs: PhysicsPair[] = [];
    const hiddenSources = new Set<HTMLElement>();

    if (playSnapshot) {
      addFallingBody(
        Bodies,
        Body,
        World,
        engine,
        pairs,
        spawnPlaySnapshot(playSnapshot, layerEl),
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
      );
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
        stiffness: 0.2,
        damping: 0.05,
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
  }, []);

  const start = useCallback(() => {
    if (sessionRef.current || startTimerRef.current !== null || active) return;

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
    return (
      <GravityActiveContext.Provider value={false}>
        <div ref={rootRef}>{children}</div>
      </GravityActiveContext.Provider>
    );
  }

  return (
    <GravityActiveContext.Provider value={active}>
      <div ref={rootRef} className="relative">
        {/* HUD in content column only — below sidebar (z-10), above physics (z-6). */}
        <div
          className="pointer-events-none fixed top-12 z-[9] flex flex-col items-center gap-1.5 py-16 md:top-0 end-0"
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
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="pointer-events-auto"
                onClick={teardown}
              >
                {t("gravityReset")}
              </Button>
              <p
                className="text-xs tabular-nums text-muted-foreground"
                aria-live="polite"
              >
                {t("gravityImpacts", { count: impacts })}
              </p>
            </>
          ) : (
            <Button
              ref={playButtonRef}
              type="button"
              variant="accent"
              size="sm"
              className="pointer-events-auto"
              onClick={start}
            >
              {t("gravityPlay")}
            </Button>
          )}
        </div>
        {children}
      </div>
    </GravityActiveContext.Provider>
  );
}
