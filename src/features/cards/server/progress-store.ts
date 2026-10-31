import "server-only";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { CardsSave } from "../persistence/types";

export type ProgressRecord = { revision: number; save: CardsSave };
export interface ProgressStore {
  read(owner: string): Promise<ProgressRecord | null>;
  write(
    owner: string,
    revision: number,
    save: CardsSave,
  ): Promise<ProgressRecord>;
}
export class ProgressConflict extends Error {}
const key = (owner: string) => createHash("sha256").update(owner).digest("hex");

export class LocalProgressStore implements ProgressStore {
  private db: DatabaseSync;
  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(
      "PRAGMA busy_timeout=3000; CREATE TABLE IF NOT EXISTS cards_progress(owner TEXT PRIMARY KEY,revision INTEGER NOT NULL,data TEXT NOT NULL)",
    );
  }
  async read(owner: string): Promise<ProgressRecord | null> {
    const row = this.db
      .prepare("SELECT revision,data FROM cards_progress WHERE owner=?")
      .get(key(owner));
    return row
      ? { revision: Number(row.revision), save: JSON.parse(String(row.data)) }
      : null;
  }
  async write(
    owner: string,
    revision: number,
    save: CardsSave,
  ): Promise<ProgressRecord> {
    const serialized = JSON.stringify(save);
    const result =
      revision === 0
        ? this.db
            .prepare("INSERT OR IGNORE INTO cards_progress VALUES(?,1,?)")
            .run(key(owner), serialized)
        : this.db
            .prepare(
              "UPDATE cards_progress SET data=?,revision=revision+1 WHERE owner=? AND revision=?",
            )
            .run(serialized, key(owner), revision);
    if (Number(result.changes) !== 1) throw new ProgressConflict();
    return { revision: revision + 1, save };
  }
  close() {
    this.db.close();
  }
}

export class SupabaseProgressStore implements ProgressStore {
  private client;
  constructor(url: string, secret: string) {
    const parsed = new URL(url);
    let legacy = false;
    try {
      legacy =
        JSON.parse(
          Buffer.from(secret.split(".")[1] ?? "", "base64url").toString(),
        ).role === "service_role";
    } catch {}
    if (
      parsed.protocol !== "https:" ||
      parsed.pathname !== "/" ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      (!secret.startsWith("sb_secret_") && !legacy)
    )
      throw Error("Invalid server configuration");
    this.client = createClient(url, secret, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) =>
          fetch(input, { ...init, signal: AbortSignal.timeout(8000) }),
      },
    });
  }
  async read(owner: string): Promise<ProgressRecord | null> {
    const { data, error } = await this.client
      .from("cards_progress")
      .select("revision,data")
      .eq("owner", key(owner))
      .maybeSingle();
    if (error) throw Error("Progress storage unavailable");
    return data
      ? { revision: data.revision, save: data.data as CardsSave }
      : null;
  }
  async write(
    owner: string,
    revision: number,
    save: CardsSave,
  ): Promise<ProgressRecord> {
    const table = this.client.from("cards_progress");
    const query =
      revision === 0
        ? table.insert({ owner: key(owner), revision: 1, data: save })
        : table
            .update({
              revision: revision + 1,
              data: save,
              updated_at: new Date().toISOString(),
            })
            .eq("owner", key(owner))
            .eq("revision", revision);
    const { data, error } = await query.select("revision,data").maybeSingle();
    if (error?.code === "23505" || (!error && !data))
      throw new ProgressConflict();
    if (error) throw Error("Progress storage unavailable");
    return { revision: data!.revision, save: data!.data as CardsSave };
  }
}
let instance: ProgressStore | undefined;
export function progressStore(): ProgressStore {
  if (instance) return instance;
  const url = process.env.SUPABASE_URL;
  const secret =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && secret) return (instance = new SupabaseProgressStore(url, secret));
  if (process.env.VERCEL || url || secret)
    throw Error("Remote progress storage is not configured");
  return (instance = new LocalProgressStore(
    process.env.CARDS_DB_PATH || resolve(".local/cards/progress.sqlite"),
  ));
}
