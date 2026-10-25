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
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Game, type Action, type GameEvent } from "../engine/game";
import { LavaBoard } from "../render/board";
import { claimOpening, resetOpeningFromDevUrl } from "../controls/onboarding";
import { bindKeyboard } from "../controls/input";
import {
  defaults,
  feel,
  readStore,
  writeStore,
  type Settings,
} from "../feel/config";
import { PieceShape as Mini } from "./piece-shape";
import { GameplayBackground } from "./gameplay-background";
import { Link } from "@/i18n/navigation";
import type { CaseStudySection } from "@/lib/content";
import { LineCelebration } from "../feel/line-celebration";
import { lineFeel, lineCount } from "../feel/line-config";
import { haptic } from "../feel/haptics";
import { sourceLicense } from "../engine/source-license";
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
export function Tetris({
  information = [],
}: {
  information?: CaseStudySection[];
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
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
  useEffect(() => {
    resetOpeningFromDevUrl();
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
    game.current = new Game(Math.random, claimOpening());
    setExpanded(true);
    setStatus("playing");
    root.current?.scrollIntoView({ block: "center" });
    root.current?.focus({ preventScroll: true });
  };
  useEffect(() => {
    const g = game.current;
    return g.on((e) => {
      // One line-clear event owns reward, haptics and camera; tetris/combo notifications must not duplicate them.
      if (e.type !== "tetris" && e.type !== "combo")
        haptic(e, settingsRef.current, iosSwitch.current);
      if (e.type === "gameOver") {
        setStatus("over");
        setBest((old) => {
          const value = Math.max(old, g.score);
          writeStore("lava-best", value);
          return value;
        });
      }
      if (e.type === "lineClear") {
        const config = lineFeel[lineCount(e.n)];
        setFeedback({ id: ++serial.current, e });
        if (!reducedRef.current)
          void camera
            .start({
              scale: config.zoom,
              x: config.shake ? -config.shake : 0,
              transition: feel.spring,
            })
            .then(() =>
              camera.start({ scale: 1, x: 0, transition: feel.spring }),
            );
      }
    });
  }, [status, camera]);
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(
      () => setFeedback(null),
      lineFeel[lineCount(feedback.e.n)].duration,
    );
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
  return (
    <Card
      ref={root}
      tabIndex={0}
      className="lava-game"
      data-controls={settings.overlay}
      data-expanded={expanded}
      data-playing={status === "playing"}
      data-state={status}
      data-reduced={reduced}
      aria-label="Tetris Lava, zone de jeu"
    >
      {status === "ready" ? (
        <div className="lava-lobby">
          <GameplayBackground />
          <Link
            href="/jeux"
            className="lava-back text-sm text-muted-foreground"
          >
            ← Jeux
          </Link>
          <Card className="lava-lobby-panel">
            <span className="lava-wordmark" aria-hidden="true">
              lava.
            </span>
            <Button variant="accent" size="lg" onClick={start}>
              Jouer
            </Button>
            <Button variant="outline" disabled>
              Classement <Badge variant="secondary">Bientôt</Badge>
            </Button>
            <Button variant="outline" onClick={() => setSettingsOpen(true)}>
              Réglages
            </Button>
            <Button variant="ghost" onClick={() => setRulesOpen(true)}>
              Règles
            </Button>
          </Card>
        </div>
      ) : (
        <>
          <div className="lava-top">
            <span className="lava-wordmark">lava.</span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                aria-label="Quitter la partie"
                onClick={() => {
                  stopRepeat();
                  setExpanded(false);
                  setStatus("ready");
                }}
              >
                <X />
              </Button>
              <Button variant="ghost" aria-label="Pause" onClick={pause}>
                <Pause />
              </Button>
              <Button
                variant="ghost"
                aria-label="Réglages"
                onClick={() => {
                  setStatus("paused");
                  setSettingsOpen(true);
                }}
              >
                <Settings2 />
              </Button>
            </div>
          </div>
          <div className="lava-stage">
            <aside className="lava-side lava-side-left">
              <div>
                <Badge variant="secondary">Réserve</Badge>
                <Mini name={g.held} />
              </div>
              <div>
                <Badge variant="secondary">Score</Badge>
                <Score value={g.score} reduced={reduced} />
              </div>
              <div>
                <Badge variant="secondary">Lignes</Badge>
                <span className="lava-score">{g.lines}</span>
              </div>
              <div className="lava-hud-bottom">
                <Badge variant="secondary">Record</Badge>
                <span>{best.toLocaleString("fr")}</span>
              </div>
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
              {feedback && (
                <LineCelebration
                  key={feedback.id}
                  event={feedback.e}
                  reduced={reduced}
                />
              )}
              {effect &&
                lineFeel[lineCount(effect.n)].flash > 0 &&
                !reduced && (
                  <motion.div
                    key={`flash-${feedback?.id}`}
                    className="lava-flash"
                    initial={{ opacity: lineFeel[lineCount(effect.n)].flash }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 0.45 }}
                  />
                )}
              {status === "over" ? (
                <Card className="lava-cover">
                  <h2>Encore une ?</h2>
                  <p>
                    {g.score} points · {g.lines} lignes · niveau {g.level}
                  </p>
                  <p>
                    {g.pieces} pièces · {Math.floor(g.elapsed / 1000)} s ·
                    Record {best}
                  </p>
                  <Button variant="accent" onClick={start}>
                    Rejouer
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setExpanded(false);
                      setStatus("ready");
                    }}
                  >
                    Menu
                  </Button>
                </Card>
              ) : null}
            </motion.div>
            <aside className="lava-side lava-side-right">
              <div>
                <Badge variant="secondary">Ensuite</Badge>
                {g.next.map((n, i) => (
                  <Mini key={`${i}-${n}`} name={n} />
                ))}
              </div>
              <div className="lava-hud-bottom">
                <Badge variant="secondary">Niveau</Badge>
                <span className="lava-score">{g.level}</span>
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
              <Button variant="outline" onClick={pause}>
                <Pause />
                <span>Pause</span>
                <kbd>P / Échap</kbd>
              </Button>
            </div>
          )}
        </>
      )}
      {status === "paused" && (
        <Card className="lava-cover lava-pause">
          <Button
            className="lava-pause-quit"
            variant="ghost"
            aria-label="Quitter la partie"
            onClick={() => {
              stopRepeat();
              setExpanded(false);
              setStatus("ready");
            }}
          >
            <X />
          </Button>
          <h2>Pause</h2>
          <Button
            variant="accent"
            onClick={() => {
              setStatus("playing");
              root.current?.focus({ preventScroll: true });
            }}
          >
            Reprendre
          </Button>
        </Card>
      )}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        {" "}
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
      <Sheet open={rulesOpen} onOpenChange={setRulesOpen}>
        <SheetContent className="z-[80] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Règles et informations</SheetTitle>
            <SheetDescription>Les repères pour jouer à Lava.</SheetDescription>
          </SheetHeader>
          <div className="lava-settings text-sm">
            <h2 className="font-semibold">Contrôles</h2>
            <p>
              Glissez à gauche ou à droite pour déplacer, vers le bas pour
              descendre, vers le haut rapidement pour lâcher. Touchez le plateau
              pour pivoter. Les boutons fonctionnent aussi en maintien.
            </p>
            <p>
              Clavier : ← → ↓, X / ↑ et Z pour tourner, Espace pour lâcher, C ou
              Shift pour réserver, P / Échap pour la pause.
            </p>
            <h2 className="font-semibold">Score</h2>
            <p>
              1 / 2 / 3 / 4 lignes : 100 / 300 / 500 / 800 points × niveau.
              Tetris consécutifs : ×1,5. Combo : +50 par rang × niveau. Chute
              douce : +1 par cellule ; chute rapide : +2. Un niveau tous les 10
              lignes.
            </p>
            {information.map((section) => (
              <section key={section.id}>
                <h2 className="font-semibold">{section.title}</h2>
                {section.body.map((text) => (
                  <p key={text} className="mt-2 text-muted-foreground">
                    {text}
                  </p>
                ))}
              </section>
            ))}
            <h2 className="font-semibold">Crédits et licence</h2>
            <p>
              Logique adaptée de{" "}
              <a href="https://github.com/sen-ltd/tetris" className="underline">
                sen-ltd/tetris
              </a>
              , © 2026 SEN LLC, sous licence MIT. Aucun rendu source repris.
            </p>
            <details>
              <summary>Licence MIT complète</summary>
              <pre className="whitespace-pre-wrap text-xs">{sourceLicense}</pre>
            </details>
          </div>
        </SheetContent>
      </Sheet>
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
