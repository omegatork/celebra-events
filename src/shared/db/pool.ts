import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __celebraPool: Pool | undefined;
}

/** Shared connection pool (one per server process). */
export function getPool(): Pool {
  if (!globalThis.__celebraPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    globalThis.__celebraPool = new Pool({ connectionString, max: 10 });
  }
  return globalThis.__celebraPool;
}

/** Postgres unique_violation error code. */
export const UNIQUE_VIOLATION = "23505";

export function isPgError(err: unknown, code: string): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === code;
}
