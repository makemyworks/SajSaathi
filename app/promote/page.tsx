"use client";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Download, Printer } from "lucide-react";
import NextImage from "next/image";
import type { Service } from "@/lib/core/types";
import { useData } from "@/lib/client";
import { BRAND } from "@/lib/shared/brand";
import { inr } from "@/lib/shared/format";
import { LoadFailure, Notice, Spinner } from "@/lib/shared/ui";
import { usePartner } from "@/components/Partner";

type Format = "a4" | "square" | "story" | "whatsapp" | "menu" | "qr";
const SIZES: Record<Format, [number, number]> = { a4: [2480, 3508], square: [1080, 1080], story: [1080, 1920], whatsapp: [1080, 1350], menu: [1240, 1754], qr: [1200, 1200] };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const toB64 = (s: string) => btoa(unescape(encodeURIComponent(s)));

/**
 * Posters are built as SVG from the partner's genuine, approved details and the official logo,
 * then exported to PNG in the browser (no server rendering, works on low-end phones).
 */
export default function PromotePage() {
  const { t, app, approved, locale } = usePartner();
  const p = app?.application;
  const { data: serviceData, error: serviceError, reload: reloadServices } = useData<{ services: Service[] }>(p ? "partner/services" : null);
  const services = useMemo(() => serviceData?.services.filter((s) => s.active) ?? [], [serviceData?.services]);
  const [format, setFormat] = useState<Format>("a4");
  const [branch, setBranch] = useState("");
  const [qrSvg, setQrSvg] = useState("");
  const [logo, setLogo] = useState("");
  const url = p ? `${BRAND.urls.customer}/book/${p.slug}?src=qr${branch ? `&branch=${branch}` : ""}` : "";
  useEffect(() => { if (url) QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#102B28", light: "#FFFFFF" } }).then(setQrSvg); }, [url]);
  useEffect(() => { fetch(BRAND.logo.onDark).then((r) => r.text()).then(setLogo); }, []);

  const svg = useMemo(() => {
    if (!p || !qrSvg || !logo) return "";
    const [W, H] = SIZES[format];
    const u = W / 1080; // scale unit
    const qrData = `data:image/svg+xml;base64,${toB64(qrSvg)}`;
    const logoData = `data:image/svg+xml;base64,${toB64(logo)}`;
    const name = esc(p.businessName);
    const place = esc([p.address.locality, p.address.city].filter(Boolean).join(", "));
    const branchName = branch ? esc(p.branches.find((b) => b.id === branch)?.name ?? "") : "";
    const scan = esc(t.promote.scan);
    const serif = "Georgia, 'Noto Serif Devanagari', serif", sans = "Arial, 'Noto Sans Devanagari', sans-serif";
    if (format === "qr") {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="#fff"/><image href="${qrData}" x="${W * 0.1}" y="${H * 0.08}" width="${W * 0.8}" height="${W * 0.8}"/><text x="${W / 2}" y="${H * 0.96}" font-family="${sans}" font-size="${40 * u}" text-anchor="middle" fill="#102B28">${name}</text></svg>`;
    }
    const lines = format === "menu" ? services.slice(0, 14) : services.slice(0, format === "a4" ? 6 : format === "story" ? 5 : 3);
    const qrSize = (format === "story" ? 520 : format === "a4" ? 1150 : format === "menu" ? 330 : 420) * (format === "a4" ? 1 : u);
    let y = 0; const parts: string[] = [];
    parts.push(`<rect width="${W}" height="${H}" fill="#183F3A"/>`);
    parts.push(`<rect x="${40 * u}" y="${40 * u}" width="${W - 80 * u}" height="${H - 80 * u}" rx="${28 * u}" fill="none" stroke="#D9B77C" stroke-width="${3 * u}"/>`);
    parts.push(`<image href="${logoData}" x="${(W - 640 * u) / 2}" y="${90 * u}" width="${640 * u}" height="${180 * u}"/>`);
    y = 380 * u;
    parts.push(`<text x="${W / 2}" y="${y}" font-family="${serif}" font-size="${(name.length > 22 ? 64 : 82) * u}" font-weight="600" text-anchor="middle" fill="#F7F5EF">${name}</text>`);
    y += 70 * u;
    if (place) parts.push(`<text x="${W / 2}" y="${y}" font-family="${sans}" font-size="${38 * u}" text-anchor="middle" fill="#D9B77C">${place}${branchName ? ` · ${branchName}` : ""}</text>`);
    y += 80 * u;
    const lineH = (format === "menu" ? 64 : 60) * u;
    for (const s of lines) {
      parts.push(`<text x="${110 * u}" y="${y}" font-family="${sans}" font-size="${36 * u}" fill="#F7F5EF">${esc(s.name.slice(0, 34))}</text>`);
      parts.push(`<text x="${W - 110 * u}" y="${y}" font-family="${sans}" font-size="${36 * u}" font-weight="700" text-anchor="end" fill="#F7F5EF">${esc(inr(s.pricePaise, locale))}</text>`);
      parts.push(`<line x1="${110 * u}" x2="${W - 110 * u}" y1="${y + 18 * u}" y2="${y + 18 * u}" stroke="#ffffff" stroke-opacity="0.15" stroke-width="${2 * u}"/>`);
      y += lineH;
    }
    const qy = Math.max(y + 40 * u, H - qrSize - 260 * u);
    parts.push(`<rect x="${(W - qrSize) / 2 - 30 * u}" y="${qy - 30 * u}" width="${qrSize + 60 * u}" height="${qrSize + 60 * u}" rx="${24 * u}" fill="#fff"/>`);
    parts.push(`<image href="${qrData}" x="${(W - qrSize) / 2}" y="${qy}" width="${qrSize}" height="${qrSize}"/>`);
    parts.push(`<text x="${W / 2}" y="${qy + qrSize + 110 * u}" font-family="${serif}" font-size="${50 * u}" text-anchor="middle" fill="#F7F5EF">${scan}</text>`);
    parts.push(`<text x="${W / 2}" y="${H - 80 * u}" font-family="${sans}" font-size="${28 * u}" text-anchor="middle" fill="#D9B77C">${esc(BRAND.urls.customer.replace(/^https?:\/\//, ""))}</text>`);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join("")}</svg>`;
  }, [p, qrSvg, logo, format, services, branch, t, locale]);

  if (!p) return <Spinner label={t.common.loading} />;
  if (!approved) return <div className="grid gap-4"><h1 className="text-2xl">{t.promote.title}</h1><Notice tone="warn">{t.promote.notApproved}</Notice></div>;

  const download = async () => {
    const [W, H] = SIZES[format];
    const img = new Image();
    img.src = `data:image/svg+xml;base64,${toB64(svg)}`;
    await img.decode();
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    c.getContext("2d")!.drawImage(img, 0, 0, W, H);
    const a = document.createElement("a"); a.download = `saj-saathi-${p.slug}-${format}.png`; a.href = c.toDataURL("image/png"); a.click();
  };
  const print = () => {
    const w = window.open("", "_blank"); if (!w) return;
    w.document.write(`<!doctype html><title>${esc(p.businessName)}</title><style>@page{size:A4;margin:0}body{margin:0}svg{width:210mm;height:297mm;display:block}</style>${svg}<script>onload=()=>print()<\/script>`);
    w.document.close();
  };
  const labels: Record<Format, string> = { a4: t.promote.a4, square: t.promote.square, story: t.promote.story, whatsapp: t.promote.whatsapp, menu: t.promote.menu, qr: t.promote.qrOnly };
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl">{t.promote.title}</h1>
      <p className="muted">{t.promote.hint}</p>
      {serviceError && <LoadFailure message={serviceError} onRetry={reloadServices} />}
      <nav className="flex flex-wrap gap-2">{(Object.keys(SIZES) as Format[]).map((f) => <button key={f} className="chip" aria-pressed={f === format} onClick={() => setFormat(f)}>{labels[f]}</button>)}</nav>
      {p.branches.length > 0 && <label className="field max-w-xs"><span>{t.promote.branch}</span><select className="input" value={branch} onChange={(e) => setBranch(e.target.value)}><option value="">{p.businessName}</option>{p.branches.filter((b) => b.active).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>}
      {svg ? <div className="panel p-3 grid place-items-center bg-[var(--color-sand)]"><NextImage unoptimized alt={labels[format]} src={`data:image/svg+xml;base64,${toB64(svg)}`} width={SIZES[format][0]} height={SIZES[format][1]} className="max-h-[60vh] w-auto shadow" /></div> : <Spinner label={t.common.loading} />}
      <p className="text-sm muted break-all">{url}</p>
      <div className="flex gap-2 flex-wrap"><button className="btn btn-primary" disabled={!svg} onClick={download}><Download aria-hidden size={18} />{t.promote.download}</button>{(format === "a4" || format === "menu") && <button className="btn btn-outline" disabled={!svg} onClick={print}><Printer aria-hidden size={18} />{t.promote.print}</button>}</div>
    </div>
  );
}
