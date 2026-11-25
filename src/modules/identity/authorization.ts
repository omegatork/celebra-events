import { getEventById, getEventOwnership, listEvents, listEventsForAccounts } from "@/modules/events/repository";
import { EventInvitation } from "@/lib/types";
import { Session } from "./sessions";

// All authorization decisions live here so routes stay thin and rules stay consistent.

export function isAdmin(s: Session | null): boolean {
  return s?.kind === "admin";
}

/** Invitation-password sessions manage exactly one existing event; they cannot create new ones. */
export function canCreateEvents(s: Session): boolean {
  return s.kind === "admin" || (s.kind === "user" && s.accountIds.length > 0);
}

export async function canManageEvent(s: Session, eventId: string): Promise<boolean> {
  if (s.kind === "admin") return true;
  if (s.kind === "invitation") return s.eventId === eventId;
  const ownership = await getEventOwnership(eventId);
  return !!ownership?.accountId && s.accountIds.includes(ownership.accountId);
}

export async function listVisibleEvents(s: Session): Promise<EventInvitation[]> {
  if (s.kind === "admin") return listEvents();
  if (s.kind === "invitation") {
    const e = s.eventId ? await getEventById(s.eventId) : undefined;
    return e ? [e] : [];
  }
  return listEventsForAccounts(s.accountIds);
}

/** Account that new events created by this session belong to (null = unowned/admin-managed). */
export function accountForNewEvent(s: Session): string | null {
  return s.kind === "user" ? s.accountIds[0] ?? null : null;
}
