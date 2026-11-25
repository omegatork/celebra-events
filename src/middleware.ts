import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/modules/identity/session-cookie";

// Cheap gate for UX: no session cookie -> redirect/401 before rendering.
// The real authorization (DB-backed session + permissions) happens in every route handler.
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/cuenta/:path*",
    "/admin/:path*",
    "/api/events/:path*",
    "/api/guests/:path*",
    "/api/admin/:path*",
    "/api/account/:path*"
  ]
};

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();
  if (req.cookies.get(SESSION_COOKIE)?.value) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const target = new URL(pathname.startsWith("/admin") ? "/admin/login" : "/login", req.url);
  target.searchParams.set("next", pathname + search);
  return NextResponse.redirect(target);
}
