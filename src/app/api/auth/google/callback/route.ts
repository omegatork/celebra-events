import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  decodeState,
  exchangeCode,
  googleConfig,
  GoogleIdentity,
  OAUTH_COOKIE,
  OAUTH_COOKIE_PATH,
  sanitizeNext
} from "@/modules/identity/google";
import { safeEqual } from "@/modules/identity/passwords";
import {
  createUserWithAccount,
  findUserByEmail,
  findUserByGoogleSub,
  linkGoogleSub
} from "@/modules/identity/repository";
import { createSession, setSessionCookie } from "@/modules/identity/sessions";
import { clientIp, isThrottled, recordAttempt } from "@/modules/identity/throttle";

export const dynamic = "force-dynamic";

type Outcome = { userId: string } | { error: string };

/**
 * Step 2: Google redirects back here. Signs in an existing user (by Google id, or by
 * verified email, linking Google to that user) or creates a new user + account.
 */
export async function GET(req: Request) {
  const cfg = googleConfig();
  const base = cfg?.baseUrl ?? new URL(req.url).origin;
  const params = new URL(req.url).searchParams;
  const saved = decodeState(cookies().get(OAUTH_COOKIE)?.value);

  const fail = (code: string) => finish(NextResponse.redirect(new URL(`/login?error=${code}`, base)));
  const finish = (res: NextResponse) => {
    res.cookies.set(OAUTH_COOKIE, "", { httpOnly: true, path: OAUTH_COOKIE_PATH, maxAge: 0 });
    return res;
  };

  if (!cfg) return fail("google_off");
  if (params.get("error")) return fail(params.get("error") === "access_denied" ? "google_cancel" : "google");

  const state = params.get("state") ?? "";
  const code = params.get("code") ?? "";
  if (!saved || !state || !code || !safeEqual(state, saved.state)) return fail("google_state");

  const ipKey = `google:${clientIp(req)}`;
  if (await isThrottled([{ key: ipKey, max: 30 }])) return fail("google_throttle");
  await recordAttempt([ipKey]);

  let identity: GoogleIdentity;
  try {
    identity = await exchangeCode(cfg, code, saved);
  } catch (err) {
    console.error("google sign-in failed", err instanceof Error ? err.message : err);
    return fail("google");
  }

  const outcome = await resolveUser(identity, req);
  if ("error" in outcome) return fail(outcome.error);

  const { token, maxAge } = await createSession("user", { userId: outcome.userId });
  const res = NextResponse.redirect(new URL(sanitizeNext(saved.next), base));
  setSessionCookie(res, req, token, maxAge);
  return finish(res);
}

async function resolveUser(identity: GoogleIdentity, req: Request): Promise<Outcome> {
  const bySub = await findUserByGoogleSub(identity.sub);
  if (bySub) return { userId: bySub.id };

  // Google says this email is verified, so its owner may sign in to the matching user.
  const byEmail = await findUserByEmail(identity.email);
  if (byEmail) {
    if (byEmail.google_sub) return { error: "google_conflict" }; // linked to a different Google account
    await linkGoogleSub(byEmail.id, identity.sub);
    return { userId: byEmail.id };
  }

  const regKey = `register:${clientIp(req)}`;
  if (await isThrottled([{ key: regKey, max: 10 }])) return { error: "google_throttle" };
  await recordAttempt([regKey]);
  try {
    const userId = await createUserWithAccount({
      email: identity.email,
      name: identity.name,
      passwordHash: null,
      googleSub: identity.sub
    });
    return { userId };
  } catch (err) {
    // Lost a race with a parallel sign-in for the same person: use whoever won.
    const winner = await findUserByGoogleSub(identity.sub);
    if (winner) return { userId: winner.id };
    console.error("google sign-up failed", err);
    return { error: "google" };
  }
}
