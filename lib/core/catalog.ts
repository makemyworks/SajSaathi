import type { Ctx } from "./context";
import type { Category, Provider, Review, Service, Staff } from "./types";
import { notFound, PIN_RE } from "./util";

/** Only approved providers in active categories are ever public. */
const PUBLIC_PROVIDER = { status: "approved" };

export async function listCategories(ctx: Ctx) {
  const cats = await ctx.repo.col<Category>("categories").find({ status: "active", visible: true }, { sort: { sortOrder: 1 } });
  return cats.map(publicCategory);
}
export function publicCategory(c: Category) {
  return { id: c._id, slug: c.slug, name: c.name, description: c.description, icon: c.icon, image: c.image, vertical: c.vertical, atHomeAllowed: c.atHomeAllowed, inStoreAllowed: c.inStoreAllowed, bookingFields: c.bookingFields.filter((f) => !f.private), safetyNotice: c.safetyNotice, cancellationPolicy: c.cancellationPolicy, bookingRules: { requiresConsent: c.bookingRules.requiresConsent, consentText: c.bookingRules.consentText, maxAdvanceDays: c.bookingRules.maxAdvanceDays }, seo: c.seo };
}
export async function getCategory(ctx: Ctx, slug: string) {
  const c = await ctx.repo.col<Category>("categories").findOne({ slug, status: "active", visible: true });
  if (!c) throw notFound("Category");
  return c;
}

export interface SearchQuery {
  q?: string; category?: string; city?: string; locality?: string; pin?: string;
  mode?: "in_store" | "at_home"; minRating?: number; maxPricePaise?: number;
  sort?: "relevance" | "rating" | "price_low" | "price_high"; page?: number;
}

