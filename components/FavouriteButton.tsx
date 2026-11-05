"use client";
import { useState } from "react";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";

export function FavouriteButton({ providerId, initial, loggedIn, label }: { providerId: string; initial: boolean; loggedIn: boolean; label: string }) {
  const [on, setOn] = useState(initial);
  const router = useRouter();
  return (
    <button type="button" aria-pressed={on} aria-label={label} className="btn btn-sm btn-outline" onClick={async () => {
      if (!loggedIn) { router.push(`/login?next=${encodeURIComponent(location.pathname)}`); return; }
      const next = !on; setOn(next);
      const r = await fetch("/api/v1/me/favourites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ providerId, on: next }) });
      if (!r.ok) setOn(!next);
    }}>
      <Heart aria-hidden size={18} className={on ? "fill-[var(--color-bad)] text-[var(--color-bad)]" : ""} />
    </button>
  );
}
