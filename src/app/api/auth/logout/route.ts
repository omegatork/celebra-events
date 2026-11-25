import { NextResponse } from "next/server";
import { clearSessionCookie, deleteCurrentSession } from "@/modules/identity/sessions";

export const dynamic = "force-dynamic";

export async function POST() {
  await deleteCurrentSession().catch(() => {});
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}
