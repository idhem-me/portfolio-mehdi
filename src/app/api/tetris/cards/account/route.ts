import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { authClient, googleConfigured } from "@/features/tetris/server/auth";
import { validateCloudSave } from "@/features/cards/server/validation";
import { resolveCardsChoice } from "@/features/cards/server/save-choice";
import { accountGate } from "@/features/account/server/http";

const messages: Record<string, string> = {
  INVALID_PRICE_QUOTE: "Le coût de l’ouverture est invalide. Recharge le jeu.",
  PRICE_CHANGED: "La réserve gratuite a changé. Vérifie le coût puis réessaie.",
  BOOSTER_SHOP_RETIRED:
    "Les boosters s’ouvrent maintenant directement avec des gratuits ou des gems.",
  OPENING_LIMIT: "Tu peux ouvrir de 1 à 10 boosters à la fois.",
  INSUFFICIENT_CREDITS: "Gems insuffisantes.",
  INSUFFICIENT_BOOSTERS: "Pas assez de boosters disponibles.",
  ALREADY_OWNED: "Ce cosmétique est déjà possédé.",
  NOT_OWNED: "Achète ce cosmétique avant de l’équiper.",
  OPENING_ACTIVE: "Termine ton ouverture en cours.",
  SAVE_CHOICE_REQUIRED: "Choisis d’abord la sauvegarde à conserver.",
  STALE_CARD: "La carte a changé. Réessaie.",
};
const actions = new Set([
  "grant_credits",
  "buy_cosmetic",
  "consume_booster",
  "phase",
  "discover",
  "advance",
  "finish",
  "dismiss",
  "reset",
  "equip",
  "settings",
  "resolve",
]);
export async function POST(request: NextRequest) {
  const denied = accountGate(request, true);
  if (denied) return denied;
  if (!googleConfigured())
    return NextResponse.json(
      { error: "La connexion au jeu est indisponible." },
      { status: 503 },
    );
  const context = authClient(request);
  const reply = (data: unknown, status = 200) =>
    context.apply(NextResponse.json(data, { status }));
  try {
    if (Number(request.headers.get("content-length")) > 220000)
      return reply({ error: "Requête trop volumineuse." }, 413);
    const raw = await request.text();
    if (raw.length > 220000)
      return reply({ error: "Requête trop volumineuse." }, 413);
    const body = JSON.parse(raw);
    let {
      data: { user },
    } = await context.client.auth.getUser();
    if (!user) {
      const signed = await context.client.auth.signInAnonymously();
      if (signed.error)
        return reply(
          {
            error:
              "La session invité est indisponible. Connecte-toi avec Google pour continuer.",
          },
          503,
        );
      user = signed.data.user;
    }
    if (!user) return reply({ error: "Connexion requise." }, 401);
    const action = body.action ?? "state";
    if (
      action !== "state" &&
      (!actions.has(action) ||
        typeof body.requestId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(body.requestId))
    )
      return reply({ error: "Requête invalide." }, 400);
    let legacyProcessed = false;
    if (action === "state" && body.legacySave) {
      let candidate;
      try {
        candidate = validateCloudSave(body.legacySave);
      } catch {
        return reply(
          {
            error:
              "L’ancienne sauvegarde est invalide. Elle a été conservée sur cet appareil.",
          },
          400,
        );
      }
      const admin = createClient(
        process.env.SUPABASE_URL!,
        (process.env.SUPABASE_SECRET_KEY ||
          process.env.SUPABASE_SERVICE_ROLE_KEY)!,
        { auth: { persistSession: false, autoRefreshToken: false } },
      );
      const imported = await admin.rpc("cards_import_legacy_for", {
        owner_id: user.id,
        candidate,
      });
      if (imported.error)
        return reply(
          {
            error: "Impossible de transférer l’ancienne sauvegarde. Réessaie.",
          },
          409,
        );
      legacyProcessed = true;
    }
    let data, error;
    if (action === "resolve") {
      try {
        data = await resolveCardsChoice(
          context.client,
          body.payload?.keep,
          body.payload?.revision,
          body.payload?.sourceRevision,
        );
        legacyProcessed = true;
      } catch (e) {
        return reply(
          { error: e instanceof Error ? e.message : "Choix impossible." },
          409,
        );
      }
    } else {
      const result =
        action === "state"
          ? await context.client.rpc("cards_state")
          : await context.client.rpc("cards_action", {
              action,
              payload: body.payload ?? {},
              request_id: body.requestId,
            });
      data = result.data;
      error = result.error;
    }
    if (error)
      return reply(
        {
          error:
            messages[error.message] ??
            "Impossible d’enregistrer cette action. Réessaie.",
        },
        400,
      );
    const pending = await context.client.rpc("cards_pending_choice");
    if (pending.error)
      return reply({ error: "Impossible de vérifier les sauvegardes." }, 503);
    const response = reply({
      pendingChoice: pending.data,
      legacyProcessed,
      ...data,
      user: {
        id: user.id,
        anonymous: !!user.is_anonymous,
        name: user.user_metadata.full_name ?? null,
        avatar: user.user_metadata.avatar_url ?? null,
      },
    });
    response.cookies.set("cards-theme", data.profile.theme, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      maxAge: 31536000,
    });
    return response;
  } catch {
    return reply({ error: "Le jeu est momentanément indisponible." }, 503);
  }
}
