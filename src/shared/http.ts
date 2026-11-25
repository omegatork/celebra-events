import { NextResponse } from "next/server";
import { getSession, Session } from "@/modules/identity/sessions";

export const unauthorized = () => NextResponse.json({ error: "No autorizado" }, { status: 401 });
export const forbidden = () => NextResponse.json({ error: "No tienes permiso para esta acción" }, { status: 403 });
export const notFound = (what = "No encontrado") => NextResponse.json({ error: what }, { status: 404 });
export const badRequest = (error: string) => NextResponse.json({ error }, { status: 400 });

/** Returns the session, or a 401 response to return directly. */
export async function requireSession(): Promise<Session | NextResponse> {
  const s = await getSession();
  return s ?? unauthorized();
}

export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export const str = (v: unknown) => (typeof v === "string" ? v : "");
