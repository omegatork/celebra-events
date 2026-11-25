import { NextResponse } from "next/server";
import { createGuest, deleteGuest } from "@/modules/guests/repository";

// Organizer-only (protected by middleware).
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body?.eventId || typeof body.eventId !== "string") {
      return NextResponse.json({ error: "eventId es obligatorio" }, { status: 400 });
    }
    const guest = await createGuest({
      eventId: body.eventId,
      name: body.name,
      phone: body.phone,
      tableNumber: body.tableNumber,
      passesAllocated: body.passesAllocated
    });
    return NextResponse.json({ guest });
  } catch (err) {
    console.error("createGuest failed", err);
    return NextResponse.json({ error: "No se pudo crear el invitado" }, { status: 400 });
  }
}

// DELETE /api/guests?eventId=...&id=...
// (Query params, not a JSON body: DELETE bodies don't survive Next 14 middleware reliably.)
export async function DELETE(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const eventId = params.get("eventId");
    const id = params.get("id");
    if (!eventId || !id) {
      return NextResponse.json({ error: "eventId e id son obligatorios" }, { status: 400 });
    }
    const deleted = await deleteGuest(eventId, id);
    return NextResponse.json({ ok: deleted }, { status: deleted ? 200 : 404 });
  } catch (err) {
    console.error("deleteGuest failed", err);
    return NextResponse.json({ error: "No se pudo eliminar el invitado" }, { status: 500 });
  }
}
