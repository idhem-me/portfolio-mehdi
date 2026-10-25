import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { verifyReplay } from "../engine/replay";
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export class LeaderboardStore {
  db: DatabaseSync;
  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=3000;
      CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, owner TEXT, seed INTEGER, created INTEGER, used INTEGER DEFAULT 0);
      CREATE TABLE IF NOT EXISTS scores (owner TEXT PRIMARY KEY, name TEXT, score INTEGER, lines INTEGER, created INTEGER);`);
  }
  session(owner: string) {
    const now = Date.now();
    this.db
      .prepare("DELETE FROM sessions WHERE created < ?")
      .run(now - 86400000);
    this.db
      .prepare("DELETE FROM scores WHERE created < ?")
      .run(now - 90 * 86400000);
    const count = this.db
      .prepare("SELECT count(*) AS n FROM sessions WHERE owner=? AND created>?")
      .get(hash(owner), now - 60000)!.n as number;
    if (count >= 10)
      throw Error("Patientez une minute avant de rejouer en classement.");
    const id = randomBytes(32).toString("hex"),
      seed = randomInt(0, 2147483647);
    this.db
      .prepare("INSERT INTO sessions(id,owner,seed,created) VALUES (?,?,?,?)")
      .run(hash(id), hash(owner), seed, now);
    return { id, seed };
  }
  submit(owner: string, id: string, name: string, steps: unknown) {
    name = name.normalize("NFKC").trim();
    if (!/^[\p{L}\p{N} ._-]{2,20}$/u.test(name))
      throw Error(
        "Pseudonyme : 2 à 20 lettres, chiffres, espaces, points ou tirets.",
      );
    const session = this.db
      .prepare("SELECT * FROM sessions WHERE id=? AND owner=?")
      .get(hash(id), hash(owner));
    if (
      !session ||
      session.used ||
      Date.now() - Number(session.created) > 86400000
    )
      throw Error("Session expirée ou déjà envoyée.");
    const game = verifyReplay(Number(session.seed), steps);
    if (game.elapsed > Date.now() - Number(session.created) + 2000)
      throw Error("Durée de partie invalide.");
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = this.db
        .prepare("UPDATE sessions SET used=1 WHERE id=? AND used=0")
        .run(hash(id));
      if (!result.changes) throw Error("Score déjà envoyé.");
      this.db
        .prepare(
          `INSERT INTO scores VALUES (?,?,?,?,?) ON CONFLICT(owner) DO UPDATE SET name=excluded.name,score=excluded.score,lines=excluded.lines,created=excluded.created WHERE excluded.score>scores.score OR (excluded.score=scores.score AND excluded.lines>scores.lines)`,
        )
        .run(hash(owner), name, game.score, game.lines, Date.now());
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
    return { score: game.score, lines: game.lines };
  }
  list() {
    return this.db
      .prepare(
        "SELECT name,score,lines,RANK() OVER (ORDER BY score DESC,lines DESC) AS rank FROM scores WHERE created>? ORDER BY score DESC,lines DESC,created ASC LIMIT 20",
      )
      .all(Date.now() - 90 * 86400000);
  }
}
type Backend =
  | LeaderboardStore
  | import("./remote-store").RemoteLeaderboardStore
  | import("./supabase-store").SupabaseLeaderboardStore;
const globalStore = globalThis as typeof globalThis & {
  lavaStore?: Promise<Backend>;
};
export async function store(): Promise<Backend> {
  return (globalStore.lavaStore ??= (async () => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl || supabaseKey) {
      if (!supabaseUrl || !supabaseKey)
        throw Error("Configuration Supabase incomplète.");
      const { SupabaseLeaderboardStore } = await import("./supabase-store");
      return new SupabaseLeaderboardStore(supabaseUrl, supabaseKey);
    }
    const url = process.env.TURSO_DATABASE_URL;
    const token = process.env.TURSO_AUTH_TOKEN;
    if (url || token) {
      if (!url || !token || !/^(libsql|https):\/\//.test(url))
        throw Error("Configuration du classement incomplète.");
      const [{ createClient }, { RemoteLeaderboardStore }] = await Promise.all([
        import("@libsql/client/web"),
        import("./remote-store"),
      ]);
      return new RemoteLeaderboardStore(
        createClient({ url, authToken: token }),
      );
    }
    if (process.env.VERCEL)
      throw Error("Le classement nécessite une base distante persistante.");
    return new LeaderboardStore(
      process.env.TETRIS_DB_PATH || resolve(".local/tetris/leaderboard.sqlite"),
    );
  })().catch((error) => {
    globalStore.lavaStore = undefined;
    throw error;
  }));
}
