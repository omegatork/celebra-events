"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { User, X } from "lucide-react";

/** Header button + modal: "Iniciar sesión / Crear cuenta" with the invitation-password option. */
export default function AuthMenu({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (signedIn) {
    return (
      <Link
        href="/dashboard"
        className="px-4 py-2 rounded-xl bg-[#1A3C34] hover:bg-[#122b25] text-white text-xs uppercase tracking-wider font-semibold transition shadow-sm"
      >
        Mi panel
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#1A3C34]/30 text-[#1A3C34] hover:bg-[#1A3C34]/5 text-xs font-semibold transition"
      >
        <User className="w-4 h-4" />
        Iniciar sesión / Crear cuenta
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-stone-400 hover:text-stone-700"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
            <Link
              href="/login"
              className="block w-full py-3 rounded-xl bg-[#1A3C34] hover:bg-[#122b25] text-white text-center text-sm font-semibold"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/registro"
              className="block w-full py-3 rounded-xl border border-[#1A3C34]/30 text-[#1A3C34] text-center text-sm font-semibold hover:bg-[#1A3C34]/5"
            >
              Crear cuenta
            </Link>
            <div className="border-t border-stone-100 my-4" />
            <Link
              href="/login?modo=invitacion"
              className="block w-full py-3 rounded-xl border border-stone-300 text-stone-700 text-center text-sm font-medium hover:bg-stone-50"
            >
              Iniciar con contraseña de invitación
            </Link>
            <p className="text-xs text-stone-500 text-center">Para invitaciones creadas sin cuenta</p>
          </div>
        </div>
      )}
    </>
  );
}
