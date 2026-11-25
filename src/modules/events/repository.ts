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

function toEvent(row: EventRow): EventInvitation {
  return { ...row.data, id: row.id, slug: row.slug, isDemo: row.is_demo } as EventInvitation;
}

export async function listEvents(): Promise<EventInvitation[]> {
  const { rows } = await getPool().query<EventRow>(
    "SELECT id, slug, is_demo, data FROM events ORDER BY created_at, id"
  );
  return rows.map(toEvent);
}

export async function listDemoEvents(): Promise<EventInvitation[]> {
  const { rows } = await getPool().query<EventRow>(
    "SELECT id, slug, is_demo, data FROM events WHERE is_demo ORDER BY created_at, id"
  );
  return rows.map(toEvent);
}

export async function getEventBySlug(slug: string): Promise<EventInvitation | undefined> {
  const { rows } = await getPool().query<EventRow>(
    "SELECT id, slug, is_demo, data FROM events WHERE slug = $1",
    [slug]
  );
  return rows[0] ? toEvent(rows[0]) : undefined;
}

export class SlugTakenError extends Error {
  constructor(slug: string) {
    super(`La URL "${slug}" ya está en uso por otro evento`);
  }
}

/** Insert or update an event. `isDemo` is never changed from the client. */
export async function upsertEvent(event: EventInvitation): Promise<EventInvitation> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, slug, isDemo, ...data } = event;
  try {
    const { rows } = await getPool().query<EventRow>(
      `INSERT INTO events (id, slug, data) VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, data = EXCLUDED.data, updated_at = now()
       RETURNING id, slug, is_demo, data`,
      [id, slug, data]
    );
    return toEvent(rows[0]);
  } catch (err) {
    if (isPgError(err, UNIQUE_VIOLATION)) throw new SlugTakenError(slug);
    throw err;
  }
}
