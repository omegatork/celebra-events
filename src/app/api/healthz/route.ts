import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Liveness: the Node process is up. Does not touch the database. */
export async function GET() {
  return NextResponse.json({ ok: true });
}
