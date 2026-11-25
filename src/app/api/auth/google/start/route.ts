import { NextResponse } from "next/server";
import {
  authorizationUrl,
  encodeState,
  googleConfig,
  newOAuthState,
  OAUTH_COOKIE,
  OAUTH_COOKIE_PATH,
  OAUTH_TTL_SECONDS,
  sanitizeNext
} from "@/modules/identity/google";

export const dynamic = "force-dynamic";

/** Step 1: send the browser to Google's account chooser. */
export async function GET(req: Request) {
  const cfg = googleConfig();
  if (!cfg) {
    return NextResponse.redirect(new URL("/login?error=google_off", req.url));
  }

  const state = newOAuthState(sanitizeNext(new URL(req.url).searchParams.get("next")));
  const res = NextResponse.redirect(authorizationUrl(cfg, state));
  res.cookies.set(OAUTH_COOKIE, encodeState(state), {
    httpOnly: true,
    // "lax" so the cookie is sent on Google's top-level redirect back to /callback.
    sameSite: "lax",
    secure: cfg.baseUrl.startsWith("https://"),
    path: OAUTH_COOKIE_PATH,
    maxAge: OAUTH_TTL_SECONDS
  });
  return res;
}
