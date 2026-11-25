// Applies pending SQL migrations from ./migrations in filename order.
// Usage: DATABASE_URL=... node scripts/migrate.mjs
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();

try {
  // Serialize concurrent migration runs.
  await client.query("SELECT pg_advisory_lock(727001)");
  await client.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())"
  );

  const dir = path.join(process.cwd(), "migrations");
  const files = fs
    .readdirSync(dir)
    .filter((f) => /^\d{3}_[a-z0-9_]+\.sql$/.test(f))
    .sort();

  for (const file of files) {
    const { rowCount } = await client.query("SELECT 1 FROM schema_migrations WHERE name = $1", [file]);
    if (rowCount) continue;

    await client.query("BEGIN");
    try {
      await client.query(fs.readFileSync(path.join(dir, file), "utf8"));
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`applied ${file}`);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
  }
  console.log("migrations up to date");
} finally {
  await client.query("SELECT pg_advisory_unlock(727001)").catch(() => {});
  await client.end();
}
