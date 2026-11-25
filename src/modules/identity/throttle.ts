import { getPool } from "@/shared/db/pool";

const WINDOW_MINUTES = 15;

export interface ThrottleKey {
  key: string;
  max: number;
}

/** Client IP as seen through Cloudflare; LAN requests have no header and share one bucket. */
export function clientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export async function isThrottled(keys: ThrottleKey[]): Promise<boolean> {
  const { rows } = await getPool().query<{ key: string; n: number }>(
    `SELECT key, count(*)::int AS n FROM auth_attempts
     WHERE key = ANY($1) AND at > now() - make_interval(mins => $2)
     GROUP BY key`,
    [keys.map((k) => k.key), WINDOW_MINUTES]
  );
  return rows.some((r) => r.n >= (keys.find((k) => k.key === r.key)?.max ?? Infinity));
}

export async function recordAttempt(keys: string[]): Promise<void> {
  const pool = getPool();
  await pool.query("INSERT INTO auth_attempts (key) SELECT unnest($1::text[])", [keys]);
  if (Math.random() < 0.05) {
    await pool.query("DELETE FROM auth_attempts WHERE at < now() - interval '1 day'").catch(() => {});
  }
}

export async function clearAttempts(key: string): Promise<void> {
  await getPool().query("DELETE FROM auth_attempts WHERE key = $1", [key]);
}

export const failureDelay = () => new Promise((r) => setTimeout(r, 600));

export const TOO_MANY = "Demasiados intentos. Espera 15 minutos e inténtalo de nuevo.";
