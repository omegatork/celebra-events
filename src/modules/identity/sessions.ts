import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getPool } from "@/shared/db/pool";
import { SESSION_COOKIE } from "./session-cookie";

export { SESSION_COOKIE };

export type SessionKind = "user" | "invitation" | "admin";

export interface Session {
  kind: SessionKind;
  userId?: string;
  email?: string;
  name?: string;
  /** Accounts (tenants) the user belongs to. Empty for admin/invitation sessions. */
  accountIds: string[];
  /** For invitation sessions: the single event this session may manage. */
  eventId?: string;
  eventSlug?: string;
}

const TTL_SECONDS: Record<SessionKind, number> = {
  user: 60 * 60 * 24 * 14, // 14 days
  invitation: 60 * 60 * 24 * 14,
  admin: 60 * 60 * 12 // 12 hours
};

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(
  kind: SessionKind,
  opts: { userId?: string; eventId?: string } = {}
): Promise<{ token: string; maxAge: number }> {
  const token = randomBytes(32).toString("base64url");
  const maxAge = TTL_SECONDS[kind];
  const pool = getPool();
  await pool.query(
    `INSERT INTO sessions (token_hash, kind, user_id, event_id, expires_at)
     VALUES ($1, $2, $3, $4, now() + make_interval(secs => $5))`,
    [hashToken(token), kind, opts.userId ?? null, opts.eventId ?? null, maxAge]
  );
  // Opportunistic cleanup of expired sessions.
  if (Math.random() < 0.05) {
    await pool.query("DELETE FROM sessions WHERE expires_at < now()").catch(() => {});
  }
  return { token, maxAge };
}

export function setSessionCookie(res: NextResponse, req: Request, token: string, maxAge: number) {
  const proto = req.headers.get("x-forwarded-proto");
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // Secure over HTTPS (Cloudflare sets x-forwarded-proto); LAN access is plain HTTP.
    secure: proto === "https" || new URL(req.url).protocol === "https:",
    path: "/",
    maxAge
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
}

/** Resolves the current request's session from the cookie, or null. */
export async function getSession(): Promise<Session | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;

  const { rows } = await getPool().query<{
    kind: SessionKind;
    user_id: string | null;
    event_id: string | null;
    email: string | null;
    name: string | null;
    event_slug: string | null;
    account_ids: string[];
  }>(
    `SELECT s.kind, s.user_id, s.event_id, u.email, u.name, e.slug AS event_slug,
            COALESCE((SELECT array_agg(m.account_id) FROM memberships m WHERE m.user_id = s.user_id), '{}') AS account_ids
     FROM sessions s
     LEFT JOIN users u ON u.id = s.user_id
     LEFT JOIN events e ON e.id = s.event_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [hashToken(token)]
  );
  const r = rows[0];
  if (!r) return null;
  return {
    kind: r.kind,
    userId: r.user_id ?? undefined,
    email: r.email ?? undefined,
    name: r.name ?? undefined,
    accountIds: r.account_ids ?? [],
    eventId: r.event_id ?? undefined,
    eventSlug: r.event_slug ?? undefined
  };
}

export async function deleteCurrentSession(): Promise<void> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) await getPool().query("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
}

export async function deleteUserSessions(userId: string): Promise<void> {
  await getPool().query("DELETE FROM sessions WHERE user_id = $1", [userId]);
}

/** Revoke every invitation-password session for an event (password changed, disabled or claimed). */
export async function deleteInvitationSessions(eventId: string): Promise<void> {
  await getPool().query("DELETE FROM sessions WHERE kind = 'invitation' AND event_id = $1", [eventId]);
}
