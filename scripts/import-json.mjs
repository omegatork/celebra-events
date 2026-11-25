// One-time import of the legacy JSON store (db.json) into Postgres.
// Skips if the events table already has rows, so it is safe to run on every deploy.
// Source: $DATA_FILE_PATH if it exists, otherwise scripts/seed-demo.json.
// Every guest gets a NEW random token (legacy tokens were derived from names and guessable).
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const DEMO_EVENT_IDS = new Set(["evt-boda-sofia-mateo", "evt-xv-valeria"]);
// Demo events that showcase open RSVP (no personalized link needed).
const OPEN_RSVP_DEMO_IDS = new Set(["evt-xv-valeria"]);

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const legacyPath = process.env.DATA_FILE_PATH;
const source =
  legacyPath && fs.existsSync(legacyPath)
    ? legacyPath
    : path.join(process.cwd(), "scripts", "seed-demo.json");

const client = new pg.Client({ connectionString: url });
await client.connect();

try {
  const { rows } = await client.query("SELECT count(*)::int AS n FROM events");
  if (rows[0].n > 0) {
    console.log("events table not empty; skipping import");
    process.exit(0);
  }

  const db = JSON.parse(fs.readFileSync(source, "utf8"));
  const slugOk = (s) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s) && s.length >= 3 && s.length <= 80;
  const clip = (v, n) => String(v ?? "").slice(0, n);

  await client.query("BEGIN");
  let events = 0;
  let guests = 0;
  const importedIds = new Set();

  for (const evt of db.events ?? []) {
    if (!evt?.id || !slugOk(evt.slug ?? "")) {
      console.warn(`skipping event with invalid id/slug: ${evt?.id} ${evt?.slug}`);
      continue;
    }
    const { id, slug, ...rest } = evt;
    const data = { ...rest };
    data.sections = { ...(data.sections ?? {}), allowOpenRsvp: OPEN_RSVP_DEMO_IDS.has(id) };
    await client.query(
      "INSERT INTO events (id, slug, is_demo, data) VALUES ($1, $2, $3, $4)",
      [id, slug, DEMO_EVENT_IDS.has(id), data]
    );
    importedIds.add(id);
    events++;
  }

  for (const g of db.guests ?? []) {
    if (!importedIds.has(g.eventId)) continue;
    const allocated = Math.min(Math.max(Number(g.passesAllocated) || 1, 1), 30);
    const status = ["pending", "confirmed", "declined"].includes(g.status) ? g.status : "pending";
    const confirmed = status === "confirmed" ? Math.min(Math.max(Number(g.passesConfirmed) || 0, 0), allocated) : 0;
    await client.query(
      `INSERT INTO guests (id, event_id, token, name, phone, table_number, passes_allocated,
                           passes_confirmed, status, dietary_notes, message)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        g.id || crypto.randomUUID(),
        g.eventId,
        crypto.randomBytes(16).toString("base64url"),
        clip(g.name || "Invitado", 120),
        clip(String(g.phone ?? "").replace(/[^0-9]/g, ""), 20),
        clip(g.tableNumber || "Por asignar", 60),
        allocated,
        confirmed,
        status,
        clip(g.dietaryNotes, 300),
        clip(g.message, 1000)
      ]
    );
    guests++;
  }

  await client.query("COMMIT");
  console.log(`imported ${events} events and ${guests} guests from ${source}`);
} catch (err) {
  await client.query("ROLLBACK").catch(() => {});
  throw err;
} finally {
  await client.end();
}
