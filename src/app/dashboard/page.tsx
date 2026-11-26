"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  MessageCircle,
  Palette,
  Plus,
  Save,
  Settings,
  Sparkles,
  Trash2,
  Users,
  XCircle
} from "lucide-react";
import { EventInvitation, GuestPass, ThemePalette } from "@/lib/types";
import { newEventTemplate } from "@/lib/eventTemplate";
import AccessBar, { EventMeta, Me } from "@/components/dashboard/AccessBar";
import WhatsAppSender from "@/components/dashboard/WhatsAppSender";
import { renderMessage, templateFor, whatsappLink } from "@/lib/whatsapp";

export default function DashboardPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [meta, setMeta] = useState<EventMeta | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);
  const [events, setEvents] = useState<EventInvitation[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventInvitation | null>(null);
  const [guests, setGuests] = useState<GuestPass[]>([]);
  const [activeTab, setActiveTab] = useState<"guests" | "editor" | "preview">("guests");
  const [isSaving, setIsSaving] = useState(false);
  const [saveBanner, setSaveBanner] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [senderOpen, setSenderOpen] = useState(false);

  // New Guest Modal / Form State
  const [newGuestName, setNewGuestName] = useState("");
  const [newGuestPhone, setNewGuestPhone] = useState("");
  const [newGuestPasses, setNewGuestPasses] = useState(2);
  const [newGuestTable, setNewGuestTable] = useState("Mesa 1");

  const loadEvents = async (preferredSlug?: string) => {
    const res = await fetch("/api/events");
    if (res.status === 401) {
      window.location.href = "/login?next=/dashboard";
      return;
    }
    const data = await res.json();
    const list: EventInvitation[] = data.events || [];
    setEvents(list);
    setMeta(data.meta);
    setLoaded(true);

    const target =
      (preferredSlug && list.find((e) => e.slug === preferredSlug)) ||
      (selectedEvent && list.find((e) => e.id === selectedEvent.id)) ||
      list[0];
    if (target) {
      selectEvent(target.slug);
    } else {
      setSelectedEvent(null);
      setGuests([]);
    }
  };

  const selectEvent = async (slug: string) => {
    const res = await fetch(`/api/events?slug=${slug}`);
    const data = await res.json();
    if (data.event) {
      setSelectedEvent(data.event);
      setGuests(data.guests || []);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    fetch("/api/auth/me").then(async (r) => {
      if (r.status === 401) {
        window.location.href = "/login?next=/dashboard";
        return;
      }
      setMe(await r.json());
      loadEvents(params.get("slug") || undefined);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = me?.kind === "admin" ? "/admin/login" : "/";
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedEvent)
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveBanner(`Error: ${data.error || "no se pudo guardar"}`);
        setTimeout(() => setSaveBanner(""), 5000);
      } else if (data.event) {
        setSelectedEvent(data.event);
        setSaveBanner("¡Cambios guardados y publicados en la invitación!");
        setTimeout(() => setSaveBanner(""), 3500);
        loadEvents(data.event.slug);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateNewEvent = async () => {
    const template = newEventTemplate();
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(template)
    });
    const data = await res.json();
    if (data.event) {
      await loadEvents(data.event.slug);
      setActiveTab("editor");
    } else {
      alert(data.error || "No se pudo crear el evento");
    }
  };

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !newGuestName.trim()) return;

    const res = await fetch("/api/guests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: selectedEvent.id,
        name: newGuestName.trim(),
        phone: newGuestPhone.trim(),
        passesAllocated: Number(newGuestPasses),
        tableNumber: newGuestTable.trim() || "Por asignar"
      })
    });
    if (res.ok) {
      setNewGuestName("");
      setNewGuestPhone("");
      setNewGuestPasses(2);
      selectEvent(selectedEvent.slug);
    }
  };

  const handleDeleteGuest = async (guestId: string) => {
    if (!selectedEvent) return;
    await fetch(
      `/api/guests?eventId=${encodeURIComponent(selectedEvent.id)}&id=${encodeURIComponent(guestId)}`,
      { method: "DELETE" }
    );
    selectEvent(selectedEvent.slug);
  };

  const getGuestInviteUrl = (guest: GuestPass) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://192.168.100.240";
    return `${origin}/e/${selectedEvent?.slug}?g=${guest.token}`;
  };

  const getWhatsAppShareUrl = (guest: GuestPass) => {
    if (!selectedEvent) return "#";
    const text = renderMessage(templateFor(selectedEvent, "invite"), selectedEvent, guest, getGuestInviteUrl(guest));
    return whatsappLink(guest.phone, text);
  };

  /** Optimistically mark a guest's invitation as sent / not sent, then persist it. */
  const markInviteSent = async (guest: GuestPass, sent: boolean) => {
    if (!selectedEvent) return;
    const previous = guest.inviteSentAt ?? null;
    const optimistic = sent ? previous ?? new Date().toISOString() : null;
    const apply = (value: string | null) =>
      setGuests((list) => list.map((g) => (g.id === guest.id ? { ...g, inviteSentAt: value } : g)));
    apply(optimistic);
    try {
      const res = await fetch("/api/guests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: selectedEvent.id, id: guest.id, inviteSent: sent })
      });
      if (!res.ok) throw new Error();
      apply((await res.json()).inviteSentAt ?? null);
    } catch {
      apply(previous);
    }
  };

  const sentCount = guests.filter((g) => g.inviteSentAt).length;

  const copyGuestLink = (guest: GuestPass) => {
    navigator.clipboard.writeText(getGuestInviteUrl(guest));
    setCopiedToken(guest.token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  if (!me || !loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100 text-stone-600 text-sm">
        Cargando celebra.events...
      </div>
    );
  }

  if (!selectedEvent) {
    return (
      <div className="min-h-screen bg-stone-100 text-stone-900 flex flex-col">
        <header className="bg-white border-b border-stone-200">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/" className="font-serif text-lg font-semibold text-[#1A3C34]">
              celebra.events
            </Link>
            <button
              type="button"
              onClick={logout}
              className="px-3 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-100"
            >
              Cerrar sesión
            </button>
          </div>
        </header>
        <AccessBar me={me} selectedEvent={null} meta={meta} onChanged={loadEvents} />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-md text-center space-y-4">
            <h1 className="font-serif text-3xl text-[#1A3C34]">Aún no tienes invitaciones</h1>
            <p className="text-sm text-stone-600">
              Crea tu primera invitación, o si ya contrataste una, agrégala con su contraseña desde
              “Agregar invitación a mi cuenta”.
            </p>
            {me.kind !== "invitation" && (
              <button
                type="button"
                onClick={handleCreateNewEvent}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1A3C34] text-white text-xs uppercase tracking-widest font-semibold"
              >
                <Plus className="w-4 h-4" /> Crear mi invitación
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Calculate RSVP Metrics
  const totalPassesAllocated = guests.reduce((acc, g) => acc + g.passesAllocated, 0);
  const totalPassesConfirmed = guests
    .filter((g) => g.status === "confirmed")
    .reduce((acc, g) => acc + g.passesConfirmed, 0);
  const totalPendingFamilies = guests.filter((g) => g.status === "pending").length;
  const totalDeclinedFamilies = guests.filter((g) => g.status === "declined").length;

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 flex flex-col">
      {/* Top Studio Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#1A3C34] text-amber-200 flex items-center justify-center font-serif font-bold">
                C
              </div>
              <span className="font-serif text-lg font-semibold text-[#1A3C34]">
                celebra.events
              </span>
            </Link>

            <span className="text-stone-300">/</span>

            {/* Event Switcher */}
            <select
              value={selectedEvent.slug}
              onChange={(e) => selectEvent(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-stone-100 border border-stone-200 text-sm font-medium text-stone-800"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.slug}>
                  {ev.title} ({ev.subtitle})
                </option>
              ))}
            </select>

            {me.kind !== "invitation" && (
              <button
                type="button"
                onClick={handleCreateNewEvent}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs font-semibold hover:bg-amber-100 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Nuevo Evento
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={logout}
              className="px-3 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-100"
            >
              Cerrar sesión
            </button>
            <Link
              href={`/e/${selectedEvent.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1A3C34] text-white text-xs uppercase tracking-wider font-semibold hover:bg-[#122b25] transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Abrir Invitación Pública
            </Link>
          </div>
        </div>
      </header>

      <AccessBar me={me} selectedEvent={selectedEvent} meta={meta} onChanged={loadEvents} />

      {/* Main Workspace */}
      <div className="max-w-7xl mx-auto w-full px-6 py-8 flex-1 space-y-6">
        {saveBanner && (
          <div className="p-4 rounded-2xl bg-emerald-800 text-white text-sm flex items-center justify-between shadow">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-300" />
              {saveBanner}
            </span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 pb-4">
          <button
            type="button"
            onClick={() => setActiveTab("guests")}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider font-semibold transition ${
              activeTab === "guests"
                ? "bg-[#1A3C34] text-white shadow-sm"
                : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
            }`}
          >
            <Users className="w-4 h-4" />
            1. Lista de Invitados, Pases & WhatsApp ({guests.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("editor")}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider font-semibold transition ${
              activeTab === "editor"
                ? "bg-[#1A3C34] text-white shadow-sm"
                : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
            }`}
          >
            <Palette className="w-4 h-4" />
            2. Editor Visual de Invitación
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider font-semibold transition ${
              activeTab === "preview"
                ? "bg-[#1A3C34] text-white shadow-sm"
                : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
            }`}
          >
            <Eye className="w-4 h-4" />
            3. Vista Previa Móvil En Vivo
          </button>
        </div>

        {/* TAB 1: GUEST LIST, PERSONALIZED LINKS & RSVP DASHBOARD */}
        {activeTab === "guests" && (
          <div className="space-y-8">
            {/* KPI Summary Cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-sm">
                <p className="text-xs uppercase tracking-wider text-stone-400">
                  Total Pases Asignados
                </p>
                <p className="font-serif text-3xl font-bold text-stone-900 mt-1">
                  {totalPassesAllocated}
                </p>
                <p className="text-xs text-stone-500 mt-1">En {guests.length} familias / grupos</p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-emerald-200 shadow-sm">
                <p className="text-xs uppercase tracking-wider text-emerald-700 font-semibold">
                  Pases Confirmados (Asistirán)
                </p>
                <p className="font-serif text-3xl font-bold text-emerald-800 mt-1">
                  {totalPassesConfirmed}
                </p>
                <p className="text-xs text-stone-500 mt-1">Con pase digital</p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-amber-200 shadow-sm">
                <p className="text-xs uppercase tracking-wider text-amber-700 font-semibold">
                  Familias Pendientes
                </p>
                <p className="font-serif text-3xl font-bold text-amber-800 mt-1">
                  {totalPendingFamilies}
                </p>
                <p className="text-xs text-stone-500 mt-1">Por confirmar en su enlace</p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-rose-200 shadow-sm">
                <p className="text-xs uppercase tracking-wider text-rose-700 font-semibold">
                  No Podrán Asistir
                </p>
                <p className="font-serif text-3xl font-bold text-rose-800 mt-1">
                  {totalDeclinedFamilies}
                </p>
                <p className="text-xs text-stone-500 mt-1">Lugares liberados</p>
              </div>
            </div>

            {/* Add New Guest Pass Form */}
            <form
              onSubmit={handleAddGuest}
              className="p-6 rounded-3xl bg-white border border-stone-200 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-xl text-[#1A3C34]">
                  Agregar Familia o Invitado con Pase Personalizado
                </h3>
                <span className="text-xs text-stone-400">
                  Genera automáticamente un link único para enviar por WhatsApp
                </span>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-2">
                  <label className="block text-[11px] uppercase tracking-wider text-stone-500 mb-1">
                    Nombre de la Familia o Invitado
                  </label>
                  <input
                    type="text"
                    required
                    value={newGuestName}
                    onChange={(e) => setNewGuestName(e.target.value)}
                    placeholder="Ej. Familia Hernández López"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-stone-500 mb-1">
                    WhatsApp (Con código país)
                  </label>
                  <input
                    type="text"
                    value={newGuestPhone}
                    onChange={(e) => setNewGuestPhone(e.target.value)}
                    placeholder="5215512345678"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-stone-500 mb-1">
                    Pases Asignados & Mesa
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      max={15}
                      value={newGuestPasses}
                      onChange={(e) => setNewGuestPasses(Number(e.target.value))}
                      className="w-20 px-3 py-2.5 rounded-xl border border-stone-200 text-sm"
                    />
                    <input
                      type="text"
                      value={newGuestTable}
                      onChange={(e) => setNewGuestTable(e.target.value)}
                      placeholder="Mesa 2"
                      className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm"
                    />
                  </div>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-xl bg-[#1A3C34] hover:bg-[#122b25] text-white text-xs uppercase tracking-wider font-semibold transition flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Crear Pase
                  </button>
                </div>
              </div>
            </form>

            {/* Guided WhatsApp sending */}
            <div className="p-5 rounded-3xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
              <div>
                <p className="font-serif text-lg text-emerald-900">Envía las invitaciones por WhatsApp</p>
                <p className="text-xs text-emerald-800/80">
                  {guests.length === 0
                    ? "Agrega invitados para empezar."
                    : `${sentCount} de ${guests.length} enviadas · te guiamos invitado por invitado desde tu propio WhatsApp.`}
                </p>
              </div>
              <button
                type="button"
                disabled={guests.length === 0}
                onClick={() => setSenderOpen(true)}
                className="shrink-0 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs uppercase tracking-wider font-semibold inline-flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Enviar por WhatsApp
              </button>
            </div>

            {senderOpen && (
              <WhatsAppSender
                event={selectedEvent}
                guests={guests}
                inviteUrl={getGuestInviteUrl}
                markSent={markInviteSent}
                onEventSaved={(saved) =>
                  // Only take the message fields, keeping any unsaved edits from the editor tab.
                  setSelectedEvent((cur) =>
                    cur
                      ? { ...cur, whatsappMessage: saved.whatsappMessage, whatsappReminder: saved.whatsappReminder }
                      : saved
                  )
                }
                onClose={() => setSenderOpen(false)}
              />
            )}

            {/* Guests Table */}
            <div className="rounded-3xl bg-white border border-stone-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50 text-[11px] uppercase tracking-wider text-stone-500">
                      <th className="py-3.5 px-5">Invitado / Familia</th>
                      <th className="py-3.5 px-4">Mesa</th>
                      <th className="py-3.5 px-4">Pases</th>
                      <th className="py-3.5 px-4">Estado RSVP</th>
                      <th className="py-3.5 px-4">Notas / Mensaje</th>
                      <th className="py-3.5 px-5 text-right">Acciones & Envío</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 text-sm">
                    {guests.map((g) => (
                      <tr key={g.id} className="hover:bg-stone-50/80">
                        <td className="py-4 px-5">
                          <p className="font-semibold text-stone-900">{g.name}</p>
                          {g.inviteSentAt ? (
                            <p className="text-xs text-emerald-700 mt-0.5">
                              ✓ Enviada{" "}
                              {new Date(g.inviteSentAt).toLocaleDateString("es-MX", {
                                day: "numeric",
                                month: "short"
                              })}{" "}
                              ·{" "}
                              <button
                                type="button"
                                onClick={() => markInviteSent(g, false)}
                                className="underline text-stone-400 hover:text-stone-600"
                              >
                                desmarcar
                              </button>
                            </p>
                          ) : (
                            <p className="text-xs text-stone-400 mt-0.5">
                              Sin enviar ·{" "}
                              <button
                                type="button"
                                onClick={() => markInviteSent(g, true)}
                                className="underline hover:text-stone-600"
                              >
                                marcar como enviada
                              </button>
                            </p>
                          )}
                        </td>
                        <td className="py-4 px-4 text-xs text-stone-600">{g.tableNumber}</td>
                        <td className="py-4 px-4">
                          <span className="font-semibold text-stone-800">
                            {g.status === "confirmed" ? g.passesConfirmed : 0}
                          </span>{" "}
                          <span className="text-stone-400">/ {g.passesAllocated}</span>
                        </td>
                        <td className="py-4 px-4">
                          {g.status === "confirmed" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Confirmado
                            </span>
                          )}
                          {g.status === "pending" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium">
                              <Clock className="w-3.5 h-3.5" />
                              Pendiente
                            </span>
                          )}
                          {g.status === "declined" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-xs font-medium">
                              <XCircle className="w-3.5 h-3.5" />
                              Declinado
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 max-w-xs">
                          {g.dietaryNotes && (
                            <p className="text-xs text-amber-800 font-medium">
                              🍽️ {g.dietaryNotes}
                            </p>
                          )}
                          {g.message && (
                            <p className="text-xs text-stone-500 italic truncate" title={g.message}>
                              &ldquo;{g.message}&rdquo;
                            </p>
                          )}
                        </td>
                        <td className="py-4 px-5 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => copyGuestLink(g)}
                              className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-medium text-stone-700 hover:bg-stone-100 inline-flex items-center gap-1"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              {copiedToken === g.token ? "¡Copiado!" : "Copiar Link"}
                            </button>

                            <a
                              href={getWhatsAppShareUrl(g)}
                              target="_blank"
                              rel="noreferrer"
                              onClick={() => !g.inviteSentAt && markInviteSent(g, true)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium inline-flex items-center gap-1"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              WhatsApp
                            </a>

                            <Link
                              href={`/e/${selectedEvent.slug}?g=${g.token}`}
                              target="_blank"
                              className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100"
                              title="Ver invitación como este invitado"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>

                            <button
                              type="button"
                              onClick={() => handleDeleteGuest(g.id)}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                              title="Eliminar pase"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SELF-SERVE VISUAL INVITATION EDITOR */}
        {activeTab === "editor" && (
          <form onSubmit={handleSaveEvent} className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* General Info & Theme */}
              <div className="p-6 rounded-3xl bg-white border border-stone-200 shadow-sm space-y-5">
                <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                  <Sparkles className="w-5 h-5 text-amber-700" />
                  <h3 className="font-serif text-xl text-[#1A3C34]">
                    Identidad & Tema Visual del Evento
                  </h3>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-stone-500 mb-1">
                      Título Principal
                    </label>
                    <input
                      type="text"
                      value={selectedEvent.title}
                      onChange={(e) =>
                        setSelectedEvent({ ...selectedEvent, title: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider text-stone-500 mb-1">
                      Subtítulo / Encabezado
                    </label>
                    <input
                      type="text"
                      value={selectedEvent.subtitle}
                      onChange={(e) =>
                        setSelectedEvent({ ...selectedEvent, subtitle: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider text-stone-500 mb-1">
                      Paleta de Color & Sello de Lacre
                    </label>
                    <select
                      value={selectedEvent.theme}
                      onChange={(e) =>
                        setSelectedEvent({
                          ...selectedEvent,
                          theme: e.target.value as ThemePalette
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm bg-white"
                    >
                      <option value="emerald-gold">Verde Esmeralda & Oro (Clásico Boda)</option>
                      <option value="rose-quartz">Rosa Cuarzo & Champagne (XV Años / Romántico)</option>
                      <option value="midnight-navy">Azul Medianoche & Dorado (Gala Nocturna)</option>
                      <option value="terracotta-sage">Terracota & Olivo (Hacienda / Jardín)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider text-stone-500 mb-1">
                      Fecha y Hora del Evento (ISO)
                    </label>
                    <input
                      type="text"
                      value={selectedEvent.dateISO}
                      onChange={(e) =>
                        setSelectedEvent({ ...selectedEvent, dateISO: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-stone-500 mb-1">
                    Imagen Principal de Portada (URL)
                  </label>
                  <input
                    type="url"
                    value={selectedEvent.coverImageUrl}
                    onChange={(e) =>
                      setSelectedEvent({ ...selectedEvent, coverImageUrl: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-stone-500 mb-1">
                    Frase / Cita Romántica
                  </label>
                  <textarea
                    rows={2}
                    value={selectedEvent.quote}
                    onChange={(e) =>
                      setSelectedEvent({ ...selectedEvent, quote: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-stone-500 mb-1">
                    Bendición de Padres / Padrinos
                  </label>
                  <textarea
                    rows={3}
                    value={selectedEvent.parentsText}
                    onChange={(e) =>
                      setSelectedEvent({ ...selectedEvent, parentsText: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm"
                  />
                </div>
              </div>

              {/* Venues & Locations */}
              <div className="p-6 rounded-3xl bg-white border border-stone-200 shadow-sm space-y-5">
                <h3 className="font-serif text-xl text-[#1A3C34] border-b border-stone-100 pb-3">
                  Ubicaciones (Ceremonia y Recepción)
                </h3>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-stone-500 mb-1">
                      Sede Ceremonia
                    </label>
                    <input
                      type="text"
                      value={selectedEvent.ceremonyVenue}
                      onChange={(e) =>
                        setSelectedEvent({ ...selectedEvent, ceremonyVenue: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-stone-500 mb-1">
                      Hora Ceremonia
                    </label>
                    <input
                      type="text"
                      value={selectedEvent.ceremonyTime}
                      onChange={(e) =>
                        setSelectedEvent({ ...selectedEvent, ceremonyTime: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs uppercase tracking-wider text-stone-500 mb-1">
                      Dirección Ceremonia
                    </label>
                    <input
                      type="text"
                      value={selectedEvent.ceremonyAddress}
                      onChange={(e) =>
                        setSelectedEvent({ ...selectedEvent, ceremonyAddress: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider text-stone-500 mb-1">
                      Sede Recepción
                    </label>
                    <input
                      type="text"
                      value={selectedEvent.receptionVenue}
                      onChange={(e) =>
                        setSelectedEvent({ ...selectedEvent, receptionVenue: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-stone-500 mb-1">
                      Hora Recepción
                    </label>
                    <input
                      type="text"
                      value={selectedEvent.receptionTime}
                      onChange={(e) =>
                        setSelectedEvent({ ...selectedEvent, receptionTime: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs uppercase tracking-wider text-stone-500 mb-1">
                      Dirección Recepción
                    </label>
                    <input
                      type="text"
                      value={selectedEvent.receptionAddress}
                      onChange={(e) =>
                        setSelectedEvent({ ...selectedEvent, receptionAddress: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Dress Code & Bank Registry */}
              <div className="p-6 rounded-3xl bg-white border border-stone-200 shadow-sm space-y-5">
                <h3 className="font-serif text-xl text-[#1A3C34] border-b border-stone-100 pb-3">
                  Vestimenta & Mesa de Regalos / CLABE
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-stone-500 mb-1">
                      Código de Vestimenta
                    </label>
                    <input
                      type="text"
                      value={selectedEvent.dressCode}
                      onChange={(e) =>
                        setSelectedEvent({ ...selectedEvent, dressCode: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-stone-500 mb-1">
                      Notas de Vestimenta
                    </label>
                    <input
                      type="text"
                      value={selectedEvent.dressCodeNotes}
                      onChange={(e) =>
                        setSelectedEvent({ ...selectedEvent, dressCodeNotes: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-stone-500 mb-1">
                      Banco (Lluvia de Sobres)
                    </label>
                    <input
                      type="text"
                      value={selectedEvent.bankDetails.bank}
                      onChange={(e) =>
                        setSelectedEvent({
                          ...selectedEvent,
                          bankDetails: { ...selectedEvent.bankDetails, bank: e.target.value }
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-stone-500 mb-1">
                      CLABE Interbancaria
                    </label>
                    <input
                      type="text"
                      value={selectedEvent.bankDetails.clabe}
                      onChange={(e) =>
                        setSelectedEvent({
                          ...selectedEvent,
                          bankDetails: { ...selectedEvent.bankDetails, clabe: e.target.value }
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sidebar: Section Toggles & Publish Action */}
            <div className="space-y-6">
              <div className="p-6 rounded-3xl bg-white border border-stone-200 shadow-sm space-y-5 sticky top-24">
                <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                  <Settings className="w-5 h-5 text-stone-600" />
                  <h3 className="font-serif text-xl text-[#1A3C34]">Módulos Activos</h3>
                </div>

                <div className="space-y-3 text-sm">
                  {(
                    [
                      { key: "showCountdown", label: "Cuenta Regresiva en Vivo" },
                      { key: "showItinerary", label: "Línea de Tiempo / Itinerario" },
                      { key: "showGallery", label: "Galería Fotográfica" },
                      { key: "showDressCode", label: "Código de Vestimenta" },
                      { key: "showGiftRegistry", label: "Mesa de Regalos & CLABE" },
                      { key: "showGuestbook", label: "Libro de Firmas Digital" },
                      { key: "allowOpenRsvp", label: "Confirmación abierta (sin enlace personal)" }
                    ] as const
                  ).map((sec) => (
                    <label
                      key={sec.key}
                      className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200/80 cursor-pointer"
                    >
                      <span className="font-medium text-stone-700">{sec.label}</span>
                      <input
                        type="checkbox"
                        checked={Boolean(selectedEvent.sections[sec.key])}
                        onChange={(e) =>
                          setSelectedEvent({
                            ...selectedEvent,
                            sections: {
                              ...selectedEvent.sections,
                              [sec.key]: e.target.checked
                            }
                          })
                        }
                        className="w-4 h-4 accent-[#1A3C34]"
                      />
                    </label>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-4 rounded-xl bg-[#1A3C34] hover:bg-[#122b25] text-white text-xs uppercase tracking-widest font-semibold shadow-md transition flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? "Publicando Cambios..." : "Guardar y Publicar Invitación"}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* TAB 3: MOBILE SIMULATOR PREVIEW */}
        {activeTab === "preview" && (
          <div className="flex flex-col items-center justify-center py-4 space-y-4">
            <p className="text-xs uppercase tracking-widest text-stone-500">
              Simulador Móvil Interactuable • URL:{" "}
              <code className="font-mono text-stone-800">/e/{selectedEvent.slug}</code>
            </p>
            <div className="w-[390px] h-[780px] rounded-[44px] border-[10px] border-stone-900 shadow-2xl overflow-hidden bg-white">
              <iframe
                src={`/e/${selectedEvent.slug}?preview=1`}
                title="Mobile Invitation Preview"
                className="w-full h-full border-0"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
