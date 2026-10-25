/* eslint-disable react-hooks/refs -- Imperative game engine: React HUD is explicitly refreshed at 25 Hz; canvas reads the same engine at frame rate. */
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  motion,
  useAnimationControls,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ChevronsDown,
  RotateCw,
  Pause,
  Settings2,
  Repeat2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Game,
  blocks,
  spawn,
  type Action,
  type GameEvent,
} from "../engine/game";
import type { PieceName } from "../engine/pieces";
import { LavaBoard } from "../render/board";
import { bindKeyboard } from "../controls/input";
import {
  defaults,
  feel,
  readStore,
  writeStore,
  type Settings,
} from "../feel/config";
import { haptic } from "../feel/haptics";
import "./game.css";
const controls = [
  ["left", "Gauche", "←", ArrowLeft],
  ["right", "Droite", "→", ArrowRight],
  ["cw", "Pivoter", "X / ↑", RotateCw],
  ["soft", "Descendre", "↓", ArrowDown],
  ["hold", "Réserve", "C / ⇧", Repeat2],
  ["ccw", "Pivoter ↶", "Z", RotateCw],
  ["hard", "Lâcher", "Espace", ChevronsDown],
] as const;
function Mini({ name }: { name: PieceName | null }) {
  return (
    <svg
      className="lava-mini"
      viewBox="0 0 4 3"
      role="img"
      aria-label={name ?? "Réserve vide"}
    >
      {name &&
        blocks(spawn(name)).map(([x, y]) => (
          <rect
            key={`${x}-${y}`}
            x={x - 3 + 0.07}
            y={y + 0.07}
            width=".86"
            height=".86"
            rx=".28"
            fill={`var(--tetris-piece-${name.toLowerCase()})`}
          />
        ))}
    </svg>
  );
}
function Score({ value, reduced }: { value: number; reduced: boolean }) {
  const target = useMotionValue(value);
  const spring = useSpring(target, { stiffness: 160, damping: 25 });
  const label = useTransform(spring, (v) => Math.round(v).toLocaleString("fr"));
  useEffect(() => {
    target.set(value);
  }, [value, target]);
  return (
    <motion.div
      className="lava-score"
      animate={reduced ? {} : { scale: [1, 1.06, 1] }}
      key={Math.floor(value / 100)}
    >
      {reduced ? (
        value.toLocaleString("fr")
      ) : (
        <motion.span>{label}</motion.span>
      )}
    </motion.div>
  );
}
export function Tetris() {
  const game = useRef(new Game(() => 0.5));
  const root = useRef<HTMLDivElement>(null);
  const iosSwitch = useRef<HTMLInputElement>(null);
  const [, refresh] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState<"ready" | "playing" | "paused" | "over">(
    "ready",
  );
  const statusRef = useRef(status);
  statusRef.current = status;
  const [settings, setSettings] = useState<Settings>(defaults);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const [best, setBest] = useState(0);
  const [feedback, setFeedback] = useState<{ id: number; e: GameEvent } | null>(
    null,
  );
  const serial = useRef(0);
  const camera = useAnimationControls();
  const [systemReduced, setSystemReduced] = useState(false);
  const reduced = settings.reduced || !!systemReduced;
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setSystemReduced(media.matches);
    media.addEventListener("change", sync);
    const frame = requestAnimationFrame(sync);
    return () => {
      cancelAnimationFrame(frame);
      media.removeEventListener("change", sync);
    };
  }, []);
  useEffect(() => {
    if (reduced) {
      camera.stop();
      camera.set({ scale: 1, x: 0, y: 0 });
    }
  }, [reduced, camera]);
  const touch = useRef<{
    x: number;
    y: number;
    time: number;
    moved: boolean;
  } | null>(null);
  const repeat = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setSettings({
        ...defaults,
        ...readStore<Settings>("lava-settings", defaults),
      });
      setBest(readStore<number>("lava-best", 0));
    });
    return () => cancelAnimationFrame(raf);
  }, []);
  const stopRepeat = useCallback(() => {
    if (repeat.current) clearTimeout(repeat.current);
    repeat.current = null;
  }, []);
  const act = useCallback((a: Action) => {
    if (statusRef.current !== "playing") return;
    game.current.action(a);
    refresh((v) => v + 1);
  }, []);
  const pause = useCallback(() => {
    stopRepeat();
    setStatus((s) =>
      s === "playing" ? "paused" : s === "paused" ? "playing" : s,
    );
  }, [stopRepeat]);
  const start = () => {
    game.current = new Game();
    setExpanded(true);
    setStatus("playing");
    root.current?.scrollIntoView({ block: "center" });
    root.current?.focus({ preventScroll: true });
  };
  useEffect(() => {
    const g = game.current;
    return g.on((e) => {
      haptic(e, settingsRef.current, iosSwitch.current);
      if (e.type === "gameOver") {
        setStatus("over");
        setBest((old) => {
          const value = Math.max(old, g.score);
          writeStore("lava-best", value);
          return value;
        });
      }
      if (
        [
          "lock",
          "hardDrop",
          "lineClear",
          "tetris",
          "combo",
          "levelUp",
        ].includes(e.type)
      ) {
        setFeedback((old) => ({
          id: ++serial.current,
          e: {
            ...e,
            rows:
              e.rows ??
              (["tetris", "combo"].includes(e.type) ? old?.e.rows : undefined),
          },
        }));
        if (!reducedRef.current) {
          const strong = ["tetris", "combo"].includes(e.type);
          void camera
            .start({
              scale: strong
                ? feel.camera.strongZoom
                : e.type === "lineClear"
                  ? feel.camera.lineZoom
                  : feel.camera.lockZoom,
              x: strong ? -feel.camera.shake : 0,
              y: e.type === "hardDrop" ? feel.camera.dropBump : 1,
              transition: feel.spring,
            })
            .then(() =>
              camera.start({ scale: 1, x: 0, y: 0, transition: feel.spring }),
            );
        }
      }
    });
  }, [status, camera]);
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), feel.pulse);
    return () => clearTimeout(timer);
  }, [feedback]);
  useEffect(() => bindKeyboard(root.current!, act, pause), [act, pause]);
  useEffect(() => {
    const blur = () => {
      stopRepeat();
      setStatus((s) => (s === "playing" ? "paused" : s));
    };
    const visibility = () => {
      if (document.hidden) blur();
    };
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", visibility);
      stopRepeat();
    };
  }, [stopRepeat]);
  useEffect(() => {
    if (!expanded) return;
    let raf = 0,
      last = performance.now(),
      ui = last;
    const loop = (now: number) => {
      if (status === "playing") game.current.tick(Math.min(50, now - last));
      last = now;
      if (now - ui > 40) {
        refresh((v) => v + 1);
        ui = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [status, expanded]);
  const toggle = (key: keyof Settings) => {
    setSettings((s) => {
      const next = { ...s, [key]: !s[key] };
      writeStore("lava-settings", next);
      return next;
    });
  };
  const press = (a: Action) => {
    stopRepeat();
    act(a);
    if (["left", "right", "soft"].includes(a)) {
      const tick = () => {
        act(a);
        repeat.current = setTimeout(
          tick,
          a === "soft" ? feel.softArr : feel.arr,
        );
      };
      repeat.current = setTimeout(tick, a === "soft" ? feel.softArr : feel.das);
    }
  };
  const g = game.current;
  const effect = feedback?.e;
  const lineEffect =
    effect && ["lineClear", "tetris", "combo"].includes(effect.type);
  const announcement =
    effect?.type === "tetris"
      ? "TETRIS"
      : effect?.type === "combo"
        ? `COMBO ×${effect.n + 1}`
        : effect?.type === "levelUp"
          ? `NIVEAU ${effect.n}`
          : effect?.type === "lineClear"
            ? `${effect.n} LIGNE${effect.n > 1 ? "S" : ""}`
            : "";
  return (
    <Card
      ref={root}
      tabIndex={0}
      className="lava-game"
      data-expanded={expanded}
      data-playing={status === "playing"}
      data-reduced={reduced}
      aria-label="Tetris Lava, zone de jeu. Les raccourcis clavier fonctionnent quand cette zone a le focus."
    >
      <div className="lava-top">
        <div className="flex items-end gap-2">
          <span className="lava-wordmark">
            lava<span className="text-muted-foreground">.</span>
          </span>
          <Badge variant="outline">Tetris</Badge>
        </div>
        <div className="flex gap-2">
          {expanded && (
            <Button
              variant="ghost"
              aria-label="Quitter le jeu"
              onClick={() => {
                stopRepeat();
                setExpanded(false);
                setStatus("ready");
              }}
            >
              <X />
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={pause}
            disabled={status === "ready" || status === "over"}
            aria-label="Pause"
          >
            <Pause />
            <span className="hidden sm:inline">Pause · P</span>
          </Button>
          <Sheet
            onOpenChange={(open) => {
              if (open && statusRef.current === "playing") setStatus("paused");
            }}
          >
            <SheetTrigger asChild>
              <Button variant="ghost" aria-label="Réglages">
                <Settings2 />
              </Button>
            </SheetTrigger>
            <SheetContent className="z-[80]">
              <SheetHeader>
                <SheetTitle>À votre rythme.</SheetTitle>
                <SheetDescription>
                  Le plaisir de jouer, avec juste les effets qu’il vous faut.
                </SheetDescription>
              </SheetHeader>
              <div className="lava-settings">
                {(
                  [
                    ["haptics", "Haptiques"],
                    ["ios", "Haptiques iOS expérimentales"],
                    ["reduced", "Effets réduits"],
                    ["overlay", "Contrôles visibles"],
                  ] as const
                ).map(([key, label]) => (
                  <Button
                    key={key}
                    variant="outline"
                    role="switch"
                    aria-checked={settings[key]}
                    onClick={() => toggle(key)}
                  >
                    {label}
                    <Badge variant={settings[key] ? "default" : "secondary"}>
                      {settings[key] ? "Oui" : "Non"}
                    </Badge>
                  </Button>
                ))}
                <p className="text-xs text-muted-foreground">
                  L’option iOS utilise une astuce non officielle de Safari 18+,
                  uniquement sur les impacts forts. Elle peut ne produire aucune
                  vibration.
                </p>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <div className="lava-stage">
        <aside className="lava-side">
          <div>
            <div className="lava-label">Score</div>
            <Score value={g.score} reduced={reduced} />
          </div>
          <div>
            <div className="lava-label">Record</div>
            <span>{best.toLocaleString("fr")}</span>
          </div>
          <div>
            <div className="lava-label">Réserve</div>
            <Mini name={g.held} />
          </div>
          <p className="lava-legend">
            ← → déplacer
            <br />↓ descendre
            <br />X / ↑ pivoter
            <br />Z rotation ↶<br />
            Espace lâcher
            <br />C / ⇧ réserve
            <br />P / Échap pause
          </p>
        </aside>
        <motion.div
          className="lava-board"
          animate={camera}
          onPointerDown={(e) => {
            if (status !== "playing") return;
            e.currentTarget.setPointerCapture(e.pointerId);
            touch.current = {
              x: e.clientX,
              y: e.clientY,
              time: performance.now(),
              moved: false,
            };
          }}
          onPointerMove={(e) => {
            const t = touch.current;
            if (!t) return;
            const dx = e.clientX - t.x,
              dy = e.clientY - t.y;
            if (Math.abs(dx) > feel.swipe) {
              act(dx > 0 ? "right" : "left");
              t.x = e.clientX;
              t.moved = true;
            }
            if (dy > feel.swipe) {
              act("soft");
              t.y = e.clientY;
              t.moved = true;
            }
          }}
          onPointerUp={(e) => {
            const t = touch.current;
            touch.current = null;
            if (!t) return;
            if (
              e.clientY - t.y < -feel.swipe &&
              performance.now() - t.time < feel.fastSwipe
            )
              act("hard");
            else if (!t.moved && Math.abs(e.clientY - t.y) < feel.swipe)
              act("cw");
          }}
          onPointerCancel={() => {
            touch.current = null;
          }}
        >
          <LavaBoard
            game={game}
            active={status === "playing"}
            reduced={reduced}
          />
          {effect &&
            !reduced &&
            [
              "hardDrop",
              "lock",
              "lineClear",
              "tetris",
              "combo",
              "levelUp",
            ].includes(effect.type) && (
              <motion.div
                key={`flash-${feedback.id}`}
                className="lava-flash"
                style={{
                  background: `var(--tetris-piece-${effect.color?.toLowerCase()})`,
                }}
                initial={{ opacity: feel.flashOpacity }}
                animate={{ opacity: 0 }}
                transition={{ duration: feel.pulse / 1000 }}
              />
            )}
          {effect?.rows?.map((row) => (
            <div
              key={`${feedback?.id}-${row}`}
              className="lava-line"
              style={{ top: `${(row - 2) * 5}%` }}
            />
          ))}
          {lineEffect &&
            !reduced &&
            Array.from({ length: feel.particles }, (_, i) => (
              <motion.i
                key={`${feedback?.id}-${i}`}
                className="lava-droplet"
                style={{
                  left: `${(i * 37) % 100}%`,
                  top: "70%",
                  background: `var(--tetris-piece-${effect.color?.toLowerCase()})`,
                }}
                initial={{ opacity: 1, y: 0, scale: 1 }}
                animate={{
                  opacity: 0,
                  y: -30 - (i % 5) * 15,
                  x: (i % 2 ? 1 : -1) * (10 + i * 2),
                  scale: 0,
                }}
                transition={{ duration: feel.pulse / 1000 }}
              />
            ))}
          <div aria-live="polite" className="lava-feedback">
            {announcement}
          </div>
          {status !== "playing" && (
            <div className="lava-cover" data-slot="card">
              <Badge variant="secondary">
                {status === "ready"
                  ? "Une expérience de matière"
                  : status === "paused"
                    ? "Prenez votre temps"
                    : "Bien joué."}
              </Badge>
              <h2>
                {status === "ready"
                  ? "Let it flow."
                  : status === "paused"
                    ? "On respire ?"
                    : "Encore une ?"}
              </h2>
              <p>
                {status === "ready"
                  ? "Empilez, alignez, laissez fondre. Un classique à portée de pouce."
                  : status === "paused"
                    ? "Votre partie vous attend."
                    : `${g.score.toLocaleString("fr")} points · ${g.lines} lignes · niveau ${g.level}`}
              </p>
              {status === "over" && (
                <p>
                  {g.pieces} pièces · {Math.floor(g.elapsed / 60000)} min{" "}
                  {Math.floor(g.elapsed / 1000) % 60} s<br />
                  {g.stats[1]} singles · {g.stats[2]} doubles · {g.stats[3]}{" "}
                  triples · {g.stats[4]} tetris
                  <br />
                  Record : {best.toLocaleString("fr")}
                </p>
              )}
              <Button
                variant="accent"
                onClick={
                  status === "paused"
                    ? () => {
                        setStatus("playing");
                        root.current?.focus({ preventScroll: true });
                      }
                    : start
                }
              >
                {status === "ready"
                  ? "Jouer"
                  : status === "paused"
                    ? "Reprendre"
                    : "Rejouer"}
              </Button>
            </div>
          )}
        </motion.div>
        <aside className="lava-side">
          <div>
            <div className="lava-label">Ensuite</div>
            {g.next.map((name, i) => (
              <Mini key={`${i}-${name}`} name={name} />
            ))}
          </div>
          <div>
            <div className="lava-label">Niveau</div>
            <span className="lava-score">
              {String(g.level).padStart(2, "0")}
            </span>
          </div>
          <div>
            <div className="lava-label">Lignes</div>
            <span>{g.lines}</span>
          </div>
        </aside>
      </div>
      {settings.overlay && (
        <div className="lava-controls" aria-label="Contrôles tactiles">
          {controls.map(([action, label, key, Icon]) => (
            <Button
              key={action}
              variant="outline"
              disabled={status !== "playing"}
              aria-label={label}
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                press(action);
              }}
              onPointerUp={stopRepeat}
              onPointerCancel={stopRepeat}
              onLostPointerCapture={stopRepeat}
              onClick={(e) => {
                if (e.detail === 0) act(action);
              }}
            >
              <Icon />
              <span>{label}</span>
              <kbd>{key}</kbd>
            </Button>
          ))}
          <Button
            variant="outline"
            onClick={pause}
            disabled={status === "ready" || status === "over"}
          >
            <Pause />
            <span>Pause</span>
            <kbd>P / Échap</kbd>
          </Button>
        </div>
      )}
      <input
        ref={iosSwitch}
        type="checkbox"
        {...({ switch: "" } as Record<string, string>)}
        className="lava-switch"
        tabIndex={-1}
        aria-hidden="true"
      />
      <span className="sr-only" aria-live="polite">
        {status === "over"
          ? `Partie terminée. ${g.score} points.`
          : status === "paused"
            ? "Partie en pause."
            : ""}
      </span>
    </Card>
  );
}
