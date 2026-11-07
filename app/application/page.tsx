import { redirect } from "next/navigation";

/**
 * The partner application experience lives in the separately deployed
 * SajSaathiPartner app. This legacy Main-site path now sends visitors to the
 * customer-facing professional information page instead of importing
 * Partner-only components into the Customer + Admin build.
 */
export default function ApplicationPage(): never {
  redirect("/professional");
}
