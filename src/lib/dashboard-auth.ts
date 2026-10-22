export const DASHBOARD_COOKIE = "dashboard_session";

export async function hashToken(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function expectedDashboardToken(): Promise<string | null> {
  const password = process.env.DASHBOARD_PASSWORD?.trim();
  if (!password) return null;
  return hashToken(password);
}

export async function isValidDashboardToken(
  token: string | undefined | null,
): Promise<boolean> {
  if (!token) return false;
  const expected = await expectedDashboardToken();
  if (!expected) return false;
  return token === expected;
}
