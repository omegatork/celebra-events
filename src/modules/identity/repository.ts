import { randomUUID } from "node:crypto";
import { getPool, isPgError, UNIQUE_VIOLATION } from "@/shared/db/pool";

export class EmailTakenError extends Error {
  constructor() {
    super("Ya existe una cuenta con ese correo");
  }
}

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  password_hash: string;
}

export function normalizeEmail(email: unknown): string {
  return String(email ?? "").trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Sign-up: creates the user, their account (tenant) and an owner membership in one transaction. */
export async function createUserWithAccount(input: {
  email: string;
  name: string;
  passwordHash: string;
}): Promise<string> {
  const client = await getPool().connect();
  const userId = randomUUID();
  const accountId = randomUUID();
  try {
    await client.query("BEGIN");
    await client.query("INSERT INTO users (id, email, name, password_hash) VALUES ($1, $2, $3, $4)", [
      userId,
      input.email,
      input.name,
      input.passwordHash
    ]);
    await client.query("INSERT INTO accounts (id, name) VALUES ($1, $2)", [accountId, input.name]);
    await client.query("INSERT INTO memberships (account_id, user_id, role) VALUES ($1, $2, 'owner')", [
      accountId,
      userId
    ]);
    await client.query("COMMIT");
    return userId;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    if (isPgError(err, UNIQUE_VIOLATION)) throw new EmailTakenError();
    throw err;
  } finally {
    client.release();
  }
}

export async function findUserByEmail(email: string): Promise<UserRecord | undefined> {
  const { rows } = await getPool().query<UserRecord>(
    "SELECT id, email, name, password_hash FROM users WHERE email = $1",
    [email]
  );
  return rows[0];
}

export async function findUserById(id: string): Promise<UserRecord | undefined> {
  const { rows } = await getPool().query<UserRecord>(
    "SELECT id, email, name, password_hash FROM users WHERE id = $1",
    [id]
  );
  return rows[0];
}

export async function setUserPassword(userId: string, passwordHash: string): Promise<boolean> {
  const { rowCount } = await getPool().query(
    "UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1",
    [userId, passwordHash]
  );
  return (rowCount ?? 0) > 0;
}

export interface UserSummary {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  eventCount: number;
}

export async function listUsers(): Promise<UserSummary[]> {
  const { rows } = await getPool().query<{
    id: string;
    email: string;
    name: string;
    created_at: Date;
    event_count: number;
  }>(
    `SELECT u.id, u.email, u.name, u.created_at,
            (SELECT count(*)::int FROM events e JOIN memberships m ON m.account_id = e.account_id
              WHERE m.user_id = u.id) AS event_count
     FROM users u ORDER BY u.created_at DESC`
  );
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    name: r.name,
    createdAt: r.created_at.toISOString(),
    eventCount: r.event_count
  }));
}

/**
 * Deletes a user and the accounts they own. Their events are kept but become
 * unowned (account_id NULL), so the platform admin can still manage them.
 */
export async function deleteUser(userId: string): Promise<boolean> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "DELETE FROM accounts WHERE id IN (SELECT account_id FROM memberships WHERE user_id = $1 AND role = 'owner')",
      [userId]
    );
    const { rowCount } = await client.query("DELETE FROM users WHERE id = $1", [userId]);
    await client.query("COMMIT");
    return (rowCount ?? 0) > 0;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
