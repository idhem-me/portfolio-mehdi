"use client";
import { clampQuantity, MAX_OPENING_BOOSTERS } from "../../engine/quantity";
import {
  affordableBoosters,
  openingCost,
  boosterCountdown,
} from "../../engine/economy";
import { formatCredits } from "../../shop/catalog";
import { QuantityPicker } from "./quantity-picker";
import { useScopedTheme } from "@/components/ui/scoped-theme";
import { Link } from "@/i18n/navigation";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { X, PlayingCardsFan, Info, Gem } from "lucide-react";
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
import { RARITY_RANK } from "../../catalog/types";
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
  onStart: (
    setId: CardSetId,
    quantity: number,
    maxGemCost: number,
  ) => Promise<void>;
  credits: number;
  ready: boolean;
  settings: CardsSettings;
  audio: React.MutableRefObject<CardsAudio | null>;
  iosSwitch: React.RefObject<HTMLInputElement | null>;
  onSaveChange: () => void;
  onViewCollection: () => void;
  collection: Record<string, { qty: number }>;
};

export function OpeningScene({
  controller,
  onStart,
  credits,
  ready,
  settings,
  audio,
  iosSwitch,
  onSaveChange,
  onViewCollection,
  collection,
}: Props) {
  const scopedTheme = useScopedTheme();
  const reduced = usePrefersReducedMotion();
  const [quantity, setQuantity] = useState(1);
  const [selectedSet, setSelectedSet] = useState<CardSetId>("origins");
  const [entryRect, setEntryRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const captureBooster = () => {
    const rect = document
      .querySelector(
        `[data-booster-set="${selectedSet}"] .cards-selector-pack-frame`,
      )
      ?.getBoundingClientRect();
    setEntryRect(
      rect
        ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
        : null,
    );
  };
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

  const [summaryLimit, setSummaryLimit] = useState(50);
  const [startError, setStartError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const start = async (quantity: number) => {
    if (starting.current || !ready) return;
    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_OPENING_BOOSTERS
    ) {
      setStartError(
        `Ouvre au maximum ${MAX_OPENING_BOOSTERS} boosters à la fois.`,
      );
      return;
    }
    starting.current = true;
    setLoading(true);
    setStartError(null);
    captureBooster();
    unlockFeel();
    cardsHaptic("light", settings, iosSwitch.current);
    try {
      if (devUnlimited && canBypassBoosterLimit())
        controller.startSimulation({
          setId: selectedSet,
          batchSize: quantity > 1 ? quantity : undefined,
        });
      else
        await onStart(
          selectedSet,
          quantity,
          openingCost(quantity, refillBoosters(save.boosters, clock).available)
            .gems,
        );
      refresh();
    } catch (error) {
      setStartError(
        error instanceof Error ? error.message : "Ouverture impossible.",
      );
    } finally {
      starting.current = false;
      setLoading(false);
    }
  };
  const startOpen = () => {
    void start(
      clampQuantity(
        quantity,
        affordableBoosters(
          refillBoosters(save.boosters, clock).available,
          credits,
        ),
      ),
    );
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
    if (
      open?.phase !== "wrapperExit" ||
      !open.batchKinds ||
      open.batchKinds.length > MAX_OPENING_BOOSTERS ||
      reduced
    )
      return;
    const staggerMs = Math.min(
      wrapperExitTiming.staggerMs,
      2500 / Math.max(1, open.batchKinds.length - 1),
    );
    const start = performance.now();
    const timer = window.setInterval(
      () =>
        setCutFrontIndex(
          Math.min(
            (open.batchKinds?.length ?? 1) - 1,
            Math.floor((performance.now() - start) / staggerMs),
          ),
        ),
      staggerMs,
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
  const unlimited = devUnlimited && canBypassBoosterLimit();
  const available = unlimited
    ? MAX_OPENING_BOOSTERS
    : affordableBoosters(bank.available, credits);
  const wait = nextBoosterIn(bank, clock);
  const countdown = boosterCountdown(wait ?? 0);
  const chosenQuantity = clampQuantity(quantity, available);
  const cost = openingCost(chosenQuantity, bank.available);
  const boosterStatus = (
    <div className="cards-booster-reserve">
      <div className="cards-reserve-start">
        <p
          className="cards-reserve-quantity"
          aria-label={`${bank.available} boosters gratuits sur ${BOOSTER_CAPACITY}`}
        >
          <PlayingCardsFan aria-hidden="true" />
          <span>
            {bank.available} / {BOOSTER_CAPACITY}
          </span>
          <span className="cards-reserve-label">gratuits</span>
        </p>
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
              data-cards-theme={scopedTheme}
              side="bottom"
              align="end"
              sideOffset={8}
              className="z-50 w-64 rounded-lg border border-border bg-popover p-4 text-sm text-popover-foreground shadow-md outline-none"
            >
              <p className="font-medium">Ta réserve de boosters</p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Tu reçois 1 booster toutes les 6 heures, même hors ligne,
                jusqu’à {BOOSTER_CAPACITY} boosters maximum. La recharge reprend
                dès qu’une place se libère. Les gratuits sont utilisés en
                priorité ; chaque booster supplémentaire coûte 100 gems.
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
          onOpen={startOpen}
          canOpen={available > 0 || unlimited}
          selected={selectedSet}
          onSelect={setSelectedSet}
          reduced={reduced}
        />
        <div className="cards-open-actions">
          {startError && (
            <p role="alert" className="text-sm text-destructive">
              {startError}
            </p>
          )}
          <QuantityPicker
            value={chosenQuantity}
            max={Math.min(MAX_OPENING_BOOSTERS, available)}
            onChange={setQuantity}
            disabled={loading || !ready}
          />
          {unlimited ? (
            <p className="cards-opening-price text-sm text-muted-foreground">
              Simulation
            </p>
          ) : (
            chosenQuantity > 0 && (
              <p
                className="cards-opening-price text-sm text-muted-foreground"
                aria-live="polite"
              >
                {cost.freeUsed > 0
                  ? `${cost.freeUsed} gratuit${cost.freeUsed > 1 ? "s" : ""}`
                  : null}
                {cost.freeUsed > 0 && cost.gems > 0 ? " + " : null}
                {cost.gems > 0 ? (
                  <>
                    <Gem aria-hidden="true" size={14} />
                    {formatCredits(cost.gems)} gems
                  </>
                ) : null}
              </p>
            )
          )}
          {ready && available === 0 ? (
            <Button
              variant="accent"
              size="lg"
              asChild
              className="cards-primary-cta min-h-11 w-full max-w-sm"
            >
              <Link href="/boutique?tab=credits">Obtenir des gems</Link>
            </Button>
          ) : (
            <Button
              variant="accent"
              size="lg"
              className="cards-primary-cta min-h-11 w-full max-w-sm"
              onClick={() => void start(chosenQuantity)}
              disabled={loading || !ready || (available === 0 && !unlimited)}
            >
              {loading
                ? "Préparation…"
                : chosenQuantity === 0
                  ? "Aucun booster disponible"
                  : `Ouvrir ${chosenQuantity === 1 ? "un booster" : `${chosenQuantity} boosters`}`}
            </Button>
          )}
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
              captureBooster();
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

  if (
    (open.batchKinds?.length ?? 1) > MAX_OPENING_BOOSTERS &&
    ["cutting", "wrapperExit", "cameraZoom"].includes(open.phase)
  ) {
    return (
      <div className="cards-opening space-y-4 py-8">
        <h2 className="text-lg font-medium">Ton ouverture est sauvegardée</h2>
        <p className="text-sm text-muted-foreground">
          Ce grand lot dépasse la nouvelle limite d’animation. Tu peux découvrir
          ses cartes ou accéder directement au récapitulatif.
        </p>
        <Button
          onClick={() => {
            controller.setPhase("revealing");
            refresh();
          }}
        >
          Découvrir les cartes
        </Button>
        <Button variant="secondary" onClick={finishOpening}>
          Voir le récapitulatif
        </Button>
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
          {(open.batchCards ?? open.cards)
            .slice(0, summaryLimit)
            .map((drawn, index) => {
              const card = getCard(drawn.cardId)!;
              const summaryCards = open.batchCards ?? open.cards;
              const before = open.batchCards
                ? Math.max(
                    0,
                    (collection[drawn.cardId]?.qty ?? 0) -
                      summaryCards.filter(
                        (card) => card.cardId === drawn.cardId,
                      ).length,
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
        {(open.batchCards ?? open.cards).length > summaryLimit && (
          <Button
            variant="secondary"
            onClick={() => setSummaryLimit((n) => n + 50)}
          >
            Afficher les 50 cartes suivantes
          </Button>
        )}
        <div className="cards-summary-actions">
          <Button
            variant="secondary"
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
        className={`cards-opening-immersive cards-surface is-immersive ${entryRect && !reduced ? "cards-scene-entering" : ""}`}
        data-reveal-gold={
          (open.phase === "revealing" &&
            open.discovered?.includes(open.currentIndex) &&
            RARITY_RANK[open.cards[open.currentIndex]?.rarity] >= 3) ||
          undefined
        }
        overlayClassName="cards-opening-overlay"
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
                entryRect={entryRect}
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
              discovered={open.discovered}
              onDiscover={(index) => {
                controller.discover(index);
                refresh();
              }}
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
