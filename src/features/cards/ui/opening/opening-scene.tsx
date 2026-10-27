"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { getCard } from "../../catalog/cards";
import type { OpeningController } from "../../engine/opening";
import type { CardsAudio } from "../../feel/audio";
import type { CardsSettings } from "../../feel/config";
import { cardsHaptic } from "../../feel/haptics";
import type { ActiveOpen, CutDirection } from "../../persistence/types";
import { CardFace } from "../card-face";
import { DevPreviewPanel } from "../dev-preview";
import { BoosterCutStage } from "./booster-cut-stage";
import { CardStack } from "./card-stack";
import {
  refillBoosters,
  nextBoosterIn,
  BOOSTER_CAPACITY,
  canBypassBoosterLimit,
} from "../../engine/boosters";
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
  const [clock, setClock] = useState(() => Date.now());
  const [devUnlimited, setDevUnlimited] = useState(false);
  useEffect(() => {
    const update = () => setClock(Date.now());
    const timer = window.setInterval(update, 1000);
    window.addEventListener("focus", update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", update);
    };
  }, []);

  const save = controller.getSave();
  const open = save.activeOpen;
  void tick;

  const refresh = useCallback(() => {
    onSaveChange();
    setTick((t) => t + 1);
  }, [onSaveChange]);

  useEffect(() => {
    if (immersiveExit) audio.current?.stop();
  }, [immersiveExit, audio]);
  useEffect(() => {
    const instance = audio.current;
    return () => instance?.stop();
  }, [audio]);

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
    unlockFeel();
    cardsHaptic("light", settings, iosSwitch.current);
    const next = controller.startOpen(undefined, devUnlimited);
    if (!next) starting.current = false;
    refresh();
    // Keep the guard until React commits the new opening.
  };

  const onCutValidated = useCallback(
    (direction: CutDirection) => {
      controller.setCutDirection(direction);
      controller.setPhase("wrapperExit");
      refresh();
    },
    [controller, refresh],
  );

  const onWrapperExitDone = useCallback(() => {
    const current = controller.getSave().activeOpen;
    if (!current || current.phase !== "wrapperExit") return;
    controller.setPhase("cameraZoom");
    refresh();
  }, [controller, refresh]);

  useEffect(() => {
    if (immersiveExit || open?.phase !== "cameraZoom") return;
    const id = window.setTimeout(
      () => {
        controller.setPhase("revealing");
        refresh();
      },
      reduced ? cameraZoomTiming.reducedMs : cameraZoomTiming.durationMs,
    );
    return () => window.clearTimeout(id);
  }, [open?.openId, open?.phase, immersiveExit, reduced, controller, refresh]);

  useEffect(() => {
    starting.current = false;
  }, [open?.openId]);

  const commit = (index: number) => {
    controller.advanceCard(index);
  };

  const qtyBefore = (cardId: string, openSnapshot: ActiveOpen) => {
    const owned = collection[cardId]?.qty ?? 0;
    if (openSnapshot.finalized || openSnapshot.simulation) {
      const inPack = openSnapshot.cards.filter(
        (c) => c.cardId === cardId,
      ).length;
      return Math.max(0, owned - (openSnapshot.simulation ? 0 : inPack));
    }
    return owned;
  };

  const bank = refillBoosters(save.boosters, clock);
  const wait = nextBoosterIn(bank, clock);
  const seconds = Math.ceil((wait ?? 0) / 1000);
  const countdown = `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor(seconds / 60) % 60).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const unlimited = devUnlimited && canBypassBoosterLimit();
  const boosterStatus = (
    <div className="cards-booster-reserve text-center space-y-2 mb-4">
      <p className="text-sm font-medium">
        {bank.available} / {BOOSTER_CAPACITY} boosters gratuits
      </p>
      <p className="text-xs text-muted-foreground">
        {wait === null
          ? "Réserve pleine · 1 booster offert par heure"
          : `Prochain booster dans ${countdown} · 1 par heure`}
      </p>
      {canBypassBoosterLimit() && (
        <Button
          size="sm"
          variant={unlimited ? "secondary" : "outline"}
          aria-pressed={unlimited}
          onClick={() => setDevUnlimited((value) => !value)}
        >
          Mode dev : boosters illimités {unlimited ? "activés" : "désactivés"}
        </Button>
      )}
    </div>
  );

  // —— Idle / closed ——
  if (!open || open.phase === "closed" || open.phase === "idle") {
    return (
      <div className="cards-opening cards-opening-idle">
        {boosterStatus}
        <div className="cards-booster-idle" aria-hidden>
          <div className="cards-booster-pack">
            <span>Booster</span>
          </div>
        </div>
        <Button
          variant="accent"
          size="lg"
          className="cards-primary-cta min-h-11 w-full max-w-sm"
          onClick={startOpen}
          disabled={bank.available === 0 && !unlimited}
        >
          Ouvrir un booster
        </Button>
        {process.env.NODE_ENV === "development" && (
          <DevPreviewPanel
            onSimulate={(opts) => {
              unlockFeel();
              setImmersiveExit(false);
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
        {boosterStatus}
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
            const isNew =
              before === 0 &&
              !open.simulation &&
              open.cards.findIndex((c) => c.cardId === drawn.cardId) === index;
            const ownedNow = open.simulation
              ? before
              : (collection[drawn.cardId]?.qty ?? before + 1);
            return (
              <li
                key={`${open.openId}-sum-${index}`}
                className="cards-summary-item"
              >
                <CardFace card={card} compact shiny={drawn.shiny} />
                <div className="min-w-0">
                  <Badge variant={isNew ? "default" : "secondary"}>
                    {open.simulation
                      ? "Aperçu"
                      : isNew
                        ? "Nouvelle"
                        : `Doublon ×${ownedNow}`}
                  </Badge>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 flex w-full max-w-sm flex-col gap-2">
          <Button
            variant="accent"
            size="lg"
            className="cards-primary-cta min-h-11"
            onClick={startOpen}
            disabled={bank.available === 0 && !unlimited}
          >
            Ouvrir
          </Button>
        </div>
        {open.simulation && process.env.NODE_ENV === "development" && (
          <DevPreviewPanel
            onSimulate={(options) => {
              setImmersiveExit(false);
              unlockFeel();
              controller.startSimulation(options);
              refresh();
            }}
          />
        )}
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
          className="cards-primary-cta min-h-11 w-full max-w-sm"
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
    <Dialog
      open={immersive}
      onOpenChange={(value) => {
        if (!value) setImmersiveExit(true);
      }}
    >
      <DialogContent
        className="cards-opening-immersive cards-surface is-immersive"
        style={{ translate: "none" }}
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          document
            .querySelector<HTMLElement>('[role="tab"][data-state="active"]')
            ?.focus();
        }}
      >
        <DialogTitle className="sr-only">Ouverture du booster</DialogTitle>
        <DialogDescription className="sr-only">
          Découpez puis touchez ou glissez les cinq cartes. Échap permet de
          suspendre et reprendre l’ouverture.
        </DialogDescription>
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
            duration:
              (reduced
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

          {(cutPhase ||
            open.phase === "cameraZoom" ||
            open.phase === "revealing") && (
            <CardStack
              key={open.openId}
              enabled={open.phase === "revealing"}
              visible={
                open.phase === "wrapperExit" ||
                open.phase === "cameraZoom" ||
                open.phase === "revealing"
              }
              cards={open.cards}
              currentIndex={open.currentIndex}
              reduced={reduced}
              settings={settings}
              audio={audio}
              iosSwitch={iosSwitch}
              onCommit={commit}
              onSettled={refresh}
            />
          )}
        </motion.div>
        {cutPhase === "cutting" && (
          <Button
            variant="accent"
            size="lg"
            className="cards-primary-cta min-h-11"
            onClick={() => {
              unlockFeel();
              audio.current?.emit("tear");
              cardsHaptic("tear", settings, iosSwitch.current);
              onCutValidated("right");
            }}
          >
            Découper le booster
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
