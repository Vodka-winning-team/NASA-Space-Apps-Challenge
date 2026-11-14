/* Offline support: keep a copy of every file. Written with AI assistance (Claude). */
var CACHE = "lander-v12";
var FILES = ["./", "index.html", "style.css", "app.js", "planner.js", "planner.css", "extras.js", "extras.css", "mode.js", "mode.css", "manifest.webmanifest", "icon.svg", "map.jpg", "icon-192.png", "icon-512.png",
  "fonts/archivo.woff2", "fonts/jbmono.woff2", "data/sites.js", "data/validation.js", "data/moris.js",
  "data/MMA_K2023.js", "data/MMO01.js", "data/NR101.js", "data/dGR201.js", "data/HW06.js", "data/SP07.js", "data/ridges.js", "terrain3d.js", "vendor/three.min.js", "vendor/OrbitControls.js",
  "data/terrain_MMA_K2023.js", "data/terrain_MMO01.js", "data/terrain_NR101.js", "data/terrain_dGR201.js", "data/terrain_HW06.js", "data/terrain_SP07.js"];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
// Network first, so updates show up; fall back to the saved copy when offline.
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(fetch(e.request).then(function (r) {
    var copy = r.clone();
    caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
    return r;
  }).catch(function () { return caches.match(e.request, { ignoreSearch: true }); }));
});
