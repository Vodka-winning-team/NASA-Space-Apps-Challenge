/* Offline support: keep a copy of every file. Written with AI assistance (Claude). */
var CACHE = "lander-v31";
var FILES = ["./", "index.html", "style.css", "science.js", "app.js", "planner.js", "planner.css", "extras.js", "extras.css", "mode.js", "mode.css", "rescue.js", "rescue.css", "customcalc.js", "custom.js", "custom.css", "manifest.webmanifest", "icon.svg", "map.jpg", "icon-192.png", "icon-512.png",
  "export.js", "export.css", "replay.css", "data/far/relief.js", "data/far/shade.jpg", "data/far/earth.jpg", "fonts/archivo.woff2", "fonts/jbmono.woff2", "data/sites.js", "data/validation.js", "data/moris.js",
  "data/MMA_K2023.js", "data/MMO01.js", "data/NR101.js", "data/dGR201.js", "data/HW06.js", "data/SP07.js", "data/ridges.js", "terrain3d.js", "gyro.js", "vendor/three.min.js", "vendor/OrbitControls.js",
  "data/terrain_MMA_K2023.js", "data/terrain_MMO01.js", "data/terrain_NR101.js", "data/terrain_dGR201.js", "data/terrain_HW06.js", "data/terrain_SP07.js"];
var DEM = "lander-dem";      // map pieces for "Somewhere else": kept across updates, filled as people use them
self.addEventListener("install", function (e) {
  // "reload": fetch every file fresh from the server, never from the browser's own short-term cache,
  // so a new version is never put together from old copies
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll(FILES.map(function (f) { return new Request(f, { cache: "reload" }); }));
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  // delete only this app's older copies; leave the map pieces and anything else on the same site alone
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return /^lander-v\d+$/.test(k) && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
// Network first, so updates show up; fall back to the saved copy when offline or when the server answers with an error.
// Only good answers from this site are saved, so an error page never replaces a working file.
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  var store = /\/data\/dem\//.test(req.url) ? DEM : CACHE;
  var saved = function () { return caches.match(req, { ignoreSearch: true }); };
  // "no-cache": always ask the server (a cheap "not changed" answer when nothing changed), so a push shows up at once
  e.respondWith(fetch(req, { cache: "no-cache" }).then(function (r) {
    if (r && r.ok && r.type === "basic") {
      var copy = r.clone();
      e.waitUntil(caches.open(store).then(function (c) { return c.put(req, copy); }).catch(function () {}));
      return r;
    }
    return saved().then(function (m) { return m || r; });
  }, function () {
    return saved().then(function (m) { return m || Response.error(); });
  }));
});
