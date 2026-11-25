"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Church,
  Clock,
  Copy,
  Gift,
  Heart,
  MapPin,
  Music,
  PartyPopper,
  QrCode,
  Sparkles,
  Utensils,
  Volume2,
  VolumeX,
  Wine
} from "lucide-react";
import { EventInvitation, GuestPass, ThemePalette } from "@/lib/types";

const THEME_STYLES: Record<
  ThemePalette,
  {
    bg: string;
    cardBg: string;
    primary: string;
    primaryText: string;
    accent: string;
    border: string;
    sealColor: string;
    envelopeBg: string;
  }
> = {
  "emerald-gold": {
    bg: "bg-[#FBF9F5]",
    cardBg: "bg-white",
    primary: "bg-[#1A3C34] hover:bg-[#132c26] text-white",
    primaryText: "text-[#1A3C34]",
    accent: "text-[#B89758]",
    border: "border-[#E5DEC9]",
    sealColor: "from-[#C8A45D] via-[#B28D46] to-[#8C6B2B]",
    envelopeBg: "from-[#1A3C34] to-[#0E241F]"
  },
  "rose-quartz": {
    bg: "bg-[#FFF9FA]",
    cardBg: "bg-white",
    primary: "bg-[#8D4E5E] hover:bg-[#733D4B] text-white",
    primaryText: "text-[#8D4E5E]",
    accent: "text-[#C59B6D]",
    border: "border-[#F2DCE0]",
    sealColor: "from-[#D4A373] via-[#B98554] to-[#98683B]",
    envelopeBg: "from-[#8D4E5E] to-[#5E2E3A]"
  },
  "midnight-navy": {
    bg: "bg-[#F5F7FA]",
    cardBg: "bg-white",
    primary: "bg-[#1B2A4A] hover:bg-[#121D33] text-white",
    primaryText: "text-[#1B2A4A]",
    accent: "text-[#C29B61]",
    border: "border-[#DCE2EE]",
    sealColor: "from-[#C29B61] via-[#A47E44] to-[#7D5D2B]",
    envelopeBg: "from-[#1B2A4A] to-[#0F182B]"
  },
  "terracotta-sage": {
    bg: "bg-[#FAF6F2]",
    cardBg: "bg-white",
    primary: "bg-[#9E523B] hover:bg-[#7F402D] text-white",
    primaryText: "text-[#9E523B]",
    accent: "text-[#5D7052]",
    border: "border-[#EADCD3]",
    sealColor: "from-[#9E523B] via-[#83412D] to-[#632F1F]",
    envelopeBg: "from-[#5D7052] to-[#3E4C36]"
  }
};

interface InvitationViewProps {
  event: EventInvitation;
  initialGuest?: GuestPass | null;
  allConfirmedMessages?: GuestPass[];
  isPreview?: boolean;
}

