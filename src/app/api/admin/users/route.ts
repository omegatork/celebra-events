import { NextResponse } from "next/server";
import { deleteUser, findUserByEmail, listUsers, normalizeEmail, setUserPassword } from "@/modules/identity/repository";
import { isAdmin } from "@/modules/identity/authorization";
import { generateReadablePassword, hashPassword } from "@/modules/identity/passwords";
import { deleteUserSessions } from "@/modules/identity/sessions";
import { badRequest, forbidden, notFound, readJson, requireSession, str } from "@/shared/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await requireSession();
  if (s instanceof NextResponse) return s;
  if (!isAdmin(s)) return forbidden();
  return NextResponse.json({ users: await listUsers() });
}

/**
 * POST { userId, action: "reset" }
 * Sets a temporary password (returned once) and signs the user out everywhere.
 * Stand-in for "forgot password" emails until an email provider is configured.
 */
export async function POST(req: Request) {
  const s = await requireSession();
  if (s instanceof NextResponse) return s;
  if (!isAdmin(s)) return forbidden();

  const body = await readJson(req);
  const userId = str(body?.userId);
  if (!userId || body?.action !== "reset") return badRequest("Solicitud inválida");

  const temporaryPassword = generateReadablePassword();
  if (!(await setUserPassword(userId, await hashPassword(temporaryPassword)))) {
    return notFound("Usuario no encontrado");
  }
  await deleteUserSessions(userId);
  return NextResponse.json({ temporaryPassword });
}

/** DELETE /api/admin/users?id=...  (or ?email=...) */
export async function DELETE(req: Request) {
  const s = await requireSession();
  if (s instanceof NextResponse) return s;
  if (!isAdmin(s)) return forbidden();

  const params = new URL(req.url).searchParams;
  let id = params.get("id");
  const email = params.get("email");
  if (!id && email) id = (await findUserByEmail(normalizeEmail(email)))?.id ?? null;
  if (!id) return notFound("Usuario no encontrado");
  return (await deleteUser(id)) ? NextResponse.json({ ok: true }) : notFound("Usuario no encontrado");
}
