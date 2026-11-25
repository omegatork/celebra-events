"use client";

import React, { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import AuthShell, { inputClass, postJson, primaryButtonClass, safeNext } from "@/components/AuthShell";

function AdminLoginForm() {
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { ok, data } = await postJson("/api/auth/admin", { password });
    setLoading(false);
    if (ok) window.location.href = safeNext(params.get("next"));
    else setError(data.error || "No se pudo iniciar sesión");
  };

  return (
    <AuthShell title="Administración" subtitle="Acceso del equipo de celebra.events">
      <form onSubmit={submit} className="space-y-4">
        <input
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          placeholder="Contraseña de administración"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
        {error && <p className="text-sm text-rose-700">{error}</p>}
        <button type="submit" disabled={loading} className={primaryButtonClass}>
          {loading ? "Verificando..." : "Entrar"}
        </button>
      </form>
    </AuthShell>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginForm />
    </Suspense>
  );
}
