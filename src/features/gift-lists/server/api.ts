import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { isSameOrigin } from "@/lib/backoffice/request-origin";
import { verifiedGoogleUser } from "@/features/tetris/server/auth";
import { safeWebUrl } from "../types";
import { normalizeListImage } from "./cover-image";

const uuid = z.uuid();
export const slugSchema = z.string().regex(/^[0-9a-f]{20}$/);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((value) => value || null);
const webUrl = optionalText(4096).refine(
  (value) => value === null || safeWebUrl(value) !== null,
  "Lien HTTP ou HTTPS requis.",
);
const money = z
  .number()
  .finite()
  .min(0)
  .max(999_999_999.99)
  .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.00001)
  .nullable();
const listInput = z
  .object({
    title: z.string().trim().min(1).max(160),
    description: optionalText(5000),
    occasion_type: z.enum([
      "birth",
      "birthday",
      "christmas",
      "wedding",
      "other",
    ]),
    occasion_label: optionalText(80),
    cover_image: optionalText(250000).refine(
      (value) =>
        !value ||
        /^data:image\/(?:webp|jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(
          value,
        ),
    ),
    is_surprise_mode: z.boolean(),
    payment_info: optionalText(2000),
  })
  .transform((value) => ({
    ...value,
    occasion_label:
      value.occasion_type === "other" ? value.occasion_label : null,
  }));
const itemInput = z
  .object({
    title: z.string().trim().min(1).max(200),
    url: webUrl,
    image_url: webUrl,
    price: money,
    is_group_gift: z.boolean(),
    priority: z.enum(["normal", "high"]),
  })
  .refine(
    (value) =>
      !value.is_group_gift || (value.price !== null && value.price > 0),
    "Indique un prix cible positif pour une participation à plusieurs.",
  );
export const creatorInput = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create_list"), data: listInput }),
  z.object({
    action: z.literal("update_list"),
    list_id: uuid,
    data: listInput,
  }),
  z.object({ action: z.literal("delete_list"), list_id: uuid }),
  z.object({ action: z.literal("reveal"), list_id: uuid }),
  z.object({ action: z.literal("add_item"), list_id: uuid, data: itemInput }),
  z.object({
    action: z.literal("update_item"),
    list_id: uuid,
    item_id: uuid,
    data: itemInput,
  }),
  z.object({ action: z.literal("delete_item"), list_id: uuid, item_id: uuid }),
]);
export const reservationInput = z.object({
  item_id: uuid,
  guest_name: z.string().trim().min(1).max(120),
  guest_email: optionalText(254).refine(
    (value) => !value || z.email().safeParse(value).success,
    "Vérifie ton adresse email.",
  ),
  message: optionalText(2000),
  amount: money,
  token: z.string().regex(/^[0-9a-f]{64}$/),
});
const listColumns =
  "id,title,description,slug,occasion_type,occasion_label,cover_image,is_surprise_mode,reservations_revealed_at,payment_info";
const itemColumns = "id,title,url,image_url,price,is_group_gift,priority";

