import { NextResponse } from "next/server";
import { findInvitationLogin } from "@/modules/events/repository";
import { burnPasswordCheck, normalizeInvitationPassword, verifyPassword } from "@/modules/identity/passwords";
import { createSession, setSessionCookie } from "@/modules/identity/sessions";
import { clearAttempts, clientIp, failureDelay, isThrottled, recordAttempt, TOO_MANY } from "@/modules/identity/throttle";
import { readJson, str } from "@/shared/http";

export const dynamic = "force-dynamic";

/** "Iniciar con contraseña de invitación": manage one event that has no account. */
export async function POST(req: Request) {
  const body = await readJson(req);
  const slug = str(body?.slug).trim().toLowerCase().replace(/^.*\/e\//, "").replace(/[/?#].*$/, "");
  const password = normalizeInvitationPassword(str(body?.password));
  const ipKey = `ip:${clientIp(req)}`;
  const invKey = `inv:${slug}`;

  if (await isThrottled([{ key: ipKey, max: 50 }, { key: invKey, max: 10 }])) {
    return NextResponse.json({ error: TOO_MANY }, { status: 429 });
  }

  const row = slug ? await findInvitationLogin(slug) : undefined;
  // Events owned by an account can't be opened with an invitation password.
  const usable = row && !row.accountId && row.passwordHash;
  const ok = usable ? await verifyPassword(password, row.passwordHash) : await burnPasswordCheck(password);
  if (!usable || !ok) {
    await recordAttempt([ipKey, invKey]);
    await failureDelay();
    return NextResponse.json({ error: "Invitación o contraseña incorrecta" }, { status: 401 });
  }

  await clearAttempts(invKey);
  const { token, maxAge } = await createSession("invitation", { eventId: row.id });
  const res = NextResponse.json({ ok: true, slug });
  setSessionCookie(res, req, token, maxAge);
  return res;
}
