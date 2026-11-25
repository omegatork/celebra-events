"use client";

import React, { useState } from "react";
import Link from "next/link";
import AuthShell, { inputClass, labelClass, postJson, primaryButtonClass } from "@/components/AuthShell";

const MIN = 10;

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < MIN) return setError(`La contraseña debe tener al menos ${MIN} caracteres`);
    if (password !== confirm) return setError("Las contraseñas no coinciden");
    setLoading(true);
    const { ok, data } = await postJson("/api/auth/register", { name, email, password });
    setLoading(false);
    if (ok) window.location.href = "/dashboard";
    else setError(data.error || "No se pudo crear la cuenta");
  };

  return (
    <AuthShell
      title="Crear cuenta"
      subtitle="Diseña y administra tus invitaciones"
      footer={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-semibold text-[#1A3C34] underline">
            Iniciar sesión
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className={labelClass}>Nombre</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </div>
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
          <label className={labelClass}>Contraseña (mínimo {MIN} caracteres)</label>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Confirmar contraseña</label>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputClass}
          />
        </div>
        {error && <p className="text-sm text-rose-700">{error}</p>}
        <button type="submit" disabled={loading} className={primaryButtonClass}>
          {loading ? "Creando cuenta..." : "Crear cuenta"}
        </button>
        <p className="text-xs text-stone-400 text-center">
          ¿Ya tienes una invitación con contraseña? Después de crear tu cuenta podrás agregarla desde tu panel.
        </p>
      </form>
    </AuthShell>
  );
}