class ApiError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function giftAdmin(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new ApiError(
      "Le stockage des listes est momentanément indisponible.",
      503,
    );
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
function check(error: { message: string } | null) {
  if (!error) return;
  const messages: Record<string, string> = {
    gift_already_reserved:
      "Ce cadeau vient d’être réservé. Choisis-en un autre.",
    gift_amount_exceeds_remaining:
      "Le montant restant a changé. Actualise la liste avant de participer.",
    gift_item_has_reservations:
      "Le prix et le type ne peuvent plus changer tant que ce cadeau a une réservation active.",
    gift_reservation_cancelled: "Cette réservation a déjà été annulée.",
    gift_retry_mismatch:
      "Cette tentative ne correspond pas aux informations enregistrées. Reprends ta réservation en cours.",
    gift_item_not_found: "Ce cadeau n’est plus disponible.",
    gift_invalid_amount:
      "Indique un montant positif avec deux décimales au maximum.",
    gift_unexpected_amount:
      "Ce cadeau ne propose pas de participation à plusieurs.",
  };
  if (messages[error.message]) throw new ApiError(messages[error.message], 409);
  throw new ApiError(
    "Impossible d’enregistrer cette action. Actualise la page et réessaie.",
    503,
  );
}
function reply(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer",
    },
  });
}
function failure(error: unknown) {
  return error instanceof ApiError
    ? reply({ error: error.message }, error.status)
    : error instanceof z.ZodError
      ? reply(
          {
            error:
              "Vérifie les champs : titre, liens et montants doivent être valides.",
          },
          400,
        )
      : reply(
          {
            error:
              "Le service est momentanément indisponible. Réessaie dans un instant.",
          },
          503,
        );
}
async function body(request: Request, maxBytes = 20000): Promise<unknown> {
  if (!request.headers.get("origin") || !isSameOrigin(request))
    throw new ApiError("Action autorisée uniquement depuis le site.", 403);
  if (
    !/^application\/json(?:\s*;|$)/i.test(
      request.headers.get("content-type") ?? "",
    )
  )
    throw new ApiError("Format JSON attendu.", 415);
  if (Number(request.headers.get("content-length")) > maxBytes)
    throw new ApiError("Requête trop volumineuse.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError("Requête vide.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > maxBytes) {
        await reader.cancel();
        throw new ApiError("Requête trop volumineuse.", 413);
      }
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ApiError("Requête JSON invalide.");
  }
}

