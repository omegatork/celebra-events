import { NextResponse } from "next/server";
import { safeEqual } from "@/modules/identity/passwords";
import { createSession, setSessionCookie } from "@/modules/identity/sessions";
import { clientIp, failureDelay, isThrottled, recordAttempt, TOO_MANY } from "@/modules/identity/throttle";
import { readJson, str } from "@/shared/http";

export const dynamic = "force-dynamic";

/** Platform super-admin login (shared password from the celebra-auth Secret). */
export async function POST(req: Request) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return NextResponse.json({ error: "Administración no configurada" }, { status: 503 });
  }

  const key = `admin:${clientIp(req)}`;
  if (await isThrottled([{ key, max: 10 }])) {
    return NextResponse.json({ error: TOO_MANY }, { status: 429 });
  }

  const body = await readJson(req);
  if (!safeEqual(str(body?.password), adminPassword)) {
    await recordAttempt([key]);
    await failureDelay();
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }

  const { token, maxAge } = await createSession("admin");
  const res = NextResponse.json({ ok: true });
  setSessionCookie(res, req, token, maxAge);
  return res;
}
