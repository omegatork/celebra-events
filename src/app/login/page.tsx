"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Only allow relative redirects inside this site.
  const nextParam = params.get("next") || "/dashboard";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/dashboard";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      if (res.ok) {
        router.replace(next);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "No se pudo iniciar sesión");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-sm p-8 rounded-3xl bg-white border border-stone-200 shadow-sm space-y-5"
    >
      <div className="text-center space-y-2">
        <div className="w-11 h-11 mx-auto rounded-2xl bg-[#1A3C34] text-amber-200 flex items-center justify-center">
          <Lock className="w-5 h-5" />
        </div>
        <h1 className="font-serif text-2xl text-[#1A3C34]">celebra.events</h1>
        <p className="text-sm text-stone-500">Acceso al panel de organizadores</p>
      </div>
      <input
        type="password"
        autoFocus
        required
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Contraseña"
        className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm"
      />
      {error && <p className="text-sm text-rose-700">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl bg-[#1A3C34] hover:bg-[#122b25] text-white text-xs uppercase tracking-widest font-semibold"
      >
        {loading ? "Verificando..." : "Entrar"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-100 px-6">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
