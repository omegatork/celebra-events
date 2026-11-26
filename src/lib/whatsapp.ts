import { EventInvitation, GuestPass } from "./types";

// Builds wa.me links: the organizer sends from their own WhatsApp, one tap per guest.
// Pure functions, safe in the browser.

export const PLACEHOLDERS = ["{nombre}", "{evento}", "{pases}", "{mesa}", "{enlace}"] as const;

export const DEFAULT_INVITE_MESSAGE =
  "¡Hola *{nombre}*! ✨ Con mucha alegría queremos compartir contigo la invitación digital a *{evento}*.\n\n" +
  "🎟️ Hemos reservado *{pases}* para ustedes.\n\n" +
  "Por favor abre tu invitación y confirma tu asistencia aquí:\n{enlace}";

export const DEFAULT_REMINDER_MESSAGE =
  "¡Hola *{nombre}*! 😊 Te recordamos que nos encantaría contar contigo en *{evento}*.\n\n" +
  "¿Nos ayudas a confirmar tu asistencia? Solo toma un minuto:\n{enlace}";

export type MessageKind = "invite" | "reminder";

export function templateFor(event: EventInvitation, kind: MessageKind): string {
  const custom = kind === "invite" ? event.whatsappMessage : event.whatsappReminder;
  return custom?.trim() ? custom : kind === "invite" ? DEFAULT_INVITE_MESSAGE : DEFAULT_REMINDER_MESSAGE;
}

export function renderMessage(template: string, event: EventInvitation, guest: GuestPass, link: string): string {
  const passes = `${guest.passesAllocated} ${guest.passesAllocated === 1 ? "pase" : "pases"}`;
  const values: Record<string, string> = {
    "{nombre}": guest.name,
    "{evento}": event.title,
    "{pases}": passes,
    "{mesa}": guest.tableNumber || "Por asignar",
    "{enlace}": link
  };
  return template.replace(/\{(nombre|evento|pases|mesa|enlace)\}/g, (m) => values[m] ?? m);
}

/**
 * Digits only, with country code. A bare 10-digit number is treated as Mexican (52 + number).
 * Returns "" when there's no usable number: wa.me then lets the sender pick the contact.
 */
export function normalizePhone(phone: string | undefined): string {
  const digits = (phone || "").replace(/[^0-9]/g, "");
  if (digits.length === 10) return `52${digits}`;
  return digits.length >= 11 && digits.length <= 15 ? digits : "";
}

export function whatsappLink(phone: string | undefined, text: string): string {
  return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(text)}`;
}
