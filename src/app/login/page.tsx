"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AuthShell, { inputClass, labelClass, postJson, primaryButtonClass, safeNext } from "@/components/AuthShell";

type Mode = "cuenta" | "invitacion";

function LoginForms() {
  const params = useSearchParams();
  const [mode, setMode] = useState<Mode>(params.get("modo") === "invitacion" ? "invitacion" : "cuenta");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [slug, setSlug] = useState("");
  const [invPassword, setInvPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const next = safeNext(params.get("next"));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { ok, data } =
      mode === "cuenta"
        ? await postJson("/api/auth/login", { email, password })
        : await postJson("/api/auth/invitation", { slug, password: invPassword });
    setLoading(false);
    if (ok) {
      window.location.href = mode === "cuenta" ? next : "/dashboard";
    } else {
      setError(data.error || "No se pudo iniciar sesión");
    }
  };

  const tab = (m: Mode, label: string) => (
    <button
      type="button"
      onClick={() => {
        setMode(m);
        setError("");
      }}
      className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${
        mode === m ? "bg-white shadow-sm text-[#1A3C34]" : "text-stone-500"
      }`}
    >
      {label}
    </button>
  );

  return (
    <AuthShell
      title="Iniciar sesión"
      subtitle={mode === "cuenta" ? "Administra tus invitaciones" : "Para invitaciones creadas sin cuenta"}
      footer={
        <>
          ¿No tienes cuenta?{" "}
          <Link href="/registro" className="font-semibold text-[#1A3C34] underline">
            Crear cuenta
          </Link>
        </>
      }
    >
      <div className="flex gap-1 p-1 rounded-xl bg-stone-100">
        {tab("cuenta", "Con mi cuenta")}
        {tab("invitacion", "Contraseña de invitación")}
      </div>

      <form onSubmit={submit} className="space-y-4">
        {mode === "cuenta" ? (
          <>
            <div>
              <label className={labelClass}>Correo</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Contraseña</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className={labelClass}>Dirección de tu invitación</label>
              <div className="flex items-center rounded-xl border border-stone-200 overflow-hidden">
                <span className="pl-4 pr-1 text-sm text-stone-400 whitespace-nowrap">/e/</span>
                <input
                  type="text"
                  required
                  placeholder="sofia-y-mateo"
                  autoCapitalize="none"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full py-3 pr-4 text-sm focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Contraseña de invitación</label>
              <input
                type="text"
                required
                placeholder="XXXX-XXXX-XXXX"
                autoCapitalize="characters"
                autoComplete="off"
                value={invPassword}
                onChange={(e) => setInvPassword(e.target.value)}
                className={`${inputClass} font-mono tracking-wider`}
              />
              <p className="mt-1.5 text-xs text-stone-400">La recibiste al contratar tu invitación.</p>
            </div>
          </>
        )}

        {error && <p className="text-sm text-rose-700">{error}</p>}
        <button type="submit" disabled={loading} className={primaryButtonClass}>
          {loading ? "Verificando..." : "Entrar"}
        </button>
        {mode === "cuenta" && (
          <p className="text-xs text-stone-400 text-center">
            ¿Olvidaste tu contraseña? Escríbenos y te ayudamos a restablecerla.
          </p>
        )}
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForms />
    </Suspense>
  );
}
