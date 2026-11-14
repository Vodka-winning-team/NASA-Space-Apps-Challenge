/* 3D view of the ground around the landing site, lit by the Sun at the chosen hour.
   Uses three.js r147 (docs/vendor, MIT). Terrain: docs/data/terrain_<site>.js, built by
   engine/build_terrain.py from NASA LOLA. Written with AI assistance (Claude). */
(function () {
  "use strict";
  var APP = window.LANDER_APP, DATA = window.LANDER_DATA, T = window.THREE;
  var $ = function (id) { return document.getElementById(id); };
  var section = $("terrain3d"), host = $("t3dCanvas");
  if (!APP || !section || !host) return;
  if (!T || !window.WebGLRenderingContext) { $("t3dNote").textContent = "This browser cannot show 3D graphics."; return; }

  var COMPASS = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"];
  var api = null, idx = 0, started = false, siteShown = null, mastShown = null, exag = 1, view = "overview";
  var renderer, scene, camera, controls, ground, ring, sunLight, hemi, sunSprite, earthSprite, beacon, landerMat;
  var RING_R = 12900;

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
    var t = new T.CanvasTexture(c); return t;
  }
  function loadTerrain(id, done) {
    if (window.LANDER_TERRAIN && window.LANDER_TERRAIN[id]) return done();
    var s = document.createElement("script");
    s.src = "data/terrain_" + id + ".js";
    s.onload = done;
    s.onerror = function () { $("t3dNote").textContent = "Could not load the ground data for this place."; };
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

  /* ---------- scene ---------- */

  function init() {
    renderer = new T.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.outputEncoding = T.sRGBEncoding;
    host.appendChild(renderer.domElement);
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.setAttribute("aria-label", "3D view of the ground around the lander, lit by the Sun");

    scene = new T.Scene();
    scene.background = new T.Color(0x05060a);
    camera = new T.PerspectiveCamera(38, 1, 0.5, 600000);

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

    controls = new T.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.maxPolarAngle = Math.PI * 0.495;
    controls.addEventListener("change", render);
    renderer.domElement.style.touchAction = "pan-y";      // let the page scroll past on phones

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
    var d = DATA[id], hor = d.horizons[mast], n = hor.length, eye = parseFloat(mast);
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
    ring = new T.Mesh(g, new T.MeshBasicMaterial({ color: 0x15171c, side: T.DoubleSide }));
    ring.visible = view === "lander";
    scene.add(ring);
  }

  function setView(v) {
    if (!renderer || !api) return;
    view = v;
    if (ring) ring.visible = v === "lander";     // far hills only make sense from the lander's own spot
    [].forEach.call($("t3dViews").children, function (b) { b.setAttribute("aria-pressed", b.dataset.v === v); });
    var eye = parseFloat(api.state.mast) * exag;     // same height the skyline was computed for
    if (v === "lander") {
      var d = DATA[api.state.site], look = dir(d.sun_az[idx], 0);
      camera.near = 0.5; camera.fov = 55;
      camera.position.set(0, eye, 0);
      controls.target.set(look.x, eye, look.z);
      controls.enableZoom = false; controls.enablePan = false; controls.rotateSpeed = -0.35;
      controls.minDistance = controls.maxDistance = 1;
    } else {
      camera.near = 5; camera.fov = 38;
      camera.position.set(-15500, 9000 * Math.max(1, exag * 0.7), 15500);
      controls.target.set(0, 0, 0);
      controls.enableZoom = true; controls.enablePan = true; controls.rotateSpeed = 0.6;
      controls.minDistance = 800; controls.maxDistance = 60000;
    }
    camera.updateProjectionMatrix(); controls.update(); render();
  }

  function place() {
    if (!api || !ground) return;
    var d = DATA[api.state.site], P = api.P, sun = dir(d.sun_az[idx], d.sun_el[idx]), earth = dir(d.earth_az[idx], d.earth_el[idx]);
    var f = P.sun[idx];
    sunLight.position.copy(sun).multiplyScalar(60000);
    sunLight.intensity = 2.6 * f;                         // dims as the far hills cover the Sun
    sunSprite.position.copy(sun).multiplyScalar(200000); sunSprite.scale.setScalar(26000);
    earthSprite.position.copy(earth).multiplyScalar(200000); earthSprite.scale.setScalar(16000);
    var h = idx - api.state.start, dead = !api.run.alive && h >= api.run.died;
    if (view === "lander") {
      var look = dir(d.sun_az[idx], 0), y = parseFloat(api.state.mast) * exag;
      camera.position.set(0, y, 0);                       // pinned, so it cannot drift
      controls.target.set(look.x, y, look.z); controls.update();
    }
    landerMat.color.set(dead ? 0xec6049 : f * 3 >= 1 ? 0x58d08a : 0xf2b544);
    var el = d.sun_el[idx];
    $("t3dNow").innerHTML = "Sun <b>" + (el >= 0 ? el.toFixed(1) + "° above level ground" : Math.abs(el).toFixed(1) + "° below level ground") +
      "</b> in the " + COMPASS[Math.round(((d.sun_az[idx] % 360) + 360) % 360 / 45) % 8] + " · " +
      (f >= 0.99 ? "fully out" : f > 0 ? Math.round(f * 100) + "% of it above the hills" : "hidden by the hills") +
      " · lander " + (dead ? "lost" : f * 3 >= 1 ? "charging" : "on battery");
    render();
  }

  function resize() {
    if (!renderer) return;
    var w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix(); render();
  }
  var queued = false, onScreen = true;
  new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; if (onScreen) render(); }).observe(section);
  function render() {          // at most one draw per screen frame, however often the hour changes
    if (!renderer || queued || !onScreen) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; renderer.render(scene, camera); });
  }

  /* ---------- keep in step with the rest of the page ---------- */

  function sync() {
    if (!started || !api) return;
    var id = api.state.site, mast = api.state.mast;
    if (id !== siteShown) {
      $("t3dNote").textContent = "Loading the ground…";
      loadTerrain(id, function () {
        if (api.state.site !== id) return;
        siteShown = id; mastShown = null;
        buildGround(id);
        $("t3dNote").textContent = "";
        sync();
        setView(view);
      });
      return;
    }
    if ($("t3dNote").textContent.indexOf("Loading") === 0) $("t3dNote").textContent = "";
    if (mast !== mastShown) { mastShown = mast; buildRing(id, mast); if (view === "lander") setView("lander"); }
    place();
  }

  APP.onRefresh(function (a) { api = a; idx = a.state.start + Math.round(a.state.hour); sync(); });
  APP.onHour(function (i) { idx = i; if (api && siteShown === api.state.site) place(); });

  [].forEach.call($("t3dViews").children, function (b) { b.onclick = function () { setView(b.dataset.v); }; });
  $("t3dExag").onclick = function () {
    if (!renderer) return;
    exag = exag === 1 ? 3 : 1;
    this.setAttribute("aria-pressed", exag === 3);
    if (siteShown) { buildGround(siteShown); buildRing(siteShown, api.state.mast); setView(view); place(); }
  };

  // build only when the section comes into view, so the page stays quick to open
  var io = new IntersectionObserver(function (es) {
    if (!es.some(function (e) { return e.isIntersecting; })) return;
    io.disconnect();
    try { init(); } catch (e) { $("t3dNote").textContent = "This browser cannot show 3D graphics."; return; }
    started = true; sync();
  }, { rootMargin: "300px" });
  io.observe(section);
})();
