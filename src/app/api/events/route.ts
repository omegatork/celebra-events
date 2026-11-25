import { NextResponse } from "next/server";
import { getAllEvents, getEventBySlug, getGuestsByEventId, upsertEvent } from "@/lib/db";
import { EventInvitation } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (slug) {
    const event = getEventBySlug(slug);
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    const guests = getGuestsByEventId(event.id);
    return NextResponse.json({ event, guests });
  }

  const events = getAllEvents();
  return NextResponse.json({
    environment: process.env.APP_ENV || "development",
    events
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as EventInvitation;
    if (!body.slug || !body.title) {
      return NextResponse.json({ error: "Slug and title are required" }, { status: 400 });
    }
    const saved = upsertEvent(body);
    return NextResponse.json({ event: saved });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
