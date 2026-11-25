import { EventInvitation } from "@/lib/types";

/** Starting point for a brand-new invitation (used when the organizer has no events yet). */
export function newEventTemplate(): EventInvitation {
  const stamp = Date.now().toString(36);
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  date.setHours(17, 0, 0, 0);

  return {
    id: `evt-${stamp}`,
    slug: `evento-${stamp}`,
    type: "boda",
    title: "Ana & Luis",
    subtitle: "¡Nos Casamos!",
    hosts: "Ana Sofía & Luis Eduardo",
    parentsText: "Con la bendición de Dios y de nuestros padres",
    dateISO: date.toISOString(),
    coverImageUrl:
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1400&q=80",
    galleryUrls: [],
    musicTitle: "",
    theme: "emerald-gold",
    ceremonyVenue: "Parroquia (nombre)",
    ceremonyAddress: "Dirección de la ceremonia",
    ceremonyTime: "17:00 HRS",
    ceremonyMapUrl: "https://maps.google.com",
    receptionVenue: "Salón / Jardín (nombre)",
    receptionAddress: "Dirección de la recepción",
    receptionTime: "19:30 HRS",
    receptionMapUrl: "https://maps.google.com",
    dressCode: "Formal",
    dressCodeNotes: "",
    giftRegistryText: "Su presencia es nuestro mejor regalo.",
    bankDetails: { bank: "", beneficiary: "", clabe: "", concept: "" },
    quote: "",
    itinerary: [],
    sections: {
      showCountdown: true,
      showItinerary: true,
      showGallery: false,
      showDressCode: true,
      showGiftRegistry: true,
      showGuestbook: true,
      allowOpenRsvp: false
    }
  };
}
