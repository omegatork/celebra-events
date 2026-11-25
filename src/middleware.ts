import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionValue } from "@/shared/auth/session";

// Organizer-only surfaces. Public: "/", "/e/*", "/login", "/api/rsvp", "/api/healthz", "/api/readyz".
export const config = {
  matcher: ["/dashboard/:path*", "/api/events/:path*", "/api/guests/:path*"]
};

export async function middleware(req: NextRequest) {
  const secret = process.env.SESSION_SECRET;
  // Fail closed if the secret is missing.
  const ok = !!secret && (await verifySessionValue(req.cookies.get(SESSION_COOKIE)?.value, secret));
  if (ok) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const login = new URL("/login", req.url);
  login.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(login);
}
