"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, MessageCircle, Pencil, PartyPopper, X } from "lucide-react";
import { EventInvitation, GuestPass } from "@/lib/types";
import {
  DEFAULT_INVITE_MESSAGE,
  DEFAULT_REMINDER_MESSAGE,
  MessageKind,
  normalizePhone,
  PLACEHOLDERS,
  renderMessage,
  templateFor,
  whatsappLink
} from "@/lib/whatsapp";

interface Props {
  event: EventInvitation;
  guests: GuestPass[];
  inviteUrl: (g: GuestPass) => string;
  /** Persist "invitation sent" for a guest (the parent updates its guest list). */
  markSent: (g: GuestPass, sent: boolean) => Promise<void>;
  onEventSaved: (e: EventInvitation) => void;
  onClose: () => void;
}

/**
 * Guided sending: walks the organizer through each guest with the message pre-filled.
 * Each tap opens WhatsApp (their own number) and moves on to the next guest.
 */
export default function WhatsAppSender({ event, guests, inviteUrl, markSent, onEventSaved, onClose }: Props) {
  const [kind, setKind] = useState<MessageKind>("invite");
  // Snapshot the queue when the mode changes, so marking a guest as sent doesn't reshuffle it.
  const [queueIds, setQueueIds] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [sentThisRun, setSentThisRun] = useState(0);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saveMsg, setSaveMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const notSent = guests.filter((g) => !g.inviteSentAt);
  const awaitingReply = awaitingReplyOf(guests);

  useEffect(() => {
    const list = kind === "invite" ? guests.filter((g) => !g.inviteSentAt) : awaitingReplyOf(guests);
    setQueueIds(list.map((g) => g.id));
    setIndex(0);
    setSentThisRun(0);
    setEditing(false);
    // Only rebuild on mode change, not on every guest update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const queue = useMemo(
    () => queueIds.map((id) => guests.find((g) => g.id === id)).filter((g): g is GuestPass => !!g),
    [queueIds, guests]
  );
  const current = queue[index];
  const template = templateFor(event, kind);
  const message = current ? renderMessage(template, event, current, inviteUrl(current)) : "";

  const send = () => {
    if (!current) return;
    window.open(whatsappLink(current.phone, message), "_blank", "noopener,noreferrer");
    if (kind === "invite" && !current.inviteSentAt) markSent(current, true);
    setSentThisRun((n) => n + 1);
    setIndex((i) => i + 1);
  };

  const startEditing = () => {
    setDraft(template);
    setSaveMsg("");
    setEditing(true);
  };

  const saveTemplate = async (text: string) => {
    if (!text.includes("{enlace}")) {
      setSaveMsg("El mensaje debe incluir {enlace} para que cada invitado reciba su pase.");
      return;
    }
    setSaving(true);
    setSaveMsg("");
    try {
      // Merge into the *saved* event so unsaved changes in the editor tab aren't published by accident.
      const fresh = await fetch(`/api/events?slug=${encodeURIComponent(event.slug)}`).then((r) => r.json());
      if (!fresh.event) throw new Error();
      const field = kind === "invite" ? "whatsappMessage" : "whatsappReminder";
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fresh.event, [field]: text })
      });
      const data = await res.json();
      if (!res.ok || !data.event) throw new Error(data.error);
      onEventSaved(data.event);
      setEditing(false);
    } catch (err) {
      setSaveMsg(err instanceof Error && err.message ? err.message : "No se pudo guardar el mensaje.");
    } finally {
      setSaving(false);
    }
  };

  const tab = (k: MessageKind, label: string, count: number) => (
    <button
      type="button"
      onClick={() => setKind(k)}
      className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition ${
        kind === k ? "bg-white shadow-sm text-[#1A3C34]" : "text-stone-500"
      }`}
    >
      {label} ({count})
    </button>
  );

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Enviar por WhatsApp"
    >
      <div
        className="relative w-full max-w-lg max-h-full overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-stone-400 hover:text-stone-700"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="space-y-1 pr-6">
          <h2 className="font-serif text-2xl text-[#1A3C34]">Enviar por WhatsApp</h2>
          <p className="text-xs text-stone-500">
            Se abre WhatsApp con el mensaje listo. Envíalo y regresa aquí para el siguiente invitado.
          </p>
        </div>

        <div className="flex gap-1 p-1 rounded-xl bg-stone-100">
          {tab("invite", "Invitaciones sin enviar", notSent.length)}
          {tab("reminder", "Recordatorios sin respuesta", awaitingReply.length)}
        </div>

        {editing ? (
          <div className="space-y-3">
            <label className="block text-[11px] uppercase tracking-wider text-stone-500">
              {kind === "invite" ? "Mensaje de invitación" : "Mensaje de recordatorio"}
            </label>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={8}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3C34]/30"
            />
            <div className="flex flex-wrap gap-1.5">
              {PLACEHOLDERS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setDraft((d) => `${d}${p}`)}
                  className="px-2 py-1 rounded-md bg-stone-100 hover:bg-stone-200 text-[11px] font-mono text-stone-700"
                >
                  {p}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-stone-400">
              Usa *texto* para negritas en WhatsApp. {"{enlace}"} es obligatorio.
            </p>
            {saveMsg && <p className="text-sm text-rose-700">{saveMsg}</p>}
            <div className="flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                onClick={() => setDraft(kind === "invite" ? DEFAULT_INVITE_MESSAGE : DEFAULT_REMINDER_MESSAGE)}
                className="px-3 py-2 rounded-lg text-xs font-medium text-stone-500 hover:bg-stone-100"
              >
                Restablecer
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-3 py-2 rounded-lg border border-stone-200 text-xs font-medium text-stone-700 hover:bg-stone-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => saveTemplate(draft)}
                className="px-4 py-2 rounded-lg bg-[#1A3C34] hover:bg-[#122b25] disabled:opacity-60 text-white text-xs font-semibold"
              >
                {saving ? "Guardando..." : "Guardar mensaje"}
              </button>
            </div>
          </div>
        ) : current ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-stone-500">
              <span>
                Invitado {index + 1} de {queue.length}
              </span>
              <button
                type="button"
                onClick={startEditing}
                className="inline-flex items-center gap-1 font-medium text-[#1A3C34] hover:underline"
              >
                <Pencil className="w-3.5 h-3.5" />
                Editar mensaje
              </button>
            </div>
            <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
              <div
                className="h-full bg-emerald-600 transition-all"
                style={{ width: `${(index / Math.max(queue.length, 1)) * 100}%` }}
              />
            </div>

            <div>
              <p className="font-semibold text-stone-900">{current.name}</p>
              <p className="text-xs text-stone-500">
                {normalizePhone(current.phone)
                  ? `+${normalizePhone(current.phone)}`
                  : "Sin número: WhatsApp te pedirá elegir el contacto"}
              </p>
            </div>

            <div className="rounded-2xl bg-[#E7F7E1] border border-emerald-100 p-4 text-sm text-stone-800 whitespace-pre-wrap break-words">
              {message}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIndex((i) => Math.max(i - 1, 0))}
                disabled={index === 0}
                className="p-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-40"
                aria-label="Anterior"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={send}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Abrir WhatsApp y seguir
              </button>
              <button
                type="button"
                onClick={() => setIndex((i) => i + 1)}
                className="px-3 py-2.5 rounded-xl border border-stone-200 text-xs font-medium text-stone-600 hover:bg-stone-50 inline-flex items-center gap-1"
              >
                Saltar
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-3 py-6">
            {queue.length > 0 ? (
              <>
                <PartyPopper className="w-10 h-10 mx-auto text-amber-600" />
                <p className="font-serif text-xl text-[#1A3C34]">¡Listo!</p>
                <p className="text-sm text-stone-600">
                  Abriste WhatsApp para {sentThisRun} de {queue.length} invitados.
                </p>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-600" />
                <p className="text-sm text-stone-600">
                  {kind === "invite"
                    ? "Todas las invitaciones ya fueron enviadas."
                    : "No hay invitados pendientes de responder."}
                </p>
              </>
            )}
            <button
              type="button"
              onClick={startEditing}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#1A3C34] hover:underline"
            >
              <Pencil className="w-3.5 h-3.5" />
              Editar mensaje
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

function awaitingReplyOf(guests: GuestPass[]) {
  return guests.filter((g) => g.inviteSentAt && g.status === "pending");
}
