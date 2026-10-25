import { createHash, randomBytes, randomInt } from "node:crypto";
import { reportSupabaseFailure } from "./diagnostics";
import { verifyReplay } from "../engine/replay";
import {
  validateProfileAvatar,
  validateProfileName,
} from "../profile/validation";
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
type RpcFetch = (url: string, init: RequestInit) => Promise<Response>;
/** Server-only Supabase REST/RPC adapter. No browser SDK or auth session. */
export class SupabaseLeaderboardStore {
  private readonly base: string;
  private readonly headers: Record<string, string>;
  constructor(
    url: string,
    key: string,
    private readonly request: RpcFetch = fetch,
  ) {
    const parsed = new URL(url);
    if (
      parsed.protocol !== "https:" ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      parsed.pathname !== "/"
    )
      throw Error("Configuration Supabase invalide.");
    let legacy = false;
    try {
      legacy =
        JSON.parse(Buffer.from(key.split(".")[1] ?? "", "base64url").toString())
          .role === "service_role";
    } catch {}
    if (!key.startsWith("sb_secret_") && !legacy)
      throw Error("Supabase nécessite une clé secrète serveur.");
    this.base = parsed.origin + "/rest/v1/rpc/";
    this.headers = { "Content-Type": "application/json", apikey: key };
    // New sb_secret_ keys are opaque, not JWTs. Only legacy keys use Bearer.
    if (legacy) this.headers.Authorization = `Bearer ${key}`;
  }
  private async rpc<T>(
    name: string,
    args: Record<string, unknown> = {},
  ): Promise<T> {
    const response = await this.request(this.base + name, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(args),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const body = await response.text();
    const data = body ? JSON.parse(body) : null; // PostgreSQL void RPCs can return HTTP 204.
    if (!response.ok) {
      if (data?.message === "tetris_rate_limit")
        throw Error("Patientez une minute avant de rejouer en classement.");
      if (data?.message === "tetris_session_used")
        throw Error("Score déjà envoyé.");
      reportSupabaseFailure(response.status, data?.code, name);
      throw Error("Connexion au classement indisponible.");
    }
    return data as T;
  }
  async session(owner: string) {
    const id = randomBytes(32).toString("hex"),
      seed = randomInt(0, 2147483647);
    await this.rpc("tetris_start_session", {
      p_id: hash(id),
      p_owner: hash(owner),
      p_seed: seed,
    });
    return { id, seed };
  }
  async submit(
    owner: string,
    id: string,
    name: string,
    steps: unknown,
    recordOwner = owner,
    avatar: string | null = null,
  ) {
    name = name.normalize("NFKC").trim();
    if (!/^[\p{L}\p{N} ._-]{2,20}$/u.test(name))
      throw Error(
        "Pseudonyme : 2 à 20 lettres, chiffres, espaces, points ou tirets.",
      );
    const receipts = await this.rpc<{ score: number; lines: number }[]>(
      "tetris_score_receipt",
      { p_id: hash(id), p_owner: hash(owner), p_target: hash(recordOwner) },
    );
    if (receipts[0])
      return {
        score: Number(receipts[0].score),
        lines: Number(receipts[0].lines),
      };
    const identity = hash(owner),
      sessionId = hash(id);
    const sessions = await this.rpc<
      { seed: number; created: number; used: boolean }[]
    >("tetris_read_session", { p_id: sessionId, p_owner: identity });
    const session = sessions[0];
    if (
      !session ||
      session.used ||
      Date.now() - Number(session.created) > 86400000
    )
      throw Error("Session expirée ou déjà envoyée.");
    const game = verifyReplay(Number(session.seed), steps);
    if (game.elapsed > Date.now() - Number(session.created) + 2000)
      throw Error("Durée de partie invalide.");
    await this.rpc(
      recordOwner === owner ? "tetris_commit_score" : "tetris_commit_score_v3",
      {
        ...(recordOwner === owner
          ? {}
          : { p_record_owner: hash(recordOwner), p_avatar: avatar }),
        p_id: sessionId,
        p_owner: identity,
        p_name: name,
        p_score: game.score,
        p_lines: game.lines,
      },
    );
    return { score: game.score, lines: game.lines };
  }
  async profile(owner: string) {
    const rows = await this.rpc<{ name: string; avatar: string | null }[]>(
      "tetris_get_profile",
      { p_owner: hash(owner) },
    );
    return rows[0] ?? null;
  }
  async saveProfile(owner: string, name: string, avatar: string | null) {
    name = validateProfileName(name);
    validateProfileAvatar(avatar);
    const result = await this.rpc<{ name: string; avatar: string | null }[]>(
      "tetris_save_profile",
      { p_owner: hash(owner), p_name: name, p_avatar: avatar },
    );
    return result[0] ?? { name, avatar };
  }
  async submitLocal(
    owner: string,
    id: string,
    steps: unknown,
    opening = false,
  ) {
    const receipts = await this.rpc<{ score: number; lines: number }[]>(
      "tetris_score_receipt",
      {
        p_id: hash(id),
        p_owner: hash(owner),
        p_target: "local:" + hash(owner),
      },
    );
    if (receipts[0])
      return {
        score: Number(receipts[0].score),
        lines: Number(receipts[0].lines),
      };
    const identity = hash(owner),
      sessionId = hash(id);
    const sessions = await this.rpc<
      { seed: number; created: number; used: boolean }[]
    >("tetris_read_session", { p_id: sessionId, p_owner: identity });
    const session = sessions[0];
    if (
      !session ||
      session.used ||
      Date.now() - Number(session.created) > 86400000
    )
      throw Error("Session expirée ou déjà envoyée.");
    const game = verifyReplay(Number(session.seed), steps, opening);
    if (game.elapsed > Date.now() - Number(session.created) + 2000)
      throw Error("Durée de partie invalide.");
    await this.rpc("tetris_commit_local_score", {
      p_id: sessionId,
      p_owner: identity,
      p_score: game.score,
      p_lines: game.lines,
    });
    return { score: game.score, lines: game.lines };
  }
  /** Private owner lookup: hashes never leave the server; no new SQL migration. */
  async rank(owner: string) {
    const url = new URL("../tetris_scores", this.base);
    url.searchParams.set("select", "owner,score,lines");
    url.searchParams.set("created", "gt." + (Date.now() - 90 * 86400000));
    url.searchParams.set("order", "score.desc,lines.desc,created.asc");
    url.searchParams.set("limit", "20");
    const response = await this.request(url.toString(), {
      method: "GET",
      headers: this.headers,
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw Error("Classement indisponible.");
    const rows = (await response.json()) as {
      owner: string;
      score: number;
      lines: number;
    }[];
    const index = rows.findIndex((row) => row.owner === hash(owner));
    if (index < 0) return null;
    return (
      rows.findIndex(
        (row) =>
          Number(row.score) === Number(rows[index].score) &&
          Number(row.lines) === Number(rows[index].lines),
      ) + 1
    );
  }
  async list() {
    let rows: {
      name: string;
      score: number;
      lines: number;
      avatar: string | null;
      rank: number;
    }[];
    try {
      rows = await this.rpc<
        {
          name: string;
          score: number;
          lines: number;
          avatar: string | null;
          rank: number;
        }[]
      >("tetris_leaderboard_v3");
    } catch {
      const legacy =
        await this.rpc<
          { name: string; score: number; lines: number; rank: number }[]
        >("tetris_leaderboard");
      rows = legacy.map((row) => ({ ...row, avatar: null }));
    }
    return rows.map((row) => ({
      name: row.name,
      score: Number(row.score),
      lines: Number(row.lines),
      avatar: row.avatar ?? null,
      rank: Number(row.rank),
    }));
  }
}
