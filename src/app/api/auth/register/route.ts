import { NextResponse } from "next/server";
import {
  createUserWithAccount,
  EmailTakenError,
  isValidEmail,
  normalizeEmail
} from "@/modules/identity/repository";
import { hashPassword, MIN_PASSWORD_LENGTH } from "@/modules/identity/passwords";
import { createSession, setSessionCookie } from "@/modules/identity/sessions";
import { clientIp, isThrottled, recordAttempt, TOO_MANY } from "@/modules/identity/throttle";
import { badRequest, readJson, str } from "@/shared/http";

export const dynamic = "force-dynamic";

/** Create an organizer account (+ its own account/tenant) and sign in. */
export async function POST(req: Request) {
  const regKey = `register:${clientIp(req)}`;
  if (await isThrottled([{ key: regKey, max: 10 }])) {
    return NextResponse.json({ error: TOO_MANY }, { status: 429 });
  }
  await recordAttempt([regKey]); // every sign-up attempt counts

  const body = await readJson(req);
  const name = str(body?.name).trim().slice(0, 120);
  const email = normalizeEmail(body?.email);
  const password = str(body?.password);

  if (!name) return badRequest("Escribe tu nombre");
  if (!isValidEmail(email)) return badRequest("Correo inválido");
  if (password.length < MIN_PASSWORD_LENGTH) {
    return badRequest(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`);
  }
  if (password.length > 200) return badRequest("Contraseña demasiado larga");

  try {
    const userId = await createUserWithAccount({ email, name, passwordHash: await hashPassword(password) });
    const { token, maxAge } = await createSession("user", { userId });
    const res = NextResponse.json({ ok: true });
    setSessionCookie(res, req, token, maxAge);
    return res;
  } catch (err) {
    if (err instanceof EmailTakenError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("register failed", err);
    return NextResponse.json({ error: "No se pudo crear la cuenta" }, { status: 500 });
  }
}
