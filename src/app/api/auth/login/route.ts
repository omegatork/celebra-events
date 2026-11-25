import { NextRequest, NextResponse } from "next/server";
import {
  createSessionValue,
  passwordMatches,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS
} from "@/shared/auth/session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secret = process.env.SESSION_SECRET;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!secret || !adminPassword) {
    return NextResponse.json({ error: "Autenticación no configurada" }, { status: 503 });
  }

  let password = "";
  try {
    const body = await req.json();
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    // fall through with empty password
  }

  if (!(await passwordMatches(password, adminPassword, secret))) {
    // Slow down guessing.
    await new Promise((r) => setTimeout(r, 750));
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await createSessionValue(secret), {
    httpOnly: true,
    sameSite: "lax",
    // Secure when served over HTTPS (Cloudflare sets x-forwarded-proto); LAN access is plain HTTP.
    secure: req.headers.get("x-forwarded-proto") === "https" || req.nextUrl.protocol === "https:",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS
  });
  return res;
}
