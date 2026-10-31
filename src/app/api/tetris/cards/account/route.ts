import { budget } from "@/lib/security/budget";
import { readText, HttpError } from "@/lib/security/http";
import { NextRequest, NextResponse } from "next/server";
import { authClient, supabaseConfigured } from "@/features/tetris/server/auth";
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
  if (!supabaseConfigured())
    return NextResponse.json(
      { error: "La connexion au jeu est indisponible." },
      { status: 503 },
    );
  const context = authClient(request);
  const reply = (data: unknown, status = 200) =>
    context.apply(
      NextResponse.json(data, {
        status,
        headers: status === 429 ? { "Retry-After": "60" } : {},
      }),
    );
  try {
    await budget(request, "cards-account", { global: 2000, network: 180 });
    const raw = await readText(request, 220000);
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return reply({ error: "Requête invalide." }, 400);
    }
    if (!body || typeof body !== "object" || Array.isArray(body))
      return reply({ error: "Requête invalide." }, 400);
    if (body.legacySave !== undefined)
      return reply(
        { error: "L’import des sauvegardes locales est fermé." },
        410,
      );
    let {
      data: { user },
    } = await context.client.auth.getUser();
    if (!user) {
      await budget(request, "cards-guest", {
        global: 100,
        network: 5,
        seconds: 600,
      });
      const signed = await context.client.auth.signInAnonymously();
      if (signed.error)
        return reply(
          {
            error:
              "La session invité est indisponible. Connecte-toi avec Google ou Apple pour continuer.",
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
  } catch (error) {
    if (error instanceof HttpError)
      return reply({ error: error.message }, error.status);
    return reply({ error: "Le jeu est momentanément indisponible." }, 503);
  }
}
