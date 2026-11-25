import { NextResponse } from "next/server";
import { findUserByEmail, normalizeEmail } from "@/modules/identity/repository";
import { burnPasswordCheck, verifyPassword } from "@/modules/identity/passwords";
import { createSession, setSessionCookie } from "@/modules/identity/sessions";
import { clearAttempts, clientIp, failureDelay, isThrottled, recordAttempt, TOO_MANY } from "@/modules/identity/throttle";
import { readJson, str } from "@/shared/http";

export const dynamic = "force-dynamic";

/** Organizer account login (email + password). */
export async function POST(req: Request) {
  const body = await readJson(req);
  const email = normalizeEmail(body?.email);
  const password = str(body?.password);
  const ipKey = `ip:${clientIp(req)}`;
  const userKey = `login:${email}`;

  if (await isThrottled([{ key: ipKey, max: 50 }, { key: userKey, max: 10 }])) {
    return NextResponse.json({ error: TOO_MANY }, { status: 429 });
  }

  const user = email ? await findUserByEmail(email) : undefined;
  const ok = user ? await verifyPassword(password, user.password_hash) : await burnPasswordCheck(password);
  if (!user || !ok) {
    await recordAttempt([ipKey, userKey]);
    await failureDelay();
    return NextResponse.json({ error: "Correo o contraseña incorrectos" }, { status: 401 });
  }

  await clearAttempts(userKey);
  const { token, maxAge } = await createSession("user", { userId: user.id });
  const res = NextResponse.json({ ok: true });
  setSessionCookie(res, req, token, maxAge);
  return res;
}
