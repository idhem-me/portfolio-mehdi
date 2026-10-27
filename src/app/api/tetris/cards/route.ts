import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { accountGate } from "@/features/account/server/http";
import { verifiedGoogleUser } from "@/features/tetris/server/auth";
import { googleIdentity } from "@/features/tetris/auth/identity";
import {
  progressStore,
  ProgressConflict,
} from "@/features/cards/server/progress-store";
import { validateCloudSave } from "@/features/cards/server/validation";

const json = (data: unknown, status = 200) =>
  NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
async function handle(request: NextRequest, mutation: boolean) {
  const denied = accountGate(request, mutation);
  if (denied) return denied;
  const auth = await verifiedGoogleUser(request);
  const owner = googleIdentity(auth.user);
  if (!owner)
    return auth.apply(
      json(
        {
          error: "Connecte ton compte Google pour synchroniser ta collection.",
        },
        401,
      ),
    );
  const accountKey = createHash("sha256").update(owner).digest("hex");
  try {
    const store = progressStore();
    if (!mutation)
      return auth.apply(
        json({
          accountKey,
          ...((await store.read(owner)) ?? { revision: 0, save: null }),
        }),
      );
    const raw = await request.text();
    if (raw.length > 200000)
      return auth.apply(json({ error: "Sauvegarde trop volumineuse." }, 413));
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return auth.apply(json({ error: "Sauvegarde invalide." }, 400));
    }
    if (body.accountKey !== accountKey)
      return auth.apply(
        json(
          { error: "Le compte actif a changé. Réessaie après reconnexion." },
          409,
        ),
      );
    if (!Number.isSafeInteger(body.revision) || body.revision < 0)
      return auth.apply(json({ error: "Révision invalide." }, 400));
    let save;
    try {
      save = validateCloudSave(body.save);
    } catch {
      return auth.apply(json({ error: "Sauvegarde invalide." }, 400));
    }
    return auth.apply(
      json({ accountKey, ...(await store.write(owner, body.revision, save)) }),
    );
  } catch (error) {
    return auth.apply(
      json(
        {
          error:
            error instanceof ProgressConflict
              ? "Une sauvegarde plus récente existe. Choisis la progression à conserver."
              : "La synchronisation est indisponible. Ta progression reste sur cet appareil.",
        },
        error instanceof ProgressConflict ? 409 : 503,
      ),
    );
  }
}
export const GET = (request: NextRequest) => handle(request, false);
export const PUT = (request: NextRequest) => handle(request, true);
