/**
 * Saj Saathi — shared domain types.
 * Money is always stored as integer paise (₹1 = 100). Dates are stored as UTC Date objects.
 */

export type Id = string;
export type Locale = "en" | "hi" | (string & {});
export type LocalizedText = { en: string; hi?: string; [locale: string]: string | undefined };

export type Role =
  | "customer"
  | "partner_owner"
  | "partner_staff"
  | "admin"; // admin users additionally carry an adminRole

export type AdminRole = "super_admin" | "operations" | "finance" | "support" | "content" | "verification";

export interface Consent {
  kind: "terms" | "privacy" | "marketing_email" | "marketing_sms" | "marketing_whatsapp" | "partner_agreement" | "service_consent";
  version: string;
  granted: boolean;
  at: Date;
}

export interface User {
  _id: Id;
  role: Role;
  adminRole?: AdminRole;
  name: string;
  phone?: string; // E.164, e.g. +919876543210
  email?: string; // lower-cased
  passwordHash?: string;
  status: "active" | "disabled" | "deletion_requested" | "deleted";
  providerId?: Id; // for partner_owner / partner_staff
  locale: Locale;
  mfa?: { enabled: boolean; secret?: string };
  consents: Consent[];
  favourites?: Id[];
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export interface Address {
  label?: string;
  line1: string;
  line2?: string;
  locality?: string;
  city: string;
  state: string;
  pin: string;
  country: string; // ISO-3166 alpha-2
  landmark?: string;
  geo?: { lat: number; lng: number };
}

export interface SavedAddress extends Address {
  _id: Id;
  userId: Id;
  isDefault?: boolean;
  createdAt: Date;
}

export type FieldType = "text" | "textarea" | "number" | "select" | "multiselect" | "boolean" | "date" | "file";
export interface FieldDef {
  key: string;
  label: LocalizedText;
  type: FieldType;
  required?: boolean;
  options?: { value: string; label: LocalizedText }[];
  help?: LocalizedText;
  min?: number;
  max?: number;
  /** "customer" fields are asked at booking; "provider" fields at onboarding; "service" fields on each service */
  scope: "customer" | "provider" | "service";
  private?: boolean; // never shown publicly
}

export interface CategoryBookingRules {
  minLeadMinutes: number;
  maxAdvanceDays: number;
  slotStepMinutes: number;
  bufferMinutes: number;
  requiresConsent: boolean;
  consentText?: LocalizedText;
}

export interface CancellationPolicy {
  freeUntilHours: number; // free cancellation if cancelled at least N hours before start
  lateFeePercent: number; // percent of service value retained when cancelled late
  noShowFeePercent: number;
  description?: LocalizedText;
}

export interface Category {
  _id: Id;
  slug: string;
  name: LocalizedText;
  description?: LocalizedText;
  icon?: string; // lucide icon name
  image?: string;
  parentId?: Id;
  vertical: string; // e.g. "salon", "bridal", "wellness", "pet", "senior_fitness"
  providerTypes: string[];
  requiredCredentials: { key: string; label: LocalizedText; mandatory: boolean }[];
  verificationRequirements: LocalizedText[];
  onboardingFields: FieldDef[];
  bookingFields: FieldDef[];
  serviceFields: FieldDef[];
  atHomeAllowed: boolean;
  inStoreAllowed: boolean;
  bookingRules: CategoryBookingRules;
  cancellationPolicy: CancellationPolicy;
  safetyNotice?: LocalizedText; // shown before booking (e.g. massage boundaries, not a vet, not a doctor)
  disallowedClaims?: string[]; // words providers may not use in this category (e.g. "doctor", "physiotherapist", "vet")
  pricing?: { commissionPercent?: number; bookingFeePaise?: number; travelFeePaise?: number };
  seo?: { title?: LocalizedText; description?: LocalizedText };
  features: Record<string, boolean>; // e.g. { staff: true, packages: true, petProfile: true }
  status: "active" | "inactive";
  visible: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ApplicationStatus = "draft" | "submitted" | "under_review" | "documents_required" | "approved" | "rejected" | "suspended";

export interface DayHours { open: boolean; slots: { start: string; end: string }[] } // "09:30"
export type WeeklyHours = Record<"0" | "1" | "2" | "3" | "4" | "5" | "6", DayHours>; // 0 = Sunday

export interface Branch {
  id: Id;
  name: string;
  address: Address;
  hours?: WeeklyHours;
  active: boolean;
}

export interface Provider {
  _id: Id;
  ownerUserId: Id;
  kind: "business" | "individual";
  categoryIds: Id[];
  primaryCategoryId: Id;
  businessName: string;
  slug: string;
  about?: string;
  phone: string;
  email?: string;
  address: Address;
  cityId?: Id;
  branches: Branch[];
  serviceArea?: { pins: string[]; radiusKm?: number };
  atHome: boolean;
  inStore: boolean;
  travelFeePaise?: number;
  hours: WeeklyHours;
  holidays: string[]; // "YYYY-MM-DD" in provider timezone
  timezone: string; // IANA, default Asia/Kolkata
  status: ApplicationStatus;
  statusNote?: string;
  verified: boolean;
  verifiedAt?: Date;
  onboardingAnswers: Record<string, unknown>;
  credentials: { key: string; value: string; documentId?: Id }[];
  gallery: { url: string; caption?: string }[];
  ratingAvg: number;
  ratingCount: number;
  commissionPercent?: number; // authorised exception to category/platform default
  plan?: { code: string; renewsAt?: Date; status: "active" | "lapsed" | "none" };
  featured?: { until: Date; label: "Sponsored" };
  agreementAcceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Staff {
  _id: Id;
  providerId: Id;
  branchId?: Id;
  name: string;
  role: string; // "Senior stylist", "Groomer"…
  serviceIds: Id[];
  hours?: WeeklyHours;
  active: boolean;
  createdAt: Date;
}

export interface AddOn { id: string; name: string; pricePaise: number; durationMin: number }

export interface Service {
  _id: Id;
  providerId: Id;
  categoryId: Id;
  name: string;
  description?: string;
  durationMin: number;
  pricePaise: number;
  mode: "in_store" | "at_home" | "both";
  addOns: AddOn[];
  isPackage?: boolean;
  packageItems?: string[];
  fieldValues?: Record<string, unknown>;
  eligibility?: string; // e.g. "Dogs up to 25 kg"
  staffIds: Id[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "rescheduled"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "refund_pending"
  | "refunded"
  | "no_show";

export type PaymentStatus = "not_required" | "unpaid" | "created" | "authorized" | "captured" | "failed" | "refund_pending" | "refunded" | "partially_refunded";

export interface PriceBreakdown {
  basePaise: number;
  addOnsPaise: number;
  travelPaise: number;
  bookingFeePaise: number;
  discountPaise: number;
  taxPaise: number;
  totalPaise: number;
  commissionPaise: number; // platform commission on service value (for statements; not charged to customer)
  currency: "INR" | (string & {});
}

export interface BookingHistoryEntry { at: Date; from?: BookingStatus; to: BookingStatus; byUserId?: Id; byRole: Role | "system"; note?: string }

export interface Booking {
  _id: Id;
  ref: string; // human reference, e.g. SS-7KQ2-91XD
  customerId: Id;
  customerName: string;
  customerPhone?: string;
  providerId: Id;
  branchId?: Id;
  staffId?: Id;
  serviceId: Id;
  serviceName: string;
  categoryId: Id;
  addOnIds: string[];
  start: Date;
  end: Date;
  mode: "in_store" | "at_home";
  address?: Address; // at-home only; private to customer, provider and admins
  fields: Record<string, unknown>; // category booking fields (pet type/size, etc.)
  notes?: string;
  price: PriceBreakdown;
  couponCode?: string;
  paymentMethod: "pay_at_venue" | "online";
  paymentStatus: PaymentStatus;
  status: BookingStatus;
  arrivedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  cancellationFeePaise?: number;
  providerPenaltyPaise?: number; // late cancellation by provider, deducted on their statement
  consentAt?: Date;
  walkIn?: boolean;
  history: BookingHistoryEntry[];
  reviewId?: Id;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  _id: Id;
  bookingId: Id;
  customerId: Id;
  providerId: Id;
  gateway: "razorpay" | (string & {});
  gatewayOrderId: string;
  gatewayPaymentId?: string;
  amountPaise: number;
  currency: string;
  status: PaymentStatus;
  method?: string;
  failureReason?: string;
  refundedPaise: number;
  receiptNo?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Refund {
  _id: Id;
  paymentId: Id;
  bookingId: Id;
  amountPaise: number;
  status: "requested" | "approved" | "processing" | "processed" | "failed" | "rejected";
  gatewayRefundId?: string;
  reason: string;
  requestedBy: Id;
  decidedBy?: Id;
  createdAt: Date;
  updatedAt: Date;
}

export interface Review {
  _id: Id;
  bookingId: Id;
  customerId: Id;
  customerName: string;
  providerId: Id;
  serviceId: Id;
  rating: 1 | 2 | 3 | 4 | 5;
  text?: string;
  status: "published" | "hidden" | "flagged";
  reply?: { text: string; at: Date };
  createdAt: Date;
}

export interface Coupon {
  _id: Id;
  code: string; // upper-case
  title: string;
  type: "percent" | "flat";
  value: number; // percent (1-100) or paise
  maxDiscountPaise?: number;
  minOrderPaise?: number;
  validFrom: Date;
  validTo: Date;
  usageLimit?: number;
  perUserLimit?: number;
  usedCount: number;
  categoryIds?: Id[];
  providerIds?: Id[];
  fundedBy: "platform" | "provider";
  active: boolean;
  createdAt: Date;
}

export interface NotificationDoc {
  _id: Id;
  userId: Id;
  kind: string; // "booking.created" etc
  title: string;
  body: string;
  link?: string;
  read: boolean;
  channels: { channel: "in_app" | "email" | "sms" | "whatsapp" | "push"; status: "sent" | "delivered" | "failed" | "skipped_not_configured" | "skipped_no_consent"; providerMessageId?: string; error?: string }[];
  createdAt: Date;
}

export interface SupportTicket {
  _id: Id;
  ref: string;
  userId: Id;
  role: Role;
  subject: string;
  category: "booking" | "payment" | "account" | "safety" | "partner" | "other";
  bookingId?: Id;
  status: "open" | "pending" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "urgent";
  messages: { at: Date; byUserId: Id; byRole: Role; text: string }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentRecord {
  _id: Id;
  ownerUserId: Id;
  providerId?: Id;
  kind: string; // "id_proof", "address_proof", "certificate", "gallery"
  fileName: string;
  contentType: string;
  sizeBytes: number;
  storageKey: string; // private storage key, never a public URL for verification docs
  visibility: "private" | "public";
  status: "uploaded" | "accepted" | "rejected";
  reviewNote?: string;
  createdAt: Date;
}

export interface AuditEvent {
  _id: Id;
  at: Date;
  actorUserId?: Id;
  actorRole: Role | "system";
  action: string;
  entity: string;
  entityId?: Id;
  ip?: string;
  details?: Record<string, unknown>;
}

export interface Session { _id: Id; userId: Id; role: Role; createdAt: Date; expiresAt: Date; userAgent?: string; ip?: string; mfaPassed?: boolean }

export interface Actor { userId: Id; role: Role; adminRole?: AdminRole; providerId?: Id }
