"use client";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { useI18n } from "./I18n";

export function InstallButton() {
  const { t } = useI18n();
  const [can, setCan] = useState(false);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    setCan(!!window.__ssInstall);
    const on = () => setCan(true);
    window.addEventListener("ss-installable", on);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    return () => window.removeEventListener("ss-installable", on);
  }, []);
  if (installed) return null;
  if (ios) return <p className="muted">{t.home.installIos}</p>;
  return (
    <button type="button" className="btn btn-light" disabled={!can} onClick={async () => { const p = window.__ssInstall; if (!p) return; await p.prompt(); window.__ssInstall = null; setCan(false); }}>
      <Download aria-hidden size={18} /> {t.home.installCta}
    </button>
  );
}
