import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_ROUTES = ["/login", "/register"];

export function proxy(request: NextRequest) {
  const token = request.cookies.get("davt_token")?.value;
  const { pathname } = request.nextUrl;

  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (!token && !isAuthRoute) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (token && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/projects/:path*",
    "/tasks/:path*",
    "/profile/:path*",
    "/workspaces/:path*",
    "/invitations/:path*",
    "/login",
    "/register",
  ],
};
