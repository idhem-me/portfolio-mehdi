import { NextResponse, type NextRequest } from "next/server";
import {
  DASHBOARD_COOKIE,
  isValidDashboardToken,
} from "@/lib/dashboard-auth";

export async function middleware(request: NextRequest) {
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

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/api/analytics/:path*",
  ],
};
