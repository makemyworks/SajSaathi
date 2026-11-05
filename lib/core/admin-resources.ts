/**
 * Admin resource registry. Each entry drives:
 *   - GET/POST/PATCH/DELETE /api/v1/admin/resources/:key (server: allow-listed collections & fields only)
 *   - the generic list/edit screens in the admin console.
 * Adding a new admin section for a simple collection = adding an entry here. No new UI code needed.
 */
import type { AdminPermission } from "./permissions";
import { badRequest } from "./util";

export type AdminFieldType = "text" | "textarea" | "number" | "money" | "boolean" | "select" | "date" | "datetime" | "tags" | "localized" | "json" | "email" | "url";
export interface AdminField { key: string; label: string; type: AdminFieldType; required?: boolean; options?: string[]; help?: string; readOnly?: boolean }
export interface AdminResource {
  key: string;
  label: string;
  group: string;
  collection: string;
  view: AdminPermission;
  manage?: AdminPermission; // absent = read-only
  baseFilter?: Record<string, unknown>;
  columns: { key: string; label: string; type?: AdminFieldType }[];
  fields: AdminField[];
  search?: string[];
  filters?: { key: string; label: string; options: string[] }[];
  sort?: Record<string, 1 | -1>;
  canCreate?: boolean;
  canDelete?: boolean;
  hidden?: string[]; // never returned (secrets)
  defaults?: Record<string, unknown>;
  note?: string;
}

const statusOpts = ["draft", "submitted", "under_review", "documents_required", "approved", "rejected", "suspended"];
const bookingStatus = ["pending", "confirmed", "rescheduled", "in_progress", "completed", "cancelled", "refund_pending", "refunded", "no_show"];
const providerCols = [
  { key: "businessName", label: "Name" }, { key: "kind", label: "Type" }, { key: "address.city", label: "City" },
  { key: "status", label: "Status" }, { key: "ratingAvg", label: "Rating", type: "number" as const }, { key: "createdAt", label: "Joined", type: "datetime" as const },
];
const providerFields: AdminField[] = [
  { key: "businessName", label: "Business name", type: "text", required: true },
  { key: "about", label: "About", type: "textarea" },
  { key: "phone", label: "Phone", type: "text" },
  { key: "email", label: "Email", type: "email" },
  { key: "address.city", label: "City", type: "text" },
  { key: "address.locality", label: "Locality", type: "text" },
  { key: "address.pin", label: "PIN", type: "text" },
  { key: "atHome", label: "Offers at-home", type: "boolean" },
  { key: "inStore", label: "Offers in-store", type: "boolean" },
  { key: "commissionPercent", label: "Commission % (exception)", type: "number", help: "Leave empty to use category/platform default" },
  { key: "status", label: "Status", type: "select", options: statusOpts, readOnly: true, help: "Use the Applications review screen to change status" },
];
const loc = (key: string, label: string, collection: string, extra: AdminField[]): AdminResource => ({
  key, label, group: "Locations", collection, view: "locations.manage", manage: "locations.manage", canCreate: true, canDelete: true,
  columns: [{ key: "name", label: "Name" }, ...extra.slice(0, 2).map((f) => ({ key: f.key, label: f.label })), { key: "active", label: "Active", type: "boolean" }],
  fields: [{ key: "name", label: "Name", type: "text", required: true }, ...extra, { key: "active", label: "Live for customers", type: "boolean" }],
  search: ["name"], sort: { name: 1 }, defaults: { active: false },
});
const content = (key: string, label: string, collection: string, fields: AdminField[], perm: AdminPermission = "content.manage", group = "Content"): AdminResource => ({
  key, label, group, collection, view: perm, manage: perm, canCreate: true, canDelete: true,
  columns: fields.slice(0, 3).map((f) => ({ key: f.key, label: f.label, type: f.type })).concat([{ key: "updatedAt", label: "Updated", type: "datetime" }]),
  fields, search: [fields[0].key], sort: { updatedAt: -1 },
});

