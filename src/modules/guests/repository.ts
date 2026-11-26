import { randomBytes, randomUUID } from "node:crypto";
import { getPool } from "@/shared/db/pool";
import { GuestbookEntry, GuestPass } from "@/lib/types";

/** 128 random bits, URL-safe. Never derive tokens from names. */
export function generateGuestToken(): string {
  return randomBytes(16).toString("base64url");
}

interface GuestRow {
  id: string;
  event_id: string;
  token: string;
  name: string;
  phone: string;
  table_number: string;
  passes_allocated: number;
  passes_confirmed: number;
  status: GuestPass["status"];
  dietary_notes: string;
  message: string;
  updated_at: Date;
  invite_sent_at: Date | null;
}

const COLUMNS =
  "id, event_id, token, name, phone, table_number, passes_allocated, passes_confirmed, status, dietary_notes, message, updated_at, invite_sent_at";

function toGuest(r: GuestRow): GuestPass {
  return {
    id: r.id,
    eventId: r.event_id,
    token: r.token,
    name: r.name,
    phone: r.phone,
    tableNumber: r.table_number,
    passesAllocated: r.passes_allocated,
    passesConfirmed: r.passes_confirmed,
    status: r.status,
    dietaryNotes: r.dietary_notes,
    message: r.message,
    updatedAt: r.updated_at?.toISOString(),
    inviteSentAt: r.invite_sent_at ? r.invite_sent_at.toISOString() : null
  };
}

/** Guest data safe to send to the guest's own browser (no phone, no organizer bookkeeping). */
export function toPublicGuest(g: GuestPass): GuestPass {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { phone, inviteSentAt, ...rest } = g;
  return rest;
}

const clip = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);
const clampInt = (v: unknown, min: number, max: number) =>
  Math.min(Math.max(Math.trunc(Number(v)) || min, min), max);

export async function listGuestsByEvent(eventId: string): Promise<GuestPass[]> {
  const { rows } = await getPool().query<GuestRow>(
    `SELECT ${COLUMNS} FROM guests WHERE event_id = $1 ORDER BY created_at, id`,
    [eventId]
  );
  return rows.map(toGuest);
}

export async function findGuestByToken(eventId: string, token: string): Promise<GuestPass | undefined> {
  if (!token || token.length > 64) return undefined;
  const { rows } = await getPool().query<GuestRow>(
    `SELECT ${COLUMNS} FROM guests WHERE event_id = $1 AND token = $2`,
    [eventId, token]
  );
  return rows[0] ? toGuest(rows[0]) : undefined;
}

/** Token of the first confirmed guest. Only call this for demo events. */
export async function findDemoGuestToken(eventId: string): Promise<string | undefined> {
  const { rows } = await getPool().query<{ token: string }>(
    `SELECT g.token FROM guests g JOIN events e ON e.id = g.event_id
     WHERE g.event_id = $1 AND e.is_demo AND g.status = 'confirmed'
     ORDER BY g.created_at, g.id LIMIT 1`,
    [eventId]
  );
  return rows[0]?.token;
}

export async function listGuestbook(eventId: string): Promise<GuestbookEntry[]> {
  const { rows } = await getPool().query<GuestbookEntry>(
    `SELECT id, name, message FROM guests
     WHERE event_id = $1 AND status = 'confirmed' AND message <> ''
     ORDER BY updated_at DESC LIMIT 100`,
    [eventId]
  );
  return rows;
}

export interface NewGuestInput {
  eventId: string;
  name: unknown;
  phone?: unknown;
  tableNumber?: unknown;
  passesAllocated: unknown;
}

export async function createGuest(input: NewGuestInput): Promise<GuestPass> {
  const name = clip(input.name, 120);
  if (!name) throw new Error("El nombre es obligatorio");
  const { rows } = await getPool().query<GuestRow>(
    `INSERT INTO guests (id, event_id, token, name, phone, table_number, passes_allocated)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${COLUMNS}`,
    [
      randomUUID(),
      input.eventId,
      generateGuestToken(),
      name,
      clip(input.phone, 20).replace(/[^0-9]/g, ""),
      clip(input.tableNumber, 60) || "Por asignar",
      clampInt(input.passesAllocated, 1, 30)
    ]
  );
  return toGuest(rows[0]);
}

/** Marks the invitation as sent (now) or not sent. Returns the new timestamp, or undefined if no such guest. */
export async function setInviteSent(
  eventId: string,
  guestId: string,
  sent: boolean
): Promise<{ inviteSentAt: string | null } | undefined> {
  const { rows } = await getPool().query<{ invite_sent_at: Date | null }>(
    `UPDATE guests SET invite_sent_at = CASE WHEN $3 THEN COALESCE(invite_sent_at, now()) ELSE NULL END
     WHERE event_id = $1 AND id = $2 RETURNING invite_sent_at`,
    [eventId, guestId, sent]
  );
  if (!rows[0]) return undefined;
  return { inviteSentAt: rows[0].invite_sent_at ? rows[0].invite_sent_at.toISOString() : null };
}

export async function deleteGuest(eventId: string, guestId: string): Promise<boolean> {
  const { rowCount } = await getPool().query("DELETE FROM guests WHERE event_id = $1 AND id = $2", [
    eventId,
    guestId
  ]);
  return (rowCount ?? 0) > 0;
}

export interface RsvpInput {
  status: unknown;
  passesConfirmed: unknown;
  dietaryNotes?: unknown;
  message?: unknown;
}

/** Guest answers their own invitation. Confirmed passes are capped at the allocation. */
export async function submitRsvp(
  eventId: string,
  token: string,
  input: RsvpInput
): Promise<GuestPass | undefined> {
  const status = input.status === "declined" ? "declined" : "confirmed";
  const requested = status === "confirmed" ? clampInt(input.passesConfirmed, 1, 30) : 0;
  const { rows } = await getPool().query<GuestRow>(
    `UPDATE guests SET
       status = $3,
       passes_confirmed = LEAST($4::int, passes_allocated),
       dietary_notes = $5,
       message = $6,
       updated_at = now()
     WHERE event_id = $1 AND token = $2
     RETURNING ${COLUMNS}`,
    [eventId, token, status, requested, clip(input.dietaryNotes, 300), clip(input.message, 1000)]
  );
  return rows[0] ? toGuest(rows[0]) : undefined;
}
