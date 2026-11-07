import { redirect } from "next/navigation";

/**
 * Legacy Partner booking route.
 * Partner bookings are served by the separate SajSaathiPartner deployment.
 * Customers should use their account booking history on the Main app.
 */
export default function LegacyBookingsPage(): never {
  redirect("/account/bookings");
}
