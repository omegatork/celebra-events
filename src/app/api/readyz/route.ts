import { NextResponse } from "next/server";
import { getPool } from "@/shared/db/pool";

export const dynamic = "force-dynamic";

/** Readiness: the app can reach Postgres. */
export async function GET() {
  try {
    await getPool().query("SELECT 1");
    return NextResponse.json({ ok: true, environment: process.env.APP_ENV || "development" });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
