"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Matter from "matter-js";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

type PhysicsPair = {
  body: Matter.Body;
  el: HTMLElement;
  width: number;
  height: number;
};

type Session = {
  engine: Matter.Engine;
  runner: Matter.Runner;
  mouseConstraint: Matter.MouseConstraint;
  mouseEl: HTMLElement;
  layerEl: HTMLElement;
  pairs: PhysicsPair[];
  sources: HTMLElement[];
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

    const { Engine, Bodies, World, Runner, Mouse, MouseConstraint, Body, Events } =
      Matter;

    const engine = Engine.create({
      gravity: { x: 0, y: 1, scale: 0.001 },
    });

    const w = window.innerWidth;
    const h = window.innerHeight;
    const wallOpts = { isStatic: true, render: { visible: false } };
    const thickness = 80;

    World.add(engine.world, [
      Bodies.rectangle(w / 2, h + thickness / 2, w + thickness * 2, thickness, wallOpts),
      Bodies.rectangle(-thickness / 2, h / 2, thickness, h * 2, wallOpts),
      Bodies.rectangle(w + thickness / 2, h / 2, thickness, h * 2, wallOpts),
    ]);

    const layerEl = document.createElement("div");
    layerEl.setAttribute("aria-hidden", "true");
    // Under sidebar (z-10) so nav stays usable; above page content for drag hit-testing
    layerEl.className = "pointer-events-none fixed inset-0 z-[6]";
    document.body.appendChild(layerEl);

    const mouseEl = document.createElement("div");
    mouseEl.setAttribute("aria-hidden", "true");
    mouseEl.className = "fixed inset-0 z-[5]";
    document.body.appendChild(mouseEl);

    const pairs: PhysicsPair[] = [];

    sources.forEach((source) => {
      const rect = source.getBoundingClientRect();
      const width = Math.max(rect.width, 8);
      const height = Math.max(rect.height, 8);
      const cx = rect.left + width / 2;
      const cy = rect.top + height / 2;

      const clone = source.cloneNode(true) as HTMLElement;
      neutralizeClone(clone);
      clone.removeAttribute("data-physics-item");
      clone.className = [
        source.className,
        "fixed z-[6] m-0 box-border border border-border bg-card shadow-sm",
      ]
        .filter(Boolean)
        .join(" ");
      clone.style.left = "0";
      clone.style.top = "0";
      clone.style.width = `${width}px`;
      clone.style.height = `${height}px`;
      clone.style.margin = "0";
      clone.style.boxSizing = "border-box";
      clone.style.transformOrigin = "center center";
      clone.style.willChange = "transform";
      clone.style.pointerEvents = "none";
      clone.style.visibility = "visible";
      clone.setAttribute("aria-hidden", "true");

      const computed = window.getComputedStyle(source);
      if (computed.display.includes("inline") || computed.display === "contents") {
        clone.style.display = "inline-flex";
        clone.style.alignItems = "center";
      }

      layerEl.appendChild(clone);

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
      pairs.push({ body, el: clone, width, height });
      source.style.visibility = "hidden";
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
      sources,
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
    const onResize = () => teardown();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [active, teardown]);

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
