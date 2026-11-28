import { NextResponse } from "next/server";
import {
  createEvent,
  deleteEvent,
  getEventById,
  getEventBySlug,
  isValidSlug,
  listOwnershipMeta,
  SlugTakenError,
  updateEvent
} from "@/modules/events/repository";
import { listGuestsByEvent } from "@/modules/guests/repository";
import {
  accountForNewEvent,
  canCreateEvents,
  canManageEvent,
  isAdmin,
  listVisibleEvents
} from "@/modules/identity/authorization";
import { badRequest, forbidden, notFound, requireSession } from "@/shared/http";
import { EventInvitation } from "@/lib/types";

export const dynamic = "force-dynamic";

const NOT_FOUND = "Evento no encontrado";

export async function GET(request: Request) {
  const s = await requireSession();
  if (s instanceof NextResponse) return s;

  const slug = new URL(request.url).searchParams.get("slug");
  if (slug) {
    const event = await getEventBySlug(slug);
    // 404 (not 403) so other people's event slugs can't be probed.
    if (!event || !(await canManageEvent(s, event.id))) return notFound(NOT_FOUND);
    return NextResponse.json({ event, guests: await listGuestsByEvent(event.id) });
  }

  return NextResponse.json({
    environment: process.env.APP_ENV || "development",
    events: await listVisibleEvents(s),
    meta: isAdmin(s) ? await listOwnershipMeta() : undefined
  });
}

export async function POST(request: Request) {
  const s = await requireSession();
  if (s instanceof NextResponse) return s;

  let body: EventInvitation;
  try {
    body = (await request.json()) as EventInvitation;
  } catch {
    return badRequest("JSON inválido");
  }
  if (!body?.id || typeof body.id !== "string" || !/^[A-Za-z0-9_-]{3,80}$/.test(body.id)) {
    return badRequest("id inválido");
  }
  if (!body.slug || !isValidSlug(body.slug)) {
    return badRequest("URL inválida: usa minúsculas, números y guiones (3-80 caracteres)");
  }
  if (typeof body.title !== "string") return badRequest("El título es obligatorio");
  if (JSON.stringify(body).length > 200_000) {
    return NextResponse.json({ error: "Evento demasiado grande" }, { status: 413 });
  }

  try {
    const existing = await getEventById(body.id);
    if (existing) {
      if (!(await canManageEvent(s, existing.id))) return notFound(NOT_FOUND);
      const updated = await updateEvent(body);
      return updated ? NextResponse.json({ event: updated }) : notFound(NOT_FOUND);
    }
    if (!canCreateEvents(s)) return forbidden();
    return NextResponse.json({ event: await createEvent(body, accountForNewEvent(s)) });
  } catch (err) {
    if (err instanceof SlugTakenError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("save event failed", err);
    return NextResponse.json({ error: "Error al guardar el evento" }, { status: 500 });
  }
}

/** DELETE /api/events?id=...  (platform admin only for now) */
export async function DELETE(request: Request) {
  const s = await requireSession();
  if (s instanceof NextResponse) return s;
  if (!isAdmin(s)) return forbidden();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return badRequest("id es obligatorio");
  return (await deleteEvent(id)) ? NextResponse.json({ ok: true }) : notFound(NOT_FOUND);
}