export const ADMIN_RESOURCES: AdminResource[] = [
  // People
  { key: "customers", label: "Customers", group: "People", collection: "users", view: "customers.view", manage: "customers.manage", baseFilter: { role: "customer" },
    columns: [{ key: "name", label: "Name" }, { key: "phone", label: "Phone" }, { key: "email", label: "Email" }, { key: "status", label: "Status" }, { key: "createdAt", label: "Joined", type: "datetime" }],
    fields: [{ key: "name", label: "Name", type: "text", required: true }, { key: "status", label: "Status", type: "select", options: ["active", "disabled", "deletion_requested", "deleted"] }, { key: "locale", label: "Language", type: "select", options: ["en", "hi"] }],
    search: ["name", "phone", "email"], filters: [{ key: "status", label: "Status", options: ["active", "disabled", "deletion_requested"] }], sort: { createdAt: -1 }, hidden: ["passwordHash", "mfa"] },
  { key: "partners", label: "Partners", group: "Partners", collection: "providers", view: "partners.view", manage: "partners.manage", baseFilter: { kind: "business" }, columns: providerCols, fields: providerFields, search: ["businessName", "phone", "address.city"], filters: [{ key: "status", label: "Status", options: statusOpts }], sort: { createdAt: -1 } },
  { key: "professionals", label: "Independent professionals", group: "Partners", collection: "providers", view: "partners.view", manage: "partners.manage", baseFilter: { kind: "individual" }, columns: providerCols, fields: providerFields, search: ["businessName", "phone", "address.city"], filters: [{ key: "status", label: "Status", options: statusOpts }], sort: { createdAt: -1 } },
  { key: "approvals", label: "Approved", group: "Partners", collection: "providers", view: "partners.view", baseFilter: { status: "approved" }, columns: providerCols, fields: providerFields, search: ["businessName"], sort: { updatedAt: -1 } },
  { key: "rejections", label: "Rejected", group: "Partners", collection: "providers", view: "partners.view", baseFilter: { status: "rejected" }, columns: [...providerCols, { key: "statusNote", label: "Reason" }], fields: providerFields, search: ["businessName"], sort: { updatedAt: -1 } },
  { key: "suspensions", label: "Suspended", group: "Partners", collection: "providers", view: "partners.view", baseFilter: { status: "suspended" }, columns: [...providerCols, { key: "statusNote", label: "Reason" }], fields: providerFields, search: ["businessName"], sort: { updatedAt: -1 } },
  { key: "documents", label: "Documents", group: "Partners", collection: "documents", view: "documents.view", manage: "applications.review",
    columns: [{ key: "kind", label: "Type" }, { key: "fileName", label: "File" }, { key: "status", label: "Status" }, { key: "createdAt", label: "Uploaded", type: "datetime" }],
    fields: [{ key: "status", label: "Status", type: "select", options: ["uploaded", "accepted", "rejected"] }, { key: "reviewNote", label: "Review note", type: "textarea" }],
    filters: [{ key: "status", label: "Status", options: ["uploaded", "accepted", "rejected"] }], sort: { createdAt: -1 }, hidden: ["storageKey"], note: "Files open through a short-lived signed link from the application review screen." },
  { key: "featured", label: "Featured providers", group: "Marketing", collection: "providers", view: "marketing.manage", manage: "marketing.manage", baseFilter: { status: "approved" },
    columns: [{ key: "businessName", label: "Name" }, { key: "address.city", label: "City" }, { key: "featured.until", label: "Featured until", type: "datetime" }],
    fields: [{ key: "featured.until", label: "Featured until", type: "datetime", help: "Shown with a clear 'Sponsored' label. Clear to stop." }, { key: "featured.label", label: "Label", type: "select", options: ["Sponsored"] }],
    search: ["businessName"], sort: { "featured.until": -1 } },

  // Catalog (categories have a dedicated builder screen; this is the list view)
  { key: "services", label: "Services", group: "Catalog", collection: "services", view: "catalog.manage", manage: "catalog.manage",
    columns: [{ key: "name", label: "Service" }, { key: "pricePaise", label: "Price", type: "money" }, { key: "durationMin", label: "Minutes", type: "number" }, { key: "mode", label: "Mode" }, { key: "active", label: "Active", type: "boolean" }],
    fields: [{ key: "name", label: "Name", type: "text", required: true }, { key: "description", label: "Description", type: "textarea" }, { key: "pricePaise", label: "Price", type: "money" }, { key: "durationMin", label: "Duration (min)", type: "number" }, { key: "active", label: "Active", type: "boolean" }],
    search: ["name"], sort: { updatedAt: -1 } },
  { key: "pricing-exceptions", label: "Pricing exceptions", group: "Catalog", collection: "providers", view: "commissions.manage", manage: "commissions.manage", baseFilter: { commissionPercent: { $exists: true } },
    columns: [{ key: "businessName", label: "Partner" }, { key: "commissionPercent", label: "Commission %", type: "number" }, { key: "address.city", label: "City" }],
    fields: [{ key: "commissionPercent", label: "Commission %", type: "number", required: true }], search: ["businessName"], sort: { businessName: 1 },
    note: "To add an exception, open the partner and set 'Commission % (exception)'." },

  // Locations
  loc("countries", "Countries", "countries", [{ key: "code", label: "ISO code", type: "text", required: true }, { key: "currency", label: "Currency", type: "text" }, { key: "timezone", label: "Time zone", type: "text" }, { key: "paymentGateway", label: "Payment provider", type: "text" }]),
  loc("states", "States & UTs", "states", [{ key: "code", label: "Code", type: "text" }, { key: "country", label: "Country", type: "text" }, { key: "type", label: "Type", type: "select", options: ["state", "union_territory"] }]),
  loc("cities", "Cities", "cities", [{ key: "state", label: "State", type: "text", required: true }, { key: "slug", label: "URL slug", type: "text" }, { key: "launchedAt", label: "Launched", type: "date" }]),
  loc("pincodes", "PIN codes", "pincodes", [{ key: "pin", label: "PIN", type: "text", required: true }, { key: "city", label: "City", type: "text" }, { key: "locality", label: "Locality", type: "text" }]),
  loc("territories", "Territories", "territories", [{ key: "city", label: "City", type: "text" }, { key: "pins", label: "PIN codes", type: "tags" }, { key: "manager", label: "Manager", type: "text" }]),

  // Operations
  { key: "bookings", label: "Bookings", group: "Operations", collection: "bookings", view: "bookings.view",
    columns: [{ key: "ref", label: "Ref" }, { key: "customerName", label: "Customer" }, { key: "serviceName", label: "Service" }, { key: "start", label: "When", type: "datetime" }, { key: "status", label: "Status" }, { key: "price.totalPaise", label: "Total", type: "money" }, { key: "paymentStatus", label: "Payment" }],
    fields: [], search: ["ref", "customerName", "serviceName"], filters: [{ key: "status", label: "Status", options: bookingStatus }, { key: "paymentStatus", label: "Payment", options: ["not_required", "unpaid", "created", "authorized", "captured", "failed", "refund_pending", "refunded"] }], sort: { start: -1 } },
  { key: "cancellations", label: "Cancellations", group: "Operations", collection: "bookings", view: "bookings.view", baseFilter: { status: { $in: ["cancelled", "no_show"] } },
    columns: [{ key: "ref", label: "Ref" }, { key: "customerName", label: "Customer" }, { key: "cancellationReason", label: "Reason" }, { key: "cancelledAt", label: "Cancelled", type: "datetime" }, { key: "cancellationFeePaise", label: "Fee", type: "money" }],
    fields: [], search: ["ref"], sort: { cancelledAt: -1 } },
  { key: "reviews", label: "Reviews", group: "Operations", collection: "reviews", view: "reviews.moderate", manage: "reviews.moderate",
    columns: [{ key: "customerName", label: "Customer" }, { key: "rating", label: "Rating", type: "number" }, { key: "text", label: "Review" }, { key: "status", label: "Status" }, { key: "createdAt", label: "Date", type: "datetime" }],
    fields: [{ key: "status", label: "Status", type: "select", options: ["published", "hidden", "flagged"] }], filters: [{ key: "status", label: "Status", options: ["published", "hidden", "flagged"] }], sort: { createdAt: -1 } },
  { key: "complaints", label: "Complaints & safety", group: "Operations", collection: "tickets", view: "support.manage", manage: "support.manage", baseFilter: { category: { $in: ["safety", "partner"] } },
    columns: [{ key: "ref", label: "Ref" }, { key: "subject", label: "Subject" }, { key: "priority", label: "Priority" }, { key: "status", label: "Status" }, { key: "updatedAt", label: "Updated", type: "datetime" }],
    fields: [{ key: "status", label: "Status", type: "select", options: ["open", "pending", "resolved", "closed"] }, { key: "priority", label: "Priority", type: "select", options: ["low", "normal", "high", "urgent"] }], sort: { updatedAt: -1 } },
  { key: "tickets", label: "Support tickets", group: "Operations", collection: "tickets", view: "support.manage", manage: "support.manage",
    columns: [{ key: "ref", label: "Ref" }, { key: "subject", label: "Subject" }, { key: "category", label: "Type" }, { key: "priority", label: "Priority" }, { key: "status", label: "Status" }, { key: "updatedAt", label: "Updated", type: "datetime" }],
    fields: [{ key: "status", label: "Status", type: "select", options: ["open", "pending", "resolved", "closed"] }, { key: "priority", label: "Priority", type: "select", options: ["low", "normal", "high", "urgent"] }],
    search: ["ref", "subject"], filters: [{ key: "status", label: "Status", options: ["open", "pending", "resolved", "closed"] }], sort: { updatedAt: -1 } },

  // Money
  { key: "payments", label: "Payments", group: "Finance", collection: "payments", view: "payments.view",
    columns: [{ key: "gatewayOrderId", label: "Order" }, { key: "gatewayPaymentId", label: "Payment id" }, { key: "amountPaise", label: "Amount", type: "money" }, { key: "status", label: "Status" }, { key: "method", label: "Method" }, { key: "createdAt", label: "Date", type: "datetime" }],
    fields: [], search: ["gatewayOrderId", "gatewayPaymentId", "receiptNo"], filters: [{ key: "status", label: "Status", options: ["created", "authorized", "captured", "failed", "refund_pending", "refunded", "partially_refunded"] }], sort: { createdAt: -1 } },
  { key: "payouts", label: "Payouts", group: "Finance", collection: "payouts", view: "payouts.manage", manage: "payouts.manage", canCreate: true,
    columns: [{ key: "providerName", label: "Partner" }, { key: "period", label: "Period" }, { key: "amountPaise", label: "Amount", type: "money" }, { key: "status", label: "Status" }, { key: "utr", label: "UTR / ref" }],
    fields: [{ key: "providerId", label: "Partner id", type: "text", required: true }, { key: "providerName", label: "Partner name", type: "text" }, { key: "period", label: "Period (YYYY-MM)", type: "text", required: true }, { key: "amountPaise", label: "Amount", type: "money", required: true }, { key: "status", label: "Status", type: "select", options: ["scheduled", "paid", "on_hold", "failed"] }, { key: "utr", label: "Bank UTR / reference", type: "text" }, { key: "note", label: "Note", type: "textarea" }],
    sort: { createdAt: -1 }, defaults: { status: "scheduled" }, note: "Payouts are recorded here after you pay partners from your bank or a payout provider. Nothing is transferred automatically." },
  { key: "plans", label: "Subscriptions (partner plans)", group: "Finance", collection: "plans", view: "plans.manage", manage: "plans.manage", canCreate: true, canDelete: true,
    columns: [{ key: "code", label: "Code" }, { key: "name", label: "Name" }, { key: "pricePaise", label: "Price", type: "money" }, { key: "interval", label: "Billing" }, { key: "active", label: "Active", type: "boolean" }],
    fields: [{ key: "code", label: "Code", type: "text", required: true }, { key: "name", label: "Name", type: "text", required: true }, { key: "pricePaise", label: "Price", type: "money" }, { key: "interval", label: "Billing", type: "select", options: ["monthly", "quarterly", "yearly", "one_time"] }, { key: "commissionPercent", label: "Commission % on this plan", type: "number" }, { key: "benefits", label: "Benefits", type: "tags" }, { key: "active", label: "Active", type: "boolean" }], sort: { pricePaise: 1 } },
  { key: "memberships", label: "Customer memberships", group: "Finance", collection: "memberships", view: "plans.manage", manage: "plans.manage", canCreate: true, canDelete: true,
    columns: [{ key: "name", label: "Name" }, { key: "pricePaise", label: "Price", type: "money" }, { key: "interval", label: "Billing" }, { key: "active", label: "Active", type: "boolean" }],
    fields: [{ key: "name", label: "Name", type: "text", required: true }, { key: "description", label: "Description", type: "textarea" }, { key: "pricePaise", label: "Price", type: "money" }, { key: "interval", label: "Billing", type: "select", options: ["monthly", "yearly"] }, { key: "benefits", label: "Benefits", type: "tags" }, { key: "active", label: "Available to customers", type: "boolean" }],
    defaults: { active: false }, sort: { pricePaise: 1 } },
  { key: "coupons", label: "Coupons", group: "Marketing", collection: "coupons", view: "coupons.manage", manage: "coupons.manage", canCreate: true,
    columns: [{ key: "code", label: "Code" }, { key: "title", label: "Title" }, { key: "type", label: "Type" }, { key: "value", label: "Value", type: "number" }, { key: "usedCount", label: "Used", type: "number" }, { key: "validTo", label: "Valid to", type: "datetime" }, { key: "active", label: "Active", type: "boolean" }],
    fields: [{ key: "code", label: "Code", type: "text", required: true }, { key: "title", label: "Title shown to customers", type: "text", required: true }, { key: "type", label: "Type", type: "select", options: ["percent", "flat"], required: true }, { key: "value", label: "Value (percent, or paise for flat)", type: "number", required: true }, { key: "maxDiscountPaise", label: "Max discount", type: "money" }, { key: "minOrderPaise", label: "Minimum order", type: "money" }, { key: "validFrom", label: "Valid from", type: "datetime", required: true }, { key: "validTo", label: "Valid to", type: "datetime", required: true }, { key: "usageLimit", label: "Total uses", type: "number" }, { key: "perUserLimit", label: "Uses per customer", type: "number" }, { key: "fundedBy", label: "Funded by", type: "select", options: ["platform", "provider"] }, { key: "active", label: "Active", type: "boolean" }],
    search: ["code", "title"], sort: { createdAt: -1 }, defaults: { usedCount: 0, active: false, fundedBy: "platform" } },
  content("referrals", "Referral programme", "referral_programs", [{ key: "name", label: "Name", type: "text", required: true }, { key: "referrerRewardPaise", label: "Referrer reward", type: "money" }, { key: "refereeRewardPaise", label: "New customer reward", type: "money" }, { key: "terms", label: "Terms", type: "textarea" }, { key: "active", label: "Active", type: "boolean" }], "marketing.manage", "Marketing"),
  content("promotions", "Promotions (offers page)", "promotions", [{ key: "title", label: "Title", type: "text", required: true }, { key: "body", label: "Details", type: "textarea" }, { key: "couponCode", label: "Linked coupon", type: "text" }, { key: "validTo", label: "Ends", type: "datetime" }, { key: "active", label: "Visible", type: "boolean" }], "marketing.manage", "Marketing"),
  content("campaigns", "Campaigns", "campaigns", [{ key: "name", label: "Name", type: "text", required: true }, { key: "channel", label: "Channel", type: "select", options: ["email", "sms", "whatsapp", "push"] }, { key: "audience", label: "Audience", type: "select", options: ["customers_opted_in", "partners"] }, { key: "templateKey", label: "Template key", type: "text" }, { key: "status", label: "Status", type: "select", options: ["draft", "scheduled", "sent", "cancelled"] }, { key: "scheduledAt", label: "Send at", type: "datetime" }], "marketing.manage", "Marketing"),

  // Communication
  content("email-templates", "Email templates", "templates", [{ key: "key", label: "Template key", type: "text", required: true }, { key: "en", label: "English (title/body)", type: "json" }, { key: "hi", label: "Hindi (title/body)", type: "json" }, { key: "active", label: "Use this override", type: "boolean" }], "templates.manage", "Communication"),
  content("whatsapp-templates", "WhatsApp templates", "whatsapp_templates", [{ key: "name", label: "Approved template name (Meta)", type: "text", required: true }, { key: "language", label: "Language code", type: "select", options: ["en", "hi"] }, { key: "eventKey", label: "Used for event", type: "text" }, { key: "variables", label: "Variable order", type: "tags" }, { key: "status", label: "Meta approval status", type: "select", options: ["draft", "submitted", "approved", "rejected"] }], "templates.manage", "Communication"),
  { key: "notifications", label: "Notification log", group: "Communication", collection: "notifications", view: "templates.manage",
    columns: [{ key: "kind", label: "Event" }, { key: "title", label: "Title" }, { key: "read", label: "Read", type: "boolean" }, { key: "createdAt", label: "Sent", type: "datetime" }], fields: [], search: ["kind", "title"], sort: { createdAt: -1 },
    note: "Each row shows per-channel status. 'skipped_not_configured' means that channel has no credentials yet." },

  // Content & growth
  content("pages", "Content pages", "pages", [{ key: "slug", label: "Slug (e.g. about, faq)", type: "text", required: true }, { key: "title", label: "Title", type: "localized", required: true }, { key: "body", label: "Body (Markdown)", type: "localized" }, { key: "published", label: "Published", type: "boolean" }]),
  content("faqs", "FAQs", "faqs", [{ key: "question", label: "Question", type: "localized", required: true }, { key: "answer", label: "Answer", type: "localized", required: true }, { key: "audience", label: "Audience", type: "select", options: ["customer", "partner"] }, { key: "order", label: "Order", type: "number" }]),
  content("seo", "SEO", "seo_entries", [{ key: "path", label: "Path (e.g. /services/salon)", type: "text", required: true }, { key: "title", label: "Title", type: "localized" }, { key: "description", label: "Meta description", type: "localized" }, { key: "noindex", label: "Hide from search", type: "boolean" }], "seo.manage"),
  content("languages", "Languages", "languages", [{ key: "code", label: "Code (e.g. ta)", type: "text", required: true }, { key: "name", label: "Name", type: "text", required: true }, { key: "nativeName", label: "Native name", type: "text" }, { key: "status", label: "Status", type: "select", options: ["planned", "translating", "in_review", "live"] }, { key: "reviewedBy", label: "Reviewed by", type: "text" }], "languages.manage"),
  content("jobs", "Recruitment — job posts", "job_posts", [{ key: "title", label: "Title", type: "text", required: true }, { key: "city", label: "City", type: "text" }, { key: "description", label: "Description", type: "textarea" }, { key: "status", label: "Status", type: "select", options: ["draft", "open", "closed"] }], "careers.manage", "Future modules"),
  content("courses", "Academy / training", "courses", [{ key: "title", label: "Title", type: "text", required: true }, { key: "audience", label: "For", type: "select", options: ["partners", "professionals"] }, { key: "description", label: "Description", type: "textarea" }, { key: "status", label: "Status", type: "select", options: ["draft", "published", "archived"] }], "academy.manage", "Future modules"),
  content("products", "Marketplace catalogue (not live)", "products", [{ key: "name", label: "Product", type: "text", required: true }, { key: "line", label: "Line", type: "select", options: ["care", "pro"] }, { key: "description", label: "Description", type: "textarea" }, { key: "status", label: "Status", type: "select", options: ["idea", "sourcing", "ready"] }], "marketing.manage", "Future modules"),

  // System
  { key: "admins", label: "Admin users", group: "System", collection: "users", view: "admins.manage", manage: "admins.manage", baseFilter: { role: "admin" },
    columns: [{ key: "name", label: "Name" }, { key: "email", label: "Email" }, { key: "adminRole", label: "Role" }, { key: "status", label: "Status" }, { key: "lastLoginAt", label: "Last login", type: "datetime" }],
    fields: [{ key: "name", label: "Name", type: "text", required: true }, { key: "adminRole", label: "Role", type: "select", options: ["super_admin", "operations", "finance", "support", "content", "verification"] }, { key: "status", label: "Status", type: "select", options: ["active", "disabled"] }],
    hidden: ["passwordHash", "mfa"], sort: { name: 1 }, note: "New admins are invited from the 'Invite admin' button (sets a temporary password)." },
  { key: "audit", label: "Audit log", group: "System", collection: "audit_events", view: "audit.view",
    columns: [{ key: "at", label: "When", type: "datetime" }, { key: "actorRole", label: "Actor" }, { key: "action", label: "Action" }, { key: "entity", label: "Entity" }, { key: "entityId", label: "Id" }, { key: "ip", label: "IP" }],
    fields: [], search: ["action", "entity", "entityId", "actorUserId"], sort: { at: -1 } },
  content("flags", "Feature flags", "feature_flags", [{ key: "key", label: "Flag", type: "text", required: true }, { key: "enabled", label: "Enabled", type: "boolean" }, { key: "description", label: "What it controls", type: "text" }], "flags.manage", "System"),
];

