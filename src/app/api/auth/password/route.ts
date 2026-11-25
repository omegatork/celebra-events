import { NextResponse } from "next/server";
import { findUserById, setUserPassword } from "@/modules/identity/repository";
import { hashPassword, MIN_PASSWORD_LENGTH, verifyPassword } from "@/modules/identity/passwords";
import { createSession, deleteUserSessions, setSessionCookie } from "@/modules/identity/sessions";
import { badRequest, forbidden, readJson, requireSession, str } from "@/shared/http";

export const dynamic = "force-dynamic";

/** Change own password. Signs out every other device. */
export async function POST(req: Request) {
  const s = await requireSession();
  if (s instanceof NextResponse) return s;
  if (s.kind !== "user" || !s.userId) return forbidden();

  const body = await readJson(req);
  const current = str(body?.currentPassword);
  const next = str(body?.newPassword);
  if (next.length < MIN_PASSWORD_LENGTH || next.length > 200) {
    return badRequest(`La nueva contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`);
  }

  const user = await findUserById(s.userId);
  if (!user || !(await verifyPassword(current, user.password_hash))) {
    return NextResponse.json({ error: "La contraseña actual no es correcta" }, { status: 401 });
  }

  await setUserPassword(user.id, await hashPassword(next));
  await deleteUserSessions(user.id);
  const { token, maxAge } = await createSession("user", { userId: user.id });
  const res = NextResponse.json({ ok: true });
  setSessionCookie(res, req, token, maxAge);
  return res;
}
