const CACHE_VERSION = "skycast-shell-v6";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./styles/location.css",
  "./styles/air-quality.css",
  "./app.js",
  "./air-quality.js",
  "./src/forecast-core.js",
  "./src/location-core.js",
  "./src/air-quality-core.js",
  "./manifest.webmanifest",
  "./assets/app-icon.svg",
  "./assets/hero-clear.svg",
  "./assets/hero-cloud.svg",
  "./assets/hero-rain.svg",
  "./assets/hero-snow.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_VERSION).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith("skycast-shell-") && key !== CACHE_VERSION).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_VERSION).then(cache => cache.put(request, copy));
      }
      return response;
    }))
  );
});
