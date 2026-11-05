import type { AdminPermission } from "@/lib/core/permissions";

/** The 54 founder sections, grouped. Each is either a dedicated screen or a registry-driven list ("/admin/r/<key>"). */
export const NAV: { group: string; items: { label: string; href: string; perm: AdminPermission }[] }[] = [
  { group: "Overview", items: [
    { label: "Dashboard", href: "/admin", perm: "dashboard.view" },
    { label: "Analytics", href: "/admin/analytics", perm: "reports.view" },
    { label: "Reports", href: "/admin/reports", perm: "reports.view" },
  ] },
  { group: "People", items: [
    { label: "Customers", href: "/admin/r/customers", perm: "customers.view" },
    { label: "Partners", href: "/admin/r/partners", perm: "partners.view" },
    { label: "Independent professionals", href: "/admin/r/professionals", perm: "partners.view" },
  ] },
  { group: "Onboarding", items: [
    { label: "Partner applications", href: "/admin/applications", perm: "applications.review" },
    { label: "Verification", href: "/admin/applications?status=under_review", perm: "applications.review" },
    { label: "Documents", href: "/admin/r/documents", perm: "documents.view" },
    { label: "Approvals", href: "/admin/r/approvals", perm: "partners.view" },
    { label: "Rejections", href: "/admin/r/rejections", perm: "partners.view" },
    { label: "Suspensions", href: "/admin/r/suspensions", perm: "partners.view" },
  ] },
  { group: "Catalog", items: [
    { label: "Categories", href: "/admin/categories", perm: "catalog.manage" },
    { label: "Services", href: "/admin/r/services", perm: "catalog.manage" },
    { label: "Pricing rules", href: "/admin/settings#pricing", perm: "settings.manage" },
    { label: "Pricing exceptions", href: "/admin/r/pricing-exceptions", perm: "commissions.manage" },
  ] },
  { group: "Locations", items: [
    { label: "Countries", href: "/admin/r/countries", perm: "locations.manage" },
    { label: "States & UTs", href: "/admin/r/states", perm: "locations.manage" },
    { label: "Cities", href: "/admin/r/cities", perm: "locations.manage" },
    { label: "PIN codes", href: "/admin/r/pincodes", perm: "locations.manage" },
    { label: "Territories", href: "/admin/r/territories", perm: "locations.manage" },
  ] },
  { group: "Operations", items: [
    { label: "Bookings", href: "/admin/r/bookings", perm: "bookings.view" },
    { label: "Cancellations", href: "/admin/r/cancellations", perm: "bookings.view" },
    { label: "Reviews", href: "/admin/r/reviews", perm: "reviews.moderate" },
    { label: "Complaints & safety", href: "/admin/r/complaints", perm: "support.manage" },
    { label: "Support tickets", href: "/admin/r/tickets", perm: "support.manage" },
  ] },
  { group: "Finance", items: [
    { label: "Payments", href: "/admin/r/payments", perm: "payments.view" },
    { label: "Refund requests", href: "/admin/refunds", perm: "refunds.manage" },
    { label: "Commissions", href: "/admin/commissions", perm: "commissions.manage" },
    { label: "Payouts", href: "/admin/r/payouts", perm: "payouts.manage" },
    { label: "Subscriptions", href: "/admin/r/plans", perm: "plans.manage" },
    { label: "Memberships", href: "/admin/r/memberships", perm: "plans.manage" },
  ] },
  { group: "Marketing", items: [
    { label: "Coupons", href: "/admin/r/coupons", perm: "coupons.manage" },
    { label: "Referrals", href: "/admin/r/referrals", perm: "marketing.manage" },
    { label: "Promotions", href: "/admin/r/promotions", perm: "marketing.manage" },
    { label: "Featured providers", href: "/admin/r/featured", perm: "marketing.manage" },
    { label: "Campaigns", href: "/admin/r/campaigns", perm: "marketing.manage" },
  ] },
  { group: "Communication", items: [
    { label: "Email templates", href: "/admin/r/email-templates", perm: "templates.manage" },
    { label: "WhatsApp templates", href: "/admin/r/whatsapp-templates", perm: "templates.manage" },
    { label: "Notifications", href: "/admin/r/notifications", perm: "templates.manage" },
  ] },
  { group: "Content", items: [
    { label: "Content pages", href: "/admin/r/pages", perm: "content.manage" },
    { label: "FAQs", href: "/admin/r/faqs", perm: "content.manage" },
    { label: "SEO", href: "/admin/r/seo", perm: "seo.manage" },
    { label: "Languages", href: "/admin/r/languages", perm: "languages.manage" },
  ] },
  { group: "Future modules", items: [
    { label: "Recruitment", href: "/admin/r/jobs", perm: "careers.manage" },
    { label: "Academy / training", href: "/admin/r/courses", perm: "academy.manage" },
    { label: "Marketplace (not live)", href: "/admin/r/products", perm: "marketing.manage" },
  ] },
  { group: "System", items: [
    { label: "Admin users", href: "/admin/admins", perm: "admins.manage" },
    { label: "Role permissions", href: "/admin/roles", perm: "admins.manage" },
    { label: "Audit log", href: "/admin/r/audit", perm: "audit.view" },
    { label: "Integrations", href: "/admin/integrations", perm: "integrations.manage" },
    { label: "Feature flags", href: "/admin/r/flags", perm: "flags.manage" },
    { label: "System settings", href: "/admin/settings", perm: "settings.manage" },
    { label: "Brand settings", href: "/admin/brand", perm: "brand.manage" },
    { label: "Maintenance", href: "/admin/maintenance", perm: "settings.manage" },
    { label: "My security (MFA)", href: "/admin/security", perm: "dashboard.view" },
  ] },
];
