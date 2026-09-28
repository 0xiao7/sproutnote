const CACHE_NAME = "sproutnote-shell-v1";
const APP_BASE = "/sproutnote/";
const APP_SHELL = [
  APP_BASE,
  `${APP_BASE}manifest.webmanifest`,
  `${APP_BASE}favicon.svg`,
  `${APP_BASE}icons/icon-192.png`,
  `${APP_BASE}icons/icon-512.png`,
  `${APP_BASE}demo/art-table.png`,
  `${APP_BASE}demo/block-bridge.png`,
  `${APP_BASE}demo/garden-observation.png`,
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || !url.pathname.startsWith(APP_BASE)) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then((response) => {
      if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(APP_BASE, response.clone()));
      return response;
    }).catch(() => caches.match(APP_BASE)));
    return;
  }

  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
    return response;
  })));
});
