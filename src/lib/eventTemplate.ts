import { EventInvitation } from "@/lib/types";

/** Starting point for a brand-new invitation (used when the organizer has no events yet). */
export const DEFAULT_COVER_IMAGE =
  "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1400&q=80";

/**
 * Starting point for a brand-new invitation. Text fields start empty: the editor shows
 * hint text (placeholders) instead of sample data the organizer would have to delete.
 */
export function newEventTemplate(): EventInvitation {
  const stamp = Date.now().toString(36);

  return {
    id: `evt-${stamp}`,
    slug: `evento-${stamp}`,
    type: "boda",
    title: "",
    subtitle: "",
    hosts: "",
    parentsText: "",
    dateISO: "",
    coverImageUrl: "",
    galleryUrls: [],
    musicTitle: "",
    theme: "emerald-gold",
    ceremonyVenue: "",
    ceremonyAddress: "",
    ceremonyTime: "",
    ceremonyMapUrl: "",
    receptionVenue: "",
    receptionAddress: "",
    receptionTime: "",
    receptionMapUrl: "",
    dressCode: "",
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
