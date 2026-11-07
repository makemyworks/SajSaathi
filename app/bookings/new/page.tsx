import { redirect } from "next/navigation";

/**
 * Walk-in booking creation belongs to the Partner application.
 * Send Main-app visitors to the customer service catalogue instead.
 */
export default function LegacyWalkInBookingPage(): never {
  redirect("/services");
}
