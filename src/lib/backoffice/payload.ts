import { z } from "zod";
import { deltaLimits } from "@/lib/tracking/limits";
export const fields = [
  "active_ms",
  "mouse_px",
  "scroll_px",
  "clicks",
  "key_presses",
  "brush_strokes",
  "colors_used",
  "games_played",
  "cta_clicks",
  "theme_toggles",
  "lang_changes",
] as const;
export const payload = z
  .object({
    visitor_id: z.uuid(),
    session_id: z.uuid(),
    batch_id: z.uuid(),
    delta: z.partialRecord(
      z.enum(fields),
      z.number().int().min(0).max(10000000),
    ),
    pages: z.record(
      z
        .string()
        .startsWith("/")
        .max(200)
        .refine((v) => !v.includes("?") && !v.includes("#")),
      z.number().int().min(1).max(1000),
    ),
    games: z
      .array(
        z.object({
          game: z.enum(["tetris", "cards", "clicker-burger"]),
          score: z.number().min(0).max(1e15),
          at: z.iso.datetime(),
        }),
      )
      .max(20),
    context: z
      .object({
        device: z.enum(["desktop", "mobile", "tablet"]),
        browser: z.string().max(20),
        lang: z.string().max(10),
        width: z.enum(["small", "medium", "large"]),
      })
      .optional(),
  })
  .refine(
    (p) =>
      Object.entries(p.delta).every(
        ([k, n]) => typeof n === "number" && n <= deltaLimits[k],
      ),
    { message: "Delta limit exceeded" },
  );
