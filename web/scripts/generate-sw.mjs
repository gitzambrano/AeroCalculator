import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const dist = new URL("../dist/", import.meta.url);

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(full));
    else files.push(full);
  }
  return files;
}

const distPath = dist.pathname;
const files = await listFiles(distPath);
const assets = files
  .map((file) => relative(distPath, file).split(sep).join("/"))
  .filter((file) => file !== "sw.js" && !file.endsWith(".map"))
  .map((file) => "./" + file);

if (!assets.includes("./index.html")) assets.unshift("./index.html");
assets.unshift("./");

const cacheName = "aerocalculator-web-" + Date.now();
const sw = `const CACHE_NAME = ${JSON.stringify(cacheName)};
const PRECACHE = ${JSON.stringify([...new Set(assets)], null, 2)};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
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

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(async () => {
        if (event.request.mode === "navigate") {
          return (await caches.match("./index.html")) ?? Response.error();
        }
        return Response.error();
      });
    })
  );
});
`;

await writeFile(new URL("../dist/sw.js", import.meta.url), sw, "utf8");
