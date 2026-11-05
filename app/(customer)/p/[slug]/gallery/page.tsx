import type { Metadata } from "next";
import { loadProvider } from "@/lib/provider-page";
import { dict } from "@/lib/session";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Empty } from "@/lib/shared/ui";

type P = Promise<{ slug: string }>;
export async function generateMetadata({ params }: { params: P }): Promise<Metadata> { const p = await loadProvider((await params).slug); return { title: `Photos — ${p.name}` }; }
export default async function GalleryPage({ params }: { params: P }) {
  const [p, t] = await Promise.all([loadProvider((await params).slug), dict()]);
  return (
    <div className="wrap py-8 grid gap-6">
      <Breadcrumbs items={[{ href: "/", label: "Saj Saathi" }, { href: `/p/${p.slug}`, label: p.name }, { href: `/p/${p.slug}/gallery`, label: t.provider.gallery }]} />
      <h1>{t.provider.gallery} — {p.name}</h1>
      {p.gallery.length === 0 ? <Empty title={t.provider.gallery} /> : (
        <ul className="grid grid-cols-2 md:grid-cols-3 gap-3">{p.gallery.map((g, i) => <li key={g.url}><figure className="grid gap-1"><img src={g.url} alt={g.caption ?? `${p.name} photo ${i + 1}`} loading="lazy" className="w-full aspect-square object-cover rounded-xl" />{g.caption && <figcaption className="muted text-sm">{g.caption}</figcaption>}</figure></li>)}</ul>
      )}
    </div>
  );
}
