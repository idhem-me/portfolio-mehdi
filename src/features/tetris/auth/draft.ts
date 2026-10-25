import { replayLimit, type Step } from "../engine/replay";
export type RankedRun = {
  id: string;
  seed: number;
  steps: Step[];
  opening?: boolean;
  localOnly?: boolean;
};
export type GameSummary = {
  score: number;
  lines: number;
  level: number;
  pieces: number;
  elapsed: number;
  best: number;
};
export type ScoreDraft = {
  run: RankedRun;
  summary: GameSummary;
  name: string;
  recipient?: string;
};
const key = "lava-pending-score-v1";
type StoragePort = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export function saveDraft(draft: ScoreDraft, storage?: StoragePort) {
  try {
    const source = storage ?? sessionStorage;
    try {
      const previous = JSON.parse(source.getItem(key) || "null");
      const recipient =
        previous?.draft?.run?.id === draft.run.id
          ? previous.draft.recipient
          : undefined;
      if (typeof recipient === "string" && /^[a-f0-9]{64}$/.test(recipient))
        draft = { ...draft, recipient };
    } catch {}
    const payload = JSON.stringify({ created: Date.now(), draft });
    if (payload.length > 2200000) return false;
    (storage ?? sessionStorage).setItem(key, payload);
    return true;
  } catch {
    return false;
  }
}
export function clearDraft(storage?: StoragePort, runId?: string) {
  try {
    const source = storage ?? sessionStorage;
    if (
      runId &&
      JSON.parse(source.getItem(key) || "null")?.draft?.run?.id !== runId
    )
      return;
    source.removeItem(key);
  } catch {}
}
export function recoverDraft(storage?: StoragePort): ScoreDraft | null {
  try {
    const source = storage ?? sessionStorage,
      raw = source.getItem(key);

    if (!raw || raw.length > 2200000) return null;
    const value = JSON.parse(raw),
      d = value.draft as ScoreDraft;
    if (
      !Number.isFinite(value.created) ||
      Date.now() - value.created > 86400000 ||
      value.created > Date.now() + 5000 ||
      !d ||
      (d.recipient !== undefined &&
        (typeof d.recipient !== "string" ||
          !/^[a-f0-9]{64}$/.test(d.recipient))) ||
      !d.run ||
      !d.summary ||
      typeof d.name !== "string" ||
      d.name.length > 20
    )
      return null;
    if (
      !/^[a-f0-9]{64}$/.test(d.run.id) ||
      !Number.isInteger(d.run.seed) ||
      d.run.seed < 0 ||
      d.run.seed >= 2147483647 ||
      !Array.isArray(d.run.steps) ||
      (d.run.localOnly !== undefined && typeof d.run.localOnly !== "boolean") ||
      d.run.steps.length > replayLimit
    )
      return null;
    if (
      !d.run.steps.every((s) =>
        typeof s === "number"
          ? Number.isFinite(s) && s >= 0 && s <= 50
          : ["left", "right", "cw", "ccw", "soft", "hard", "hold"].includes(s),
      )
    )
      return null;
    if (
      !["score", "lines", "level", "pieces", "elapsed", "best"].every(
        (k) =>
          typeof d.summary[k as keyof GameSummary] === "number" &&
          Number.isFinite(d.summary[k as keyof GameSummary]) &&
          d.summary[k as keyof GameSummary] >= 0,
      )
    )
      return null;
    return d;
  } catch {
    return null;
  }
}
