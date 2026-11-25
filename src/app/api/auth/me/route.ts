import { NextResponse } from "next/server";
import { requireSession } from "@/shared/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await requireSession();
  if (s instanceof NextResponse) return s;
  return NextResponse.json({
    kind: s.kind,
    email: s.email,
    name: s.name,
    eventSlug: s.eventSlug
  });
}
