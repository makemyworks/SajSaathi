"use client";
import { useEffect, useState } from "react";
import { useI18n } from "./I18n";

type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
declare global { interface Window { __ssInstall?: BIP | null } }

/** Registers the service worker, shows an offline notice and a one-tap "update" when a new version is ready. */
export function PwaRegister() {
  const { t } = useI18n();
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const onBip = (e: Event) => { e.preventDefault(); window.__ssInstall = e as BIP; window.dispatchEvent(new Event("ss-installable")); };
    window.addEventListener("beforeinstallprompt", onBip);
    const setNet = () => setOffline(!navigator.onLine);
    setNet(); window.addEventListener("online", setNet); window.addEventListener("offline", setNet);
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").then((reg) => {
        if (reg.waiting) setWaiting(reg.waiting);
        reg.addEventListener("updatefound", () => {
          const nw = reg.installing;
          nw?.addEventListener("statechange", () => { if (nw.state === "installed" && navigator.serviceWorker.controller) setWaiting(nw); });
        });
      });
      let reloaded = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => { if (!reloaded) { reloaded = true; window.location.reload(); } });
    }
    return () => { window.removeEventListener("beforeinstallprompt", onBip); window.removeEventListener("online", setNet); window.removeEventListener("offline", setNet); };
  }, []);

  if (!waiting && !offline) return null;
  return (
    <div role="status" className="fixed inset-x-0 bottom-0 z-50 p-3">
      <div className="wrap"><div className="panel shadow-lg px-4 py-3 flex items-center gap-3 flex-wrap">
        {offline ? <span>{t.common.offline}</span> : <><span>{t.common.update}</span><button className="btn btn-sm btn-primary ml-auto" onClick={() => waiting?.postMessage("SKIP_WAITING")}>{t.common.reload}</button></>}
      </div></div>
    </div>
  );
}
