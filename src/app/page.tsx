import React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Eye,
  Heart,
  Layers,
  MessageCircle,
  QrCode,
  Sliders,
  Sparkles,
  Users
} from "lucide-react";
import { listDemoEvents } from "@/modules/events/repository";
import { findDemoGuestToken } from "@/modules/guests/repository";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Only demo events are listed publicly; customer events never appear here.
  const events = await listDemoEvents();
  const demoTokens: Record<string, string | undefined> = Object.fromEntries(
    await Promise.all(events.map(async (e) => [e.id, await findDemoGuestToken(e.id)] as const))
  );
  const heroDemo = events.find((e) => demoTokens[e.id]) ?? events[0];
  const heroDemoHref = heroDemo
    ? `/e/${heroDemo.slug}${demoTokens[heroDemo.id] ? `?g=${demoTokens[heroDemo.id]}` : ""}`
    : "/dashboard";

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-stone-900">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-stone-200/80">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1A3C34] text-amber-200 flex items-center justify-center font-serif font-bold text-lg">
              C
            </div>
            <div>
              <span className="font-serif text-xl font-semibold tracking-tight text-[#1A3C34]">
                celebra.events
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold">
                México & LatAm
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm text-stone-600">
            <a href="#demos" className="hover:text-stone-950">
              Ejemplos En Vivo
            </a>
            <a href="#caracteristicas" className="hover:text-stone-950">
              Características
            </a>
            <a href="#precios" className="hover:text-stone-950">
              Planes
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-xl bg-[#1A3C34] hover:bg-[#122b25] text-white text-xs uppercase tracking-wider font-semibold transition shadow-sm"
            >
              Panel & Editor SaaS
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-28 px-6">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100/80 border border-amber-300/60 text-amber-950 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            <span>Plataforma SaaS de Invitaciones Digitales Interactivas</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl tracking-tight text-[#1A3C34] max-w-4xl mx-auto leading-[1.1]">
            Invitaciones web que emocionan y gestionan tus invitados en tiempo real.
          </h1>

          <p className="text-base sm:text-lg text-stone-600 max-w-2xl mx-auto leading-relaxed">
            Diseña tu invitación con sello de lacre interactivo, música, cuenta regresiva, mesa de
            regalos y pases personalizados por WhatsApp con código QR de acceso.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              href="/dashboard"
              className="px-7 py-4 rounded-2xl bg-[#1A3C34] hover:bg-[#122a24] text-white text-xs uppercase tracking-widest font-semibold shadow-lg transition"
            >
              Crear o Editar Invitación Ahora
            </Link>
            <Link
              href={heroDemoHref}
              className="px-7 py-4 rounded-2xl bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 text-xs uppercase tracking-widest font-semibold transition inline-flex items-center gap-2"
            >
              <Eye className="w-4 h-4 text-amber-700" />
              Ver Demo Boda (Con Pase Familiar)
            </Link>
          </div>
        </div>
      </section>

      {/* Live Interactive Templates Section */}
      <section id="demos" className="max-w-6xl mx-auto px-6 py-16 w-full">
        <div className="text-center mb-12 space-y-2">
          <p className="uppercase tracking-[0.25em] text-xs text-amber-800 font-semibold">
            Experiencias Interactivas Reales
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl text-[#1A3C34]">
            Explora Nuestros Modelos Activos
          </h2>
          <p className="text-sm text-stone-600 max-w-xl mx-auto">
            Abre cualquiera de las invitaciones para probar el sobre con sello de cera, la música
            ambiental y la confirmación RSVP con código QR.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {events.map((evt) => (
            <div
              key={evt.id}
              className="group rounded-3xl bg-white border border-stone-200/90 overflow-hidden shadow-sm hover:shadow-xl transition flex flex-col justify-between"
            >
              <div>
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={evt.coverImageUrl}
                    alt={evt.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 rounded-full bg-white/90 backdrop-blur text-[11px] font-semibold uppercase tracking-wider text-stone-900">
                      {evt.type === "boda" ? "Boda" : evt.type === "xv" ? "XV Años" : "Evento"}
                    </span>
                  </div>
                  <div className="absolute bottom-4 left-6 right-6 text-white">
                    <p className="text-xs uppercase tracking-widest text-amber-200">{evt.subtitle}</p>
                    <h3 className="font-serif text-3xl">{evt.title}</h3>
                  </div>
                </div>

                <div className="p-6 space-y-3">
                  <p className="text-xs text-stone-500">
                    <strong>Sede:</strong> {evt.ceremonyVenue} • {evt.receptionVenue}
                  </p>
                  <p className="text-sm text-stone-600 line-clamp-2 italic">{evt.quote}</p>
                </div>
              </div>

              <div className="p-6 pt-0 flex flex-wrap gap-3">
                <Link
                  href={`/e/${evt.slug}`}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#1A3C34] text-white text-center text-xs uppercase tracking-wider font-semibold hover:bg-[#122b25] transition"
                >
                  Abrir Invitación
                </Link>
                {demoTokens[evt.id] && (
                  <Link
                    href={`/e/${evt.slug}?g=${demoTokens[evt.id]}`}
                    className="py-3 px-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-center text-xs uppercase tracking-wider font-semibold hover:bg-amber-100 transition"
                  >
                    Ver con Pase VIP (4 Pases)
                  </Link>
                )}
                <Link
                  href={`/dashboard?slug=${evt.slug}`}
                  className="py-3 px-4 rounded-xl bg-stone-100 text-stone-700 text-center text-xs uppercase tracking-wider font-semibold hover:bg-stone-200 transition"
                >
                  Editar en Studio
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Core SaaS Features (Matching Invitio & InvitameOK) */}
      <section id="caracteristicas" className="bg-white border-y border-stone-200/80 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14 space-y-2">
            <p className="uppercase tracking-[0.25em] text-xs text-amber-800 font-semibold">
              Todo en un solo lugar
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#1A3C34]">
              Funcionalidades de Nivel Evento Completo
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Heart,
                title: "Apertura con Sello de Lacre & Música",
                desc: "Simula abrir un sobre físico con sello dorado que activa automáticamente la melodía de fondo en móviles."
              },
              {
                icon: MessageCircle,
                title: "Enlaces Personalizados por WhatsApp",
                desc: "Cada familia recibe un link único e imposible de adivinar con su nombre, mesa y número exacto de boletos asignados."
              },
              {
                icon: Users,
                title: "Gestión RSVP en Tiempo Real",
                desc: "Tus invitados confirman asistencia, indican alergias alimentarias y dejan felicitaciones en el libro de firmas digital."
              },
              {
                icon: QrCode,
                title: "Pase QR para Recepción",
                desc: "Al confirmar, la invitación genera automáticamente un boleto QR personalizado para el control de acceso en la entrada."
              },
              {
                icon: Sliders,
                title: "Editor Visual Self-Serve",
                desc: "Personaliza paletas de colores, fotos, itinerario, ubicaciones con Google Maps/Waze y CLABE de lluvia de sobres."
              },
              {
                icon: Layers,
                title: "Listo para tu Clúster Kubernetes",
                desc: "Arquitectura contenedorizada con ambientes separados de Stage (.240) y Producción (.241) sobre MetalLB."
              }
            ].map((feat) => (
              <div
                key={feat.title}
                className="p-7 rounded-3xl bg-[#FAF8F5] border border-stone-200/80 space-y-3"
              >
                <div className="w-11 h-11 rounded-2xl bg-[#1A3C34] text-amber-200 flex items-center justify-center">
                  <feat.icon className="w-5 h-5" />
                </div>
                <h3 className="font-serif text-xl text-stone-900">{feat.title}</h3>
                <p className="text-sm text-stone-600 leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section id="precios" className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12 space-y-2">
          <p className="uppercase tracking-[0.25em] text-xs text-amber-800 font-semibold">
            Planes Transparentes
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl text-[#1A3C34]">
            Elige el Paquete para tu Celebración
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="rounded-3xl p-8 bg-white border border-stone-200 space-y-6">
            <div>
              <span className="text-xs uppercase tracking-widest text-stone-400">Paquete Esencial</span>
              <h3 className="font-serif text-2xl text-stone-900 mt-1">Invitación Interactiva</h3>
              <p className="text-3xl font-serif font-bold text-[#1A3C34] mt-3">
                $890 <span className="text-sm font-sans font-normal text-stone-500">MXN / pago único</span>
              </p>
            </div>
            <ul className="space-y-3 text-sm text-stone-600">
              {[
                "Sobre animado y música de fondo",
                "Cuenta regresiva e itinerario",
                "Ubicaciones con botón a Google Maps y Waze",
                "Mesa de regalos y CLABE copiable",
                "Confirmación libre de invitados"
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/dashboard"
              className="block w-full py-3.5 rounded-xl border border-stone-300 text-center text-xs uppercase tracking-widest font-semibold hover:bg-stone-100 transition"
            >
              Comenzar en el Editor
            </Link>
          </div>

          <div className="rounded-3xl p-8 bg-[#1A3C34] text-white border border-amber-300/30 shadow-xl space-y-6 relative">
            <span className="absolute top-6 right-6 px-3 py-1 rounded-full bg-amber-400 text-stone-950 text-[10px] font-bold uppercase tracking-widest">
              Más Popular
            </span>
            <div>
              <span className="text-xs uppercase tracking-widest text-amber-200">Evento Completo</span>
              <h3 className="font-serif text-2xl mt-1">Invitación + Gestión VIP & QR</h3>
              <p className="text-3xl font-serif font-bold text-amber-200 mt-3">
                $1,490 <span className="text-sm font-sans font-normal text-stone-300">MXN / pago único</span>
              </p>
            </div>
            <ul className="space-y-3 text-sm text-stone-200">
              {[
                "Todo lo incluido en el Paquete Esencial",
                "Pases personalizados con nombre y boletos asignados",
                "Envío 1-clic por WhatsApp desde el Dashboard",
                "Generación de código QR por familia para recepción",
                "Control de mesas, alergias y libro de firmas digital"
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/dashboard"
              className="block w-full py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 text-center text-xs uppercase tracking-widest font-bold transition"
            >
              Probar Evento Completo
            </Link>
          </div>
        </div>
      </section>

      <footer className="mt-auto border-t border-stone-200 bg-white py-8 px-6 text-center text-xs text-stone-500">
        celebra.events • Plataforma de Invitaciones Digitales Interactivas • Listo para Kubernetes
      </footer>
    </div>
  );
}
