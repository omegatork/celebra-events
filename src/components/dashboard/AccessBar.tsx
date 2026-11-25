"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Copy, KeyRound, Link2, Shield, User, Users } from "lucide-react";
import { EventInvitation } from "@/lib/types";

export interface Me {
  kind: "user" | "invitation" | "admin";
  email?: string;
  name?: string;
  eventSlug?: string;
}

export type EventMeta = Record<string, { owned: boolean; hasInvitationPassword: boolean }>;

/** Identity strip under the dashboard header with role-specific actions. */
export default function AccessBar({
  me,
  selectedEvent,
  meta,
  onChanged
}: {
  me: Me;
  selectedEvent: EventInvitation | null;
  meta?: EventMeta;
  onChanged: (slug?: string) => void;
}) {
  const [generated, setGenerated] = useState<{ slug: string; password: string } | null>(null);
  const [claimOpen, setClaimOpen] = useState(false);
  const [claimSlug, setClaimSlug] = useState("");
  const [claimPassword, setClaimPassword] = useState("");
  const [claimError, setClaimError] = useState("");
  const [busy, setBusy] = useState(false);

  const eventMeta = selectedEvent && meta ? meta[selectedEvent.id] : undefined;

  const generatePassword = async () => {
    if (!selectedEvent) return;
    if (
      eventMeta?.hasInvitationPassword &&
      !confirm("Ya existe una contraseña de invitación. ¿Generar una nueva? La anterior dejará de funcionar.")
    )
      return;
    setBusy(true);
    const res = await fetch("/api/admin/invitation-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: selectedEvent.id })
    });
    const data = await res.json();
    setBusy(false);
    if (res.ok) {
      setGenerated({ slug: data.slug, password: data.password });
      onChanged(selectedEvent.slug);
    } else alert(data.error || "Error");
  };

  const claim = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setClaimError("");
    const res = await fetch("/api/account/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: claimSlug, password: claimPassword })
    });
    const data = await res.json();
    setBusy(false);
    if (res.ok) {
      setClaimOpen(false);
      setClaimSlug("");
      setClaimPassword("");
      onChanged(data.slug);
    } else setClaimError(data.error || "No se pudo agregar la invitación");
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="bg-white/70 border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-stone-600">
          {me.kind === "admin" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1A3C34] text-amber-100 font-semibold">
              <Shield className="w-3.5 h-3.5" /> Administrador de plataforma
            </span>
          )}
          {me.kind === "user" && (
            <span className="inline-flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> {me.name} · {me.email}
            </span>
          )}
          {me.kind === "invitation" && (
            <span className="inline-flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5" /> Acceso con contraseña de invitación · /e/{me.eventSlug}
            </span>
          )}
          {me.kind === "admin" && eventMeta && (
            <span className="text-stone-500">
              ·{" "}
              {eventMeta.owned
                ? "Vinculada a una cuenta"
                : eventMeta.hasInvitationPassword
                  ? "Con contraseña de invitación"
                  : "Sin cuenta ni contraseña"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {me.kind === "admin" && (
            <>
              {selectedEvent && eventMeta && !eventMeta.owned && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={generatePassword}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-950 font-semibold hover:bg-amber-100"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  {eventMeta.hasInvitationPassword ? "Regenerar contraseña de invitación" : "Generar contraseña de invitación"}
                </button>
              )}
              <Link
                href="/admin/usuarios"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 font-semibold text-stone-700 hover:bg-stone-100"
              >
                <Users className="w-3.5 h-3.5" /> Usuarios
              </Link>
            </>
          )}
          {me.kind === "user" && (
            <>
              <button
                type="button"
                onClick={() => setClaimOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 font-semibold text-stone-700 hover:bg-stone-100"
              >
                <Link2 className="w-3.5 h-3.5" /> Agregar invitación a mi cuenta
              </button>
              <Link
                href="/cuenta"
                className="px-3 py-1.5 rounded-lg border border-stone-200 font-semibold text-stone-700 hover:bg-stone-100"
              >
                Mi cuenta
              </Link>
            </>
          )}
          {me.kind === "invitation" && (
            <Link href="/registro" className="underline text-stone-600">
              Crea una cuenta para administrar varias invitaciones
            </Link>
          )}
        </div>
      </div>

      {generated && (
        <div className="max-w-7xl mx-auto px-6 pb-4">
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-sm space-y-2">
            <p>
              Contraseña de invitación para <strong>/e/{generated.slug}</strong>. <strong>No se volverá a mostrar</strong>;
              cópiala ahora y compártela con tu cliente:
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <code className="font-mono text-lg tracking-wider bg-white px-3 py-1 rounded-lg border border-amber-200">
                {generated.password}
              </code>
              <button
                type="button"
                onClick={() =>
                  navigator.clipboard.writeText(
                    `Tu invitación: ${origin}/e/${generated.slug}\nPara editarla entra a ${origin}/login?modo=invitacion\nDirección: ${generated.slug}\nContraseña: ${generated.password}`
                  )
                }
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-xs font-semibold"
              >
                <Copy className="w-3.5 h-3.5" /> Copiar mensaje para el cliente
              </button>
              <button type="button" onClick={() => setGenerated(null)} className="text-xs underline">
                Ocultar
              </button>
            </div>
          </div>
        </div>
      )}

      {claimOpen && (
        <div className="max-w-7xl mx-auto px-6 pb-4">
          <form onSubmit={claim} className="p-4 rounded-2xl bg-white border border-stone-200 flex flex-wrap items-end gap-3 text-sm">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-stone-500 mb-1">Dirección (/e/...)</label>
              <input
                required
                value={claimSlug}
                onChange={(e) => setClaimSlug(e.target.value)}
                placeholder="sofia-y-mateo"
                className="px-3 py-2 rounded-xl border border-stone-200"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-stone-500 mb-1">Contraseña de invitación</label>
              <input
                required
                value={claimPassword}
                onChange={(e) => setClaimPassword(e.target.value)}
                placeholder="XXXX-XXXX-XXXX"
                className="px-3 py-2 rounded-xl border border-stone-200 font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 rounded-xl bg-[#1A3C34] text-white text-xs uppercase tracking-wider font-semibold"
            >
              Agregar
            </button>
            <p className="w-full text-xs text-stone-500">
              Al agregarla, la invitación quedará en tu cuenta y su contraseña de invitación dejará de funcionar.
            </p>
            {claimError && <p className="w-full text-rose-700">{claimError}</p>}
          </form>
        </div>
      )}
    </div>
  );
}
