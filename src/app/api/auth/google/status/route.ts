import { NextResponse } from "next/server";
import { googleConfig } from "@/modules/identity/google";

export const dynamic = "force-dynamic";

/** Lets the login/sign-up pages decide whether to show the Google button. */
export async function GET() {
  return NextResponse.json({ enabled: googleConfig() !== null });
}