export default function InvitationView({
  event,
  initialGuest = null,
  allConfirmedMessages = [],
  isPreview = false
}: InvitationViewProps) {
  const [isEnvelopeOpen, setIsEnvelopeOpen] = useState(isPreview);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [copiedClabe, setCopiedClabe] = useState(false);

  // Countdown state
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // RSVP form state
  const [guest, setGuest] = useState<GuestPass | null>(initialGuest);
  const [guestNameInput, setGuestNameInput] = useState(initialGuest?.name || "");
  const [rsvpStatus, setRsvpStatus] = useState<"confirmed" | "declined">(
    initialGuest?.status === "declined" ? "declined" : "confirmed"
  );
  const [passesSelected, setPassesSelected] = useState<number>(
    initialGuest?.passesConfirmed || initialGuest?.passesAllocated || 2
  );
  const [dietaryNotes, setDietaryNotes] = useState(initialGuest?.dietaryNotes || "");
  const [guestMessage, setGuestMessage] = useState(initialGuest?.message || "");
  const [rsvpSubmitted, setRsvpSubmitted] = useState(
    initialGuest?.status === "confirmed" || initialGuest?.status === "declined"
  );
  const [isSavingRsvp, setIsSavingRsvp] = useState(false);

  // Web Audio gentle ambient chord synth (no external MP3 dependency failures)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const theme = THEME_STYLES[event.theme] || THEME_STYLES["emerald-gold"];

  useEffect(() => {
    setGuest(initialGuest);
    if (initialGuest) {
      setGuestNameInput(initialGuest.name);
      setPassesSelected(initialGuest.passesConfirmed || initialGuest.passesAllocated);
      setDietaryNotes(initialGuest.dietaryNotes || "");
      setGuestMessage(initialGuest.message || "");
      setRsvpSubmitted(initialGuest.status === "confirmed" || initialGuest.status === "declined");
    }
  }, [initialGuest]);

  useEffect(() => {
    const updateCountdown = () => {
      const target = new Date(event.dateISO).getTime();
      const now = Date.now();
      const diff = Math.max(0, target - now);

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / 1000 / 60) % 60),
        seconds: Math.floor((diff / 1000) % 60)
      });
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [event.dateISO]);

  const startAmbientMusic = () => {
    try {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const chords = [
        [261.63, 329.63, 392.0], // C major
        [220.0, 261.63, 329.63], // A minor
        [174.61, 220.0, 261.63], // F major
        [196.0, 246.94, 293.66] // G major
      ];
      let chordIdx = 0;

      const playArpeggio = () => {
        if (!audioCtxRef.current) return;
        const notes = chords[chordIdx % chords.length];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.35);

          gain.gain.setValueAtTime(0.001, ctx.currentTime + i * 0.35);
          gain.gain.exponentialRampToValueAtTime(0.03, ctx.currentTime + i * 0.35 + 0.4);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.35 + 2.8);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + i * 0.35);
          osc.stop(ctx.currentTime + i * 0.35 + 2.9);
        });
        chordIdx++;
      };

      playArpeggio();
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
      audioIntervalRef.current = setInterval(playArpeggio, 3200);
      setIsPlayingMusic(true);
    } catch {
      setIsPlayingMusic(false);
    }
  };

  const stopAmbientMusic = () => {
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current);
      audioIntervalRef.current = null;
    }
    setIsPlayingMusic(false);
  };

  useEffect(() => {
    return () => {
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    };
  }, []);

  const handleOpenEnvelope = () => {
    setIsEnvelopeOpen(true);
    startAmbientMusic();
  };

  const toggleMusic = () => {
    if (isPlayingMusic) {
      stopAmbientMusic();
    } else {
      startAmbientMusic();
    }
  };

  const handleCopyClabe = () => {
    navigator.clipboard.writeText(event.bankDetails.clabe);
    setCopiedClabe(true);
    setTimeout(() => setCopiedClabe(false), 2500);
  };

  const handleRsvpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingRsvp(true);
    try {
      const payload = {
        id: guest?.id,
        eventId: event.id,
        name: guest ? guest.name : guestNameInput,
        token: guest?.token,
        tableNumber: guest?.tableNumber || "Por asignar",
        passesAllocated: guest ? guest.passesAllocated : passesSelected,
        passesConfirmed: rsvpStatus === "confirmed" ? passesSelected : 0,
        status: rsvpStatus,
        dietaryNotes,
        message: guestMessage
      };

      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.guest) {
        setGuest(data.guest);
        setRsvpSubmitted(true);
      }
    } finally {
      setIsSavingRsvp(false);
    }
  };

  const formattedDate = new Date(event.dateISO).toLocaleDateString("es-MX", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  // 1. Animated Envelope & Wax Seal Opener (like Invitio / InvitameOK)
  if (!isEnvelopeOpen) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b ${theme.envelopeBg} text-white relative overflow-hidden`}
      >
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]" />

        <div className="relative z-10 max-w-md w-full text-center space-y-8">
          <div className="space-y-2">
            <p className="uppercase tracking-[0.35em] text-xs text-amber-200/90">
              {event.subtitle}
            </p>
            <h1 className="font-serif text-4xl sm:text-5xl tracking-wide">{event.title}</h1>
          </div>

          {/* Personalized Pass Badge on Envelope */}
          {guest ? (
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 mx-auto max-w-xs shadow-xl">
              <p className="text-xs uppercase tracking-widest text-amber-200 mb-1">
                Invitación Especial Para
              </p>
              <p className="font-serif text-xl font-medium">{guest.name}</p>
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-100 text-xs">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Válido por {guest.passesAllocated} pases</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-white/80 font-light italic px-4">
              Tenemos el honor de invitarte a compartir este día tan especial con nosotros
            </p>
          )}

          {/* Wax Seal Button */}
          <div className="pt-4 flex flex-col items-center">
            <button
              onClick={handleOpenEnvelope}
              className={`group relative w-32 h-32 rounded-full bg-gradient-to-br ${theme.sealColor} shadow-[0_15px_35px_rgba(0,0,0,0.5)] border-4 border-amber-200/40 flex flex-col items-center justify-center transition-all duration-500 hover:scale-105 active:scale-95`}
            >
              <div className="w-24 h-24 rounded-full border border-amber-100/50 flex flex-col items-center justify-center">
                <Heart className="w-7 h-7 text-amber-100 mb-1 group-hover:scale-110 transition-transform" />
                <span className="font-serif text-xs uppercase tracking-widest text-amber-50 font-semibold">
                  Abrir
                </span>
              </div>
              <span className="absolute -bottom-10 text-xs tracking-[0.25em] uppercase text-amber-200/90 animate-pulse">
                Toca el sello para abrir
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme.bg} text-stone-800 pb-20 relative selection:bg-amber-200`}>
      {/* Floating Music Controller */}
      <button
        onClick={toggleMusic}
        title={event.musicTitle}
        className={`fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-full shadow-xl ${theme.primary} transition-transform hover:scale-105`}
      >
        {isPlayingMusic ? (
          <>
            <Volume2 className="w-4 h-4 animate-pulse" />
            <span className="text-xs font-medium tracking-wider uppercase hidden sm:inline">
              Música Activa
            </span>
          </>
        ) : (
          <>
            <VolumeX className="w-4 h-4 opacity-80" />
            <span className="text-xs font-medium tracking-wider uppercase hidden sm:inline">
              Reproducir Música
            </span>
          </>
        )}
      </button>

      {/* Hero Cover Section */}
      <header className="relative h-[85vh] min-h-[540px] w-full overflow-hidden flex items-end justify-center">
        <img
          src={event.coverImageUrl}
          alt={event.title}
          className="absolute inset-0 w-full h-full object-cover object-center scale-105 transition-transform duration-1000"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/20" />

        <div className="relative z-10 text-center text-white px-6 pb-16 max-w-2xl mx-auto space-y-4">
          <p className="uppercase tracking-[0.35em] text-xs sm:text-sm text-amber-200">
            {event.subtitle}
          </p>
          <h1 className="font-serif text-5xl sm:text-7xl tracking-tight drop-shadow">
            {event.title}
          </h1>
          <div className="w-20 h-[1px] bg-amber-300/70 mx-auto my-4" />
          <p className="capitalize text-base sm:text-lg font-light tracking-wide text-stone-200">
            {formattedDate}
          </p>

          {guest && (
            <div className="mt-6 inline-block bg-white/15 backdrop-blur-md border border-white/25 rounded-2xl px-6 py-3">
              <p className="text-xs uppercase tracking-widest text-amber-200">Pase Personalizado</p>
              <p className="font-serif text-lg font-medium text-white">{guest.name}</p>
              <p className="text-xs text-stone-200">
                {guest.passesAllocated} {guest.passesAllocated === 1 ? "Pase Asignado" : "Pases Asignados"} •{" "}
                {guest.tableNumber || "Mesa asignada en recepción"}
              </p>
            </div>
          )}
        </div>
      </header>

      {/* Quote & Parents Blessing */}
      <section className="max-w-2xl mx-auto px-6 py-16 text-center space-y-8">
        {event.quote && (
          <blockquote className="font-serif italic text-lg sm:text-xl text-stone-600 leading-relaxed">
            {event.quote}
          </blockquote>
        )}

        <div className={`p-8 rounded-3xl ${theme.cardBg} border ${theme.border} shadow-sm space-y-4`}>
          <Sparkles className={`w-6 h-6 mx-auto ${theme.accent}`} />
          <h2 className={`font-serif text-2xl ${theme.primaryText}`}>{event.hosts}</h2>
          <p className="whitespace-pre-line text-sm sm:text-base text-stone-600 leading-relaxed">
            {event.parentsText}
          </p>
        </div>
      </section>

      {/* Live Countdown Timer */}
      {event.sections.showCountdown && (
        <section className="max-w-3xl mx-auto px-6 py-8">
          <div
            className={`rounded-3xl p-8 sm:p-10 ${theme.cardBg} border ${theme.border} shadow-sm text-center space-y-6`}
          >
            <p className="uppercase tracking-[0.25em] text-xs text-stone-500">
              Cuenta Regresiva Para El Gran Día
            </p>
            <div className="grid grid-cols-4 gap-3 sm:gap-6 max-w-lg mx-auto">
              {[
                { label: "Días", value: timeLeft.days },
                { label: "Horas", value: timeLeft.hours },
                { label: "Minutos", value: timeLeft.minutes },
                { label: "Segundos", value: timeLeft.seconds }
              ].map((unit) => (
                <div
                  key={unit.label}
                  className={`p-3 sm:p-5 rounded-2xl ${theme.bg} border ${theme.border}`}
                >
                  <div className={`font-serif text-2xl sm:text-4xl font-semibold ${theme.primaryText}`}>
                    {String(unit.value).padStart(2, "0")}
                  </div>
                  <div className="text-[11px] uppercase tracking-widest text-stone-500 mt-1">
                    {unit.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Ceremony & Reception Venues */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-10 space-y-2">
          <p className="uppercase tracking-[0.25em] text-xs text-stone-500">Dónde & Cuándo</p>
          <h2 className={`font-serif text-3xl ${theme.primaryText}`}>Ubicaciones del Evento</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Ceremony Card */}
          <div
            className={`rounded-3xl p-8 ${theme.cardBg} border ${theme.border} shadow-sm flex flex-col justify-between space-y-6`}
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center">
                <Church className={`w-6 h-6 ${theme.accent}`} />
              </div>
              <div>
                <span className="text-xs uppercase tracking-widest text-stone-400">Ceremonia</span>
                <h3 className={`font-serif text-2xl mt-1 ${theme.primaryText}`}>
                  {event.ceremonyVenue}
                </h3>
              </div>
              <div className="space-y-2 text-sm text-stone-600">
                <p className="flex items-center gap-2 font-medium">
                  <Clock className="w-4 h-4 text-stone-400 shrink-0" />
                  {event.ceremonyTime}
                </p>
                <p className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                  <span>{event.ceremonyAddress}</span>
                </p>
              </div>
            </div>

            <a
              href={event.ceremonyMapUrl}
              target="_blank"
              rel="noreferrer"
              className={`w-full py-3 px-5 rounded-xl text-center text-xs uppercase tracking-widest font-medium transition ${theme.primary}`}
            >
              Ver en Google Maps / Waze
            </a>
          </div>

          {/* Reception Card */}
          <div
            className={`rounded-3xl p-8 ${theme.cardBg} border ${theme.border} shadow-sm flex flex-col justify-between space-y-6`}
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center">
                <PartyPopper className={`w-6 h-6 ${theme.accent}`} />
              </div>
              <div>
                <span className="text-xs uppercase tracking-widest text-stone-400">Recepción</span>
                <h3 className={`font-serif text-2xl mt-1 ${theme.primaryText}`}>
                  {event.receptionVenue}
                </h3>
              </div>
              <div className="space-y-2 text-sm text-stone-600">
                <p className="flex items-center gap-2 font-medium">
                  <Clock className="w-4 h-4 text-stone-400 shrink-0" />
                  {event.receptionTime}
                </p>
                <p className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                  <span>{event.receptionAddress}</span>
                </p>
              </div>
            </div>

            <a
              href={event.receptionMapUrl}
              target="_blank"
              rel="noreferrer"
              className={`w-full py-3 px-5 rounded-xl text-center text-xs uppercase tracking-widest font-medium transition ${theme.primary}`}
            >
              Ver en Google Maps / Waze
            </a>
          </div>
        </div>
      </section>

      {/* Event Itinerary Timeline */}
      {event.sections.showItinerary && event.itinerary.length > 0 && (
        <section className="max-w-2xl mx-auto px-6 py-12">
          <div className={`rounded-3xl p-8 sm:p-10 ${theme.cardBg} border ${theme.border} shadow-sm`}>
            <div className="text-center mb-8">
              <p className="uppercase tracking-[0.25em] text-xs text-stone-500">Programa</p>
              <h2 className={`font-serif text-3xl mt-1 ${theme.primaryText}`}>Itinerario del Día</h2>
            </div>

            <div className="space-y-6 relative before:absolute before:top-3 before:bottom-3 before:left-5 before:w-[1px] before:bg-stone-200">
              {event.itinerary.map((item) => {
                const IconComp =
                  item.icon === "church"
                    ? Church
                    : item.icon === "cheers"
                    ? Wine
                    : item.icon === "dinner"
                    ? Utensils
                    : PartyPopper;
                return (
                  <div key={item.id} className="relative flex items-start gap-5 pl-1">
                    <div
                      className={`relative z-10 w-9 h-9 rounded-full ${theme.bg} border ${theme.border} flex items-center justify-center shrink-0`}
                    >
                      <IconComp className={`w-4 h-4 ${theme.accent}`} />
                    </div>
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                        {item.time}
                      </span>
                      <h4 className={`font-serif text-lg ${theme.primaryText}`}>{item.title}</h4>
                      <p className="text-sm text-stone-500">{item.location}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Photo Gallery */}
      {event.sections.showGallery && event.galleryUrls.length > 0 && (
        <section className="max-w-4xl mx-auto px-6 py-12">
          <div className="text-center mb-8">
            <p className="uppercase tracking-[0.25em] text-xs text-stone-500">Nuestra Historia</p>
            <h2 className={`font-serif text-3xl mt-1 ${theme.primaryText}`}>Galería de Momentos</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {event.galleryUrls.map((url, idx) => (
              <div
                key={idx}
                className="aspect-[4/5] rounded-2xl overflow-hidden border border-stone-200 shadow-sm"
              >
                <img
                  src={url}
                  alt={`${event.title} foto ${idx + 1}`}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Dress Code & Gift Registry */}
      <section className="max-w-4xl mx-auto px-6 py-8 grid md:grid-cols-2 gap-6">
        {event.sections.showDressCode && (
          <div className={`rounded-3xl p-8 ${theme.cardBg} border ${theme.border} shadow-sm space-y-4`}>
            <p className="uppercase tracking-[0.25em] text-xs text-stone-400">Código de Vestimenta</p>
            <h3 className={`font-serif text-2xl ${theme.primaryText}`}>{event.dressCode}</h3>
            <p className="text-sm text-stone-600 leading-relaxed">{event.dressCodeNotes}</p>
          </div>
        )}

        {event.sections.showGiftRegistry && (
          <div className={`rounded-3xl p-8 ${theme.cardBg} border ${theme.border} shadow-sm space-y-4`}>
            <div className="flex items-center justify-between">
              <p className="uppercase tracking-[0.25em] text-xs text-stone-400">Mesa de Regalos</p>
              <Gift className={`w-5 h-5 ${theme.accent}`} />
            </div>
            <p className="text-sm text-stone-600 leading-relaxed">{event.giftRegistryText}</p>

            <div className={`p-4 rounded-2xl ${theme.bg} border ${theme.border} text-xs space-y-1.5`}>
              <p className="font-semibold text-stone-700">
                Lluvia de Sobres Digital ({event.bankDetails.bank})
              </p>
              <p className="text-stone-600">Beneficiario: {event.bankDetails.beneficiary}</p>
              <div className="flex items-center justify-between pt-1">
                <code className="font-mono text-stone-800 font-medium">
                  CLABE: {event.bankDetails.clabe}
                </code>
                <button
                  type="button"
                  onClick={handleCopyClabe}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-stone-700 hover:bg-stone-50"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedClabe ? "¡Copiada!" : "Copiar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Real-Time RSVP Confirmation & QR Digital Pass */}
      <section id="rsvp" className="max-w-2xl mx-auto px-6 py-12">
        <div className={`rounded-3xl p-8 sm:p-10 ${theme.cardBg} border ${theme.border} shadow-md`}>
          <div className="text-center mb-8 space-y-2">
            <p className="uppercase tracking-[0.25em] text-xs text-stone-500">Confirmación de Asistencia</p>
            <h2 className={`font-serif text-3xl ${theme.primaryText}`}>Pase & RSVP</h2>
            {guest ? (
              <p className="text-sm text-stone-600">
                Invitación personalizada para <strong>{guest.name}</strong> ({guest.passesAllocated}{" "}
                pases asignados)
              </p>
            ) : (
              <p className="text-sm text-stone-600">
                Por favor confirma tu asistencia para preparar tu recepción y generar tu código QR de
                acceso.
              </p>
            )}
          </div>

          {rsvpSubmitted && guest ? (
            <div className="space-y-6 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" />
                {guest.status === "confirmed"
                  ? `¡Asistencia Confirmada (${guest.passesConfirmed} pases)!`
                  : "Respuesta registrada (No podrá asistir)"}
              </div>

              {guest.status === "confirmed" && (
                <div
                  className={`p-6 rounded-2xl ${theme.bg} border-2 border-dashed ${theme.border} max-w-sm mx-auto space-y-4`}
                >
                  <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-stone-500">
                    <QrCode className="w-4 h-4" />
                    Pase Digital de Acceso
                  </div>
                  {/* Self-contained SVG QR-style Pass Visual */}
                  <div className="w-36 h-36 mx-auto bg-white p-3 rounded-xl border border-stone-200 flex flex-col items-center justify-center">
                    <QrCode className={`w-24 h-24 ${theme.primaryText}`} />
                    <span className="text-[10px] font-mono text-stone-400 mt-1">
                      #{guest.token.toUpperCase().slice(0, 12)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className={`font-serif text-xl font-medium ${theme.primaryText}`}>
                      {guest.name}
                    </p>
                    <p className="text-xs text-stone-600 font-medium">
                      {guest.passesConfirmed} Pases Confirmados • {guest.tableNumber || "Mesa por asignar"}
                    </p>
                  </div>
                  <p className="text-[11px] text-stone-400">
                    Muestra este pase en la entrada de {event.receptionVenue}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => setRsvpSubmitted(false)}
                className="text-xs underline text-stone-500 hover:text-stone-800"
              >
                Modificar mi confirmación
              </button>
            </div>
          ) : (
            <form onSubmit={handleRsvpSubmit} className="space-y-5">
              {!guest && (
                <div>
                  <label className="block text-xs uppercase tracking-wider text-stone-500 mb-1.5">
                    Nombre Completo o Familia
                  </label>
                  <input
                    type="text"
                    required
                    value={guestNameInput}
                    onChange={(e) => setGuestNameInput(e.target.value)}
                    placeholder="Ej. Familia Pérez Garza"
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                  />
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-stone-500 mb-1.5">
                    ¿Podrás acompañarnos?
                  </label>
                  <select
                    value={rsvpStatus}
                    onChange={(e) => setRsvpStatus(e.target.value as "confirmed" | "declined")}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm bg-white"
                  >
                    <option value="confirmed">Sí, confirmo mi asistencia</option>
                    <option value="declined">No podré asistir</option>
                  </select>
                </div>

                {rsvpStatus === "confirmed" && (
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-stone-500 mb-1.5">
                      Número de Pases a Utilizar
                    </label>
                    <select
                      value={passesSelected}
                      onChange={(e) => setPassesSelected(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm bg-white"
                    >
                      {Array.from(
                        { length: guest ? guest.passesAllocated : 6 },
                        (_, i) => i + 1
                      ).map((num) => (
                        <option key={num} value={num}>
                          {num} {num === 1 ? "persona" : "personas"}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {rsvpStatus === "confirmed" && (
                <div>
                  <label className="block text-xs uppercase tracking-wider text-stone-500 mb-1.5">
                    Restricciones Alimentarias / Alergias (Opcional)
                  </label>
                  <input
                    type="text"
                    value={dietaryNotes}
                    onChange={(e) => setDietaryNotes(e.target.value)}
                    placeholder="Ej. 1 menú vegetariano, sin gluten..."
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs uppercase tracking-wider text-stone-500 mb-1.5">
                  Mensaje o Buenos Deseos para {event.title}
                </label>
                <textarea
                  rows={3}
                  value={guestMessage}
                  onChange={(e) => setGuestMessage(e.target.value)}
                  placeholder="Escribe aquí tus felicitaciones..."
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingRsvp}
                className={`w-full py-4 rounded-xl text-xs uppercase tracking-widest font-semibold transition shadow-md ${theme.primary}`}
              >
                {isSavingRsvp ? "Guardando Confirmación..." : "Confirmar y Generar Pase QR"}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Digital Guestbook Messages */}
      {event.sections.showGuestbook && allConfirmedMessages.length > 0 && (
        <section className="max-w-3xl mx-auto px-6 py-8">
          <div className="text-center mb-8">
            <p className="uppercase tracking-[0.25em] text-xs text-stone-500">Libro de Firmas</p>
            <h2 className={`font-serif text-2xl mt-1 ${theme.primaryText}`}>
              Mensajes de Nuestros Invitados
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {allConfirmedMessages
              .filter((g) => g.message && g.message.trim().length > 0)
              .map((g) => (
                <div
                  key={g.id}
                  className={`p-5 rounded-2xl ${theme.cardBg} border ${theme.border} shadow-sm space-y-2`}
                >
                  <p className="text-sm text-stone-600 italic">&ldquo;{g.message}&rdquo;</p>
                  <p className={`text-xs font-semibold ${theme.primaryText}`}>— {g.name}</p>
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
