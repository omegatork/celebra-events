"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, KeyRound, Trash2 } from "lucide-react";

interface UserSummary {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  eventCount: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserSummary[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<{ email: string; password: string } | null>(null);

  const load = async () => {
    const res = await fetch("/api/admin/users");
    if (res.status === 401) {
      window.location.href = "/admin/login?next=/admin/usuarios";
      return;
    }
    if (res.status === 403) {
      setError("Solo el equipo de administración puede ver esta página.");
      return;
    }
    setUsers((await res.json()).users);
  };

  useEffect(() => {
    load();
  }, []);

  const reset = async (u: UserSummary) => {
    if (!confirm(`¿Restablecer la contraseña de ${u.email}? Se cerrarán sus sesiones.`)) return;
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: u.id, action: "reset" })
    });
    const data = await res.json();
    if (res.ok) setNotice({ email: u.email, password: data.temporaryPassword });
    else alert(data.error || "Error");
  };

  const remove = async (u: UserSummary) => {
    if (!confirm(`¿Eliminar la cuenta ${u.email}? Sus invitaciones se conservan y quedan a cargo del administrador.`))
      return;
    const res = await fetch(`/api/admin/users?id=${encodeURIComponent(u.id)}`, { method: "DELETE" });
    if (res.ok) load();
    else alert((await res.json()).error || "Error");
  };

  return (
    <div className="min-h-screen bg-stone-100 px-6 py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-3xl text-[#1A3C34]">Usuarios</h1>
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-stone-600 hover:text-stone-900">
            <ArrowLeft className="w-4 h-4" /> Volver al panel
          </Link>
        </div>

        {error && <p className="p-4 rounded-2xl bg-rose-50 text-rose-800 text-sm">{error}</p>}

        {notice && (
          <div className="p-5 rounded-2xl bg-amber-50 border border-amber-300 text-sm space-y-2">
            <p>
              Contraseña temporal para <strong>{notice.email}</strong> (no se volverá a mostrar):
            </p>
            <p className="font-mono text-lg tracking-wider">{notice.password}</p>
            <p className="text-stone-600">Compártela con el usuario y pídele que la cambie en “Mi cuenta”.</p>
            <button type="button" onClick={() => setNotice(null)} className="text-xs underline">
              Ocultar
            </button>
          </div>
        )}

        {users && (
          <div className="rounded-3xl bg-white border border-stone-200 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-[11px] uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="py-3 px-5">Nombre</th>
                  <th className="py-3 px-4">Correo</th>
                  <th className="py-3 px-4">Invitaciones</th>
                  <th className="py-3 px-4">Alta</th>
                  <th className="py-3 px-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 px-5 text-stone-500">
                      Aún no hay cuentas registradas.
                    </td>
                  </tr>
                )}
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="py-3 px-5 font-medium">{u.name}</td>
                    <td className="py-3 px-4 text-stone-600">{u.email}</td>
                    <td className="py-3 px-4">{u.eventCount}</td>
                    <td className="py-3 px-4 text-stone-500">{new Date(u.createdAt).toLocaleDateString("es-MX")}</td>
                    <td className="py-3 px-5 text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => reset(u)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-stone-200 text-xs hover:bg-stone-100"
                      >
                        <KeyRound className="w-3.5 h-3.5" /> Restablecer contraseña
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(u)}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                        title="Eliminar cuenta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
