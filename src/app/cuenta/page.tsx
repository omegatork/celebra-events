"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import AuthShell, { inputClass, labelClass, postJson, primaryButtonClass } from "@/components/AuthShell";

interface Me {
  kind: "user" | "invitation" | "admin";
  email?: string;
  name?: string;
  hasPassword?: boolean;
  hasGoogle?: boolean;
}

export default function AccountPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then(async (r) => {
      if (r.status === 401) window.location.href = "/login?next=/cuenta";
      else setMe(await r.json());
    });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) return setMsg({ ok: false, text: "Las contraseñas no coinciden" });
    setLoading(true);
    const { ok, data } = await postJson("/api/auth/password", { currentPassword: current, newPassword: next });
    setLoading(false);
    setMsg(ok ? { ok, text: "Contraseña actualizada. Cerramos tus otras sesiones." } : { ok, text: data.error });
    if (ok) {
      setMe((m) => (m ? { ...m, hasPassword: true } : m));
      setCurrent("");
      setNext("");
      setConfirm("");
    }
  };

  return (
    <AuthShell
      title="Mi cuenta"
      subtitle={me?.kind === "user" ? `${me.name} · ${me.email}` : undefined}
      footer={
        <Link href="/dashboard" className="underline">
          Volver al panel
        </Link>
      }
    >
      {me && me.kind !== "user" ? (
        <p className="text-sm text-stone-600 text-center">
          Esta sección es para cuentas de organizador.{" "}
          <Link href="/registro" className="underline font-semibold">
            Crea una cuenta
          </Link>{" "}
          para administrar varias invitaciones.
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {me?.hasGoogle && (
            <p className="text-xs text-stone-500 text-center">Tu cuenta está conectada con Google.</p>
          )}
          {me?.hasPassword === false ? (
            <p className="text-sm text-stone-600">
              Entras con Google. Si quieres, crea también una contraseña para entrar con tu correo.
            </p>
          ) : (
            <div>
              <label className={labelClass}>Contraseña actual</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                className={inputClass}
              />
            </div>
          )}
          <div>
            <label className={labelClass}>Nueva contraseña (mínimo 10 caracteres)</label>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Confirmar nueva contraseña</label>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputClass}
            />
          </div>
          {msg && <p className={`text-sm ${msg.ok ? "text-emerald-700" : "text-rose-700"}`}>{msg.text}</p>}
          <button type="submit" disabled={loading} className={primaryButtonClass}>
            {loading ? "Guardando..." : me?.hasPassword === false ? "Crear contraseña" : "Cambiar contraseña"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