function escapeRe(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

export async function searchProviders(ctx: Ctx, q: SearchQuery) {
  const filter: Record<string, unknown> = { ...PUBLIC_PROVIDER };
  let category: Category | null = null;
  if (q.category) {
    category = await ctx.repo.col<Category>("categories").findOne({ slug: q.category, status: "active" });
    if (!category) return { providers: [], total: 0, category: null };
    filter.categoryIds = category._id;
  } else {
    const active = await ctx.repo.col<Category>("categories").find({ status: "active" });
    filter.categoryIds = { $in: active.map((c) => c._id) };
  }
  if (q.city) filter["address.city"] = { $regex: `^${escapeRe(q.city.trim())}$`, $options: "i" };
  if (q.locality) filter["address.locality"] = { $regex: escapeRe(q.locality.trim()), $options: "i" };
  if (q.pin && PIN_RE.test(q.pin)) filter.$or = [{ "address.pin": q.pin }, { "serviceArea.pins": q.pin }];
  if (q.mode === "at_home") filter.atHome = true;
  if (q.mode === "in_store") filter.inStore = true;
  if (q.minRating) filter.ratingAvg = { $gte: q.minRating };

  let providers = await ctx.repo.col<Provider>("providers").find(filter, { limit: 300 });
  const ids = providers.map((p) => p._id);
  const services = ids.length ? await ctx.repo.col<Service>("services").find({ providerId: { $in: ids }, active: true, ...(category ? { categoryId: category._id } : {}) }) : [];
  const byProvider = new Map<string, Service[]>();
  for (const s of services) byProvider.set(s.providerId, [...(byProvider.get(s.providerId) ?? []), s]);

  const text = q.q?.trim().toLowerCase();
  providers = providers.filter((p) => {
    const ss = byProvider.get(p._id) ?? [];
    if (!ss.length) return false; // nothing bookable
    if (q.maxPricePaise && !ss.some((s) => s.pricePaise <= q.maxPricePaise!)) return false;
    if (q.mode && !ss.some((s) => s.mode === "both" || s.mode === q.mode)) return false;
    if (text && !(p.businessName.toLowerCase().includes(text) || ss.some((s) => s.name.toLowerCase().includes(text)) || (p.address.locality ?? "").toLowerCase().includes(text))) return false;
    return true;
  });
  const minPrice = (p: Provider) => Math.min(...(byProvider.get(p._id) ?? []).map((s) => s.pricePaise));
  const now = ctx.now();
  const sponsored = (p: Provider) => (p.featured && p.featured.until > now ? 1 : 0);
  providers.sort((a, b) => {
    if (q.sort === "rating") return b.ratingAvg - a.ratingAvg || b.ratingCount - a.ratingCount;
    if (q.sort === "price_low") return minPrice(a) - minPrice(b);
    if (q.sort === "price_high") return minPrice(b) - minPrice(a);
    return sponsored(b) - sponsored(a) || b.ratingCount * b.ratingAvg - a.ratingCount * a.ratingAvg;
  });
  const page = Math.max(1, q.page ?? 1), per = 20;
  return {
    total: providers.length,
    category: category ? publicCategory(category) : null,
    providers: providers.slice((page - 1) * per, page * per).map((p) => ({
      ...publicProviderCard(p),
      sponsored: sponsored(p) === 1,
      fromPricePaise: minPrice(p),
      topServices: (byProvider.get(p._id) ?? []).slice(0, 3).map((s) => ({ id: s._id, name: s.name, pricePaise: s.pricePaise, durationMin: s.durationMin })),
    })),
  };
}

export function publicProviderCard(p: Provider) {
  return {
    id: p._id, slug: p.slug, name: p.businessName, kind: p.kind, verified: p.verified,
    locality: p.address.locality, city: p.address.city, pin: p.address.pin,
    atHome: p.atHome, inStore: p.inStore, ratingAvg: p.ratingAvg, ratingCount: p.ratingCount,
    photo: p.gallery[0]?.url, categoryIds: p.categoryIds,
  };
}

/** Full public profile. Never includes documents, credentials values, owner contact or private answers. */
export async function getProviderPublic(ctx: Ctx, slug: string) {
  const p = await ctx.repo.col<Provider>("providers").findOne({ slug, ...PUBLIC_PROVIDER });
  if (!p) throw notFound("Provider");
  const [services, staff, reviews, cats] = await Promise.all([
    ctx.repo.col<Service>("services").find({ providerId: p._id, active: true }, { sort: { pricePaise: 1 } }),
    ctx.repo.col<Staff>("staff").find({ providerId: p._id, active: true }),
    ctx.repo.col<Review>("reviews").find({ providerId: p._id, status: "published" }, { sort: { createdAt: -1 }, limit: 20 }),
    ctx.repo.col<Category>("categories").find({ _id: { $in: p.categoryIds }, status: "active" }),
  ]);
  const publicFieldKeys = new Set(cats.flatMap((c) => c.onboardingFields.filter((f) => !f.private).map((f) => f.key)));
  const credentialLabels = cats.flatMap((c) => c.requiredCredentials).filter((c) => p.credentials.some((x) => x.key === c.key && x.value)).map((c) => c.label);
  return {
    ...publicProviderCard(p),
    about: p.about,
    address: p.inStore ? { line1: p.address.line1, locality: p.address.locality, city: p.address.city, state: p.address.state, pin: p.address.pin } : { locality: p.address.locality, city: p.address.city },
    serviceAreaPins: p.atHome ? p.serviceArea?.pins ?? [] : [],
    hours: p.hours, holidays: p.holidays.filter((d) => d >= ctx.now().toISOString().slice(0, 10)).slice(0, 30), timezone: p.timezone,
    gallery: p.gallery,
    publicAnswers: Object.fromEntries(Object.entries(p.onboardingAnswers).filter(([k]) => publicFieldKeys.has(k))),
    credentialsOnFile: credentialLabels, // labels only — "Certificate on file", never the document
    verifiedAt: p.verifiedAt,
    categories: cats.map(publicCategory),
    services: services.map((s) => ({ id: s._id, categoryId: s.categoryId, name: s.name, description: s.description, durationMin: s.durationMin, pricePaise: s.pricePaise, mode: s.mode, addOns: s.addOns, isPackage: s.isPackage, packageItems: s.packageItems, eligibility: s.eligibility, staffIds: s.staffIds })),
    staff: staff.map((s) => ({ id: s._id, name: s.name, role: s.role, serviceIds: s.serviceIds })),
    reviews: reviews.map((r) => ({ id: r._id, rating: r.rating, text: r.text, name: r.customerName.split(" ")[0], at: r.createdAt, reply: r.reply })),
    travelFeePaise: p.atHome ? p.travelFeePaise ?? 0 : undefined,
  };
}

export async function citiesWithProviders(ctx: Ctx) {
  const ps = await ctx.repo.col<Provider>("providers").find(PUBLIC_PROVIDER);
  const m = new Map<string, { city: string; state: string; count: number; localities: Set<string> }>();
  for (const p of ps) {
    if (!p.address.city) continue;
    const k = p.address.city.toLowerCase();
    const e = m.get(k) ?? { city: p.address.city, state: p.address.state, count: 0, localities: new Set<string>() };
    e.count++; if (p.address.locality) e.localities.add(p.address.locality);
    m.set(k, e);
  }
  return [...m.values()].sort((a, b) => b.count - a.count).map((e) => ({ city: e.city, state: e.state, count: e.count, localities: [...e.localities].sort() }));
}
