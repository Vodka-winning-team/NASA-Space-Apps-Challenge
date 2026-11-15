/* The 3D Moon: turn it, zoom in on the south pole, and pick where to land.
   Whole Moon: NASA LRO LROC colour map (NASA SVS CGI Moon Kit). South pole cap: NASA LRO LOLA heights,
   shown 5x taller so ridges and craters stand out. Lit by the Sun at the chosen hour, from NASA/JPL Horizons.
   Tap a dot to pick one of the six places, or tap inside the dashed ring (south of 85 S) to land anywhere.
   If 3D is not available, the flat map stays. Uses three.js r147 (docs/vendor). Written with AI assistance (Claude). */
(function () {
  "use strict";
  var APP = window.LANDER_APP, T = window.THREE, G = window.LANDER_GLOBE;
  var $ = function (id) { return document.getElementById(id); };
  var fig = $("globeFig"), host = $("globe"), flat = document.querySelector(".pick .moon"), pick = document.querySelector(".pick");
  if (!APP || !T || !T.OrbitControls || !G || !fig || !host) return;
  try { var probe = document.createElement("canvas"); if (!(probe.getContext("webgl2") || probe.getContext("webgl"))) return; } catch (e) { return; }

  var R = G.radius_m, EXAG = 5, D = Math.PI / 180;
  var renderer, scene, camera, controls, moon, sunLight, earth, ring85, markers = {}, labels = {}, api = null, idx = 0, shownSite = null;
  var orbitWhole, orbitPole, mode = "whole", tween = null, touched = false;
  var POLE = new T.Vector3(0, 0, 1);              // the south pole, in the scene (the Moon is turned so it faces +z)
  var msgBox = $("globeMsg"), labelBox = $("globeLabels");

  /* ---------- the Moon's own frame: x to longitude 0 (toward Earth), y to the north pole, z to 90 W ---------- */
  function m2v(lat, lon, r) {
    var la = lat * D, lo = lon * D;
    return new T.Vector3(r * Math.cos(la) * Math.cos(lo), r * Math.sin(la), -r * Math.cos(la) * Math.sin(lo));
  }
  // heights near the pole, from the 241 x 241 grid (polar stereographic, row 0 toward longitude 0)
  var zgrid = (function () {
    var bin = atob(G.z_b64), buf = new ArrayBuffer(bin.length), u8 = new Uint8Array(buf);
    for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return new Int16Array(buf);
  })();
  function stereo(lat, lon) {           // metres on the polar stereographic plane, y toward longitude 0
    var r = 2 * R * Math.tan(Math.PI / 4 + lat * D / 2);
    return [r * Math.sin(lon * D), r * Math.cos(lon * D)];
  }
  function heightAt(lat, lon) {
    if (lat > -80) return 0;
    var p = stereo(lat, lon), n = G.n, s = (n - 1) / (2 * G.half_m);
    var c = (p[0] + G.half_m) * s, r = (G.half_m - p[1]) * s;
    if (c < 0 || r < 0 || c > n - 1 || r > n - 1) return 0;
    var c0 = Math.min(Math.floor(c), n - 2), r0 = Math.min(Math.floor(r), n - 2), fc = c - c0, fr = r - r0;
    return zgrid[r0 * n + c0] * (1 - fr) * (1 - fc) + zgrid[r0 * n + c0 + 1] * (1 - fr) * fc +
           zgrid[(r0 + 1) * n + c0] * fr * (1 - fc) + zgrid[(r0 + 1) * n + c0 + 1] * fr * fc;
  }
  function surface(lat, lon, lift) { return m2v(lat, lon, 1 + (EXAG * heightAt(lat, lon) + (lift || 0)) / R); }

  // a direction in a place's local sky (azimuth clockwise from north, elevation) -> the Moon's frame
  function skyToMoon(lat, lon, az, el) {
    var la = lat * D, lo = lon * D, sa = Math.sin(la), ca = Math.cos(la), so = Math.sin(lo), co = Math.cos(lo);
    var a = az * D, e = el * D, x = Math.cos(e) * Math.sin(a), y = Math.cos(e) * Math.cos(a), z = Math.sin(e);
    var ex = -so * x - sa * co * y + ca * co * z, ey = co * x - sa * so * y + ca * so * z, ez = ca * y + sa * z;   // x0, x90E, north
    return new T.Vector3(ex, ez, -ey);
  }

  /* ---------- scene ---------- */

  function texture(src) {
    var t = new T.TextureLoader().load(src, render);
    t.encoding = T.sRGBEncoding; t.anisotropy = 4;
    return t;
  }
  function buildCap() {
    var n = G.n, H = G.half_m, keep = (n - 1) / 2, pos = [], uv = [], col = [], index = [], id = new Int32Array(n * n).fill(-1);
    var fadeIn = 2 * R * Math.tan(Math.PI / 4 - 80.6 * D / 2), edge = H * 0.995;        // fully opaque inside 80.6 S
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
      var x = (c - keep) / keep * H, y = (keep - r) / keep * H, rr = Math.sqrt(x * x + y * y);
      if (rr > edge) continue;
      var lat = -90 + 2 * Math.atan(rr / (2 * R)) / D, lon = Math.atan2(x, y) / D;
      // full relief inside 82 S, easing to none at the edge, so the cap meets the globe without a step
      var taper = rr < 0.72 * H ? 1 : Math.max(0, (edge - rr) / (edge - 0.72 * H)), tz = taper * taper * (3 - 2 * taper);
      var v = m2v(lat, lon, 1 + (EXAG * zgrid[r * n + c] * tz + 300) / R);
      id[r * n + c] = pos.length / 3;
      pos.push(v.x, v.y, v.z);
      uv.push((x + H) / (2 * H), (y + H) / (2 * H));
      col.push(1, 1, 1, rr < fadeIn ? 1 : Math.max(0, 1 - (rr - fadeIn) / (edge - fadeIn)));
    }
    for (r = 0; r < n - 1; r++) for (c = 0; c < n - 1; c++) {
      var a = id[r * n + c], b = id[r * n + c + 1], d = id[(r + 1) * n + c], e = id[(r + 1) * n + c + 1];
      if (a < 0 || b < 0 || d < 0 || e < 0) continue;
      index.push(a, d, b, b, d, e);
    }
    var g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    g.setAttribute("color", new T.Float32BufferAttribute(col, 4));
    g.setIndex(index); g.computeVertexNormals();
    var m = new T.Mesh(g, new T.MeshStandardMaterial({ map: texture("data/globe/pole.jpg"), vertexColors: true, transparent: true, roughness: 1, metalness: 0 }));
    m.renderOrder = 1;
    return m;
  }

  function init() {
    renderer = new T.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = T.sRGBEncoding;
    host.insertBefore(renderer.domElement, host.firstChild);
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.setAttribute("aria-label", "The Moon in 3D. Drag to turn it, pinch or scroll to zoom. Tap a landing place, or anywhere inside the dashed ring near the south pole.");

    scene = new T.Scene();
    camera = new T.PerspectiveCamera(36, 1, 0.01, 100);
    scene.add(new T.HemisphereLight(0xb8c4d8, 0x1a1c22, 0.22));
    sunLight = new T.DirectionalLight(0xfff4e0, 1.9);
    scene.add(sunLight);

    // the Moon, turned so the south pole faces you and longitude 0 (the side facing Earth) points up
    moon = new T.Group();
    moon.setRotationFromMatrix(new T.Matrix4().makeBasis(new T.Vector3(0, 1, 0), new T.Vector3(0, 0, -1), new T.Vector3(-1, 0, 0)));
    scene.add(moon);
    var sphere = new T.Mesh(new T.SphereGeometry(1, 128, 64, 0, Math.PI * 2, 0, (90 + 80.8) * D),      // stops at 80.8 S; the cap (solid from 80.6 S) takes over
      new T.MeshStandardMaterial({ map: texture("data/globe/moon.jpg"), roughness: 1, metalness: 0 }));
    sphere.name = "moon";
    moon.add(sphere);
    var cap = buildCap(); cap.name = "cap"; moon.add(cap);

    // the 85 S limit for "land anywhere"
    var pts = [];
    for (var k = 0; k <= 180; k++) pts.push(surface(-85, k * 2, 2500));
    ring85 = new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineDashedMaterial({ color: 0xece8dc, dashSize: 0.004, gapSize: 0.003, transparent: true, opacity: 0.7 }));
    ring85.computeLineDistances(); moon.add(ring85);

    // Earth, far away in the direction it really is
    var c = document.createElement("canvas"); c.width = c.height = 128;
    var g2 = c.getContext("2d"), gr = g2.createRadialGradient(64, 64, 6, 64, 64, 64);
    gr.addColorStop(0, "#cfe3ff"); gr.addColorStop(0.22, "#6ea8e6"); gr.addColorStop(0.4, "rgba(110,168,230,0.25)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g2.fillStyle = gr; g2.fillRect(0, 0, 128, 128);
    earth = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(c), depthWrite: false }));
    earth.scale.setScalar(0.9);
    scene.add(earth);

    // two ways to look: the whole Moon (turn it around its centre), and the south pole (circle above the pole,
    // never below the ground, with the side facing Earth at the top). OrbitControls reads camera.up when it is made.
    camera.up.set(0, 0, 1);
    orbitPole = new T.OrbitControls(camera, renderer.domElement);
    orbitPole.target.copy(POLE); orbitPole.enablePan = false; orbitPole.enableDamping = false;
    orbitPole.minDistance = 0.07; orbitPole.maxDistance = 1.1; orbitPole.maxPolarAngle = 80 * D;
    camera.up.set(0, 1, 0);
    orbitWhole = new T.OrbitControls(camera, renderer.domElement);
    orbitWhole.enablePan = false; orbitWhole.enableDamping = false;
    orbitWhole.minDistance = 1.3; orbitWhole.maxDistance = 6;
    [orbitPole, orbitWhole].forEach(function (o) {
      o.enabled = false;                       // only the active one listens (setMode switches it on)
      o.addEventListener("change", function () {
        if (o === orbitPole) o.rotateSpeed = Math.max(0.25, Math.min(0.8, o.getDistance() * 0.9));
        render();
      });
    });
    setMode("whole", false);
    new ResizeObserver(resize).observe(host);
    resize();
    bindPick();
  }

  // where each view starts
  function home(m) {
    return m === "pole"
      ? { pos: new T.Vector3(0, -0.40, 1.34), target: POLE.clone(), up: new T.Vector3(0, 0, 1) }
      : { pos: new T.Vector3(0, -0.32, 1).setLength(3.9), target: new T.Vector3(0, 0, 0), up: new T.Vector3(0, 1, 0) };
  }
  function setMode(m, animate) {
    mode = m;
    [].forEach.call(document.querySelectorAll("#globeViews [data-v]"), function (b) { b.setAttribute("aria-pressed", b.dataset.v === m); });
    var to = home(m), from = { pos: camera.position.clone(), target: (controls ? controls.target : new T.Vector3()).clone(), up: camera.up.clone() };
    orbitPole.enabled = false; orbitWhole.enabled = false;     // no dragging while the camera glides
    controls = m === "pole" ? orbitPole : orbitWhole;
    var finish = function () {
      camera.up.copy(to.up); camera.position.copy(to.pos); controls.target.copy(to.target);
      controls.enabled = true; controls.update(); render();
    };
    if (!animate) { finish(); return; }
    var t0 = performance.now(), dur = 1400;
    tween = function (t) {
      var k = Math.min(1, (t - t0) / dur), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      camera.up.copy(from.up).lerp(to.up, e).normalize();
      camera.position.copy(from.pos).lerp(to.pos, e);
      var tg = from.target.clone().lerp(to.target, e);
      camera.lookAt(tg); renderer.render(scene, camera); placeLabels();
      if (k < 1) requestAnimationFrame(step); else { tween = null; finish(); }
    };
    var step = tween;
    requestAnimationFrame(step);
  }
  function resetView() { setMode(mode, false); }

  /* ---------- the six places and the custom one ---------- */

  function syncMarkers() {
    var sites = api.sites, seen = {};
    sites.forEach(function (s) {
      seen[s.id] = true;
      if (markers[s.id] && markers[s.id].userData.lat === s.lat && markers[s.id].userData.lon === s.lon) return;
      if (markers[s.id]) { moon.remove(markers[s.id]); }
      var m = new T.Mesh(new T.SphereGeometry(1, 16, 12), new T.MeshBasicMaterial({ color: 0xffffff }));
      m.position.copy(surface(s.lat, s.lon, 3000));
      m.userData = { id: s.id, lat: s.lat, lon: s.lon, custom: !!s.custom };
      markers[s.id] = m; moon.add(m);
      if (!labels[s.id]) { labels[s.id] = document.createElement("span"); labels[s.id].className = "globeLabel"; labelBox.appendChild(labels[s.id]); }
      labels[s.id].textContent = s.name;
    });
    Object.keys(markers).forEach(function (id) {
      if (seen[id]) return;
      moon.remove(markers[id]); delete markers[id];
      if (labels[id]) { labels[id].parentNode.removeChild(labels[id]); delete labels[id]; }
    });
  }
  function styleMarkers() {
    var dist = camera.position.distanceTo(POLE), size = Math.max(0.0009, Math.min(0.03, dist * 0.0085));
    Object.keys(markers).forEach(function (id) {
      var m = markers[id], on = api && id === api.state.site;
      m.scale.setScalar(size * (on ? 1.45 : 1));
      m.material.color.set(on ? 0xf2b544 : m.userData.custom ? 0x6ea8e6 : 0xffffff);
    });
  }

  /* ---------- light and Earth for the chosen hour ---------- */

  function light() {
    if (!api) return;
    var d = api.data[api.state.site];
    if (!d) return;
    var i = Math.max(0, Math.min(d.n - 1, idx));
    var s = moon.localToWorld(skyToMoon(d.lat, d.lon, d.sun_az[i], d.sun_el[i]).add(m2v(d.lat, d.lon, 1))).sub(moon.localToWorld(m2v(d.lat, d.lon, 1)));
    sunLight.position.copy(s.normalize().multiplyScalar(10));
    var e = moon.localToWorld(skyToMoon(d.lat, d.lon, d.earth_az[i], d.earth_el[i]).add(m2v(d.lat, d.lon, 1))).sub(moon.localToWorld(m2v(d.lat, d.lon, 1)));
    earth.position.copy(e.normalize().multiplyScalar(14));
  }

  /* ---------- drawing ---------- */

  var queued = false, onScreen = true;
  function render() {
    if (!renderer || queued || !onScreen) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;
      if (api) styleMarkers();
      renderer.render(scene, camera);
      placeLabels();
    });
  }
  function placeLabels() {
    var w = host.clientWidth, h = host.clientHeight, dist = camera.position.distanceTo(POLE), camDir = camera.position.clone(), placed = [];
    // the chosen place first, so its name always shows; any other name that would overlap one already shown is left out
    Object.keys(labels).sort(function (a, b) { return (api && b === api.state.site) - (api && a === api.state.site); }).forEach(function (id) {
      var m = markers[id], el = labels[id];
      if (!m) return;
      var wp = m.getWorldPosition(new T.Vector3()), facing = wp.clone().normalize().dot(camDir.clone().sub(wp).normalize());
      var on = api && id === api.state.site;
      if (facing < 0.05 || (!on && dist > 0.9)) { el.style.display = "none"; return; }
      var p = wp.project(camera), x = (p.x + 1) / 2 * w, y = (1 - p.y) / 2 * h, half = el.textContent.length * 3.4 + 6;
      var box = { l: x - half, r: x + half, t: y - 28, b: y - 8 };
      if (placed.some(function (q) { return box.l < q.r && box.r > q.l && box.t < q.b && box.b > q.t; })) { el.style.display = "none"; return; }
      placed.push(box);
      el.style.display = "block";
      el.style.left = x + "px"; el.style.top = y + "px";
      el.classList.toggle("on", !!on);
    });
  }
  function resize() {
    if (!renderer) return;
    var w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix(); render();
  }

  /* ---------- picking: a short tap, not a drag ---------- */

  function say(text, kind) { msgBox.textContent = text; msgBox.className = "globeMsg" + (kind ? " " + kind : ""); }
  function bindPick() {
    var el = renderer.domElement, down = null;
    el.addEventListener("pointerdown", function (e) { touched = true; down = { x: e.clientX, y: e.clientY, t: Date.now() }; });
    el.addEventListener("pointerup", function (e) {
      if (!down) return;
      var moved = Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y), quick = Date.now() - down.t < 700;
      down = null;
      if (moved > 8 || !quick) return;
      choose(e.clientX, e.clientY);
    });
  }
  function choose(cx, cy) {
    var rect = renderer.domElement.getBoundingClientRect(), x = cx - rect.left, y = cy - rect.top;
    // 1. a landing place near the tap?
    var best = null, bestD = 26;
    Object.keys(markers).forEach(function (id) {
      var wp = markers[id].getWorldPosition(new T.Vector3());
      if (wp.clone().normalize().dot(camera.position.clone().sub(wp).normalize()) < 0.05) return;
      var p = wp.project(camera), sx = (p.x + 1) / 2 * rect.width, sy = (1 - p.y) / 2 * rect.height, dd = Math.hypot(sx - x, sy - y);
      if (dd < bestD) { bestD = dd; best = id; }
    });
    if (best) { APP.setSite(best); say(""); return; }
    // 2. otherwise, where on the Moon?
    var ray = new T.Raycaster(), ndc = new T.Vector2(x / rect.width * 2 - 1, -(y / rect.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    var hit = ray.intersectObjects(moon.children.filter(function (o) { return o.name === "moon" || o.name === "cap"; }), false)[0];
    if (!hit) return;
    var p = moon.worldToLocal(hit.point.clone()).normalize();
    var lat = Math.asin(p.y) / D, lon = Math.atan2(-p.z, p.x) / D;
    var where = Math.abs(lat).toFixed(1) + "° " + (lat < 0 ? "S" : "N") + ", " + Math.abs(lon).toFixed(1) + "° " + (lon < 0 ? "W" : "E");
    if (lat > -85) {
      say("That is " + where + ". We have the detailed height map only near the south pole: tap inside the dashed ring (south of 85° S), or pick one of the dots.", "bad");
      return;
    }
    if (!window.LANDER_CUSTOM) { say("Landing anywhere is not available here.", "bad"); return; }
    window.LANDER_CUSTOM.land(lat, lon);
  }
  window.addEventListener("lander-custom-msg", function (e) {
    var t = e.detail.text;
    if (/^Done/.test(t)) t = t.replace(/^Done: /, "Landed at ").split(". Hills")[0] + ". The answer is below.";
    say(t, e.detail.kind === "good" ? "" : e.detail.kind);
  });

  /* ---------- keep in step with the page ---------- */

  APP.onRefresh(function (a) {
    api = a; idx = a.state.start + Math.round(a.state.hour);
    if (!renderer) return;
    syncMarkers();
    if (shownSite !== a.state.site) { shownSite = a.state.site; if (!/^Landed|^Loading|^Working/.test(msgBox.textContent)) say(""); }
    light(); render();
  });
  APP.onHour(function (i) { idx = i; if (renderer) { light(); render(); } });
  if ($("globeReset")) $("globeReset").onclick = function () { if (renderer) setMode(mode, true); };
  [].forEach.call(document.querySelectorAll("#globeViews [data-v]"), function (b) { b.onclick = function () { if (renderer) { touched = true; setMode(b.dataset.v, true); } }; });

  // swap the flat map for the globe only once the globe really works
  try { init(); } catch (e) { if (renderer && renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement); return; }
  fig.hidden = false;
  if (flat) flat.hidden = true;
  window.LANDER_GLOBE_VIEW = { camera: camera, moon: moon, setMode: setMode, mode: function () { return mode; }, busy: function () { return !!tween; }, render: render, markers: markers };   // for tests
  if (pick) pick.classList.add("hasGlobe");
  api = APP.get(); if (api && api.run) { idx = api.state.start + Math.round(api.state.hour); syncMarkers(); light(); }
  resize();
  var introDone = false;
  function intro() {
    if (introDone) return; introDone = true;
    var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTimeout(function () { if (!touched) setMode("pole", !calm); }, calm ? 0 : 900);
  }
  if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; if (onScreen) { render(); intro(); } }).observe(host);
  else intro();
})();
