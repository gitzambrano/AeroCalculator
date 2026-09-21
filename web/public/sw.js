const CACHE_NAME = "aerocalculator-web-v2";
const APP_SCOPE = self.registration.scope;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.add(APP_SCOPE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "CACHE_URLS" || !Array.isArray(event.data.urls)) return;
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        for (const value of event.data.urls) {
          try {
            const url = new URL(value, APP_SCOPE);
            if (url.origin !== self.location.origin) continue;
            const response = await fetch(url.href, { cache: "reload" });
            if (response.ok) await cache.put(url.href, response);
          } catch {
            // A non-critical resource must not prevent the remaining app shell from being cached.
          }
        }
      })
      .then(() => event.ports[0]?.postMessage({ ok: true }))
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)));
        }
        return response;
      }).catch(async () => {
        if (event.request.mode === "navigate") {
          return (await caches.match(APP_SCOPE)) ?? Response.error();
        }
        return Response.error();
      });
    })
  );
});
