import { budget, imageLease } from "@/lib/security/budget";
import { readBytes, HttpError } from "@/lib/security/http";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { authClient } from "@/features/tetris/server/auth";
import { accountGate } from "@/features/account/server/http";
import { validateAvatar } from "@/features/cards/avatar/validate";
export const maxDuration = 60;
export async function POST(request: NextRequest) {
  const denied = accountGate(request, true);
  if (denied) return denied;
  const context = authClient(request);
  const reply = (data: unknown, status = 200) =>
    context.apply(
      NextResponse.json(data, {
        status,
        headers: status === 429 ? { "Retry-After": "60" } : {},
      }),
    );
  let release: (() => Promise<void>) | undefined;
  try {
    const {
      data: { user },
    } = await context.client.auth.getUser();
    if (!user) return reply({ error: "Connexion requise." }, 401);
    await budget(request, "avatar", {
      global: 120,
      network: 20,
      user: user.id,
      perUser: 10,
    });
    if (Number(request.headers.get("content-length")) > 2200000)
      return reply({ error: "Image trop volumineuse." }, 413);
    const { data: owned } = await context.client
      .from("user_cosmetics")
      .select("cosmetic_id")
      .eq("cosmetic_id", "custom-avatar")
      .maybeSingle();
    if (!owned)
      return reply({ error: "Achète d’abord l’avatar personnalisé." }, 403);
    const multipart = await readBytes(request, 2200000);
    const form = await new Response(new Uint8Array(multipart), {
      headers: { "Content-Type": request.headers.get("content-type") ?? "" },
    }).formData();
    const file = form.get("avatar");
    if (!(file instanceof File))
      return reply({ error: "Image manquante." }, 400);
    await validateAvatar(file);
    const bytes = Buffer.from(await file.arrayBuffer());
    release = await imageLease();
    const image = sharp(bytes, { limitInputPixels: 16777216, animated: false });
    const metadata = await image.metadata();
    if (metadata.pages && metadata.pages > 1)
      return reply({ error: "Les images animées ne sont pas acceptées." }, 400);
    const output = await image
      .rotate()
      .resize(512, 512, { fit: "cover" })
      .webp({ quality: 88 })
      .toBuffer();
    const { error } = await context.client.storage
      .from("avatars")
      .upload(`${user.id}/avatar.webp`, output, {
        contentType: "image/webp",
        upsert: true,
        cacheControl: "0",
      });
    if (error) throw error;
    const result = await context.client.rpc("cards_action", {
      action: "avatar",
      payload: {},
      request_id: crypto.randomUUID(),
    });
    if (result.error) throw result.error;
    return reply({ ok: true });
  } catch (error) {
    return reply(
      {
        error:
          error instanceof HttpError
            ? error.message
            : error instanceof Error &&
                [
                  "L’image doit peser au maximum 2 Mo.",
                  "Choisis une image PNG, JPEG ou WebP valide.",
                ].includes(error.message)
              ? error.message
              : "Impossible d’enregistrer cette image.",
      },
      error instanceof HttpError ? error.status : 400,
    );
  } finally {
    await release?.();
  }
}
export async function GET(request: NextRequest) {
  const context = authClient(request);
  const {
    data: { user },
  } = await context.client.auth.getUser();
  if (!user) return context.apply(new NextResponse(null, { status: 401 }));
  const { data, error } = await context.client.storage
    .from("avatars")
    .download(`${user.id}/avatar.webp`);
  if (error || !data)
    return context.apply(new NextResponse(null, { status: 404 }));
  return context.apply(
    new NextResponse(data, {
      headers: {
        "Content-Type": "image/webp",
        "X-Content-Type-Options": "nosniff",
      },
    }),
  );
}
