import "server-only";
import { createClient } from "@supabase/supabase-js";
export { fields, payload } from "./payload";
export function db() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export function guard(r: Request) {
  if (
    !(r.headers.get("cookie") || "")
      .split(";")
      .some((c) => c.trim() === "analytics_consent=granted")
  )
    return Response.json({ error: "Consent required" }, { status: 403 });
}
