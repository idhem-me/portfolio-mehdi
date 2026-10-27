"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { X, PlayingCardsFan, Info } from "lucide-react";
import { Popover } from "radix-ui";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { BoosterSelector } from "./booster-selector";
import { cardSet, type CardSetId } from "../../catalog/cards";
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
  BOOSTER_INTERVAL_MS,
  canBypassBoosterLimit,
} from "../../engine/boosters";
import { cameraZoomTiming, wrapperExitTiming } from "./gesture-config";
import "./opening-motion.css";

const ignoreWrapperExit = () => {};

type Props = {
  controller: OpeningController;
  settings: CardsSettings;
  audio: React.MutableRefObject<CardsAudio | null>;
  iosSwitch: React.RefObject<HTMLInputElement | null>;
  onSaveChange: () => void;
  onViewCollection: () => void;
  collection: Record<string, { qty: number }>;
};

export function OpeningScene({
  controller,
  settings,
  audio,
  iosSwitch,
  onSaveChange,
  onViewCollection,
  collection,
}: Props) {
  const reduced = usePrefersReducedMotion();
  const [selectedSet, setSelectedSet] = useState<CardSetId>("origins");
  const [cutFrontIndex, setCutFrontIndex] = useState(0);
  const [tick, setTick] = useState(0);
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
    unlockFeel();
    cardsHaptic("light", settings, iosSwitch.current);
    const next = controller.startOpen({ setId: selectedSet }, devUnlimited);
    if (!next) starting.current = false;
    refresh();
    // Keep the guard until React commits the new opening.
  };

  const onCutValidated = useCallback(
    (direction: CutDirection) => {
      setCutFrontIndex(0);
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
    if (open?.phase !== "cameraZoom") return;
    const id = window.setTimeout(
      () => {
        controller.setPhase("revealing");
        refresh();
      },
      reduced ? cameraZoomTiming.reducedMs : cameraZoomTiming.durationMs,
    );
    return () => window.clearTimeout(id);
  }, [open?.openId, open?.phase, reduced, controller, refresh]);

  useEffect(() => {
    starting.current = false;
  }, [open?.openId]);

  const finishOpening = () => {
    audio.current?.stop();
    controller.revealAll();
    refresh();
  };

  useEffect(() => {
    if (open?.phase !== "wrapperExit" || !open.batchKinds || reduced) return;
    const start = performance.now();
    const timer = window.setInterval(
      () =>
        setCutFrontIndex(
          Math.min(
            9,
            Math.floor(
              (performance.now() - start) / wrapperExitTiming.staggerMs,
            ),
          ),
        ),
      wrapperExitTiming.staggerMs,
    );
    return () => window.clearInterval(timer);
  }, [open?.openId, open?.phase, open?.batchKinds, reduced]);

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
  const countdown = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const unlimited = devUnlimited && canBypassBoosterLimit();
  const boosterStatus = (
    <div className="cards-booster-reserve">
      <div className="cards-reserve-start">
        <p
          className="cards-reserve-quantity"
          aria-label={`${bank.available} boosters disponibles`}
        >
          <PlayingCardsFan aria-hidden="true" />
          <span>{bank.available}</span>
        </p>
        <Popover.Root>
          <Popover.Trigger asChild>
            <Button variant="primary" size="sm">
              Obtenir des boosters
            </Button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              side="bottom"
              align="start"
              sideOffset={8}
              className="z-50 w-64 rounded-lg border border-border bg-popover p-4 text-sm text-popover-foreground shadow-md outline-none"
            >
              <p className="font-medium">Obtenir des boosters</p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Un booster est offert chaque heure, même hors ligne, jusqu’à{" "}
                {BOOSTER_CAPACITY} dans ta réserve.
              </p>
              <p className="mt-2 text-xs font-medium">
                {wait === null
                  ? "Ta réserve est pleine."
                  : `Prochain booster dans ${countdown}.`}
              </p>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>
      <div className="cards-reserve-recharge">
        <Popover.Root>
          <Popover.Trigger asChild>
            <Button
              variant="secondary"
              size="icon-sm"
              aria-label="Informations sur les boosters"
            >
              <Info aria-hidden="true" />
            </Button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              side="bottom"
              align="end"
              sideOffset={8}
              className="z-50 w-64 rounded-lg border border-border bg-popover p-4 text-sm text-popover-foreground shadow-md outline-none"
            >
              <p className="font-medium">Ta réserve de boosters</p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Tu reçois 1 booster par heure, même hors ligne, jusqu’à{" "}
                {BOOSTER_CAPACITY} boosters maximum. La recharge reprend dès
                qu’une place se libère.
              </p>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
        <div className="cards-reserve-timer-stack">
          <div
            className="cards-recharge-meter"
            role="progressbar"
            aria-label="Recharge du prochain booster"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(
              wait === null ? 100 : (1 - wait / BOOSTER_INTERVAL_MS) * 100,
            )}
            aria-valuetext={
              wait === null
                ? "Réserve pleine"
                : `Prochain booster dans ${countdown}`
            }
          >
            <span
              style={{
                width: `${wait === null ? 100 : (1 - wait / BOOSTER_INTERVAL_MS) * 100}%`,
              }}
            />
          </div>
          <span className="cards-reserve-countdown">
            {wait === null ? "Réserve pleine" : `+1 dans ${countdown}`}
          </span>
        </div>
      </div>
    </div>
  );

  // —— Idle / closed ——
  if (!open || open.phase === "closed" || open.phase === "idle") {
    return (
      <div className="cards-opening cards-opening-idle">
        {boosterStatus}
        <BoosterSelector
          collection={collection}
          selected={selectedSet}
          onSelect={setSelectedSet}
          reduced={reduced}
        />
        <div className="cards-open-actions">
          <Button
            variant="outline"
            size="lg"
            disabled={bank.available < 10 && !unlimited}
            title={
              bank.available < 10 && !unlimited
                ? "10 boosters disponibles sont nécessaires"
                : undefined
            }
            onClick={() => {
              if (starting.current) return;
              starting.current = true;
              unlockFeel();
              controller.openTen({ setId: selectedSet }, unlimited);
              refresh();
              starting.current = false;
            }}
          >
            Ouvrir 10 boosters
            {bank.available < 10 && !unlimited
              ? ` · ${bank.available}/10 disponibles`
              : ""}
          </Button>
          <Button
            variant="accent"
            size="lg"
            className="cards-primary-cta min-h-11 w-full max-w-sm"
            onClick={startOpen}
            disabled={bank.available === 0 && !unlimited}
          >
            Ouvrir un booster
          </Button>
        </div>
        {process.env.NODE_ENV === "development" && (
          <DevPreviewPanel
            unlimited={unlimited}
            onToggleUnlimited={
              canBypassBoosterLimit()
                ? () => setDevUnlimited((value) => !value)
                : undefined
            }
            onSimulate={(opts) => {
              unlockFeel();
              controller.startSimulation({ ...opts, setId: selectedSet });
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
        <ul className="cards-grid cards-summary-list">
          {(open.batchCards ?? open.cards).map((drawn, index) => {
            const card = getCard(drawn.cardId)!;
            const summaryCards = open.batchCards ?? open.cards;
            const before = open.batchCards
              ? Math.max(
                  0,
                  (collection[drawn.cardId]?.qty ?? 0) -
                    summaryCards.filter((card) => card.cardId === drawn.cardId)
                      .length,
                )
              : qtyBefore(drawn.cardId, open);
            const isNew =
              before === 0 &&
              !open.simulation &&
              summaryCards.findIndex((c) => c.cardId === drawn.cardId) ===
                index;
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
                  shiny={drawn.shiny}
                  qty={ownedNow}
                />
                {isNew && (
                  <Badge variant="default" className="cards-summary-new">
                    Nouveau
                  </Badge>
                )}
              </li>
            );
          })}
        </ul>
        <div className="cards-summary-actions">
          <Button
            variant="primary"
            size="lg"
            className="min-h-11"
            onClick={() => {
              controller.dismissSummary();
              refresh();
              onViewCollection();
            }}
          >
            Voir ma collection
          </Button>
          <Button
            variant="accent"
            size="lg"
            className="min-h-11"
            onClick={() => {
              controller.dismissSummary();
              refresh();
            }}
          >
            Ouvrir des boosters
          </Button>
        </div>
        {open.simulation && process.env.NODE_ENV === "development" && (
          <DevPreviewPanel
            onSimulate={(options) => {
              unlockFeel();
              controller.startSimulation(options);
              refresh();
            }}
          />
        )}
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
        if (!value) finishOpening();
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
          Découpez puis touchez ou glissez les cartes. Échap termine l’ouverture
          et affiche le récapitulatif.
        </DialogDescription>
        <div className="cards-immersive-chrome">
          <Button
            variant="ghost"
            size="icon"
            className="min-h-11 min-w-11"
            aria-label="Quitter la scène d’ouverture"
            onClick={finishOpening}
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
          animate={{ scale: 1, y: 0, rotate: 0 }}
          transition={{
            duration:
              (reduced
                ? cameraZoomTiming.reducedMs
                : cameraZoomTiming.durationMs) / 1000,
            ease: [0.22, 0.8, 0.25, 1],
          }}
        >
          {cutPhase &&
            Array.from({ length: open.batchKinds?.length ?? 1 }, (_, index) => (
              <BoosterCutStage
                key={`${open.openId}-cut-${index}`}
                stackIndex={index}
                batchCount={open.batchKinds?.length ?? 1}
                kind={open.batchKinds?.[index] ?? open.kind}
                setId={cardSet(getCard(open.cards[0].cardId)!)}
                frontIndex={cutFrontIndex}
                phase={cutPhase}
                cutDirection={open.cutDirection}
                reduced={reduced}
                settings={settings}
                audio={audio}
                iosSwitch={iosSwitch}
                onCutValidated={onCutValidated}
                onWrapperExitDone={
                  index === (open.batchKinds?.length ?? 1) - 1
                    ? onWrapperExitDone
                    : ignoreWrapperExit
                }
              />
            ))}

          {(cutPhase ||
            open.phase === "cameraZoom" ||
            open.phase === "revealing") && (
            <CardStack
              key={open.openId}
              enabled={open.phase === "revealing"}
              visible={
                (open.phase === "wrapperExit" && !open.batchKinds) ||
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
      </DialogContent>
    </Dialog>
  );
}
