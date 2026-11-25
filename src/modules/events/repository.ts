import { getPool, isPgError, UNIQUE_VIOLATION } from "@/shared/db/pool";
import { EventInvitation } from "@/lib/types";

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug) && slug.length >= 3 && slug.length <= 80;
}

interface EventRow {
  id: string;
  slug: string;
  is_demo: boolean;
  data: Omit<EventInvitation, "id" | "slug" | "isDemo">;
}

const COLS = "id, slug, is_demo, data";

function toEvent(row: EventRow): EventInvitation {
  return { ...row.data, id: row.id, slug: row.slug, isDemo: row.is_demo } as EventInvitation;
}

function splitEvent(event: EventInvitation) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, slug, isDemo, ...data } = event;
  return { id, slug, data };
}

export class SlugTakenError extends Error {
  constructor(slug: string) {
    super(`La URL "${slug}" ya está en uso por otro evento`);
  }
}

export async function listEvents(): Promise<EventInvitation[]> {
  const { rows } = await getPool().query<EventRow>(`SELECT ${COLS} FROM events ORDER BY created_at, id`);
  return rows.map(toEvent);
}

export async function listEventsForAccounts(accountIds: string[]): Promise<EventInvitation[]> {
  if (accountIds.length === 0) return [];
  const { rows } = await getPool().query<EventRow>(
    `SELECT ${COLS} FROM events WHERE account_id = ANY($1) ORDER BY created_at, id`,
    [accountIds]
  );
  return rows.map(toEvent);
}

export async function listDemoEvents(): Promise<EventInvitation[]> {
  const { rows } = await getPool().query<EventRow>(
    `SELECT ${COLS} FROM events WHERE is_demo ORDER BY created_at, id`
  );
  return rows.map(toEvent);
}

export async function getEventBySlug(slug: string): Promise<EventInvitation | undefined> {
  const { rows } = await getPool().query<EventRow>(`SELECT ${COLS} FROM events WHERE slug = $1`, [slug]);
  return rows[0] ? toEvent(rows[0]) : undefined;
}

export async function getEventById(id: string): Promise<EventInvitation | undefined> {
  const { rows } = await getPool().query<EventRow>(`SELECT ${COLS} FROM events WHERE id = $1`, [id]);
  return rows[0] ? toEvent(rows[0]) : undefined;
}

export interface EventOwnership {
  id: string;
  slug: string;
  accountId: string | null;
  hasInvitationPassword: boolean;
}

export async function getEventOwnership(id: string): Promise<EventOwnership | undefined> {
  const { rows } = await getPool().query<{
    id: string;
    slug: string;
    account_id: string | null;
    has_pw: boolean;
  }>(
    "SELECT id, slug, account_id, invitation_password_hash IS NOT NULL AS has_pw FROM events WHERE id = $1",
    [id]
  );
  const r = rows[0];
  return r ? { id: r.id, slug: r.slug, accountId: r.account_id, hasInvitationPassword: r.has_pw } : undefined;
}

/** Admin view: who owns each event and whether it has an invitation password. */
export async function listOwnershipMeta(): Promise<
  Record<string, { owned: boolean; hasInvitationPassword: boolean }>
> {
  const { rows } = await getPool().query<{ id: string; owned: boolean; has_pw: boolean }>(
    "SELECT id, account_id IS NOT NULL AS owned, invitation_password_hash IS NOT NULL AS has_pw FROM events"
  );
  return Object.fromEntries(rows.map((r) => [r.id, { owned: r.owned, hasInvitationPassword: r.has_pw }]));
}

export async function createEvent(event: EventInvitation, accountId: string | null): Promise<EventInvitation> {
  const { id, slug, data } = splitEvent(event);
  try {
    const { rows } = await getPool().query<EventRow>(
      `INSERT INTO events (id, slug, data, account_id) VALUES ($1, $2, $3, $4) RETURNING ${COLS}`,
      [id, slug, data, accountId]
    );
    return toEvent(rows[0]);
  } catch (err) {
    if (isPgError(err, UNIQUE_VIOLATION)) throw new SlugTakenError(slug);
    throw err;
  }
}

/** Updates content and slug. Never changes ownership or the demo flag. */
export async function updateEvent(event: EventInvitation): Promise<EventInvitation | undefined> {
  const { id, slug, data } = splitEvent(event);
  try {
    const { rows } = await getPool().query<EventRow>(
      `UPDATE events SET slug = $2, data = $3, updated_at = now() WHERE id = $1 RETURNING ${COLS}`,
      [id, slug, data]
    );
    return rows[0] ? toEvent(rows[0]) : undefined;
  } catch (err) {
    if (isPgError(err, UNIQUE_VIOLATION)) throw new SlugTakenError(slug);
    throw err;
  }
}

export async function deleteEvent(id: string): Promise<boolean> {
  const { rowCount } = await getPool().query("DELETE FROM events WHERE id = $1", [id]);
  return (rowCount ?? 0) > 0;
}

export async function findInvitationLogin(
  slug: string
): Promise<{ id: string; accountId: string | null; passwordHash: string | null } | undefined> {
  const { rows } = await getPool().query<{
    id: string;
    account_id: string | null;
    invitation_password_hash: string | null;
  }>("SELECT id, account_id, invitation_password_hash FROM events WHERE slug = $1", [slug]);
  const r = rows[0];
  return r ? { id: r.id, accountId: r.account_id, passwordHash: r.invitation_password_hash } : undefined;
}

export async function setInvitationPasswordHash(eventId: string, hash: string | null): Promise<boolean> {
  const { rowCount } = await getPool().query(
    "UPDATE events SET invitation_password_hash = $2, updated_at = now() WHERE id = $1",
    [eventId, hash]
  );
  return (rowCount ?? 0) > 0;
}

/**
 * Attach an unowned event to an account. The invitation password stops working:
 * from now on the account manages the event.
 */
export async function claimEvent(eventId: string, accountId: string): Promise<boolean> {
  const { rowCount } = await getPool().query(
    `UPDATE events SET account_id = $2, invitation_password_hash = NULL, updated_at = now()
     WHERE id = $1 AND account_id IS NULL`,
    [eventId, accountId]
  );
  return (rowCount ?? 0) > 0;
}
