import type { Client } from "@libsql/client";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { verifyReplay } from "../engine/replay";
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
          "CREATE TABLE IF NOT EXISTS scores (owner TEXT PRIMARY KEY,name TEXT,score INTEGER,lines INTEGER,created INTEGER)",
          "CREATE INDEX IF NOT EXISTS sessions_owner_created ON sessions(owner,created)",
          "CREATE INDEX IF NOT EXISTS scores_ranking ON scores(score DESC,lines DESC)",
        ],
        "write",
      )
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
  ) {
    name = name.normalize("NFKC").trim();
    if (!/^[\p{L}\p{N} ._-]{2,20}$/u.test(name))
      throw Error(
        "Pseudonyme : 2 à 20 lettres, chiffres, espaces, points ou tirets.",
      );
    await this.initialize();
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
        sql: `INSERT INTO scores VALUES (?,?,?,?,?) ON CONFLICT(owner) DO UPDATE SET name=excluded.name,score=excluded.score,lines=excluded.lines,created=excluded.created WHERE excluded.score>scores.score OR (excluded.score=scores.score AND excluded.lines>scores.lines)`,
        args: [hash(recordOwner), name, game.score, game.lines, Date.now()],
      });
      await transaction.commit();
      return { score: game.score, lines: game.lines };
    } finally {
      transaction.close();
    }
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
      sql: "SELECT name,score,lines,RANK() OVER (ORDER BY score DESC,lines DESC) AS rank FROM scores WHERE created>? ORDER BY score DESC,lines DESC,created ASC LIMIT 20",
      args: [Date.now() - 90 * 86400000],
    });
    return result.rows.map((row) => ({
      name: String(row.name),
      score: Number(row.score),
      lines: Number(row.lines),
      rank: Number(row.rank),
    }));
  }
}
