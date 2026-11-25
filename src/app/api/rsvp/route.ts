import { NextResponse } from "next/server";
import { deleteGuest, getGuestsByEventId, upsertGuest } from "@/lib/db";
import { GuestPass } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.action === "delete" && body.id) {
      deleteGuest(body.id);
      return NextResponse.json({ ok: true });
    }

    const tokenSlug =
      body.token ||
      String(body.name || "invitado")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    const existingGuests = getGuestsByEventId(body.eventId);
    const existing = existingGuests.find((g) => g.id === body.id || g.token === tokenSlug);

    const guestToSave: GuestPass = {
      id: existing?.id || body.id || `gst-${Date.now()}`,
      eventId: body.eventId,
      name: body.name || existing?.name || "Invitado",
      token: existing?.token || tokenSlug,
      phone: body.phone ?? existing?.phone ?? "",
      tableNumber: body.tableNumber ?? existing?.tableNumber ?? "Por asignar",
      passesAllocated: Number(body.passesAllocated ?? existing?.passesAllocated ?? 2),
      passesConfirmed:
        body.status === "confirmed"
          ? Number(body.passesConfirmed ?? existing?.passesAllocated ?? 1)
          : 0,
      status: body.status || existing?.status || "pending",
      dietaryNotes: body.dietaryNotes ?? existing?.dietaryNotes ?? "",
      message: body.message ?? existing?.message ?? "",
      updatedAt: new Date().toISOString()
    };

    const saved = upsertGuest(guestToSave);
    return NextResponse.json({ ok: true, guest: saved });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
