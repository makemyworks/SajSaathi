import type { Actor, AdminRole, Booking, BookingStatus, Role } from "./types";
import { forbidden } from "./util";

/**
 * Admin permissions. super_admin has everything; other admin roles get scoped sets.
 * Role → permission sets can be overridden in the `admin_roles` collection (Role Permissions page);
 * these are the safe defaults used when no override exists.
 */
export const ADMIN_PERMISSIONS = [
  "dashboard.view", "customers.view", "customers.manage", "partners.view", "partners.manage",
  "applications.review", "documents.view", "catalog.manage", "locations.manage",
  "bookings.view", "bookings.manage", "payments.view", "refunds.manage", "payouts.manage", "commissions.manage",
  "plans.manage", "coupons.manage", "marketing.manage", "reviews.moderate", "support.manage",
  "templates.manage", "content.manage", "seo.manage", "languages.manage", "careers.manage", "academy.manage",
  "reports.view", "admins.manage", "audit.view", "integrations.manage", "flags.manage", "settings.manage", "brand.manage",
] as const;
export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export const DEFAULT_ADMIN_ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[] | "*"> = {
  super_admin: "*",
  operations: ["dashboard.view", "customers.view", "partners.view", "partners.manage", "applications.review", "documents.view", "catalog.manage", "locations.manage", "bookings.view", "bookings.manage", "reviews.moderate", "support.manage", "reports.view"],
  finance: ["dashboard.view", "bookings.view", "payments.view", "refunds.manage", "payouts.manage", "commissions.manage", "plans.manage", "coupons.manage", "reports.view"],
  support: ["dashboard.view", "customers.view", "partners.view", "bookings.view", "support.manage", "reviews.moderate"],
  content: ["dashboard.view", "content.manage", "seo.manage", "languages.manage", "templates.manage", "marketing.manage", "careers.manage", "academy.manage"],
  verification: ["dashboard.view", "partners.view", "applications.review", "documents.view"],
};

export function adminCan(actor: Actor, perm: AdminPermission, overrides?: Partial<Record<AdminRole, AdminPermission[] | "*">>): boolean {
  if (actor.role !== "admin" || !actor.adminRole) return false;
  const set = overrides?.[actor.adminRole] ?? DEFAULT_ADMIN_ROLE_PERMISSIONS[actor.adminRole];
  return set === "*" || set.includes(perm);
}
export function requireAdmin(actor: Actor | null, perm: AdminPermission, overrides?: Partial<Record<AdminRole, AdminPermission[] | "*">>): Actor {
  if (!actor || !adminCan(actor, perm, overrides)) throw forbidden();
  return actor;
}
export function requireRole(actor: Actor | null, ...roles: Role[]): Actor {
  if (!actor) throw forbidden("Please log in");
  if (!roles.includes(actor.role)) throw forbidden();
  return actor;
}

/** Who may read a booking (incl. private fields such as the at-home address). */
export function canViewBooking(actor: Actor, b: Booking): boolean {
  if (actor.role === "admin") return adminCan(actor, "bookings.view");
  if (actor.role === "customer") return b.customerId === actor.userId;
  if (actor.role === "partner_owner" || actor.role === "partner_staff") return !!actor.providerId && b.providerId === actor.providerId;
  return false;
}

// ---------------- Booking state machine ----------------
type Who = "customer" | "partner" | "admin" | "system";
interface Transition { to: BookingStatus; by: Who[] }
export const BOOKING_TRANSITIONS: Record<BookingStatus, Transition[]> = {
  pending: [
    { to: "confirmed", by: ["partner", "admin", "system"] },
    { to: "cancelled", by: ["customer", "partner", "admin", "system"] },
  ],
  confirmed: [
    { to: "rescheduled", by: ["customer", "partner", "admin"] },
    { to: "in_progress", by: ["partner", "admin"] },
    { to: "cancelled", by: ["customer", "partner", "admin"] },
    { to: "no_show", by: ["partner", "admin"] },
  ],
  rescheduled: [
    { to: "confirmed", by: ["partner", "admin", "system"] },
    { to: "rescheduled", by: ["customer", "partner", "admin"] },
    { to: "in_progress", by: ["partner", "admin"] },
    { to: "cancelled", by: ["customer", "partner", "admin"] },
    { to: "no_show", by: ["partner", "admin"] },
  ],
  in_progress: [{ to: "completed", by: ["partner", "admin"] }],
  completed: [{ to: "refund_pending", by: ["admin"] }],
  cancelled: [{ to: "refund_pending", by: ["admin", "system"] }],
  no_show: [{ to: "refund_pending", by: ["admin"] }],
  refund_pending: [{ to: "refunded", by: ["admin", "system"] }],
  refunded: [],
};
export function actorKind(actor: Actor | "system"): Who {
  if (actor === "system") return "system";
  if (actor.role === "customer") return "customer";
  if (actor.role === "admin") return "admin";
  return "partner";
}
export function canTransition(from: BookingStatus, to: BookingStatus, who: Who): boolean {
  return BOOKING_TRANSITIONS[from].some((t) => t.to === to && t.by.includes(who));
}
/** Statuses that hold a time slot (and therefore block other bookings). */
export const SLOT_HOLDING: BookingStatus[] = ["pending", "confirmed", "rescheduled", "in_progress"];
