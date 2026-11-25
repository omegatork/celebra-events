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

export interface EventInvitation {
  id: string;
  slug: string;
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
  };
}

export interface DatabaseSchema {
  events: EventInvitation[];
  guests: GuestPass[];
}
