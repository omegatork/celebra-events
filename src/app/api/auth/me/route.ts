import { NextResponse } from "next/server";
import { findUserById } from "@/modules/identity/repository";
import { requireSession } from "@/shared/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await requireSession();
  if (s instanceof NextResponse) return s;
  const user = s.kind === "user" && s.userId ? await findUserById(s.userId) : undefined;
  return NextResponse.json({
    kind: s.kind,
    email: s.email,
    name: s.name,
    eventSlug: s.eventSlug,
    ...(user && { hasPassword: !!user.password_hash, hasGoogle: !!user.google_sub })
  });
}
