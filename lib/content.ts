/**
 * Default text for information and legal pages. The founder can replace any of these from
 * Admin → Content pages (same slug); the database version wins when it is published.
 * Legal pages are DRAFTS prepared for review by a qualified Indian lawyer — not legal advice.
 * Body format: paragraphs separated by blank lines; lines starting "## " are headings; lines starting "- " are bullets.
 */
export interface PageContent { title: string; intro?: string; body: string; draft?: boolean }

const grievance = `## Grievance officer
In line with the Consumer Protection (E-Commerce) Rules, 2020 and the IT (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, complaints can be sent to our Grievance Officer: {{GRIEVANCE}}. We acknowledge complaints within 48 hours and aim to resolve them within one month. You can also raise a ticket from Account → Help & tickets; every ticket gets a reference number.`;

export const CONTENT: Record<string, PageContent> = {
  "how-it-works": {
    title: "How Saj Saathi works",
    intro: "Saj Saathi helps you find checked local providers, compare real prices and book a free time.",
    body: `## For customers
- Search by service, area or 6-digit PIN code.
- Compare providers: prices, timings, photos, and reviews written only by customers who completed a booking.
- Pick a free time. Times are checked again by our server when you book, so two people can never get the same slot.
- The provider confirms your booking and you get a notification. You can change the time or cancel from My bookings.

## How results are ordered
"Recommended" order uses rating and number of completed-booking reviews. Providers who pay to be featured are always marked "Sponsored". You can sort by rating or price instead.

## Prices and fees
The price you see before confirming is the price you pay: service, add-ons, travel charge for at-home visits, and any booking fee with GST are listed separately.

## Verification
Before a provider is listed, they send government photo ID and, for some services, training or registration certificates. Our team reviews them. Verification lowers risk but cannot guarantee safety or quality — please report any concern from your booking.

## For partners
Salons, parlours, makeup and mehndi artists, therapists, pet groomers and fitness trainers apply from the partner website. Each service type has its own short form. Once approved, they manage bookings, staff, hours and prices from their phone.`,
  },
  about: {
    title: "About Saj Saathi",
    intro: "Saj means getting ready; Saathi means companion. We want to be the everyday companion people trust for personal care.",
    body: `Saj Saathi is an India-first booking service for personal care, grooming, wellness, pet grooming and active-ageing fitness. We are opening city by city, adding providers only after checking them.

## What we care about
- Honest prices shown in full before you book.
- Reviews only from real, completed bookings.
- Services for everyone: men, women, families, older adults and pets.
- Simple Hindi and English, and an app that works well on everyday Android phones.

## Where we are
We list cities on the Cities page only once verified providers are live there.`,
  },
  partner: {
    title: "Grow your business with Saj Saathi",
    intro: "Get bookings from nearby customers and manage your day from your phone — in Hindi or English.",
    body: `## What you get
- A free profile page with your services, prices, photos and hours.
- A booking calendar with staff, holidays and blocked times.
- Instant booking notifications, walk-in entries and simple reports.
- Your own booking QR code and ready-to-print posters.

## Who can join
Salons, parlours, barbers, makeup and mehndi artists, hairstylists, spa and massage therapists (professional, non-sexual services only), pet groomers, and fitness trainers for older adults.

## How to join
- Create your partner account and choose your service type.
- Fill in the short form for your category and upload ID and any certificates.
- Our team reviews your application. You'll be told if anything else is needed.
- Once approved, you appear to customers and can start receiving bookings.

## Fees
Fees are shown in the partner agreement before you submit. Nothing is charged without your acceptance.`,
  },
  professional: {
    title: "Join as an independent professional",
    intro: "Work for yourself — at your own place or at customers' homes — and get bookings through Saj Saathi.",
    body: `Independent makeup artists, mehndi artists, hairstylists, massage therapists, pet groomers and senior fitness trainers can join as an individual (no shop needed).

## You will need
- A government photo ID.
- Certificates where your service requires them (for example a fitness and first-aid certificate for senior fitness, or a massage training certificate).
- The PIN codes you are willing to travel to, and your travel charge.

## Important
Please describe your work truthfully. Pet groomers are not veterinarians, and fitness trainers are not doctors or physiotherapists — profiles making such claims are not approved.`,
  },
  contact: {
    title: "Contact us",
    intro: "We usually reply within one working day.",
    body: `## Customers
For anything about a booking, open the booking in My bookings and tap "Get help with this booking" — it reaches the right team fastest.

## Partners
Use Support inside the partner app.

## Safety concerns
Choose "Safety concern" when raising a ticket. These are handled first.

${grievance}`,
  },
  help: {
    title: "Help centre",
    intro: "Quick answers to common questions.",
    body: `## Bookings
- To change a time, open the booking and tap "Change time". Free changes are allowed up to the time shown in the cancellation policy.
- To cancel, open the booking and tap "Cancel booking". Any late-cancellation charge is shown before you confirm.
- "Waiting for confirmation" means the provider has not accepted yet. If they decline, you are told immediately.

## Payments
- If you paid online and the booking is cancelled, the refund goes back to the same method. Banks usually take 5–7 working days.
- We only show "Paid" after the payment gateway confirms the money was received.

## Safety
- At-home visits show the provider's verified name before you book. Share your booking with family if you wish.
- If something feels wrong, stop the service and raise a "Safety concern" ticket. In an emergency call 112.

## Account
- To get a copy of your data, raise a ticket under "Account". To delete your account, use Account → Settings & privacy.`,
  },
  faq: { title: "Frequently asked questions", body: "" },
  offers: { title: "Offers", intro: "Current offers from Saj Saathi and our partners.", body: "" },
  referral: { title: "Referral programme", body: "Our referral programme is not live yet. When it launches, the rewards and terms will be shown here." },
  accessibility: {
    title: "Accessibility",
    intro: "We want Saj Saathi to be usable by everyone, including older customers and people using assistive technology.",
    body: `## What we do
- Large text and touch targets, readable colour contrast, and full keyboard use.
- Screen-reader labels on all controls, and status messages announced when times load or bookings change.
- Hindi and English, with more Indian languages planned after proper translation and review.
- Reduced motion respected when your device asks for it.

## Tell us
If anything is hard to use, raise a ticket under "Other" and mention "Accessibility". We aim to follow WCAG 2.2 AA and the Rights of Persons with Disabilities Act, 2016 guidance.`,
  },
  privacy: {
    draft: true,
    title: "Privacy policy",
    intro: "How Saj Saathi collects, uses and protects your personal data.",
    body: `## Who we are
Saj Saathi ("we") operates this website and apps. Legal entity name, registered address and contact: {{COMPANY}}.

## What we collect
- Account details: name, mobile number, email, language, password (stored only as a secure hash).
- Booking details: service, time, provider, address for at-home visits, and the answers you give in booking forms (for example pet size or an emergency contact).
- Payment records: amount, status and gateway reference. Card, UPI and bank details are handled by the payment gateway (Razorpay) — we never see or store them.
- Support conversations and safety reports.
- Technical data: device type, IP address and security logs.

## Why we use it
- To create and run your bookings and send you booking messages.
- To process payments and refunds.
- To keep the platform safe (fraud prevention, abuse reports, security logs).
- To send offers only if you have agreed. You can withdraw this consent anytime from your profile.

## Who we share it with
- The provider you book, only what they need for the booking (name, phone, time, address for at-home visits, and booking answers).
- Service partners that run our infrastructure: cloud hosting, database, email/SMS/WhatsApp delivery, and the payment gateway.
- Authorities where the law requires it.
We do not sell personal data.

## How long we keep it
Booking and payment records are kept for as long as tax and accounting laws require. Other data is deleted or anonymised when it is no longer needed or when you ask us to delete your account, unless the law requires us to keep it.

## Your rights
Under the Digital Personal Data Protection Act, 2023 and the DPDP Rules, 2025 (being brought into force in phases), you can ask to access, correct or erase your personal data, withdraw consent, and nominate someone to exercise your rights. Use Account → Settings & privacy or contact our Grievance Officer.

## Security
Passwords are hashed, connections use HTTPS, verification documents are stored privately and only authorised staff can open them; every such access is logged.

## Children
Saj Saathi is for adults. Bookings for a child must be made by a parent or guardian.

${grievance}`,
  },
  terms: {
    draft: true,
    title: "Terms and conditions",
    body: `## About these terms
These terms apply when you use Saj Saathi to find and book services. Saj Saathi is a marketplace: services are provided by independent providers ("partners"), not by Saj Saathi. Legal entity details: {{COMPANY}}.

## Your account
Give accurate details and keep your password safe. You must be 18 or older to create an account.

## Bookings
- A booking request is confirmed only when the provider confirms it.
- Prices, travel charges, booking fees and taxes are shown before you confirm.
- Follow the cancellation policy shown for each service.

## Provider services
Providers are responsible for the services they deliver. We check identity and listed credentials before approval, but verification does not guarantee safety or quality. Massage and wellness services are professional and non-sexual only. Pet groomers are not veterinarians. Fitness trainers are not doctors or physiotherapists and do not provide medical treatment.

## Conduct
Do not misuse the platform, harass providers or customers, request illegal or sexual services, or post false reviews. We may suspend accounts that break these rules.

## Reviews
Only customers who completed a booking can post a review. We may hide reviews that are abusive or unrelated to the service, and we say so on the review.

## Liability
To the extent the law allows, Saj Saathi is not liable for the acts of independent providers. Nothing in these terms limits your rights under the Consumer Protection Act, 2019.

## Disputes
These terms are governed by the laws of India. Courts at {{JURISDICTION}} have jurisdiction.

${grievance}`,
  },
  refunds: {
    draft: true,
    title: "Cancellation and refund policy",
    body: `## Cancelling a booking
- Each service shows its free cancellation window (for example "Free cancellation up to 4 hours before").
- Cancelling later may carry a charge shown before you confirm the cancellation.
- If the provider cancels or declines, you are never charged.
- If a provider cancels late, they bear an equivalent charge under their partner agreement.

## No-shows
If you miss an appointment without cancelling, the provider may mark it as a no-show. Any no-show charge is listed in the service's policy.

## Refunds for online payments
- If a paid booking is cancelled, a refund request is created automatically.
- Refunds go back to the original payment method. Banks usually take 5–7 working days after we start the refund.
- If money was deducted but the booking does not show as paid, the payment gateway either confirms it or refunds it automatically.

## Pay-at-venue bookings
Payment is between you and the provider. Raise a ticket if there is a dispute.

${grievance}`,
  },
};
