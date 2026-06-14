// ============================================================================
// SEHAT — Service Worker (offline-first PWA shell)
// Cache-first for the app shell + static assets so the app launches offline.
// Network-first would be used for real API calls in the full backend build.
// ============================================================================
const VERSION = "sehat-v1.0.0";
const CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/styles.css",
  "./js/app.js",
  "./js/store.js",
  "./js/data.js",
  "./js/ai.js",
  "./js/charts.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // don't touch cross-origin

  // Navigation requests -> serve cached app shell when offline (SPA).
  if (request.mode === "navigate") {
    e.respondWith(
      fetch(request).catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Static assets -> cache-first, then populate cache.
  e.respondWith(
    caches.match(request).then((cached) =>
      cached ||
      fetch(request).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(request, copy)).catch(() => {});
        return res;
      }).catch(() => cached)
    )
  );
});
