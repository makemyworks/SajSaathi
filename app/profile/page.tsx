"use client";
import Link from "next/link";
import Image from "next/image";
import { ExternalLink, Trash2 } from "lucide-react";
import { api, proxyUrl } from "@/lib/client";
import { BRAND } from "@/lib/shared/brand";
import { LoadFailure, Notice, Spinner } from "@/lib/shared/ui";
import { usePartner } from "@/components/Partner";
import { Upload } from "@/components/Upload";

/** Public-facing profile: photos here, text/address/home-visit area on the application screen. */
export default function ProfilePage() {
  const { t, app, appError, appLoading, reloadApp, approved } = usePartner();
  const p = app?.application;
  if (!p) {
    if (appError) return <LoadFailure message={appError} onRetry={reloadApp} title="Your business profile could not be loaded." />;
    if (appLoading) return <Spinner label={t.common.loading} />;
    return <div className="grid gap-3"><Notice tone="info">Create your Partner application to set up your public business profile.</Notice><Link className="btn btn-primary justify-self-start" href="/application">Open application</Link></div>;
  }
  return (
    <div className="grid gap-5">
      <h1 className="text-2xl">{t.profile.title}</h1>
      {approved && <a className="btn btn-outline justify-self-start" href={`${BRAND.urls.customer}/p/${p.slug}`} target="_blank" rel="noreferrer"><ExternalLink aria-hidden size={16} />{t.profile.publicLink}</a>}
      <section className="panel p-4 grid gap-2"><p>{p.about || "—"}</p><p className="muted">{[p.address.line1, p.address.locality, p.address.city, p.address.pin].filter(Boolean).join(", ")}</p><Link className="underline" href="/application">{t.apply.details} / {t.nav.area}</Link></section>
      <section className="panel p-4 grid gap-3">
        <h2 className="text-lg">{t.profile.photos} ({p.gallery.length}/24)</h2>
        <Upload endpoint="partner/gallery" accept="image/jpeg,image/png,image/webp" label={t.profile.addPhoto} onDone={reloadApp} />
        <ul className="grid grid-cols-3 sm:grid-cols-4 gap-2">{p.gallery.map((g) => (
          <li key={g.url} className="relative"><Image unoptimized width={480} height={480} src={proxyUrl(g.url)} alt={g.caption ?? ""} className="aspect-square object-cover rounded-lg w-full" /><button aria-label={t.profile.removePhoto} className="absolute top-1 right-1 btn btn-sm btn-danger !min-h-8 !px-2" onClick={async () => { await api("partner/gallery", "DELETE", { url: g.url }); reloadApp(); }}><Trash2 aria-hidden size={14} /></button></li>
        ))}</ul>
      </section>
    </div>
  );
}