export function getResource(key: string): AdminResource {
  const r = ADMIN_RESOURCES.find((x) => x.key === key);
  if (!r) throw badRequest("Unknown admin section");
  return r;
}

/** Converts a form payload into a safe $set using only allow-listed, non-read-only fields. */
export function coerceAdminPayload(r: AdminResource, body: Record<string, unknown>, creating: boolean): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of r.fields) {
    if (f.readOnly) continue;
    if (!(f.key in body)) { if (creating && f.required) throw badRequest(`${f.label} is required`); continue; }
    let v = body[f.key];
    if (v === "" || v === null) { if (f.required) throw badRequest(`${f.label} is required`); out[f.key] = undefined; continue; }
    switch (f.type) {
      case "number": case "money": v = Number(v); if (!Number.isFinite(v)) throw badRequest(`${f.label} must be a number`); break;
      case "boolean": v = v === true || v === "true" || v === "on"; break;
      case "date": case "datetime": v = new Date(String(v)); if (Number.isNaN((v as Date).getTime())) throw badRequest(`${f.label} is not a valid date`); break;
      case "select": if (f.options && !f.options.includes(String(v))) throw badRequest(`${f.label} has an invalid value`); break;
      case "tags": v = Array.isArray(v) ? v.map(String) : String(v).split(",").map((s) => s.trim()).filter(Boolean); break;
      case "localized": case "json": if (typeof v === "string") { try { v = JSON.parse(v); } catch { throw badRequest(`${f.label} must be valid JSON`); } } break;
      case "email": v = String(v).trim().toLowerCase(); break;
      default: v = String(v).slice(0, 20000);
    }
    if (f.key === "code" && r.collection === "coupons") v = String(v).toUpperCase().replace(/\s/g, "");
    out[f.key] = v;
  }
  return out;
}
