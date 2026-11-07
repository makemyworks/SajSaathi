import { redirect } from "next/navigation";

/** Redirect the legacy booking URL to the customer account booking detail. */
export default async function LegacyBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<never> {
  const { id } = await params;
  redirect(`/account/bookings/${encodeURIComponent(id)}`);
}
