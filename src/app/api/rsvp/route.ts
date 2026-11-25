import { NextResponse } from "next/server";
import { getEventBySlug } from "@/modules/events/repository";
import { createGuest, submitRsvp, toPublicGuest } from "@/modules/guests/repository";

// PUBLIC endpoint: guests answer their own invitation.
// - With a token: updates only that guest group (passes capped at allocation).
// - Without a token: allowed only if the event enables open RSVP.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const slug = typeof body.slug === "string" ? body.slug : "";
  const event = slug ? await getEventBySlug(slug) : undefined;
  if (!event) {
    return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
  }

  const rsvp = {
    status: body.status,
    passesConfirmed: body.passesConfirmed,
    dietaryNotes: body.dietaryNotes,
    message: body.message
  };

  try {
    let token = typeof body.token === "string" ? body.token : "";

    if (!token) {
      if (!event.sections.allowOpenRsvp) {
        return NextResponse.json(
          { error: "Usa el enlace personalizado que recibiste para confirmar" },
          { status: 403 }
        );
      }
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name) {
        return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
      }
      const created = await createGuest({
        eventId: event.id,
        name,
        passesAllocated: Math.min(Math.max(Number(body.passesConfirmed) || 1, 1), 6)
      });
      token = created.token;
    }

    const guest = await submitRsvp(event.id, token, rsvp);
    if (!guest) {
      return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, guest: toPublicGuest(guest) });
  } catch (err) {
    console.error("rsvp failed", err);
    return NextResponse.json({ error: "No se pudo guardar tu confirmación" }, { status: 500 });
  }
}
