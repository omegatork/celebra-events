import { NextResponse } from "next/server";
import { getEventBySlug, isValidSlug, listEvents, SlugTakenError, upsertEvent } from "@/modules/events/repository";
import { listGuestsByEvent } from "@/modules/guests/repository";
import { EventInvitation } from "@/lib/types";

// Organizer-only (protected by middleware).
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug");

  if (slug) {
    const event = await getEventBySlug(slug);
    if (!event) {
      return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
    }
    const guests = await listGuestsByEvent(event.id);
    return NextResponse.json({ event, guests });
  }

  return NextResponse.json({
    environment: process.env.APP_ENV || "development",
    events: await listEvents()
  });
}

export async function POST(request: Request) {
  let body: EventInvitation;
  try {
    body = (await request.json()) as EventInvitation;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (!body?.id || typeof body.id !== "string" || body.id.length > 80) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }
  if (!body.slug || !isValidSlug(body.slug)) {
    return NextResponse.json(
      { error: "URL inválida: usa minúsculas, números y guiones (3-80 caracteres)" },
      { status: 400 }
    );
  }
  if (!body.title || typeof body.title !== "string") {
    return NextResponse.json({ error: "El título es obligatorio" }, { status: 400 });
  }
  if (JSON.stringify(body).length > 200_000) {
    return NextResponse.json({ error: "Evento demasiado grande" }, { status: 413 });
  }

  try {
    return NextResponse.json({ event: await upsertEvent(body) });
  } catch (err) {
    if (err instanceof SlugTakenError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("upsertEvent failed", err);
    return NextResponse.json({ error: "Error al guardar el evento" }, { status: 500 });
  }
}
