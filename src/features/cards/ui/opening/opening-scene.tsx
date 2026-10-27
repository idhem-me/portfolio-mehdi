"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { getCard } from "../../catalog/cards";
import { RARITY_LABELS, RARITY_RANK, type Rarity } from "../../catalog/types";
import type { OpeningController } from "../../engine/opening";
import type { CardsAudio } from "../../feel/audio";
import type { CardsSettings } from "../../feel/config";
import { cardsHaptic } from "../../feel/haptics";
import type { ActiveOpen, CutDirection } from "../../persistence/types";
import { CardFace } from "../card-face";
import { DevPreviewPanel } from "../dev-preview";
import { BoosterCutStage } from "./booster-cut-stage";
import { CardStack } from "./card-stack";
import { cameraZoomTiming } from "./gesture-config";
import "./opening-motion.css";

type Props = {
  controller: OpeningController;
  settings: CardsSettings;
  audio: React.MutableRefObject<CardsAudio | null>;
  iosSwitch: React.RefObject<HTMLInputElement | null>;
  onSaveChange: () => void;
  collection: Record<string, { qty: number }>;
};

export function OpeningScene({
  controller,
  settings,
  audio,
  iosSwitch,
  onSaveChange,
  collection,
}: Props) {
  const reduced = usePrefersReducedMotion();
  const [tick, setTick] = useState(0);
  const [immersiveExit, setImmersiveExit] = useState(false);
  const starting = useRef(false);
  const zoomDone = useRef(false);

  const save = controller.getSave();
  const open = save.activeOpen;
  void tick;

  const refresh = useCallback(() => {
    onSaveChange();
    setTick((t) => t + 1);
  }, [onSaveChange]);

  const unlockFeel = () => {
    if (settings.sound) {
      audio.current?.unlock();
      audio.current?.setVolume(settings.effectsVolume);
    }
  };

  const startOpen = () => {
    if (starting.current) return;
    starting.current = true;
    setImmersiveExit(false);
    zoomDone.current = false;
    unlockFeel();
    cardsHaptic("light", settings, iosSwitch.current);
    controller.startOpen();
    refresh();
    starting.current = false;
  };

  const onCutValidated = (direction: CutDirection) => {
    controller.setCutDirection(direction);
    controller.setPhase("wrapperExit");
    refresh();
  };

  const onWrapperExitDone = () => {
    const current = controller.getSave().activeOpen;
    if (!current || current.phase !== "wrapperExit") return;
    controller.setPhase("cameraZoom");
    refresh();
  };

  useEffect(() => {
    if (!open || open.phase !== "cameraZoom" || zoomDone.current) return;
    zoomDone.current = true;
    const ms = reduced ? cameraZoomTiming.reducedMs : cameraZoomTiming.durationMs;
    const t = window.setTimeout(() => {
      // Reveal first card as front
      const o = controller.getSave().activeOpen;
      if (o && !o.revealed[0]) {
        // Mark first as "active" without advancing — stack handles reveal UX
      }
      controller.setPhase("revealing");
      refresh();
    }, ms);
    return () => window.clearTimeout(t);
  }, [open, reduced, controller, refresh]);

  // Reset zoom flag when a new open starts
  useEffect(() => {
    if (open?.phase === "cutting") zoomDone.current = false;
  }, [open?.openId, open?.phase]);

  const advance = () => {
    controller.advanceCard();
    refresh();
  };

  const revealAll = () => {
    unlockFeel();
    audio.current?.emit("reveal");
    cardsHaptic("rare", settings, iosSwitch.current);
    controller.revealAll();
    refresh();
  };

  const dismissAndMaybeAgain = (again: boolean) => {
    controller.dismissSummary();
    setImmersiveExit(false);
    refresh();
    if (again) window.setTimeout(() => startOpen(), 0);
  };

  const qtyBefore = (cardId: string, openSnapshot: ActiveOpen) => {
    const owned = collection[cardId]?.qty ?? 0;
    if (openSnapshot.finalized || openSnapshot.simulation) {
      const inPack = openSnapshot.cards.filter((c) => c.cardId === cardId).length;
      return Math.max(0, owned - (openSnapshot.simulation ? 0 : inPack));
    }
    return owned;
  };

  // —— Idle / closed ——
  if (!open || open.phase === "closed" || open.phase === "idle") {
    return (
      <div className="cards-opening cards-opening-idle">
        <div className="cards-booster-idle" aria-hidden>
          <div className="cards-booster-pack">
            <span>Booster</span>
          </div>
        </div>
        <Button
          variant="accent"
          size="lg"
          className="min-h-11 w-full max-w-sm"
          onClick={startOpen}
        >
          Ouvrir un booster
        </Button>
        {process.env.NODE_ENV === "development" && (
          <DevPreviewPanel
            onSimulate={(opts) => {
              unlockFeel();
              setImmersiveExit(false);
              zoomDone.current = false;
              controller.startSimulation(opts);
              refresh();
            }}
            disabled={Boolean(
              open && !open.simulation && open.phase !== "summary",
            )}
          />
        )}
      </div>
    );
  }

  // —— Summary ——
  if (open.phase === "summary") {
    return (
      <div className="cards-opening cards-summary">
        {open.simulation && (
          <Badge variant="secondary" className="mb-3">
            Simulation — non ajoutée à la collection
          </Badge>
        )}
        <h2 className="text-lg font-medium">Récapitulatif</h2>
        <ul className="cards-summary-list">
          {open.cards.map((drawn, index) => {
            const card = getCard(drawn.cardId)!;
            const before = qtyBefore(drawn.cardId, open);
            const isNew = before === 0 && !open.simulation;
            const ownedNow = open.simulation
              ? before
              : (collection[drawn.cardId]?.qty ?? before + 1);
            return (
              <li
                key={`${open.openId}-sum-${index}`}
                className="cards-summary-item"
              >
                <CardFace
                  card={card}
                  compact
                  isNew={isNew}
                  qty={ownedNow}
                  effectActive={
                    !reduced &&
                    RARITY_RANK[card.rarity as Rarity] >= RARITY_RANK.epic
                  }
                />
                <div className="min-w-0">
                  <p className="font-medium">{card.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {RARITY_LABELS[card.rarity]}
                    {open.simulation
                      ? " · aperçu"
                      : isNew
                        ? " · Nouvelle"
                        : ` · Doublon · ×${ownedNow}`}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 flex w-full max-w-sm flex-col gap-2">
          <Button
            variant="accent"
            size="lg"
            className="min-h-11"
            onClick={() => dismissAndMaybeAgain(true)}
          >
            Ouvrir un autre booster
          </Button>
          <Button
            variant="outline"
            className="min-h-11"
            onClick={() => dismissAndMaybeAgain(false)}
          >
            Terminer
          </Button>
        </div>
      </div>
    );
  }

  // Immersive exit: show compact resume without killing activeOpen
  if (immersiveExit) {
    return (
      <div className="cards-opening cards-opening-idle">
        <p className="mb-3 text-sm text-muted-foreground">
          Ouverture en cours — {open.currentIndex}/5 cartes parcourues.
        </p>
        <Button
          variant="accent"
          size="lg"
          className="min-h-11 w-full max-w-sm"
          onClick={() => setImmersiveExit(false)}
        >
          Reprendre
        </Button>
      </div>
    );
  }

  const immersive =
    open.phase === "cutting" ||
    open.phase === "wrapperExit" ||
    open.phase === "cameraZoom" ||
    open.phase === "revealing" ||
    open.phase === "preparing" ||
    open.phase === "tearing";

  const cutPhase =
    open.phase === "wrapperExit"
      ? "wrapperExit"
      : open.phase === "cutting" ||
          open.phase === "preparing" ||
          open.phase === "tearing"
        ? "cutting"
        : null;

  return (
    <div
      className={`cards-opening-immersive ${immersive ? "is-immersive" : ""}`}
    >
      <div className="cards-immersive-chrome">
        <Button
          variant="ghost"
          size="icon"
          className="min-h-11 min-w-11"
          aria-label="Quitter la scène d’ouverture"
          onClick={() => setImmersiveExit(true)}
        >
          <X />
        </Button>
        {open.simulation && (
          <Badge variant="secondary">Simulation (dev)</Badge>
        )}
        {open.kind === "gold_pack" && open.phase !== "revealing" && (
          <Badge variant="default">Gold Pack</Badge>
        )}
      </div>

      <motion.div
        className="cards-opening-stage"
        initial={false}
        animate={
          open.phase === "cameraZoom" && !reduced
            ? {
                scale: [1, 1.04, 1.08],
                y: [0, -6, -10],
                rotate: [0, -0.6, 0],
              }
            : open.phase === "revealing"
              ? { scale: 1, y: 0, rotate: 0 }
              : { scale: 1, y: 0, rotate: 0 }
        }
        transition={{
          duration: (reduced
            ? cameraZoomTiming.reducedMs
            : cameraZoomTiming.durationMs) / 1000,
          ease: [0.22, 0.8, 0.25, 1],
        }}
      >
        {cutPhase && (
          <BoosterCutStage
            key={`${open.openId}-cut`}
            kind={open.kind}
            phase={cutPhase}
            cutDirection={open.cutDirection}
            reduced={reduced}
            settings={settings}
            audio={audio}
            iosSwitch={iosSwitch}
            onCutValidated={onCutValidated}
            onWrapperExitDone={onWrapperExitDone}
          />
        )}

        {(open.phase === "cameraZoom" || open.phase === "revealing") && (
          <CardStack
            cards={open.cards}
            currentIndex={open.currentIndex}
            reduced={reduced}
            settings={settings}
            audio={audio}
            iosSwitch={iosSwitch}
            onAdvance={advance}
            onRevealAll={revealAll}
          />
        )}
      </motion.div>
    </div>
  );
}
