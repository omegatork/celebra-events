import { NextResponse } from "next/server";
import { getEventOwnership, setInvitationPasswordHash } from "@/modules/events/repository";
import { isAdmin } from "@/modules/identity/authorization";
import { generateReadablePassword, hashPassword, normalizeInvitationPassword } from "@/modules/identity/passwords";
import { deleteInvitationSessions } from "@/modules/identity/sessions";
import { badRequest, forbidden, notFound, readJson, requireSession, str } from "@/shared/http";

export const dynamic = "force-dynamic";

/**
 * Generate (or regenerate) the invitation password for an event that has no account.
 * The plaintext is returned ONCE; only a hash is stored. Existing invitation sessions are revoked.
 */
export async function POST(req: Request) {
  const s = await requireSession();
  if (s instanceof NextResponse) return s;
  if (!isAdmin(s)) return forbidden();

  const eventId = str((await readJson(req))?.eventId);
  if (!eventId) return badRequest("eventId es obligatorio");
  const event = await getEventOwnership(eventId);
  if (!event) return notFound("Evento no encontrado");
  if (event.accountId) {
    return NextResponse.json(
      { error: "Este evento ya pertenece a una cuenta; se administra iniciando sesión con esa cuenta" },
      { status: 409 }
    );
  }

  const password = generateReadablePassword();
  await setInvitationPasswordHash(eventId, await hashPassword(normalizeInvitationPassword(password)));
  await deleteInvitationSessions(eventId);
  return NextResponse.json({ password, slug: event.slug });
}

/** DELETE /api/admin/invitation-password?eventId=...  disables the invitation password. */
export async function DELETE(req: Request) {
  const s = await requireSession();
  if (s instanceof NextResponse) return s;
  if (!isAdmin(s)) return forbidden();

  const eventId = new URL(req.url).searchParams.get("eventId");
  if (!eventId) return badRequest("eventId es obligatorio");
  if (!(await setInvitationPasswordHash(eventId, null))) return notFound("Evento no encontrado");
  await deleteInvitationSessions(eventId);
  return NextResponse.json({ ok: true });
}
