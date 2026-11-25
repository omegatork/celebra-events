import { createHash, randomBytes } from "node:crypto";
import { safeEqual } from "./passwords";

// "Sign in with Google" (OpenID Connect, authorization code flow + PKCE).
// Disabled unless GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and APP_BASE_URL are all set.

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

export const OAUTH_COOKIE = "celebra_oauth";
export const OAUTH_COOKIE_PATH = "/api/auth/google";
export const OAUTH_TTL_SECONDS = 600;

interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  baseUrl: string;
}

export function googleConfig(): GoogleConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const baseUrl = process.env.APP_BASE_URL?.trim().replace(/\/+$/, "");
  if (!clientId || !clientSecret || !baseUrl) return null;
  return { clientId, clientSecret, baseUrl, redirectUri: `${baseUrl}/api/auth/google/callback` };
}

/** Short-lived state kept in an httpOnly cookie between /start and /callback. */
export interface OAuthState {
  state: string;
  verifier: string;
  nonce: string;
  next: string;
}

const rand = () => randomBytes(32).toString("base64url");

/** Only same-site relative paths; anything else falls back to the dashboard. */
export function sanitizeNext(next: string | null | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") && next.length < 500
    ? next
    : "/dashboard";
}

export function newOAuthState(next: string): OAuthState {
  return { state: rand(), verifier: rand(), nonce: rand(), next };
}

export const encodeState = (s: OAuthState) => Buffer.from(JSON.stringify(s)).toString("base64url");

export function decodeState(raw: string | undefined): OAuthState | null {
  if (!raw || raw.length > 2000) return null;
  try {
    const s = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    const ok = ["state", "verifier", "nonce", "next"].every((k) => typeof s?.[k] === "string");
    return ok ? (s as OAuthState) : null;
  } catch {
    return null;
  }
}

export function authorizationUrl(cfg: GoogleConfig, s: OAuthState): string {
  const challenge = createHash("sha256").update(s.verifier).digest("base64url");
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: s.state,
    nonce: s.nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account"
  });
  return `${AUTH_URL}?${params}`;
}

export interface GoogleIdentity {
  sub: string;
  email: string;
  name: string;
}

export class GoogleAuthError extends Error {}

/**
 * Exchanges the authorization code for an ID token and validates its claims.
 * The token comes straight from Google's token endpoint over TLS, authenticated with our
 * client secret, so per OpenID Connect Core 3.1.3.7 the TLS check stands in for a signature check.
 */
export async function exchangeCode(cfg: GoogleConfig, code: string, s: OAuthState): Promise<GoogleIdentity> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uri: cfg.redirectUri,
      grant_type: "authorization_code",
      code_verifier: s.verifier
    }),
    signal: AbortSignal.timeout(10_000)
  });
  if (!res.ok) throw new GoogleAuthError(`token endpoint returned ${res.status}`);
  const body = (await res.json()) as { id_token?: unknown };
  if (typeof body.id_token !== "string") throw new GoogleAuthError("no id_token");

  const parts = body.id_token.split(".");
  if (parts.length !== 3) throw new GoogleAuthError("malformed id_token");
  let claims: Record<string, unknown>;
  try {
    claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    throw new GoogleAuthError("unreadable id_token");
  }

  const now = Math.floor(Date.now() / 1000);
  if (!ISSUERS.includes(String(claims.iss))) throw new GoogleAuthError("bad issuer");
  if (claims.aud !== cfg.clientId) throw new GoogleAuthError("bad audience");
  if (typeof claims.exp !== "number" || claims.exp < now - 60) throw new GoogleAuthError("expired");
  if (typeof claims.nonce !== "string" || !safeEqual(claims.nonce, s.nonce)) throw new GoogleAuthError("bad nonce");
  if (typeof claims.sub !== "string" || !claims.sub) throw new GoogleAuthError("no sub");
  if (claims.email_verified !== true || typeof claims.email !== "string") {
    throw new GoogleAuthError("email not verified");
  }

  const email = claims.email.trim().toLowerCase();
  const name = (typeof claims.name === "string" && claims.name.trim()) || email.split("@")[0];
  return { sub: claims.sub, email, name: name.slice(0, 120) };
}
