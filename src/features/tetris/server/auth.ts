import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, type NextResponse } from "next/server";
import { googleIdentity } from "../auth/identity";
export function googleConfigured() {
  try {
    const url = new URL(process.env.SUPABASE_URL || "");
    const key =
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      "";
    let legacy = false;
    try {
      legacy =
        JSON.parse(Buffer.from(key.split(".")[1] || "", "base64url").toString())
          .role === "anon";
    } catch {}
    return (
      url.protocol === "https:" &&
      url.pathname === "/" &&
      (key.startsWith("sb_publishable_") || legacy) &&
      key.trim() === key
    );
  } catch {
    return false;
  }
}
/** One SSR client per request. Its cookies never reach portfolio pages. */
export function authClient(request: NextRequest) {
  const writes = new Map<
    string,
    { name: string; value: string; options: CookieOptions }
  >();
  const cacheHeaders: Record<string, string> = {};
  const client = createServerClient(
    process.env.SUPABASE_URL!,
    (process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY)!,
    {
      cookieOptions: {
        name: "lava-auth",
        path: "/api/tetris",
        httpOnly: true,
        sameSite: "lax",
        secure: request.nextUrl.protocol === "https:",
      },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (items, headers) => {
          for (const item of items) {
            writes.set(item.name, item);
            request.cookies.set(item.name, item.value);
          }
          Object.assign(cacheHeaders, headers);
        },
      },
    },
  );
  return {
    client,
    apply(response: NextResponse) {
      for (const { name, value, options } of writes.values())
        response.cookies.set(name, value, {
          ...options,
          path: "/api/tetris",
          httpOnly: true,
          sameSite: "lax",
          secure: request.nextUrl.protocol === "https:",
        });
      for (const [key, value] of Object.entries(cacheHeaders))
        response.headers.set(key, value);
      response.headers.set("Cache-Control", "private, no-store");
      response.headers.set("X-Robots-Tag", "noindex");
      return response;
    },
  };
}
export async function verifiedGoogleUser(request: NextRequest) {
  if (!googleConfigured())
    return { user: null, apply: (response: NextResponse) => response };
  const context = authClient(request);
  if (
    !request.cookies
      .getAll()
      .some((cookie) => cookie.name.startsWith("lava-auth"))
  )
    return { user: null, apply: context.apply };
  try {
    const { data, error } = await context.client.auth.getUser();
    return {
      user: !error && googleIdentity(data.user) ? data.user : null,
      apply: context.apply,
    };
  } catch {
    return { user: null, apply: context.apply };
  }
}
