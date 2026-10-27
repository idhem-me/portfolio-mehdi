import { cardsEnabled } from "@/features/cards/flags";
import { clickerBurgerEnabled } from "@/features/clicker-burger/flags";
import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { DASHBOARD_COOKIE, isValidDashboardToken } from "@/lib/dashboard-auth";
import { routing } from "@/i18n/routing";

import { tetrisEnabled } from "@/features/tetris/flags";

const handleI18nRouting = createMiddleware(routing);

function isDashboardAuthPath(pathname: string) {
  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname.startsWith("/api/analytics")
  );
}

function isLocaleExempt(pathname: string) {
  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/playground") ||
    pathname.startsWith("/api")
  );
}

async function handleDashboardAuth(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isLoginPage = pathname === "/dashboard/login";
  const isLoginApi = pathname === "/api/dashboard/login";
  const isLogoutApi = pathname === "/api/dashboard/logout";

  if (isLoginApi || isLogoutApi) {
    return NextResponse.next();
  }

  const token = request.cookies.get(DASHBOARD_COOKIE)?.value;
  const authed = await isValidDashboardToken(token);

  if (isLoginPage) {
    if (authed) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (!authed) {
    if (pathname.startsWith("/api/analytics")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/dashboard/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const gamePath = pathname
    .replace(/^\/(?:fr|en|zh|ar|es|it|de)(?=\/)/, "")
    .replace(/\/$/, "");
  const hiddenTetris = !tetrisEnabled &&
    ["/jeux/tetris", "/realisations/tetris"].includes(gamePath);
  const hiddenBurger = !clickerBurgerEnabled && gamePath === "/jeux/clicker-burger";
  const hiddenCards =
    !cardsEnabled &&
    (gamePath === "/jeux/cards" || gamePath === "/cards");
  const hiddenGames =
    !tetrisEnabled &&
    !clickerBurgerEnabled &&
    !cardsEnabled &&
    gamePath === "/jeux";
  if (hiddenTetris || hiddenBurger || hiddenCards || hiddenGames) {
    return new NextResponse("Not Found", {
      status: 404,
      headers: { "X-Robots-Tag": "noindex" },
    });
  }

  if (isDashboardAuthPath(pathname)) {
    return handleDashboardAuth(request);
  }

  if (isLocaleExempt(pathname)) {
    return NextResponse.next();
  }

  // A rewrite may re-enter the Node proxy. Do not canonicalize an internal
  // /fr/... rewrite back to its public URL and create a redirect loop.
  const internalLocale = request.headers.get("x-next-intl-locale");
  if (
    internalLocale &&
    routing.locales.some((locale) => locale === internalLocale) &&
    (pathname === `/${internalLocale}` ||
      pathname.startsWith(`/${internalLocale}/`))
  ) {
    return NextResponse.next();
  }

  return handleI18nRouting(request);
}

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
};
