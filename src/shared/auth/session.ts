// Signed session cookie for the organizer area.
// Uses Web Crypto only, so it works in both Edge middleware and Node route handlers.

export const SESSION_COOKIE = "celebra_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

const encoder = new TextEncoder();

function toBase64Url(buf: ArrayBuffer): string {
  let bin = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return toBase64Url(await crypto.subtle.sign("HMAC", key, encoder.encode(data)));
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionValue(secret: string): Promise<string> {
  const expires = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  const payload = `v1.${expires}`;
  return `${payload}.${await hmac(secret, payload)}`;
}

export async function verifySessionValue(value: string | undefined, secret: string): Promise<boolean> {
  if (!value) return false;
  const parts = value.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;
  const expires = Number(parts[1]);
  if (!Number.isFinite(expires) || expires < Math.floor(Date.now() / 1000)) return false;
  const expected = await hmac(secret, `${parts[0]}.${parts[1]}`);
  return constantTimeEqual(parts[2], expected);
}

/** Compares HMACs so the comparison time doesn't leak the password. */
export async function passwordMatches(input: string, expected: string, secret: string): Promise<boolean> {
  if (!input || !expected) return false;
  const [a, b] = await Promise.all([hmac(secret, `pw:${input}`), hmac(secret, `pw:${expected}`)]);
  return constantTimeEqual(a, b);
}
