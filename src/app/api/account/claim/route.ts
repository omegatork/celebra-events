import { NextResponse } from "next/server";
import { claimEvent, findInvitationLogin } from "@/modules/events/repository";
import { burnPasswordCheck, normalizeInvitationPassword, verifyPassword } from "@/modules/identity/passwords";
import { deleteInvitationSessions } from "@/modules/identity/sessions";
import { clientIp, failureDelay, isThrottled, recordAttempt, TOO_MANY } from "@/modules/identity/throttle";
import { forbidden, readJson, requireSession, str } from "@/shared/http";

export const dynamic = "force-dynamic";

/** "Agregar invitación a mi cuenta": attach an unowned event using its invitation password. */
export async function POST(req: Request) {
  const s = await requireSession();
  if (s instanceof NextResponse) return s;
  if (s.kind !== "user" || s.accountIds.length === 0) return forbidden();

  const body = await readJson(req);
  const slug = str(body?.slug).trim().toLowerCase().replace(/^.*\/e\//, "").replace(/[/?#].*$/, "");
  const password = normalizeInvitationPassword(str(body?.password));
  const ipKey = `ip:${clientIp(req)}`;
  const invKey = `inv:${slug}`;

  if (await isThrottled([{ key: ipKey, max: 50 }, { key: invKey, max: 10 }])) {
    return NextResponse.json({ error: TOO_MANY }, { status: 429 });
  }

  const row = slug ? await findInvitationLogin(slug) : undefined;
  const usable = row && !row.accountId && row.passwordHash;
  const ok = usable ? await verifyPassword(password, row.passwordHash) : await burnPasswordCheck(password);
  if (!usable || !ok) {
    await recordAttempt([ipKey, invKey]);
    await failureDelay();
    return NextResponse.json({ error: "Invitación o contraseña incorrecta" }, { status: 401 });
  }

  if (!(await claimEvent(row.id, s.accountIds[0]))) {
    return NextResponse.json({ error: "Esta invitación ya pertenece a una cuenta" }, { status: 409 });
  }
  await deleteInvitationSessions(row.id);
  return NextResponse.json({ ok: true, slug });
}
