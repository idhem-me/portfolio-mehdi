import { NextResponse } from "next/server";

/**
 * Conservé pour compat / diagnostic.
 * L’envoi réel se fait côté client (Web3Forms gratuit n’autorise
 * pas les appels serveur sans plan payant).
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Utilise le formulaire côté client. Web3Forms gratuit n’accepte pas les appels serveur.",
    },
    { status: 410 },
  );
}
