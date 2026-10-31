import { randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { authClient } from "../../src/features/tetris/server/auth";

/** Temporary confirmed account; no email is sent. Does not exercise Google OAuth. */
export async function giftFixture(base = "http://localhost:3000") {
  process.loadEnvFile(".env.local");
  const admin = createClient(
    process.env.SUPABASE_URL!,
    (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  const email = `gift-test-${randomUUID()}@example.test`;
  const password = randomBytes(32).toString("hex");
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    // Controlled test fixture representing the shared Google account contract.
    app_metadata: { provider: "google" },
    user_metadata: { name: "Compte de test cadeaux" },
  });
  if (created.error || !created.data.user)
    throw new Error(
      "Impossible de créer le compte temporaire de vérification.",
    );
  const userId = created.data.user.id;
  const cleanup = async () => {
    const result = await admin.auth.admin.deleteUser(userId);
    if (result.error)
      throw new Error("Nettoyage du compte temporaire à vérifier.");
  };
  try {
    const context = authClient(new NextRequest(`${base}/api/tetris/gifts`));
    const signed = await context.client.auth.signInWithPassword({
      email,
      password,
    });
    if (signed.error)
      throw new Error("Impossible d'ouvrir la session Supabase temporaire.");
    const cookies = context.apply(NextResponse.json({})).cookies.getAll();
    const cookieHeader = cookies
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");
    const request = async (
      path: string,
      data?: unknown,
      authenticated = true,
    ) => {
      return fetch(`${base}${path}`, {
        method: data === undefined ? "GET" : "POST",
        headers: {
          origin: base,
          ...(authenticated ? { cookie: cookieHeader } : {}),
          ...(data === undefined ? {} : { "content-type": "application/json" }),
        },
        ...(data === undefined ? {} : { body: JSON.stringify(data) }),
      });
    };
    return { admin, userId, cookies, request, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
