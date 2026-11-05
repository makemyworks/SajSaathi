import { Scissors, Sparkles, Leaf, PawPrint, HeartHandshake, Flower2, type LucideProps } from "lucide-react";
const MAP = { Scissors, Sparkles, Leaf, PawPrint, HeartHandshake, Flower2 } as const;
/** Icon chosen per category in Admin → Categories (lucide icon name). Unknown names fall back to a neutral flower. */
export function CategoryIcon({ name, ...p }: { name?: string } & LucideProps) {
  const I = (name && (MAP as Record<string, typeof Flower2>)[name]) || Flower2;
  return <I aria-hidden {...p} />;
}