// Local backstop only. No IP is retained; deployment-level limits may supplement it.
const salt = randomBytes(32);
const budgets = new Map<string, { until: number; count: number }>();
function limit(key: string, max: number) {
  const now = Date.now();
  for (const [id, entry] of budgets) if (entry.until <= now) budgets.delete(id);
  const current = budgets.get(key) ?? { until: now + 60000, count: 0 };
  if (current.count >= max || (!budgets.has(key) && budgets.size >= 5000))
    throw new ApiError(
      "Trop de demandes. Patiente une minute avant de réessayer.",
      429,
    );
  current.count++;
  budgets.set(key, current);
}
function guestKey(request: Request, prefix: string) {
  return createHash("sha256")
    .update(salt)
    .update(prefix)
    .update(request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local")
    .digest("hex");
}
export async function ownedList(
  db: SupabaseClient,
  userId: string,
  id: string,
) {
  const result = await db
    .from("gift_lists")
    .select(listColumns)
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  check(result.error);
  if (!result.data)
    throw new ApiError(
      "Cette liste est introuvable ou ne t’appartient pas.",
      404,
    );
  return result.data;
}
export async function creatorGet(request: NextRequest) {
  const auth = await verifiedGoogleUser(request);
  try {
    if (!auth.user)
      throw new ApiError(
        "Connecte-toi avec Google pour retrouver tes listes.",
        401,
      );
    const db = giftAdmin();
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      const result = await db
        .from("gift_lists")
        .select(listColumns)
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false });
      check(result.error);
      return auth.apply(reply({ lists: result.data }));
    }
    uuid.parse(id);
    const list = await ownedList(db, auth.user.id, id);
    const [items, activity] = await Promise.all([
      db
        .from("gift_items")
        .select(itemColumns)
        .eq("list_id", id)
        .order("created_at"),
      db.rpc("gift_read_owner_reservations", {
        p_list_id: id,
        p_user_id: auth.user.id,
      }),
    ]);
    check(items.error);
    check(activity.error);
    return auth.apply(
      reply({ list, items: items.data, activity: activity.data }),
    );
  } catch (error) {
    return auth.apply(failure(error));
  }
}
export async function creatorPost(request: NextRequest) {
  const auth = await verifiedGoogleUser(request);
  try {
    if (!auth.user)
      throw new ApiError(
        "Connecte-toi avec Google pour gérer tes listes.",
        401,
      );
    const input = creatorInput.parse(await body(request, 270000));
    if (input.action === "create_list" || input.action === "update_list") {
      try {
        input.data.cover_image = await normalizeListImage(
          input.data.cover_image,
        );
      } catch {
        throw new ApiError(
          "Choisis une image JPEG, PNG ou WebP valide, de moins de 5 Mo.",
        );
      }
    }
    limit(`owner:${auth.user.id}`, 60);
    const db = giftAdmin();
    if (input.action === "create_list") {
      const result = await db
        .from("gift_lists")
        .insert({ ...input.data, user_id: auth.user.id })
        .select(listColumns)
        .single();
      check(result.error);
      return auth.apply(reply({ list: result.data }, 201));
    }
    await ownedList(db, auth.user.id, input.list_id);
    switch (input.action) {
      case "update_list": {
        const result = await db
          .from("gift_lists")
          .update(input.data)
          .eq("id", input.list_id)
          .eq("user_id", auth.user.id)
          .select(listColumns)
          .single();
        check(result.error);
        return auth.apply(reply({ list: result.data }));
      }
      case "reveal": {
        const result = await db
          .from("gift_lists")
          .update({ reservations_revealed_at: new Date().toISOString() })
          .eq("id", input.list_id)
          .eq("user_id", auth.user.id);
        check(result.error);
        break;
      }
      case "delete_list": {
        const result = await db
          .from("gift_lists")
          .delete()
          .eq("id", input.list_id)
          .eq("user_id", auth.user.id);
        check(result.error);
        break;
      }
      case "add_item": {
        const result = await db
          .from("gift_items")
          .insert({ ...input.data, list_id: input.list_id })
          .select(itemColumns)
          .single();
        check(result.error);
        return auth.apply(reply({ item: result.data }, 201));
      }
      case "update_item": {
        const result = await db
          .from("gift_items")
          .update(input.data)
          .eq("id", input.item_id)
          .eq("list_id", input.list_id)
          .select(itemColumns)
          .maybeSingle();
        check(result.error);
        if (!result.data) throw new ApiError("Cadeau introuvable.", 404);
        return auth.apply(reply({ item: result.data }));
      }
      case "delete_item": {
        const result = await db
          .from("gift_items")
          .delete()
          .eq("id", input.item_id)
          .eq("list_id", input.list_id)
          .select("id")
          .maybeSingle();
        check(result.error);
        if (!result.data) throw new ApiError("Cadeau introuvable.", 404);
        break;
      }
    }
    return auth.apply(reply({ ok: true }));
  } catch (error) {
    return auth.apply(failure(error));
  }
}
export async function publicGet(request: NextRequest, slug: string) {
  try {
    if (!slugSchema.safeParse(slug).success)
      throw new ApiError("Cette liste est introuvable.", 404);
    limit(guestKey(request, "read"), 120);
    const db = giftAdmin();
    const result = await db.rpc("gift_read_public", { p_slug: slug });
    check(result.error);
    if (!result.data)
      throw new ApiError(
        "Cette liste n’existe plus ou son lien est incorrect.",
        404,
      );
    const occasion = await db
      .from("gift_lists")
      .select("occasion_label,cover_image")
      .eq("slug", slug)
      .maybeSingle();
    check(occasion.error);
    return reply({
      ...result.data,
      occasion_label: occasion.data?.occasion_label ?? null,
      cover_image: occasion.data?.cover_image ?? null,
    });
  } catch (error) {
    return failure(error);
  }
}
export async function publicPost(request: NextRequest, slug: string) {
  try {
    slugSchema.parse(slug);
    const input = reservationInput.parse(await body(request));
    limit(guestKey(request, "reserve"), 20);
    const result = await giftAdmin().rpc("gift_reserve", {
      p_slug: slug,
      p_item_id: input.item_id,
      p_guest_name: input.guest_name,
      p_guest_email: input.guest_email,
      p_message: input.message,
      p_amount: input.amount,
      p_token: input.token,
    });
    check(result.error);
    return reply({ reservation_id: result.data });
  } catch (error) {
    return failure(error);
  }
}
export async function cancelPost(request: NextRequest) {
  try {
    const input = z
      .object({ token: z.string().regex(/^[0-9a-f]{64}$/) })
      .parse(await body(request));
    limit(guestKey(request, "cancel"), 20);
    const result = await giftAdmin().rpc("gift_cancel", {
      p_token: input.token,
    });
    check(result.error);
    if (!result.data)
      throw new ApiError(
        "Ce lien d’annulation est invalide ou le cadeau a été supprimé.",
        404,
      );
    return reply({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
