import { notFound } from "next/navigation";
import { getEventBySlug } from "@/modules/events/repository";
import { findGuestByToken, listGuestbook, toPublicGuest } from "@/modules/guests/repository";
import InvitationView from "@/components/InvitationView";

export const dynamic = "force-dynamic";

export default async function EventInvitationPage({
  params,
  searchParams
}: {
  params: { slug: string };
  searchParams: { g?: string; preview?: string };
}) {
  const event = await getEventBySlug(params.slug);
  if (!event) {
    notFound();
  }

  const guest = searchParams.g ? await findGuestByToken(event.id, searchParams.g) : undefined;
  // Only names + messages go to the browser, never other guests' tokens or phones.
  const guestbook = event.sections.showGuestbook ? await listGuestbook(event.id) : [];

  return (
    <InvitationView
      event={event}
      initialGuest={guest ? toPublicGuest(guest) : null}
      allConfirmedMessages={guestbook}
      isPreview={searchParams.preview === "1"}
    />
  );
}
