"use client";
import {
  createOpeningController,
  type OpeningController,
} from "../engine/opening";
import { emptySave, type CardsSave } from "../persistence/types";
import { cardsRequest } from "./client";
/** Animation state is optimistic and memory-only; only the server draws and credits cards. */
export function createAccountController(
  notify: () => void,
  onError: (message: string) => void,
) {
  let memory = emptySave();
  const engine = createOpeningController({
    load: () => memory,
    save: (save) => {
      memory = save;
    },
    clear: () => {
      memory = emptySave();
    },
  });
  let queue = Promise.resolve();
  let outstanding = 0;
  const send = (action: string, payload: Record<string, unknown>) => {
    const id = crypto.randomUUID();
    outstanding++;
    queue = queue.then(async () => {
      try {
        const result = await cardsRequest(action, payload, id);
        outstanding--;
        if (!outstanding) {
          engine.replaceSave(result.save);
          notify();
        }
      } catch (error) {
        outstanding--;
        onError(
          error instanceof Error ? error.message : "Enregistrement impossible.",
        );
        try {
          const current = await cardsRequest();
          if (!outstanding) {
            engine.replaceSave(current.save);
            notify();
          }
        } catch {}
      }
    });
  };
  const perform = (
    action: string,
    payload: Record<string, unknown>,
    fn: () => void,
  ) => {
    const open = engine.getSave().activeOpen;
    fn();
    notify();
    if (!open?.simulation) send(action, { openId: open?.openId, ...payload });
  };
  const controller: OpeningController = {
    ...engine,
    startOpen: () => null,
    openTen: () => null,
    replaceSave: (save: CardsSave) => {
      if (!outstanding && !engine.getSave().activeOpen?.simulation)
        engine.replaceSave(save);
    },
    discover: (index) => {
      if (engine.getSave().activeOpen?.discovered?.includes(index)) return;
      perform("discover", { index }, () => engine.discover(index));
    },
    setPhase: (phase) =>
      perform(
        "phase",
        { phase, direction: engine.getSave().activeOpen?.cutDirection },
        () => engine.setPhase(phase),
      ),
    setCutDirection: (direction) => engine.setCutDirection(direction),
    advanceCard: (index) => {
      const current = engine.getSave().activeOpen;
      if (
        !current ||
        current.finalized ||
        current.phase !== "revealing" ||
        (index !== undefined && current.currentIndex !== index)
      )
        return current;
      perform("advance", { index: current.currentIndex }, () =>
        engine.advanceCard(index),
      );
      return engine.getSave().activeOpen;
    },
    revealAll: () => perform("finish", {}, () => engine.revealAll()),
    complete: () => {
      perform("finish", {}, () => engine.complete());
      return engine.getSave();
    },
    dismissSummary: () => perform("dismiss", {}, () => engine.dismissSummary()),
    resetLocal: () => perform("reset", {}, () => engine.resetLocal()),
  };
  const start = async (setId: string, quantity: number, maxGemCost: number) => {
    await queue;
    try {
      const result = await cardsRequest("consume_booster", {
        setId,
        quantity,
        maxGemCost,
      });
      engine.replaceSave(result.save);
      notify();
    } catch (error) {
      try {
        const fresh = await cardsRequest();
        engine.replaceSave(fresh.save);
        notify();
      } catch {}
      throw error;
    }
  };
  return { controller, start };
}
