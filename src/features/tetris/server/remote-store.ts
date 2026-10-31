import "server-only";
import type { Client } from "@libsql/client";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { verifyReplay } from "../engine/replay";
import {
  validateProfileAvatar,
  validateProfileName,
} from "../profile/validation";
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
/** Durable libSQL adapter: independent connections share the same database. */
export class RemoteLeaderboardStore {
  private ready?: Promise<unknown>;
  constructor(readonly db: Client) {}
  initialize() {
    return (this.ready ??= this.db
      .batch(
        [
          "CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY,owner TEXT,seed INTEGER,created INTEGER,used INTEGER DEFAULT 0)",
          "CREATE TABLE IF NOT EXISTS scores (owner TEXT PRIMARY KEY,name TEXT,score INTEGER,lines INTEGER,created INTEGER,avatar TEXT)",
          "CREATE TABLE IF NOT EXISTS player_profiles (owner TEXT PRIMARY KEY,name TEXT NOT NULL,avatar TEXT,updated INTEGER NOT NULL)",
          "CREATE TABLE IF NOT EXISTS score_receipts (id TEXT PRIMARY KEY,owner TEXT,target TEXT,score INTEGER,lines INTEGER)",
          "CREATE TABLE IF NOT EXISTS local_scores (id TEXT PRIMARY KEY,owner TEXT NOT NULL,score INTEGER NOT NULL,lines INTEGER NOT NULL,created INTEGER NOT NULL)",
          "CREATE INDEX IF NOT EXISTS sessions_owner_created ON sessions(owner,created)",
          "CREATE INDEX IF NOT EXISTS scores_ranking ON scores(score DESC,lines DESC)",
        ],
        "write",
      )
      .then(async (result) => {
        try {
          await this.db.execute("ALTER TABLE scores ADD COLUMN avatar TEXT");
        } catch {}
        return result;
      })
      .catch((error) => {
        this.ready = undefined;
        throw error;
      }));
  }
  async session(owner: string) {
    await this.initialize();
    const now = Date.now(),
      identity = hash(owner),
      transaction = await this.db.transaction("write");
    try {
      await transaction.execute({
        sql: "DELETE FROM sessions WHERE created<?",
        args: [now - 86400000],
      });
      await transaction.execute({
        sql: "DELETE FROM scores WHERE created<?",
        args: [now - 90 * 86400000],
      });
      const count = await transaction.execute({
        sql: "SELECT COUNT(*) AS n FROM sessions WHERE owner=? AND created>?",
        args: [identity, now - 60000],
      });
      if (Number(count.rows[0].n) >= 10)
        throw Error("Patientez une minute avant de rejouer en classement.");
      const id = randomBytes(32).toString("hex"),
        seed = randomInt(0, 2147483647);
      await transaction.execute({
        sql: "INSERT INTO sessions(id,owner,seed,created) VALUES (?,?,?,?)",
        args: [hash(id), identity, seed, now],
      });
      await transaction.commit();
      return { id, seed };
    } finally {
      transaction.close();
    }
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
    await this.initialize();
    const receipt = await this.db.execute({
      sql: "SELECT score,lines FROM score_receipts WHERE id=? AND owner=? AND target=?",
      args: [hash(id), hash(owner), hash(recordOwner)],
    });
    if (receipt.rows[0])
      return {
        score: Number(receipt.rows[0].score),
        lines: Number(receipt.rows[0].lines),
      };
    const identity = hash(owner),
      sessionId = hash(id);
    const result = await this.db.execute({
      sql: "SELECT seed,created,used FROM sessions WHERE id=? AND owner=?",
      args: [sessionId, identity],
    });
    const session = result.rows[0];
    if (
      !session ||
      session.used ||
      Date.now() - Number(session.created) > 86400000
    )
      throw Error("Session expirée ou déjà envoyée.");
    const game = verifyReplay(Number(session.seed), steps);
    if (game.elapsed > Date.now() - Number(session.created) + 2000)
      throw Error("Durée de partie invalide.");
    const transaction = await this.db.transaction("write");
    try {
      const claimed = await transaction.execute({
        sql: "UPDATE sessions SET used=1 WHERE id=? AND owner=? AND used=0 AND created>?",
        args: [sessionId, identity, Date.now() - 86400000],
      });
      if (claimed.rowsAffected !== 1) throw Error("Score déjà envoyé.");
      await transaction.execute({
        sql: `INSERT INTO scores(owner,name,score,lines,created,avatar) VALUES (?,?,?,?,?,?) ON CONFLICT(owner) DO UPDATE SET name=excluded.name,score=excluded.score,lines=excluded.lines,created=excluded.created,avatar=coalesce(excluded.avatar,scores.avatar) WHERE excluded.score>scores.score OR (excluded.score=scores.score AND excluded.lines>scores.lines)`,
        args: [
          hash(recordOwner),
          name,
          game.score,
          game.lines,
          Date.now(),
          avatar,
        ],
      });
      await transaction.execute({
        sql: "INSERT INTO score_receipts VALUES (?,?,?,?,?)",
        args: [
          hash(id),
          hash(owner),
          hash(recordOwner),
          game.score,
          game.lines,
        ],
      });
      await transaction.commit();
      return { score: game.score, lines: game.lines };
    } finally {
      transaction.close();
    }
  }
  async profile(owner: string) {
    await this.initialize();
    const r = await this.db.execute({
      sql: "SELECT name,avatar FROM player_profiles WHERE owner=?",
      args: [hash(owner)],
    });
    const p = r.rows[0];
    return p
      ? {
          name: String(p.name),
          avatar: p.avatar === null ? null : String(p.avatar),
        }
      : null;
  }
  async saveProfile(owner: string, name: string, avatar: string | null) {
    await this.initialize();
    name = validateProfileName(name);
    validateProfileAvatar(avatar);
    await this.db.execute({
      sql: "INSERT INTO player_profiles VALUES (?,?,?,?) ON CONFLICT(owner) DO UPDATE SET name=excluded.name,avatar=excluded.avatar,updated=excluded.updated",
      args: [hash(owner), name, avatar, Date.now()],
    });
    return { name, avatar };
  }
  async submitLocal(
    owner: string,
    id: string,
    steps: unknown,
    opening = false,
  ) {
    await this.initialize();
    const receipt = await this.db.execute({
      sql: "SELECT score,lines FROM score_receipts WHERE id=? AND owner=? AND target=?",
      args: [hash(id), hash(owner), "local:" + hash(owner)],
    });
    if (receipt.rows[0])
      return {
        score: Number(receipt.rows[0].score),
        lines: Number(receipt.rows[0].lines),
      };
    const identity = hash(owner),
      sid = hash(id);
    const r = await this.db.execute({
      sql: "SELECT seed,created,used FROM sessions WHERE id=? AND owner=?",
      args: [sid, identity],
    });
    const session = r.rows[0];
    if (
      !session ||
      session.used ||
      Date.now() - Number(session.created) > 86400000
    )
      throw Error("Session expirée ou déjà envoyée.");
    const game = verifyReplay(Number(session.seed), steps, opening);
    if (game.elapsed > Date.now() - Number(session.created) + 2000)
      throw Error("Durée de partie invalide.");
    const tx = await this.db.transaction("write");
    try {
      const c = await tx.execute({
        sql: "UPDATE sessions SET used=1 WHERE id=? AND owner=? AND used=0",
        args: [sid, identity],
      });
      if (c.rowsAffected !== 1) throw Error("Score déjà envoyé.");
      await tx.execute({
        sql: "INSERT INTO local_scores VALUES (?,?,?,?,?)",
        args: [sid, identity, game.score, game.lines, Date.now()],
      });
      await tx.execute({
        sql: "INSERT INTO score_receipts VALUES (?,?,?,?,?)",
        args: [
          hash(id),
          hash(owner),
          "local:" + hash(owner),
          game.score,
          game.lines,
        ],
      });
      await tx.commit();
    } finally {
      tx.close();
    }
    return { score: game.score, lines: game.lines };
  }
  async rank(owner: string) {
    await this.initialize();
    const result = await this.db.execute({
      sql: "SELECT owner,RANK() OVER (ORDER BY score DESC,lines DESC) AS rank FROM scores WHERE created>? ORDER BY score DESC,lines DESC,created ASC LIMIT 20",
      args: [Date.now() - 90 * 86400000],
    });
    const row = result.rows.find((row) => row.owner === hash(owner));
    return row ? Number(row.rank) : null;
  }
  async list() {
    await this.initialize();
    const result = await this.db.execute({
      sql: "SELECT name,score,lines,avatar,RANK() OVER (ORDER BY score DESC,lines DESC) AS rank FROM scores WHERE created>? ORDER BY score DESC,lines DESC,created ASC LIMIT 20",
      args: [Date.now() - 90 * 86400000],
    });
    return result.rows.map((row) => ({
      name: String(row.name),
      score: Number(row.score),
      lines: Number(row.lines),
      avatar: row.avatar ? String(row.avatar) : null,
      rank: Number(row.rank),
    }));
  }
}
