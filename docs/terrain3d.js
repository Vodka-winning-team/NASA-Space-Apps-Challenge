/* "Watch the mission" in 3D: the real ground around the lander, lit by the Sun at the shown hour.
   Starts at the lander, at panel height, looking at the Sun on the horizon. Drag to look around; "From above"
   lets you fly, zoom and move. A line runs from the lander to the Sun: yellow while sunlight reaches the panel,
   red when something blocks it, with a marker on the ridge (or the far hill) in the way.
   Uses three.js r147 (docs/vendor, MIT). Terrain: docs/data/terrain_<site>.js (engine/build_terrain.py, NASA LOLA);
   far hills and blocking distances from the same NASA LOLA horizon data the rest of the page uses.
   Written with AI assistance (Claude). */
(function () {
  "use strict";
  var APP = window.LANDER_APP, T = window.THREE;
  var $ = function (id) { return document.getElementById(id); };
  var section = $("terrain3d"), host = $("t3dCanvas");
  if (!APP || !section || !host) return;
  var note = function (t) { if ($("t3dNote")) $("t3dNote").textContent = t; };
  if (!T || !window.WebGLRenderingContext) { note("This browser cannot show 3D graphics."); return; }

  var COMPASS = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"];
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var api = null, idx = 0, started = false, siteShown = null, mastShown = null, exag = 1, view = "lander", follow = true;
  var renderer, scene, camera, controls, ground, ring, sunLight, hemi, sunSprite, earthSprite, beacon, landerMat;
  var sight, blockMark, labels = {}, block = null;
  var RING_R = 12900;
  function DATA() { return api ? api.data : window.LANDER_DATA; }

  /* ---------- helpers ---------- */

  function dir(az, el) {          // azimuth clockwise from north, elevation up; east = +x, north = -z
    var a = az * Math.PI / 180, e = el * Math.PI / 180;
    return new T.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e));
  }
  function glowTexture(inner, outer) {
    var c = document.createElement("canvas"); c.width = c.height = 128;
    var g = c.getContext("2d"), gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    gr.addColorStop(0, inner); gr.addColorStop(0.18, inner); gr.addColorStop(0.32, outer); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return new T.CanvasTexture(c);
  }
  function loadTerrain(id, done) {
    if (window.LANDER_TERRAIN && window.LANDER_TERRAIN[id]) return done();
    var s = document.createElement("script");
    s.src = "data/terrain_" + id + ".js";
    s.onload = done;
    s.onerror = function () { note("Could not load the ground data for this place."); };
    document.head.appendChild(s);
  }
  function heights(id) {
    var t = window.LANDER_TERRAIN[id];
    if (!t.z) {
      var bin = atob(t.z_b64), buf = new ArrayBuffer(bin.length), u8 = new Uint8Array(buf);
      for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      t.z = new Int16Array(buf);
    }
    return t;
  }
  // true height (m, relative to the lander's ground) at a point of the 3D square; x east, z = -north
  function groundAt(t, x, z) {
    var half = t.size_m / 2, n = t.n, c = (x + half) / t.step_m, r = (z + half) / t.step_m;
    if (c < 0 || r < 0 || c > n - 1 || r > n - 1) return null;
    var c0 = Math.min(Math.floor(c), n - 2), r0 = Math.min(Math.floor(r), n - 2), fc = c - c0, fr = r - r0, Z = t.z;
    return Z[r0 * n + c0] * (1 - fr) * (1 - fc) + Z[r0 * n + c0 + 1] * (1 - fr) * fc + Z[(r0 + 1) * n + c0] * fr * (1 - fc) + Z[(r0 + 1) * n + c0 + 1] * fr * fc;
  }
  function when(i) {
    var t = new Date(Date.UTC(2027, 0, 1) + i * 3600000), h = i - api.state.start;
    return "Day " + (Math.floor(h / 24) + 1) + " · " + t.getUTCDate() + " " + MONTHS[t.getUTCMonth()] + " · " + (t.getUTCHours() < 10 ? "0" : "") + t.getUTCHours() + ":00 UTC";
  }

  /* ---------- scene ---------- */

  function init() {
    renderer = new T.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.outputEncoding = T.sRGBEncoding;
    host.insertBefore(renderer.domElement, host.firstChild);
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.setAttribute("aria-label", "3D view of the real ground around the lander, lit by the Sun at the hour shown. A line from the lander to the Sun turns red when a ridge blocks it.");

    scene = new T.Scene();
    scene.background = new T.Color(0x05060a);
    camera = new T.PerspectiveCamera(55, 1, 0.5, 600000);

    hemi = new T.HemisphereLight(0x8fa6c8, 0x202024, 0.32);          // soft fill so the ground shape stays readable in the dark
    scene.add(hemi);
    sunLight = new T.DirectionalLight(0xfff1d6, 2.6);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    var sc = sunLight.shadow.camera;
    sc.left = -14500; sc.right = 14500; sc.top = 14500; sc.bottom = -14500; sc.near = 100; sc.far = 120000;
    sunLight.shadow.bias = -0.0004; sunLight.shadow.normalBias = 30;
    scene.add(sunLight); scene.add(sunLight.target);

    sunSprite = new T.Sprite(new T.SpriteMaterial({ map: glowTexture("#fff6dc", "rgba(242,181,68,0.35)"), depthWrite: false, fog: false }));
    earthSprite = new T.Sprite(new T.SpriteMaterial({ map: glowTexture("#9cc4f0", "rgba(110,168,230,0.25)"), depthWrite: false, fog: false }));
    scene.add(sunSprite); scene.add(earthSprite);

    // the lander: shown as a beacon, because a 3 m lander is invisible on a 25 km map
    beacon = new T.Group();
    landerMat = new T.MeshBasicMaterial({ color: 0x58d08a });
    var pole = new T.Mesh(new T.CylinderGeometry(14, 14, 1100, 8), landerMat); pole.position.y = 550;
    var head = new T.Mesh(new T.OctahedronGeometry(130), landerMat); head.position.y = 1200;
    var foot = new T.Mesh(new T.RingGeometry(220, 290, 48), landerMat); foot.rotation.x = -Math.PI / 2; foot.position.y = 4;
    beacon.add(pole); beacon.add(head); beacon.add(foot);
    scene.add(beacon);

    // the line from the lander to the Sun, and the marker on whatever blocks it
    sight = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3(0, 1, 0)]),
      new T.LineBasicMaterial({ color: 0xf2b544, transparent: true, opacity: 0.95, depthTest: false }));
    sight.renderOrder = 5; sight.frustumCulled = false;
    scene.add(sight);
    blockMark = new T.Sprite(new T.SpriteMaterial({ map: glowTexture("#ffd2c8", "rgba(236,96,73,0.55)"), depthTest: false, depthWrite: false }));
    blockMark.renderOrder = 6; blockMark.visible = false;
    scene.add(blockMark);
    ["sun", "earth", "block"].forEach(function (k) {
      var el = document.createElement("span"); el.className = "t3dLabel t3dLabel-" + k; $("t3dLabels").appendChild(el); labels[k] = el;
    });
    labels.sun.textContent = "Sun"; labels.earth.textContent = "Earth";

    controls = new T.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.maxPolarAngle = Math.PI * 0.495;
    controls.addEventListener("change", render);
    controls.addEventListener("start", function () { if (view === "lander") follow = false; });

    new ResizeObserver(resize).observe(host);
    resize();
  }

  function buildGround(id) {
    var t = heights(id), n = t.n, size = t.size_m;
    if (ground) { scene.remove(ground); ground.geometry.dispose(); ground.material.dispose(); }
    var g = new T.PlaneGeometry(size, size, n - 1, n - 1);
    g.rotateX(-Math.PI / 2);                                  // row 0 (north) ends up at -z
    var pos = g.attributes.position, col = new Float32Array(pos.count * 3);
    var lo = t.min_m, hi = t.max_m;
    for (var k = 0; k < pos.count; k++) {
      var z = t.z[k];
      pos.setY(k, z * exag);
      var f = (z - lo) / Math.max(1, hi - lo), c = 0.42 + 0.22 * f;     // higher ground a little lighter
      col[k * 3] = c; col[k * 3 + 1] = c * 0.98; col[k * 3 + 2] = c * 0.94;
    }
    g.setAttribute("color", new T.BufferAttribute(col, 3));
    // keep a round patch, so the far-hill ring sits just outside it in every direction
    var keep = [], old = g.index.array, rr = (size / 2) * (size / 2);
    for (var q = 0; q < old.length; q += 3) {
      var ok = true;
      for (var w = 0; w < 3; w++) { var v = old[q + w]; if (pos.getX(v) * pos.getX(v) + pos.getZ(v) * pos.getZ(v) > rr) ok = false; }
      if (ok) keep.push(old[q], old[q + 1], old[q + 2]);
    }
    g.setIndex(keep);
    g.computeVertexNormals();
    ground = new T.Mesh(g, new T.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 }));
    ground.receiveShadow = true; ground.castShadow = true;
    scene.add(ground);
  }

  // far hills (beyond the square) as a ring wall, from the same skyline the rest of the page uses
  function buildRing(id, mast) {
    var d = DATA()[id], hor = d.horizons[mast], n = hor.length, eye = parseFloat(mast);
    if (ring) { scene.remove(ring); ring.geometry.dispose(); ring.material.dispose(); }
    var t = heights(id), base = t.min_m * exag - 400;
    var pos = new Float32Array((n + 1) * 2 * 3), idxs = [];
    for (var k = 0; k <= n; k++) {
      var az = k * d.horizon_step_deg, el = hor[k % n];
      var v = dir(az, 0).multiplyScalar(RING_R);
      var top = (eye + Math.tan(el * Math.PI / 180) * RING_R) * exag;
      pos.set([v.x, base, v.z, v.x, top, v.z], k * 6);
      if (k < n) { var a = k * 2; idxs.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    var g = new T.BufferGeometry();
    g.setAttribute("position", new T.BufferAttribute(pos, 3)); g.setIndex(idxs);
    ring = new T.Mesh(g, new T.MeshBasicMaterial({ color: 0x15171c, side: T.DoubleSide, transparent: true }));
    styleRing();
    scene.add(ring);
  }
  function styleRing() {           // solid from the lander; see-through from above, so it shows without hiding the ground
    if (!ring) return;
    ring.material.opacity = view === "lander" ? 1 : 0.55;
    ring.material.color.set(view === "lander" ? 0x15171c : 0x2a2d35);
  }

  function setView(v, keepFollow) {
    if (!renderer || !api) return;
    view = v;
    if (!keepFollow) follow = true;
    styleRing();
    [].forEach.call($("t3dViews").children, function (b) { b.setAttribute("aria-pressed", b.dataset.v === v); });
    var eye = parseFloat(api.state.mast) * exag;     // same height the skyline was computed for
    if (v === "lander") {
      var d = DATA()[api.state.site], look = dir(d.sun_az[idx], 0);
      camera.near = 0.5; camera.fov = 55;
      camera.position.set(0, eye, 0);
      controls.target.set(look.x, eye, look.z);
      controls.enableZoom = false; controls.enablePan = false; controls.rotateSpeed = -0.35;
      controls.minDistance = controls.maxDistance = 1;
      renderer.domElement.style.touchAction = "pan-y";      // turn left and right; the page still scrolls
    } else {
      camera.near = 5; camera.fov = 42;
      var d2 = DATA()[api.state.site], back = dir(d2.sun_az[idx] + 180, 0);      // stand behind the lander, Sun ahead
      camera.position.set(back.x * 15500, 9000 * Math.max(1, exag * 0.7), back.z * 15500);
      controls.target.set(0, 0, 0);
      controls.enableZoom = true; controls.enablePan = true; controls.rotateSpeed = 0.6;
      controls.minDistance = 600; controls.maxDistance = 60000;
      renderer.domElement.style.touchAction = "none";       // fly with one finger, zoom and move with two
    }
    camera.updateProjectionMatrix(); controls.update(); place();
  }

  /* ---------- the Sun's line of sight ---------- */

  // where, if anywhere, the line from the panel to the Sun's centre meets the ground of the 3D square
  function nearBlock(t, az, el, mast) {
    var a = az * Math.PI / 180, sx = Math.sin(a), sz = -Math.cos(a), tan = Math.tan(el * Math.PI / 180), lim = t.size_m / 2 - t.step_m;
    for (var s = 30; s < lim; s += 30) {
      var x = sx * s, z = sz * s, g = groundAt(t, x, z);
      if (g === null) break;
      if (g > mast + s * tan) return { x: x, z: z, h: g, dist: s };
    }
    return null;
  }
  function sightLine(d) {
    var t = heights(api.state.site), mast = parseFloat(api.state.mast), eye = new T.Vector3(0, mast * exag, 0);
    var az = d.sun_az[idx], el = d.sun_el[idx], f = api.P.sun[idx], sun = dir(az, el), end, colour = 0xf2b544, b = null;
    if (f > 0) {
      end = eye.clone().add(sun.clone().multiplyScalar(view === "lander" ? 4000 : 11000));
    } else {
      var near = nearBlock(t, az, el, mast);
      if (near) {
        b = { far: false, dist: near.dist, rise: Math.round(near.h - 0), pos: new T.Vector3(near.x, near.h * exag, near.z) };
      } else {
        var R = window.LANDER_RIDGES && window.LANDER_RIDGES[api.state.site], hor = d.horizons[api.state.mast], step = d.horizon_step_deg;
        var i = Math.round((((az % 360) + 360) % 360) / step) % hor.length, ridge = R && R.by_height[api.state.mast];
        var top = Math.max(el, hor[i]) * Math.PI / 180;
        b = { far: true, dist: ridge ? ridge.dist_km[i] * 1000 : null, rise: ridge ? ridge.rise_m[i] : null,
              pos: new T.Vector3(Math.sin(az * Math.PI / 180) * RING_R, (mast + Math.tan(Math.min(top, el * Math.PI / 180 + 0.0001)) * RING_R) * exag, -Math.cos(az * Math.PI / 180) * RING_R) };
        if (b.pos.y < (t.min_m * exag - 400)) b.pos.y = t.min_m * exag - 400;
      }
      b.sunBelow = el + d.sun_width_deg / 2 < 0;       // even flat ground would hide it
      end = b.pos.clone(); colour = 0xec6049;
    }
    sight.geometry.setFromPoints([eye, end]);
    sight.material.color.set(colour);
    sight.visible = view !== "lander" || !!b;           // from the lander, a line straight at the Sun is only a dot
    blockMark.visible = !!b;
    if (b) { blockMark.position.copy(b.pos); blockMark.scale.setScalar(view === "lander" ? Math.max(120, b.pos.length() * 0.03) : 900); }
    block = b;
  }
  function blockText(b) {
    if (!b) return "";
    var far = b.dist ? (b.dist < 1000 ? Math.round(b.dist) + " m" : (b.dist / 1000).toFixed(1) + " km") : "";
    var up = b.rise !== null && b.rise !== undefined && b.rise > 0 ? ", its top " + Math.round(b.rise) + " m above the lander" : "";
    if (!b.far) return "This ridge hides the Sun" + (far ? ": " + far + " away" : "") + up;
    if (b.sunBelow) return "The Sun is below the horizon here" + (far ? " (the land " + far + " away hides it)" : "");
    return (far ? "A hill " + far + " away hides the Sun" : "A far hill hides the Sun") + up;
  }

  function place() {
    if (!api || !ground) return;
    var d = DATA()[api.state.site], P = api.P, sun = dir(d.sun_az[idx], d.sun_el[idx]), earth = dir(d.earth_az[idx], d.earth_el[idx]);
    var f = P.sun[idx];
    sunLight.position.copy(sun).multiplyScalar(60000);
    sunLight.intensity = 2.6 * f;                         // dims as the far hills cover the Sun
    sunSprite.position.copy(sun).multiplyScalar(200000); sunSprite.scale.setScalar(26000);
    earthSprite.position.copy(earth).multiplyScalar(200000); earthSprite.scale.setScalar(16000);
    var h = idx - api.state.start, dead = !api.run.alive && h >= api.run.died;
    if (view === "lander") {
      var y = parseFloat(api.state.mast) * exag;
      camera.position.set(0, y, 0);                       // pinned at the panel, so it cannot drift
      if (follow) { var look = dir(d.sun_az[idx], 0); controls.target.set(look.x, y, look.z); }
      else { var fwd = controls.target.clone().sub(camera.position).normalize(); controls.target.copy(camera.position).add(fwd); }
      controls.update();
    }
    landerMat.color.set(dead ? 0xec6049 : f * 3 >= 1 ? 0x58d08a : 0xf2b544);
    sightLine(d);
    var el = d.sun_el[idx];
    $("t3dNow").innerHTML = "Sun <b>" + (el >= 0 ? el.toFixed(1) + "° above level ground" : Math.abs(el).toFixed(1) + "° below level ground") +
      "</b> in the " + COMPASS[Math.round(((d.sun_az[idx] % 360) + 360) % 360 / 45) % 8] + " · " +
      (f >= 0.99 ? "fully out" : f > 0 ? Math.round(f * 100) + "% of it above the hills" : "hidden by the hills") +
      " · lander " + (dead ? "lost" : f * 3 >= 1 ? "charging" : "on battery") + (block ? " · " + blockText(block) : "");
    // the readout on the picture: when, and the battery
    var b = api.run.series ? api.run.series[Math.max(0, Math.min(api.run.series.length - 1, h))] / api.state.batt : 1;
    $("hudWhen").textContent = when(idx);
    $("hudPct").textContent = dead ? "Lost" : Math.round(b * 100) + "%";
    var bar = $("hudBattBar"); bar.style.width = Math.max(0, Math.min(100, b * 100)) + "%";
    bar.style.background = dead || b <= 0 ? "#ec6049" : b < 0.25 ? "#c9c14a" : "#58d08a";
    render();
  }

  function resize() {
    if (!renderer) return;
    var w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix(); render();
  }
  var queued = false, onScreen = true;
  if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; if (onScreen) render(); }).observe(section);
  function render() {          // at most one draw per screen frame, however often the hour changes
    if (!renderer || queued || !onScreen) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; renderer.render(scene, camera); placeLabels(); });
  }
  function placeLabels() {
    var w = host.clientWidth, h = host.clientHeight;
    function put(el, obj, text, show) {
      if (!show) { el.style.display = "none"; return; }
      var p = obj.position.clone().project(camera);
      if (p.z > 1 || p.x < -1.1 || p.x > 1.1 || p.y < -1.1 || p.y > 1.1) { el.style.display = "none"; return; }
      if (text !== undefined) el.textContent = text;
      el.style.display = "block"; el.style.left = ((p.x + 1) / 2 * w) + "px"; el.style.top = ((1 - p.y) / 2 * h) + "px";
    }
    put(labels.sun, sunSprite, undefined, true);
    put(labels.earth, earthSprite, undefined, true);
    put(labels.block, blockMark, blockText(block), !!block);
  }

  /* ---------- keep in step with the rest of the page ---------- */

  function sync() {
    if (!started || !api) return;
    var id = api.state.site, mast = api.state.mast;
    if (id !== siteShown) {
      note("Loading the ground…");
      loadTerrain(id, function () {
        if (api.state.site !== id) return;
        siteShown = id; mastShown = null;
        buildGround(id);
        note("");
        sync();
        setView(view);
      });
      return;
    }
    if ($("t3dNote").textContent.indexOf("Loading") === 0) note("");
    if (mast !== mastShown) { mastShown = mast; buildRing(id, mast); setView(view, true); }
    place();
  }

  APP.onRefresh(function (a) { api = a; idx = a.state.start + Math.round(a.state.hour); sync(); });
  APP.onHour(function (i) { idx = i; if (api && siteShown === api.state.site) place(); });

  [].forEach.call($("t3dViews").children, function (b) { b.onclick = function () { setView(b.dataset.v); }; });
  $("t3dExag").onclick = function () {
    if (!renderer) return;
    exag = exag === 1 ? 3 : 1;
    this.setAttribute("aria-pressed", exag === 3);
    if (siteShown) { buildGround(siteShown); buildRing(siteShown, api.state.mast); setView(view, true); }
  };
  if ($("t3dReset")) $("t3dReset").onclick = function () { setView(view); };
  // the flat view lives in a fold; draw it when it opens
  if ($("flatView")) $("flatView").addEventListener("toggle", function () { window.dispatchEvent(new Event("resize")); });

  // build only when the section comes near the screen, so the page stays quick to open
  function webgl() {             // ask before three.js does, so a browser without WebGL gets a clean message
    try { var c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl") || c.getContext("experimental-webgl")); }
    catch (e) { return false; }
  }
  function begin() {
    if (!webgl()) { note("This browser cannot show 3D graphics. The flat 360° view below shows the same hills."); if ($("flatView")) $("flatView").open = true; return; }
    try { init(); } catch (e) { note("This browser cannot show 3D graphics. The flat 360° view below shows the same hills."); if ($("flatView")) $("flatView").open = true; return; }
    started = true; sync();
  }
  window.LANDER_T3D = { view: function () { return view; }, block: function () { return block; }, follow: function () { return follow; } };   // for tests
  if (!("IntersectionObserver" in window)) { begin(); return; }      // very old browsers: build straight away
  var io = new IntersectionObserver(function (es) {
    if (!es.some(function (e) { return e.isIntersecting; })) return;
    io.disconnect();
    begin();
  }, { rootMargin: "300px" });
  io.observe(section);
})();
