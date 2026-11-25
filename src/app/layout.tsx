import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "celebra.events — Plataforma de Invitaciones Digitales Interactivas",
  description:
    "Crea invitaciones digitales interactivas en celebra.events para Bodas, XV Años y Eventos con pases personalizados, confirmación RSVP en tiempo real y envío por WhatsApp."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV || "development";

  return (
    <html lang="es">
      <body className="antialiased bg-stone-50 text-stone-900">
        {appEnv === "staging" && (
          <div className="bg-amber-500 text-stone-950 text-xs font-semibold tracking-wider uppercase text-center py-1.5 px-4">
            Entorno de Pruebas (STAGE • 192.168.100.240) — Los cambios aquí no afectan Producción
          </div>
        )}
        {children}
      </body>
    </html>
  );
}
