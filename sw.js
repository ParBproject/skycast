const CACHE_VERSION = "skycast-shell-v8";
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

function canStore(response) {
  return Boolean(response && response.ok && response.type === "basic" && !response.redirected);
}

function revalidate(request) {
  return fetch(new Request(request.url, {method:"GET", cache:"no-cache", credentials:"same-origin", mode:"same-origin"}));
}

function store(cache, key, response) {
  if (!canStore(response)) return Promise.resolve(response);
  return cache.put(key, response.clone()).then(() => response, () => response);
}

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
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
      caches.open(CACHE_VERSION).then(cache =>
        revalidate(request)
          .then(response => {
            if (canStore(response)) return store(cache, "./index.html", response);
            return cache.match("./index.html").then(cached => cached || response);
          })
          .catch(() => cache.match("./index.html").then(cached => cached || Response.error()))
      )
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE_VERSION).then(cache =>
      revalidate(request)
        .then(response => {
          if (canStore(response)) return store(cache, request, response);
          return cache.match(request).then(cached => cached || response);
        })
        .catch(() => cache.match(request).then(cached => cached || Response.error()))
    )
  );
});
