/* eslint-disable react-hooks/refs -- Imperative game engine: React HUD is explicitly refreshed at 25 Hz; canvas reads the same engine at frame rate. */
"use client";
import { track as usage } from "@/lib/tracking/client";

import { NativeInput } from "@/components/design-system/native-controls";
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
  Repeat2,
  Pause,
  Play,
  Trophy,
  BookOpen,
  Keyboard,
  Settings as SettingsIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { AppShell } from "@/components/layout/app-shell";
import { DesignSystemScope } from "@/components/design-system/provider";
import { Badge } from "@/components/ui/badge";
import { GameSettingsPanel, useGameSettings } from "@/components/games/game-settings";
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
  saveSettings,
  writeStore,
  type Settings,
  type AudioVolumes,
} from "../feel/config";
import { PieceShape as Mini } from "./piece-shape";
import { Link } from "@/i18n/navigation";
import type { CaseStudySection } from "@/lib/content";
import { LineCelebration } from "../feel/line-celebration";
import { lineFeel, lineCount } from "../feel/line-config";
import { haptic } from "../feel/haptics";
import { sourceLicense } from "../engine/source-license";
import { GameAudio } from "../feel/audio";
import { soundEnabled, leaderboardEnabled, tetrisEnabled } from "../flags";
import { tetrisSettings } from "./settings.config";
import { seeded, replayLimit } from "../engine/replay";
import { Leaderboard, type RankedRun } from "./leaderboard";
import { PlayerIdentityProvider } from "./player-identity";
import { GameOver } from "./game-over";
import { Separator } from "@/components/ui/separator";
import { recoverDraft, type ScoreDraft } from "../auth/draft";
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
  const settingsTriggerRef = useRef<HTMLButtonElement | null>(null);
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
  const { settings, update: updateGameSettings } = useGameSettings(
    "tetris",
    defaults,
    loadSettings,
    saveSettings,
  );
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
        usage.game("tetris", g.score);
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
      // Game over mounts a modal; refreshing the HUD would recreate its props
      // every frame and retrigger score submission.
      if (status !== "over" && now - ui > 40) {
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
    updateGameSettings({ [key]: value });
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
    updateGameSettings({ [key]: !settings[key] });
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
    <div
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
          <header className="lava-lobby-header">
            <div>
              <Link
                href="/jeux"
                className="lava-breadcrumb"
                aria-label="Retour aux jeux"
              >
                <ArrowLeft
                  className="size-4 rtl:rotate-180"
                  aria-hidden="true"
                />
                Jeux
              </Link>
              <h1>Tetris</h1>
              <p>Un classique, une pièce à la fois.</p>
            </div>
            <Button variant="ghost" size="icon" aria-label="Réglages" onClick={(event) => { settingsTriggerRef.current = event.currentTarget; setSettingsOpen(true); }}>
              <SettingsIcon aria-hidden="true" />
            </Button>
          </header>
          <div className="lava-lobby-grid">
            <Card className="lava-lobby-panel">
              <CardHeader>
                <CardTitle>À vous de jouer</CardTitle>
                <CardDescription>
                  Complétez les lignes et battez votre record.
                </CardDescription>
              </CardHeader>
              <CardContent className="lava-lobby-actions">
                <Button
                  variant="accent"
                  size="lg"
                  onClick={start}
                  disabled={preparing || !hydrated}
                >
                  <Play aria-hidden="true" />
                  {preparing ? "Préparation…" : "Jouer"}
                </Button>
                <Separator />
                <Button
                  variant="outline"
                  disabled={!leaderboardEnabled}
                  onClick={() => setLeaderboardOpen(true)}
                >
                  <Trophy aria-hidden="true" />
                  Classement
                  {!leaderboardEnabled && (
                    <Badge variant="secondary">Bientôt</Badge>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setRulesOpen(true)}>
                  <BookOpen aria-hidden="true" />
                  Règles
                </Button>
              </CardContent>
            </Card>
            <div className="lava-lobby-details">
              <Card className="lava-record-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="size-4" aria-hidden="true" />
                    Votre record
                  </CardTitle>
                  <CardDescription>Sur cet appareil</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="lava-record-value">
                    {hydrated ? best.toLocaleString("fr") : "—"}
                    <span>points</span>
                  </p>
                  <div className="lava-piece-line" aria-hidden="true">
                    <Mini name="T" />
                    <Mini name="S" />
                    <Mini name="L" />
                    <Mini name="I" />
                  </div>
                </CardContent>
              </Card>
              <Card className="lava-guide-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Keyboard className="size-4" aria-hidden="true" />
                    Les commandes
                  </CardTitle>
                  <CardDescription>
                    Au clavier ou directement sur l’écran.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <dl className="lava-shortcuts">
                    <div>
                      <dt>Déplacer</dt>
                      <dd>
                        <kbd>←</kbd>
                        <kbd>→</kbd>
                      </dd>
                    </div>
                    <div>
                      <dt>Pivoter</dt>
                      <dd>
                        <kbd>↑</kbd>
                        <kbd>X</kbd>
                      </dd>
                    </div>
                    <div>
                      <dt>Lâcher la pièce</dt>
                      <dd>
                        <kbd>Espace</kbd>
                      </dd>
                    </div>
                    <div>
                      <dt>Mettre en réserve</dt>
                      <dd>
                        <kbd>C</kbd>
                      </dd>
                    </div>
                    <div>
                      <dt>Pause</dt>
                      <dd>
                        <kbd>Échap</kbd>
                      </dd>
                    </div>
                  </dl>
                  <p className="lava-touch-hint">
                    Sur mobile, glissez pour déplacer et touchez pour pivoter.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="lava-top">
            <span className="lava-wordmark">Tetris</span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                aria-label="Réglages"
                onClick={(event) => {
                  settingsTriggerRef.current = event.currentTarget;
                  setStatus("paused");
                  setSettingsOpen(true);
                }}
              >
                <SettingsIcon />
              </Button>
              <Button
                variant="ghost"
                aria-label="Mettre en pause"
                onClick={() => {
                  stopRepeat();
                  setStatus("paused");
                }}
              >
                <Pause />
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
              ? {
                  ...recovered.run,
                  opening: recovered.run.opening === true,
                }
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
        <div className="lava-cover lava-pause">
          <Card className="lava-pause-panel">
            <CardHeader>
              <CardTitle>
                <h2>Partie en pause</h2>
              </CardTitle>
              <CardDescription>Reprenez quand vous êtes prêt.</CardDescription>
            </CardHeader>
            <CardContent className="lava-lobby-actions">
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
            </CardContent>
          </Card>
        </div>
      )}
      <GameSettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        triggerRef={settingsTriggerRef}
        config={tetrisSettings}
        settings={settings}
        onSettingChange={(id, value) => {
          if (id === "sound") toggle("sound");
          else if (
            id === "effectsVolume" ||
            id === "musicVolume" ||
            id === "voiceVolume"
          ) {
            setVolume(id, Number(value));
          } else if (
            id === "haptics" ||
            id === "ios" ||
            id === "reduced" ||
            id === "overlay"
          ) {
            toggle(id);
          }
        }}
      />
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
      <NativeInput
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
    </div>
  );
}

export function Tetris(props: { information?: CaseStudySection[] }) {
  return (
    <AppShell>
      <DesignSystemScope>
        <PlayerIdentityProvider>
          <TetrisGame {...props} />
        </PlayerIdentityProvider>
      </DesignSystemScope>
    </AppShell>
  );
}
