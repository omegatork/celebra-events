import { notFound } from "next/navigation";
import { getEventBySlug, getGuestByToken, getGuestsByEventId } from "@/lib/db";
import InvitationView from "@/components/InvitationView";

export const dynamic = "force-dynamic";

export default function EventInvitationPage({
  params,
  searchParams
}: {
  params: { slug: string };
  searchParams: { g?: string; preview?: string };
}) {
  const event = getEventBySlug(params.slug);
  if (!event) {
    notFound();
  }

  const initialGuest = searchParams.g ? getGuestByToken(event.id, searchParams.g) || null : null;
  const allConfirmedMessages = getGuestsByEventId(event.id).filter(
    (g) => g.status === "confirmed" && g.message
  );

  return (
    <InvitationView
      event={event}
      initialGuest={initialGuest}
      allConfirmedMessages={allConfirmedMessages}
      isPreview={searchParams.preview === "1"}
    />
  );
}
