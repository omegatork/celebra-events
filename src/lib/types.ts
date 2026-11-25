export type EventType = "boda" | "xv" | "bautizo" | "gala";

export type ThemePalette =
  | "emerald-gold"
  | "rose-quartz"
  | "midnight-navy"
  | "terracotta-sage";

export interface ItineraryItem {
  id: string;
  time: string;
  title: string;
  location: string;
  icon: "church" | "cheers" | "dinner" | "party";
}

export interface GuestPass {
  id: string;
  eventId: string;
  name: string;
  token: string;
  phone?: string;
  tableNumber: string;
  passesAllocated: number;
  passesConfirmed: number;
  status: "pending" | "confirmed" | "declined";
  dietaryNotes?: string;
  message?: string;
  updatedAt?: string;
}

/** Public guestbook entry: only what is safe to show to every visitor. */
export interface GuestbookEntry {
  id: string;
  name: string;
  message: string;
}

export interface EventInvitation {
  id: string;
  slug: string;
  isDemo?: boolean;
  type: EventType;
  title: string;
  subtitle: string;
  hosts: string;
  parentsText: string;
  dateISO: string;
  coverImageUrl: string;
  galleryUrls: string[];
  musicTitle: string;
  theme: ThemePalette;
  ceremonyVenue: string;
  ceremonyAddress: string;
  ceremonyTime: string;
  ceremonyMapUrl: string;
  receptionVenue: string;
  receptionAddress: string;
  receptionTime: string;
  receptionMapUrl: string;
  dressCode: string;
  dressCodeNotes: string;
  giftRegistryText: string;
  bankDetails: {
    bank: string;
    beneficiary: string;
    clabe: string;
    concept: string;
  };
  storeRegistryUrl?: string;
  quote: string;
  itinerary: ItineraryItem[];
  sections: {
    showCountdown: boolean;
    showItinerary: boolean;
    showGallery: boolean;
    showDressCode: boolean;
    showGiftRegistry: boolean;
    showGuestbook: boolean;
    /** Allow RSVP without a personalized guest link. Off by default. */
    allowOpenRsvp?: boolean;
  };
}
