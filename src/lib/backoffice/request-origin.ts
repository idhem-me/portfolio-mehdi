/**
 * Next.js may build request.url from its internal listening address.
 * Host is the destination addressed by the browser; retain the scheme and port
 * checks instead of comparing the Origin with that internal address.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const url = new URL(request.url);
  const host = request.headers.get("host") || url.host;
  try {
    return (
      new URL(origin).origin === new URL(url.protocol + "//" + host).origin
    );
  } catch {
    return false;
  }
}
