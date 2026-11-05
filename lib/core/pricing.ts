import type { Category, Coupon, PriceBreakdown, Provider, Service } from "./types";

export interface PlatformPricing {
  bookingFeePaise: number; // customer-facing convenience fee (0 to disable)
  bookingFeeTaxPercent: number; // GST on the platform fee, e.g. 18
  defaultCommissionPercent: number; // charged to partner on service value
}

export interface CouponResult { ok: boolean; discountPaise: number; reason?: string }

export function evaluateCoupon(c: Coupon | null, ctx: { subtotalPaise: number; categoryId: string; providerId: string; now: Date; userRedemptions: number }): CouponResult {
  if (!c || !c.active) return { ok: false, discountPaise: 0, reason: "This coupon is not valid" };
  if (ctx.now < c.validFrom || ctx.now > c.validTo) return { ok: false, discountPaise: 0, reason: "This coupon has expired or is not active yet" };
  if (c.usageLimit !== undefined && c.usedCount >= c.usageLimit) return { ok: false, discountPaise: 0, reason: "This coupon has been fully used" };
  if (c.perUserLimit !== undefined && ctx.userRedemptions >= c.perUserLimit) return { ok: false, discountPaise: 0, reason: "You have already used this coupon" };
  if (c.minOrderPaise && ctx.subtotalPaise < c.minOrderPaise) return { ok: false, discountPaise: 0, reason: "Order value is below the coupon minimum" };
  if (c.categoryIds?.length && !c.categoryIds.includes(ctx.categoryId)) return { ok: false, discountPaise: 0, reason: "Coupon not valid for this category" };
  if (c.providerIds?.length && !c.providerIds.includes(ctx.providerId)) return { ok: false, discountPaise: 0, reason: "Coupon not valid for this provider" };
  let d = c.type === "percent" ? Math.floor((ctx.subtotalPaise * Math.min(100, Math.max(0, c.value))) / 100) : c.value;
  if (c.maxDiscountPaise !== undefined) d = Math.min(d, c.maxDiscountPaise);
  d = Math.max(0, Math.min(d, ctx.subtotalPaise));
  return { ok: true, discountPaise: d };
}

/** Single source of truth for what the customer pays. Called on the server for quotes and bookings. */
export function quote(input: {
  service: Service;
  addOnIds: string[];
  mode: "in_store" | "at_home";
  provider: Provider;
  category: Category;
  platform: PlatformPricing;
  discountPaise?: number;
}): PriceBreakdown & { durationMin: number } {
  const addOns = input.service.addOns.filter((a) => input.addOnIds.includes(a.id));
  const basePaise = input.service.pricePaise;
  const addOnsPaise = addOns.reduce((s, a) => s + a.pricePaise, 0);
  const travelPaise = input.mode === "at_home" ? input.provider.travelFeePaise ?? input.category.pricing?.travelFeePaise ?? 0 : 0;
  const bookingFeePaise = input.category.pricing?.bookingFeePaise ?? input.platform.bookingFeePaise;
  const taxPaise = Math.round((bookingFeePaise * input.platform.bookingFeeTaxPercent) / 100);
  const discountPaise = Math.min(input.discountPaise ?? 0, basePaise + addOnsPaise);
  const commissionPercent = input.provider.commissionPercent ?? input.category.pricing?.commissionPercent ?? input.platform.defaultCommissionPercent;
  const commissionPaise = Math.round(((basePaise + addOnsPaise) * commissionPercent) / 100);
  return {
    basePaise, addOnsPaise, travelPaise, bookingFeePaise, discountPaise, taxPaise,
    totalPaise: basePaise + addOnsPaise + travelPaise + bookingFeePaise + taxPaise - discountPaise,
    commissionPaise,
    currency: "INR",
    durationMin: input.service.durationMin + addOns.reduce((s, a) => s + a.durationMin, 0),
  };
}

/** Fee retained when a booking is cancelled late, per the category policy. */
export function cancellationFee(policy: Category["cancellationPolicy"], serviceValuePaise: number, start: Date, now: Date, byProvider: boolean): number {
  if (byProvider) return 0;
  const hoursBefore = (start.getTime() - now.getTime()) / 3_600_000;
  if (hoursBefore >= policy.freeUntilHours) return 0;
  return Math.round((serviceValuePaise * policy.lateFeePercent) / 100);
}
