# Legal and compliance notes (for your lawyer and CA)

This is engineering research to help a qualified Indian lawyer review the drafts in the customer site (`lib/content.ts`, shown at /legal/privacy, /legal/terms, /legal/refunds). **It is not legal advice.**

## Laws and rules the platform was designed around
* **Digital Personal Data Protection Act, 2023 + DPDP Rules, 2025.** The Rules were notified on 13 Nov 2025 with phased commencement: Data Protection Board provisions immediately; Consent Manager rules from 13 Nov 2026; the main obligations on data fiduciaries (notice, consent, security safeguards, breach notification, data-principal rights) from 13 May 2027. The platform already records versioned consents, separates marketing consent per channel, supports deletion requests and logs access to sensitive documents. Your lawyer should confirm notice wording, breach procedure, retention periods and grievance timelines against the Gazette text.
* **Consumer Protection (E-Commerce) Rules, 2020** (marketplace entity). Implemented: seller (partner) name/address/ratings on listings; full price breakdown before payment; cancellation/refund info; ticket numbers for complaints; ranking explanation (How it works); "Sponsored" disclosure for paid placement; reviews only from completed bookings; cancellation-charge symmetry (provider late cancellation bears an equivalent charge). To do: appoint a **Grievance Officer** (name, contact shown on site via `NEXT_PUBLIC_GRIEVANCE_OFFICER`) — complaints acknowledged within 48 hours, resolved within one month.
* **Information Technology Act, 2000 & IT (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021** — grievance mechanism, terms/privacy publication, takedown handling.
* **Consumer Protection Act, 2019** — unfair trade practices, misleading advertisements (no fake reviews, discounts or awards are generated anywhere in the software).
* **GST** — booking fee GST rate is configurable (default 18%); confirm registration, place-of-supply and whether the platform must collect TCS under Section 52 for marketplace supplies with your CA.
* **RBI payment aggregator rules** — handled by Razorpay; Saj Saathi never stores card/UPI data.
* **TRAI TCCCPR (DLT)** — SMS templates and headers must be DLT-registered before MSG91 will deliver.
* **WhatsApp Business** — only Meta-approved templates; marketing messages need opt-in (stored per channel).
* **Shops & Establishments Acts / local municipal rules** — some cities require licences for spas/massage centres; the massage category asks for a local licence where applicable. Check your launch cities.
* **Rights of Persons with Disabilities Act, 2016** — accessibility statement at /accessibility.

## Documents still to be written / reviewed by the lawyer
Customer Terms, Privacy Policy, Cancellation & Refund Policy (drafts provided) · Partner Agreement · Verification Policy · Provider Code of Conduct · Home Service Policy · Massage Service Requirements · Pet Grooming Requirements · Senior Fitness Service Requirements. The category consent texts in `lib/core/seed.ts` (massage, pet grooming, senior fitness) are drafts and are editable from Admin → Categories.

## Things the software deliberately does not claim
Verification does not guarantee safety; groomers are not vets; trainers are not doctors or physiotherapists; massage is non-sexual and not medical treatment; nationwide coverage is never claimed (only cities with approved providers are listed).
