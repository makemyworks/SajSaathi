/* Saj Saathi customer service worker.
   - Caches only the app shell and static assets (never API responses, never personal data).
   - Network-first for pages with an offline fallback page.
   - Bookings and payments always need the network; nothing is ever shown as "confirmed" from cache. */
const VERSION = "ss-customer-v1";
const SHELL = ["/offline.html", "/manifest.webmanifest", "/favicon.svg", "/icons/icon-192.png", "/brand/logo.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("message", (e) => { if (e.data === "SKIP_WAITING") self.skipWaiting(); });

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/account") || url.pathname.startsWith("/book")) return; // private or live: network only
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/brand/") || url.pathname.startsWith("/icons/")) {
    e.respondWith(caches.open(VERSION).then(async (c) => (await c.match(req)) || fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; })));
    return;
  }
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(async () => (await caches.match("/offline.html")) || Response.error()));
  }
});

self.addEventListener("push", (e) => {
  let d = { title: "Saj Saathi", body: "", link: "/account/notifications" };
  try { d = { ...d, ...e.data.json() }; } catch {}
  e.waitUntil(self.registration.showNotification(d.title, { body: d.body, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", data: { link: d.link } }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const link = (e.notification.data && e.notification.data.link) || "/";
  e.waitUntil(self.clients.matchAll({ type: "window" }).then((ws) => { for (const w of ws) if ("focus" in w) { w.navigate(link); return w.focus(); } return self.clients.openWindow(link); }));
});
