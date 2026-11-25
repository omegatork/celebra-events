import { NextResponse } from "next/server";
import { createGuest, deleteGuest } from "@/modules/guests/repository";
import { canManageEvent } from "@/modules/identity/authorization";
import { badRequest, notFound, readJson, requireSession, str } from "@/shared/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const s = await requireSession();
  if (s instanceof NextResponse) return s;

  const body = await readJson(request);
  const eventId = str(body?.eventId);
  if (!eventId) return badRequest("eventId es obligatorio");
  if (!(await canManageEvent(s, eventId))) return notFound("Evento no encontrado");

  try {
    const guest = await createGuest({
      eventId,
      name: body?.name,
      phone: body?.phone,
      tableNumber: body?.tableNumber,
      passesAllocated: body?.passesAllocated
    });
    return NextResponse.json({ guest });
  } catch (err) {
    console.error("createGuest failed", err);
    return badRequest("No se pudo crear el invitado");
  }
}

// DELETE /api/guests?eventId=...&id=...
// (Query params, not a JSON body: DELETE bodies don't survive Next 14 middleware reliably.)
export async function DELETE(request: Request) {
  const s = await requireSession();
  if (s instanceof NextResponse) return s;

  const params = new URL(request.url).searchParams;
  const eventId = params.get("eventId");
  const id = params.get("id");
  if (!eventId || !id) return badRequest("eventId e id son obligatorios");
  if (!(await canManageEvent(s, eventId))) return notFound("Evento no encontrado");

  const deleted = await deleteGuest(eventId, id);
  return NextResponse.json({ ok: deleted }, { status: deleted ? 200 : 404 });
}
