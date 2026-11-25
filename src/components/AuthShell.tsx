import React from "react";
import Link from "next/link";

/** Shared frame for login / sign-up / account pages. */
export default function AuthShell({
  title,
  subtitle,
  children,
  footer
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF8F5] px-6 py-12">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="w-9 h-9 rounded-xl bg-[#1A3C34] text-amber-200 flex items-center justify-center font-serif font-bold text-lg">
          C
        </div>
        <span className="font-serif text-xl font-semibold text-[#1A3C34]">celebra.events</span>
      </Link>
      <div className="w-full max-w-sm p-8 rounded-3xl bg-white border border-stone-200 shadow-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="font-serif text-2xl text-[#1A3C34]">{title}</h1>
          {subtitle && <p className="text-sm text-stone-500">{subtitle}</p>}
        </div>
        {children}
      </div>
      {footer && <div className="mt-6 text-sm text-stone-600 text-center">{footer}</div>}
    </div>
  );
}

export const inputClass =
  "w-full px-4 py-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3C34]/30";
export const primaryButtonClass =
  "w-full py-3 rounded-xl bg-[#1A3C34] hover:bg-[#122b25] disabled:opacity-60 text-white text-xs uppercase tracking-widest font-semibold transition";
export const labelClass = "block text-[11px] uppercase tracking-wider text-stone-500 mb-1";

/** POST JSON and return { ok, data }. */
export async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

/** Only allow same-site relative redirects. */
export function safeNext(next: string | null, fallback = "/dashboard"): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
