/* ════════════════════════════════════════════════════════════════
   sw.js — offline cache

   Network-first, with a short leash. When you have signal, the app
   always loads the newest files, so a fresh deploy shows up the next
   time you open it — no version numbers to remember, no stale app.
   When you don't have signal (or it's slow), it falls back to the
   cache and opens instantly, which is what you want outdoors.
   ════════════════════════════════════════════════════════════════ */

const CACHE = "errantry";
const TIMEOUT = 2500;                 // ms before we stop waiting and use the cache
const ASSETS = [
  "./", "./index.html", "./manifest.webmanifest", "./css/app.css",
  "./js/main.js", "./js/state.js", "./js/store.js", "./js/travel.js",
  "./js/ui.js", "./js/screens.js", "./js/content.js",
  "./js/dice.js", "./js/loot.js", "./js/rules.js", "./js/character.js", "./js/charui.js",
  "./icon-192.png", "./icon-512.png", "./icon-512-maskable.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      // allSettled, not all: one missing file must not sink the whole install
      .then(c => Promise.allSettled(ASSETS.map(u => c.add(new Request(u, { cache: "reload" })))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function fromNetwork(req) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("slow")), TIMEOUT);
    fetch(req).then(res => {
      clearTimeout(timer);
      if (res && res.ok && res.type === "basic") {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      }
      resolve(res);
    }, err => { clearTimeout(timer); reject(err); });
  });
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== location.origin) return;

  e.respondWith(
    fromNetwork(req).catch(() =>
      caches.match(req, { ignoreSearch: true })
        .then(hit => hit || caches.match("./index.html"))
    )
  );
});
