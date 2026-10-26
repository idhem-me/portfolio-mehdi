/* eslint-disable react-hooks/refs -- Imperative game engine: React HUD is explicitly refreshed at 25 Hz; canvas reads the same engine at frame rate. */
"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
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
  loadSettings,
  writeStore,
  type Settings,
  type AudioVolumes,
} from "../feel/config";
import { PieceShape as Mini } from "./piece-shape";
import { GameplayBackground } from "./gameplay-background";
import { Link } from "@/i18n/navigation";
import type { CaseStudySection } from "@/lib/content";
import { LineCelebration } from "../feel/line-celebration";
import { lineFeel, lineCount } from "../feel/line-config";
import { haptic } from "../feel/haptics";
import { sourceLicense } from "../engine/source-license";
import { GameAudio } from "../feel/audio";
import { soundEnabled, leaderboardEnabled, tetrisEnabled } from "../flags";
import { seeded, replayLimit } from "../engine/replay";
import { Leaderboard, type RankedRun } from "./leaderboard";
import { PlayerIdentityProvider } from "./player-identity";
import { GameOver } from "./game-over";
import { PlayerProfileButton } from "./player-profile";
import { Separator } from "@/components/ui/separator";
import { recoverDraft, type ScoreDraft } from "../auth/draft";
import { useTheme } from "next-themes";
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
const subscribeHydration = () => () => {};
function TetrisGame({
  information = [],
}: {
  information?: CaseStudySection[];
}) {
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  const [recovered, setRecovered] = useState<ScoreDraft | null>(null);
  const audio = useRef<GameAudio | null>(null);
  const ranked = useRef<RankedRun | null>(null);
  const localRun = useRef<(RankedRun & { opening: boolean }) | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      audio.current?.close();
    };
  }, []);
  const unlockAudio = () => {
    if (soundEnabled && settingsRef.current.sound) {
      audio.current ??= new GameAudio();
      audio.current.setVolumes(settingsRef.current);
      audio.current.unlock();
    }
  };
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
  const { resolvedTheme, setTheme } = useTheme();
  const theme = resolvedTheme ?? "light";
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
      setSettings(loadSettings());
      setBest(readStore<number>("lava-best", 0));
      const draft = recoverDraft();
      if (draft) {
        setRecovered(draft);
        setExpanded(true);
        setStatus("over");
      }
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
  const act = useCallback(
    (a: Action) => {
      if (statusRef.current !== "playing" || game.current.over) return;
      const capture = localRun.current;
      if (capture) {
        if (capture.steps.length >= replayLimit) {
          localRun.current = null;
          ranked.current = null;
        } else capture.steps.push(a);
      } else if (ranked.current) {
        if (ranked.current.steps.length >= replayLimit) ranked.current = null;
        else ranked.current.steps.push(a);
      }
      game.current.action(a);
      refresh((v) => v + 1);
    },
    [refresh],
  );
  const pause = useCallback(() => {
    if (
      statusRef.current === "paused" &&
      soundEnabled &&
      settingsRef.current.sound
    )
      audio.current?.unlock();
    stopRepeat();
    setStatus((s) =>
      s === "playing" ? "paused" : s === "paused" ? "playing" : s,
    );
  }, [stopRepeat]);
  const start = async () => {
    if (preparing) return;
    setRecovered(null);
    unlockAudio();
    setPreparing(true);
    ranked.current = null;
    localRun.current = null;
    const opening = claimOpening();
    let rng = Math.random;
    if (tetrisEnabled) {
      try {
        const response = await fetch("/api/tetris/sessions", {
          method: "POST",
          signal: AbortSignal.timeout(1500),
        });
        if (response.ok) {
          const session = await response.json();
          localRun.current = {
            ...session,
            steps: [],
            opening: opening.length > 0,
          };
          if (leaderboardEnabled && !opening.length)
            ranked.current = localRun.current;
          rng = seeded(session.seed);
        }
      } catch {
        /* Offline: retain the complete solo game. */
      }
    }
    if (!mounted.current) return;
    game.current = new Game(rng, opening);
    setPreparing(false);
    setExpanded(true);
    setStatus("playing");
    root.current?.scrollIntoView({ block: "center" });
    root.current?.focus({ preventScroll: true });
  };
  useEffect(() => {
    if (status === "playing" && soundEnabled && settings.sound) {
      audio.current ??= new GameAudio();
      audio.current.setVolumes(settingsRef.current);
      audio.current.unlock();
      audio.current.startMusic();
    } else audio.current?.mute();
  }, [status, settings.sound]);
  useEffect(() => {
    audio.current?.setVolumes({
      effectsVolume: settings.effectsVolume,
      musicVolume: settings.musicVolume,
      voiceVolume: settings.voiceVolume,
    });
  }, [settings.effectsVolume, settings.musicVolume, settings.voiceVolume]);
  useEffect(() => {
    const g = game.current;
    return g.on((e) => {
      if (soundEnabled && settingsRef.current.sound) audio.current?.emit(e);
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
  useEffect(() => {
    if (status !== "playing" && status !== "paused") return;
    return bindKeyboard(root.current!, act, pause);
  }, [act, pause, status]);
  useEffect(() => {
    const blur = () => {
      audio.current?.mute();
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
      if (status === "playing" && !game.current.over) {
        const dt = Math.max(0, Math.min(50, now - last));
        const capture = localRun.current;
        if (capture) {
          if (capture.steps.length >= replayLimit) {
            localRun.current = null;
            ranked.current = null;
          } else capture.steps.push(dt);
        } else if (ranked.current) {
          if (ranked.current.steps.length >= replayLimit) ranked.current = null;
          else ranked.current.steps.push(dt);
        }
        game.current.tick(dt);
      }
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
  const setVolume = (key: keyof AudioVolumes, value: number) => {
    setSettings((s) => {
      const next = { ...s, [key]: value };
      writeStore("lava-settings", next);
      return next;
    });
  };
  const toggle = (
    key: Exclude<keyof Settings, keyof AudioVolumes | "audioScaleVersion">,
  ) => {
    if (key === "sound") {
      if (!settings.sound) {
        audio.current ??= new GameAudio();
        audio.current.setVolumes(settingsRef.current);
        audio.current.unlock();
      } else audio.current?.mute();
    }
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
      aria-label="Tetris, zone de jeu"
    >
      {status === "ready" ? (
        <div className="lava-lobby">
          <GameplayBackground />
          <div className="lava-lobby-header">
            <Link
              href="/jeux"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground"
              aria-label="Retour aux jeux"
            >
              <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
              <span>Jeux</span>
            </Link>
            <PlayerProfileButton />
          </div>
          <Card className="lava-lobby-panel">
            <span className="lava-wordmark" aria-hidden="true">
              Tetris
            </span>
            <Button
              variant="accent"
              size="lg"
              onClick={start}
              disabled={preparing || !hydrated}
            >
              {preparing ? "Préparation…" : "Jouer"}
            </Button>
            <Separator className="my-1" />
            <Button
              variant="outline"
              disabled={!leaderboardEnabled}
              onClick={() => setLeaderboardOpen(true)}
            >
              Classement{" "}
              {!leaderboardEnabled && (
                <Badge variant="secondary">Bientôt</Badge>
              )}
            </Button>
            <Button variant="outline" onClick={() => setRulesOpen(true)}>
              Règles
            </Button>
            <Button variant="outline" onClick={() => setSettingsOpen(true)}>
              Réglages
            </Button>
          </Card>
        </div>
      ) : (
        <>
          <div className="lava-top">
            <span className="lava-wordmark">Tetris</span>
            <div className="flex items-center gap-2">
              <PlayerProfileButton />
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
              <Button
                variant="ghost"
                aria-label="Mettre en pause"
                onClick={() => {
                  stopRepeat();
                  setStatus("paused");
                }}
              >
                <X />
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
                <span>Pause</span>
                <kbd>P / Échap</kbd>
              </Button>
            </div>
          )}
        </>
      )}
      {status === "over" && (
        <GameOver
          summary={
            recovered?.summary ?? {
              score: g.score,
              lines: g.lines,
              level: g.level,
              pieces: g.pieces,
              elapsed: g.elapsed,
              best: Math.max(best, g.score),
            }
          }
          localRun={
            localRun.current ??
            (recovered
              ? { ...recovered.run, opening: recovered.run.opening === true }
              : null)
          }
          initialName={recovered?.name}
          expectedRecipient={recovered?.recipient}
          preparing={preparing}
          leaderboardAvailable={leaderboardEnabled}
          onLeaderboard={() => setLeaderboardOpen(true)}
          onReplay={start}
          onMenu={() => {
            setRecovered(null);
            setExpanded(false);
            setStatus("ready");
          }}
        />
      )}
      {status === "paused" && (
        <Card className="lava-cover lava-pause">
          <h2>Pause</h2>
          <Button
            variant="accent"
            onClick={() => {
              unlockAudio();
              setStatus("playing");
              root.current?.focus({ preventScroll: true });
            }}
          >
            Reprendre
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              stopRepeat();
              audio.current?.mute();
              ranked.current = null;
              setExpanded(false);
              setStatus("ready");
            }}
          >
            Quitter
          </Button>
        </Card>
      )}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        {" "}
        <SheetContent className="lava-sheet z-[80]">
          <SheetHeader>
            <SheetTitle>Réglages</SheetTitle>
            <SheetDescription className="sr-only">
              Effets et commandes du jeu.
            </SheetDescription>
          </SheetHeader>
          <div className="lava-settings">
            {soundEnabled && (
              <Button
                variant="outline"
                role="switch"
                aria-label="Son"
                aria-checked={settings.sound}
                onClick={() => toggle("sound")}
              >
                Son{" "}
                <Badge variant={settings.sound ? "default" : "secondary"}>
                  {settings.sound ? "Oui" : "Non"}
                </Badge>
              </Button>
            )}
            {soundEnabled && settings.sound && (
              <fieldset className="lava-audio-mixer">
                <legend className="sr-only">Volumes du son</legend>
                {(
                  [
                    [
                      "effectsVolume",
                      "Effets sonores",
                      "Rotation et chute des briques",
                    ],
                    ["musicVolume", "Musique", "Fond musical"],
                    ["voiceVolume", "Voix", "Nice et wow"],
                  ] as const
                ).map(([key, label, description]) => (
                  <div className="lava-audio-volume" key={key}>
                    <div className="lava-audio-volume-heading">
                      <label htmlFor={`tetris-${key}`}>{label}</label>
                      <span aria-hidden="true">{settings[key]} %</span>
                    </div>
                    <p id={`tetris-${key}-description`}>{description}</p>
                    <input
                      id={`tetris-${key}`}
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={settings[key]}
                      aria-valuetext={`${settings[key]} %`}
                      aria-describedby={`tetris-${key}-description`}
                      onChange={(event) =>
                        setVolume(key, Number(event.target.value))
                      }
                    />
                  </div>
                ))}
              </fieldset>
            )}
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
            <Button
              variant="outline"
              role="switch"
              aria-label="Thème sombre"
              aria-checked={theme === "dark"}
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              Thème sombre
              <Badge variant={theme === "dark" ? "default" : "secondary"}>
                {theme === "dark" ? "Oui" : "Non"}
              </Badge>
            </Button>
            <p className="text-xs text-muted-foreground">
              L’option iOS utilise une astuce non officielle de Safari 18+,
              uniquement sur les impacts forts. Elle peut ne produire aucune
              vibration.
            </p>
          </div>
        </SheetContent>
      </Sheet>
      {leaderboardEnabled && (
        <Leaderboard open={leaderboardOpen} onOpenChange={setLeaderboardOpen} />
      )}
      <Sheet open={rulesOpen} onOpenChange={setRulesOpen}>
        <SheetContent className="lava-sheet z-[80]">
          <SheetHeader>
            <SheetTitle>Règles</SheetTitle>
            <SheetDescription className="sr-only">
              Contrôles, score et crédits.
            </SheetDescription>
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
          ? `Partie terminée. ${recovered?.summary.score ?? g.score} points.`
          : status === "paused"
            ? "Partie en pause."
            : ""}
      </span>
    </Card>
  );
}

export function Tetris(props: { information?: CaseStudySection[] }) {
  return (
    <PlayerIdentityProvider>
      <TetrisGame {...props} />
    </PlayerIdentityProvider>
  );
}
