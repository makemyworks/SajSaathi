import { BRAND } from "./brand";

/** Brand logo. Uses the generated SVG files in /public/brand so every app shows the identical mark. */
export function Logo({ variant = "full", onDark = false, height = 32, className = "" }: { variant?: "full" | "symbol"; onDark?: boolean; height?: number; className?: string }) {
  const src = variant === "symbol" ? BRAND.logo.symbol : onDark ? BRAND.logo.onDark : BRAND.logo.full;
  // full lockup aspect ≈ 3.55 : 1, symbol ≈ 1 : 1
  const width = Math.round(variant === "symbol" ? height : height * 3.55);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={BRAND.name} width={width} height={height} className={className} style={{ height, width: "auto" }} />
  );
}
