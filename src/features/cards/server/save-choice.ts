import { createClient, type SupabaseClient } from "@supabase/supabase-js";
type Pending = {
  sourceUser: string | null;
  sourceAvatar: string | null;
  revision: number;
  sourceRevision: number;
};
/** Source identity comes exclusively from the authenticated, single-use handoff RPC. */
export async function resolveCardsChoice(
  client: SupabaseClient,
  keep: "device" | "account",
  revision: number,
  sourceRevision: number,
) {
  const { data, error } = await client.rpc("cards_pending_choice");
  if (error || !data) throw new Error("Aucune sauvegarde à choisir.");
  const pending = data as Pending;
  if (
    pending.revision !== revision ||
    pending.sourceRevision !== sourceRevision
  )
    throw new Error(
      "La sauvegarde a changé. Vérifie les informations puis réessaie.",
    );
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Connexion requise.");
  let admin: SupabaseClient | null = null;
  if (pending.sourceUser && pending.sourceAvatar) {
    if (pending.sourceAvatar !== `${pending.sourceUser}/avatar.webp`)
      throw new Error("Avatar invalide.");
    admin = createClient(
      process.env.SUPABASE_URL!,
      (process.env.SUPABASE_SECRET_KEY ||
        process.env.SUPABASE_SERVICE_ROLE_KEY)!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    if (keep === "device") {
      const image = await admin.storage
        .from("avatars")
        .download(pending.sourceAvatar);
      if (image.error)
        throw new Error("Impossible de transférer l’avatar. Réessaie.");
      const copy = await admin.storage
        .from("avatars")
        .upload(`${user.id}/avatar.webp`, image.data, {
          upsert: true,
          contentType: "image/webp",
          cacheControl: "0",
        });
      if (copy.error) throw new Error("Impossible de transférer l’avatar.");
    }
  }
  const result = await client.rpc("cards_resolve_choice", {
    keep,
    expected_revision: revision,
    expected_source_revision: sourceRevision,
  });
  if (result.error)
    throw new Error(
      result.error.message === "SAVE_CHANGED"
        ? "La sauvegarde a changé. Réessaie."
        : "Impossible de conserver cette sauvegarde.",
    );
  if (admin && pending.sourceAvatar)
    await admin.storage.from("avatars").remove([pending.sourceAvatar]);
  return result.data;
}
