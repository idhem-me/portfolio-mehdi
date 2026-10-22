import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import {
  DASHBOARD_COOKIE,
  isValidDashboardToken,
} from "@/lib/dashboard-auth";
import { routing } from "@/i18n/routing";

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

  if (isDashboardAuthPath(pathname)) {
    return handleDashboardAuth(request);
  }

  if (isLocaleExempt(pathname)) {
    return NextResponse.next();
  }

  return handleI18nRouting(request);
}

export const config = {
  matcher: [
    "/((?!_next|_vercel|.*\\..*).*)",
  ],
};
