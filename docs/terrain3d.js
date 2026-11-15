/* "Watch the mission" in 3D: the real ground around the lander, lit by the Sun at the shown hour.
   You start beside the lander, near the ground, looking toward the Sun. Drag to look around, right-drag to move,
   Ctrl + scroll (or pinch, or + and −) to zoom all the way out over the craters and ridges.
   A line runs from the lander to the Sun: yellow while sunlight reaches the panel, red when something blocks it,
   with a marker on the ridge (or the far hill) in the way.

   What is real and what is not:
   - ground shapes: NASA LRO LOLA. 80 m detail for the 26 km square (docs/data/terrain_<site>.js, or worked out
     in the browser for a custom place), 1.6 km beyond it (docs/data/far/relief.js). The Moon's curve is included.
   - Sun and Earth directions: NASA/JPL Horizons, hour by hour. Both are drawn 3x larger so you can see them.
   - the fine grain of the soil, the lander model and the stars are illustrative.
   - "Lander's eye" uses the exact hill line the rest of the page calculates with.
   Uses three.js r147 (docs/vendor, MIT). Earth picture: NASA Blue Marble. Written with AI assistance (Claude). */
(function () {
  "use strict";
  var APP = window.LANDER_APP, T = window.THREE;
  var $ = function (id) { return document.getElementById(id); };
  var section = $("terrain3d"), host = $("t3dCanvas");
  if (!APP || !section || !host) return;
  var note = function (t) { if ($("t3dNote")) $("t3dNote").textContent = t; };
  if (!T || !T.OrbitControls || !window.WebGLRenderingContext) { note("This browser cannot show 3D graphics."); return; }

  var COMPASS = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"];
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var D2R = Math.PI / 180, R_MOON = 1737400;
  var SKY_R = 400000, BIG = 3;                 // Sun and Earth sit 400 km away and are drawn 3x larger
  var RING_R = 12900, FINE_R = 12800;
  var api = null, idx = 0, started = false, siteShown = null, mastShown = null, exag = 1, view = "ground", follow = true;
  var renderer, scene, camera, controls, ground, far, ring, sunLight, hemi, sunSprite, earth, stars, lander, panelPivot, statusMat, shadowStrip, beacon, landerMat;
  var sight, blockMark, labels = {}, block = null, soil = null, ratio = 1;
  function DATA() { return api ? api.data : window.LANDER_DATA; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ---------- helpers ---------- */

  function dir(az, el) {          // azimuth clockwise from north, elevation up; east = +x, north = -z
    var a = az * D2R, e = el * D2R;
    return new T.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e));
  }
  // the same direction as drawn: when the hills are stretched upward, the sky is stretched the same way
  function sky(az, el) { var v = dir(az, el); v.y *= exag; return v.normalize(); }
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
  function b64i16(b64) {
    var bin = atob(b64), buf = new ArrayBuffer(bin.length), u8 = new Uint8Array(buf);
    for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return new Int16Array(buf);
  }
  function heights(id) {
    var t = window.LANDER_TERRAIN[id];
    if (!t.z) t.z = b64i16(t.z_b64);
    return t;
  }
  // true height (m, relative to the lander's ground) at a point of the detailed square; x east, z = -north
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

  /* ---------- the fine grain of the soil (illustrative): small craters and roughness, as a tiling texture ---------- */

  function soilTextures() {
    var N = 512, h = new Float32Array(N * N), seed = 20270728, x, y;
    var rnd = function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    // roughness: a few layers of smooth noise that wraps around
    for (var o = 0; o < 4; o++) {
      var cells = 8 << o, amp = 1.1 / (1 << o), lat = new Float32Array(cells * cells);
      for (var q = 0; q < lat.length; q++) lat[q] = rnd() - 0.5;
      for (y = 0; y < N; y++) for (x = 0; x < N; x++) {
        var fx = x / N * cells, fy = y / N * cells, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
        tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
        var x1 = (x0 + 1) % cells, y1 = (y0 + 1) % cells;
        h[y * N + x] += amp * ((lat[y0 * cells + x0] * (1 - tx) + lat[y0 * cells + x1] * tx) * (1 - ty) + (lat[y1 * cells + x0] * (1 - tx) + lat[y1 * cells + x1] * tx) * ty);
      }
    }
    // small craters: a bowl with a raised rim
    for (var k = 0; k < 150; k++) {
      var cx = rnd() * N, cy = rnd() * N, rad = 2.5 + Math.pow(rnd(), 3.4) * 30, depth = rad * 0.22, ext = Math.ceil(rad * 1.7);
      for (var dy = -ext; dy <= ext; dy++) for (var dx = -ext; dx <= ext; dx++) {
        var rr = Math.sqrt(dx * dx + dy * dy) / rad;
        if (rr > 1.7) continue;
        var v = rr < 1 ? -depth * (1 - rr * rr) : 0;
        v += depth * 0.32 * Math.exp(-Math.pow((rr - 1) / 0.28, 2));
        var px = ((Math.round(cx) + dx) % N + N) % N, py = ((Math.round(cy) + dy) % N + N) % N;
        h[py * N + px] += v;
      }
    }
    var cn = document.createElement("canvas"), ca = document.createElement("canvas"); cn.width = cn.height = ca.width = ca.height = N;
    var gn = cn.getContext("2d"), ga = ca.getContext("2d"), dn = gn.createImageData(N, N), da = ga.createImageData(N, N);
    for (y = 0; y < N; y++) for (x = 0; x < N; x++) {
      var i = y * N + x, xl = h[y * N + (x + N - 1) % N], xr = h[y * N + (x + 1) % N], yu = h[((y + N - 1) % N) * N + x], yd = h[((y + 1) % N) * N + x];
      var nx = -(xr - xl) * 0.55, ny = (yd - yu) * 0.55, len = Math.sqrt(nx * nx + ny * ny + 1);
      dn.data[i * 4] = (nx / len * 0.5 + 0.5) * 255; dn.data[i * 4 + 1] = (ny / len * 0.5 + 0.5) * 255; dn.data[i * 4 + 2] = (1 / len * 0.5 + 0.5) * 255; dn.data[i * 4 + 3] = 255;
      var a = clamp(218 + h[i] * 3.5, 170, 255);
      da.data[i * 4] = a; da.data[i * 4 + 1] = a; da.data[i * 4 + 2] = a; da.data[i * 4 + 3] = 255;
    }
    gn.putImageData(dn, 0, 0); ga.putImageData(da, 0, 0);
    var out = { normal: new T.CanvasTexture(cn), albedo: new T.CanvasTexture(ca) };
    [out.normal, out.albedo].forEach(function (t) { t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); });
    return out;
  }

  /* ---------- scene ---------- */

  function init() {
    renderer = new T.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(ratio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;                 // shadows only change when the Sun moves, not when you look around
    renderer.outputEncoding = T.sRGBEncoding;
    host.insertBefore(renderer.domElement, host.firstChild);
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.setAttribute("aria-label", "3D view of the real ground around the lander, lit by the Sun at the hour shown. A line from the lander to the Sun turns red when a ridge blocks it.");

    scene = new T.Scene();
    scene.background = new T.Color(0x020306);
    camera = new T.PerspectiveCamera(50, 1, 1, 1200000);

    hemi = new T.HemisphereLight(0x8fa6c8, 0x202024, 0.3);           // soft fill so the ground shape stays readable in the dark
    scene.add(hemi);
    sunLight = new T.DirectionalLight(0xfff1d6, 2.6);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(1024, 1024);
    var sc = sunLight.shadow.camera;
    sc.left = -14500; sc.right = 14500; sc.top = 14500; sc.bottom = -14500; sc.near = 100; sc.far = 120000;
    sunLight.shadow.bias = -0.0006; sunLight.shadow.normalBias = 45;
    scene.add(sunLight); scene.add(sunLight.target);

    // stars (illustrative), turning slowly with the Moon
    var sp = new Float32Array(1400 * 3), seed = 7, k;
    var rnd = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (k = 0; k < 1400; k++) {
      var u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      sp[k * 3] = s * Math.cos(th) * 800000; sp[k * 3 + 1] = u * 800000; sp[k * 3 + 2] = s * Math.sin(th) * 800000;
    }
    var sg = new T.BufferGeometry(); sg.setAttribute("position", new T.BufferAttribute(sp, 3));
    stars = new T.Points(sg, new T.PointsMaterial({ color: 0xcdd6ea, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.8, depthWrite: false }));
    stars.frustumCulled = false;
    scene.add(stars);

    sunSprite = new T.Sprite(new T.SpriteMaterial({ map: glowTexture("#fff6dc", "rgba(242,181,68,0.35)"), depthWrite: false, fog: false }));
    scene.add(sunSprite);

    // the Earth: NASA's Blue Marble on a ball, lit from the Sun's side, so it shows its real phase
    var et = new T.TextureLoader().load("data/far/earth.jpg", render);
    earth = new T.Mesh(new T.SphereGeometry(1, 48, 32), new T.ShaderMaterial({
      uniforms: { map: { value: et }, sunDir: { value: new T.Vector3(1, 0, 0) } },
      vertexShader: "varying vec3 vN; varying vec3 vP; varying vec2 vUv; void main(){ vN = normalize(mat3(modelMatrix) * normal); vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
      // day side brightened a little (the oceans in the picture are very dark), with a thin blue haze at the edge
      fragmentShader: "uniform sampler2D map; uniform vec3 sunDir; varying vec3 vN; varying vec3 vP; varying vec2 vUv; void main(){ vec3 n = normalize(vN); float d = dot(n, sunDir); float lit = smoothstep(-0.06, 0.22, d); vec3 c = texture2D(map, vUv).rgb; c = c * 1.5 + vec3(0.02, 0.05, 0.11); float rim = pow(1.0 - max(dot(n, normalize(cameraPosition - vP)), 0.0), 2.2); c += vec3(0.30, 0.50, 0.95) * rim * 0.9; gl_FragColor = vec4(c * (0.015 + lit), 1.0); }"
    }));
    scene.add(earth);

    // far-away marker for the lander (a real lander is too small to see from kilometres away)
    beacon = new T.Group();
    landerMat = new T.MeshBasicMaterial({ color: 0x58d08a });
    var pole = new T.Mesh(new T.CylinderGeometry(14, 14, 1100, 8), landerMat); pole.position.y = 550;
    var head = new T.Mesh(new T.OctahedronGeometry(130), landerMat); head.position.y = 1200;
    var foot = new T.Mesh(new T.RingGeometry(220, 290, 48), landerMat); foot.rotation.x = -Math.PI / 2; foot.position.y = 4;
    beacon.add(pole); beacon.add(head); beacon.add(foot);
    scene.add(beacon);

    // the lander's long shadow (drawn, because the shadow map is too coarse for a 3 m lander)
    var stripG = new T.BufferGeometry(), SEG = 24, sidx = [];
    stripG.setAttribute("position", new T.BufferAttribute(new Float32Array((SEG + 1) * 2 * 3), 3));
    var sc4 = new Float32Array((SEG + 1) * 2 * 4);
    for (k = 0; k <= SEG; k++) { var fade = Math.pow(1 - k / SEG, 1.5); sc4[k * 8 + 3] = fade; sc4[k * 8 + 7] = fade; }
    stripG.setAttribute("color", new T.BufferAttribute(sc4, 4));
    for (k = 0; k < SEG; k++) { var a = k * 2; sidx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    stripG.setIndex(sidx);
    shadowStrip = new T.Mesh(stripG, new T.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, transparent: true, opacity: 0.5, depthWrite: false, side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    shadowStrip.frustumCulled = false;
    scene.add(shadowStrip);

    // the line from the lander to the Sun, and the marker on whatever blocks it
    sight = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3(0, 1, 0)]),
      new T.LineBasicMaterial({ color: 0xf2b544, transparent: true, opacity: 0.95, depthTest: false }));
    sight.renderOrder = 5; sight.frustumCulled = false;
    scene.add(sight);
    blockMark = new T.Sprite(new T.SpriteMaterial({ map: glowTexture("#ffd2c8", "rgba(236,96,73,0.55)"), depthTest: false, depthWrite: false }));
    blockMark.renderOrder = 6; blockMark.visible = false;
    scene.add(blockMark);
    ["sun", "earth", "block"].forEach(function (key) {
      var el = document.createElement("span"); el.className = "t3dLabel t3dLabel-" + key; $("t3dLabels").appendChild(el); labels[key] = el;
    });
    labels.sun.textContent = "Sun"; labels.earth.textContent = "Earth";

    soil = soilTextures();

    controls = new T.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.screenSpacePanning = false;                   // right-drag moves you over the ground, like a map
    controls.zoomSpeed = 1.6;
    controls.addEventListener("change", onMove);
    renderer.domElement.addEventListener("pointerdown", function () { follow = false; });
    renderer.domElement.style.touchAction = "pan-y";       // on phones the page still scrolls past

    renderer.domElement.addEventListener("webglcontextlost", function (e) { e.preventDefault(); note("3D paused: the graphics card was reset. It comes back by itself."); });
    renderer.domElement.addEventListener("webglcontextrestored", function () { note(""); renderer.shadowMap.needsUpdate = true; render(); });
    new ResizeObserver(resize).observe(host);
    resize();
  }

  // the lander (illustrative): body, legs, and a solar panel at the chosen height that turns to face the Sun
  function buildLander(mast) {
    if (lander) { scene.remove(lander); lander.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); }
    lander = new T.Group();
    var gold = new T.MeshLambertMaterial({ color: 0xd6ab4e, emissive: 0x241c08 });
    var grey = new T.MeshLambertMaterial({ color: 0x9a9da3, emissive: 0x101114 });
    var body = new T.Mesh(new T.BoxGeometry(2.2, 1.1, 2.2), gold); body.position.y = 1.35; lander.add(body);
    var deck = new T.Mesh(new T.CylinderGeometry(1.55, 1.55, 0.28, 8), grey); deck.position.y = 0.72; lander.add(deck);
    var up = new T.Vector3(0, 1, 0);
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (s) {
      var a = new T.Vector3(s[0] * 1.0, 0.75, s[1] * 1.0), b = new T.Vector3(s[0] * 1.75, 0.06, s[1] * 1.75), d = b.clone().sub(a);
      var leg = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, d.length(), 6), grey);
      leg.position.copy(a).add(b).multiplyScalar(0.5); leg.quaternion.setFromUnitVectors(up, d.clone().normalize()); lander.add(leg);
      var pad = new T.Mesh(new T.CylinderGeometry(0.28, 0.28, 0.08, 10), grey); pad.position.set(b.x, 0.04, b.z); lander.add(pad);
    });
    var side = mast < 1.9, ox = side ? 2.1 : 0, from = side ? 0.05 : 1.9;
    if (mast > from + 0.05) {
      var post = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, mast - from, 6), grey); post.position.set(ox, (mast + from) / 2, 0); lander.add(post);
    }
    panelPivot = new T.Group(); panelPivot.position.set(ox, Math.max(mast, 0.5), 0);
    var w = side ? 1.6 : 2.8, hgt = side ? 0.8 : 1.4;
    panelPivot.add(new T.Mesh(new T.BoxGeometry(w, hgt, 0.05), new T.MeshLambertMaterial({ color: 0x1d3466, emissive: 0x070c18 })));
    var frame = new T.Mesh(new T.BoxGeometry(w + 0.08, hgt + 0.08, 0.03), grey); frame.position.z = -0.02; panelPivot.add(frame);
    lander.add(panelPivot);
    statusMat = new T.MeshBasicMaterial({ color: 0x58d08a });
    var lamp = new T.Mesh(new T.SphereGeometry(0.16, 12, 8), statusMat); lamp.position.set(-0.8, 2.05, -0.8); lander.add(lamp);
    lander.scale.y = exag;
    lander.visible = view !== "eye";
    scene.add(lander);
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
      var f = (z - lo) / Math.max(1, hi - lo), c = 0.50 + 0.22 * f;     // higher ground a little lighter
      col[k * 3] = c; col[k * 3 + 1] = c * 0.98; col[k * 3 + 2] = c * 0.94;
    }
    g.setAttribute("color", new T.BufferAttribute(col, 3));
    // keep a round patch; the coarser land beyond it continues from its edge
    var keep = [], old = g.index.array, rr = FINE_R * FINE_R;
    for (var q = 0; q < old.length; q += 3) {
      var ok = true;
      for (var w = 0; w < 3; w++) { var v = old[q + w]; if (pos.getX(v) * pos.getX(v) + pos.getZ(v) * pos.getZ(v) > rr) ok = false; }
      if (ok) keep.push(old[q], old[q + 1], old[q + 2]);
    }
    g.setIndex(keep);
    g.computeVertexNormals();
    soil.normal.repeat.set(size / 96, size / 96); soil.albedo.repeat.set(size / 96, size / 96);
    ground = new T.Mesh(g, new T.MeshLambertMaterial({ vertexColors: true, map: soil.albedo, normalMap: soil.normal, normalScale: new T.Vector2(0.75, 0.75) }));
    ground.receiveShadow = true; ground.castShadow = true;
    scene.add(ground);
  }

  // the land beyond the detailed square, out to the edge of NASA's 80 S map, with the Moon's curve
  var farTex = null;
  function farGrid() {
    var F = window.LANDER_FAR;
    if (!F) return null;
    if (F.z) return F;
    F.z = b64i16(F.z_b64); delete F.z_b64;
    var n = F.n, k = (n - 1) / 2, H = F.half_m, u = new Float32Array(n * n * 3);
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
      var x = (c - k) / k * H, y = (k - r) / k * H, rr = Math.sqrt(x * x + y * y);
      var lat = -Math.PI / 2 + 2 * Math.atan(rr / (2 * R_MOON)), lon = Math.atan2(x, y), cl = Math.cos(lat), i = (r * n + c) * 3;
      u[i] = cl * Math.cos(lon); u[i + 1] = cl * Math.sin(lon); u[i + 2] = Math.sin(lat);
    }
    F.unit = u;
    return F;
  }
  function buildFar(id) {
    var F = farGrid();
    if (far) { scene.remove(far); far.geometry.dispose(); far.material.dispose(); far = null; }
    if (!F) return;
    var d = DATA()[id], t = heights(id), la = d.lat * D2R, lo = d.lon * D2R, n = F.n, u = F.unit, Z = F.z;
    var sa = Math.sin(la), ca = Math.cos(la), so = Math.sin(lo), co = Math.cos(lo), r0 = R_MOON + (d.ground_m || 0);
    var Ux = ca * co, Uy = ca * so, Uz = sa, Ex = -so, Ey = co, Nx = -sa * co, Ny = -sa * so, Nz = ca;
    var pos = new Float32Array(n * n * 3), uv = new Float32Array(n * n * 2), d2 = new Float32Array(n * n);
    for (var i = 0; i < n * n; i++) {
      var rad = R_MOON + Z[i], px = rad * u[i * 3] - r0 * Ux, py = rad * u[i * 3 + 1] - r0 * Uy, pz = rad * u[i * 3 + 2] - r0 * Uz;
      var e = px * Ex + py * Ey, nn = px * Nx + py * Ny + pz * Nz, up = px * Ux + py * Uy + pz * Uz;
      d2[i] = e * e + nn * nn;
      if (d2[i] < FINE_R * FINE_R) { var g = groundAt(t, e, -nn); if (g !== null) up = g - 40; }     // under the detailed patch: tuck just below it
      pos[i * 3] = e; pos[i * 3 + 1] = up * exag; pos[i * 3 + 2] = -nn;
      uv[i * 2] = (i % n) / (n - 1); uv[i * 2 + 1] = 1 - Math.floor(i / n) / (n - 1);
    }
    var index = [], inside = (FINE_R - 250) * (FINE_R - 250);
    for (var r = 0; r < n - 1; r++) for (var c = 0; c < n - 1; c++) {
      var a = r * n + c, b = a + 1, cc = a + n, dd = cc + 1;
      if (d2[a] < inside && d2[b] < inside && d2[cc] < inside && d2[dd] < inside) continue;      // wholly under the detailed patch
      index.push(a, cc, b, b, cc, dd);
    }
    var geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.BufferAttribute(pos, 3));
    geo.setAttribute("uv", new T.BufferAttribute(uv, 2));
    geo.setIndex(new T.BufferAttribute(new Uint32Array(index), 1));
    geo.computeVertexNormals();
    if (!farTex) { farTex = new T.TextureLoader().load("data/far/shade.jpg", render); farTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); }
    far = new T.Mesh(geo, new T.MeshLambertMaterial({ map: farTex, color: 0xbab8b2 }));
    far.visible = view !== "eye";
    scene.add(far);
  }

  // "Lander's eye" only: far hills as a wall, from the exact skyline the rest of the page calculates with
  function buildRing(id, mast) {
    var d = DATA()[id], hor = d.horizons[mast], n = hor.length, eye = parseFloat(mast);
    if (ring) { scene.remove(ring); ring.geometry.dispose(); ring.material.dispose(); }
    var t = heights(id), base = t.min_m * exag - 400;
    var pos = new Float32Array((n + 1) * 2 * 3), idxs = [];
    for (var k = 0; k <= n; k++) {
      var az = k * d.horizon_step_deg, el = hor[k % n];
      var v = dir(az, 0).multiplyScalar(RING_R);
      var top = (eye + Math.tan(el * D2R) * RING_R) * exag;
      pos.set([v.x, base, v.z, v.x, top, v.z], k * 6);
      if (k < n) { var a = k * 2; idxs.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    var g = new T.BufferGeometry();
    g.setAttribute("position", new T.BufferAttribute(pos, 3)); g.setIndex(idxs);
    ring = new T.Mesh(g, new T.MeshBasicMaterial({ color: 0x15171c, side: T.DoubleSide }));
    ring.visible = view === "eye";
    scene.add(ring);
  }

  /* ---------- the camera ---------- */

  var CAM = { ground: { dist: 24, el: 6 }, above: { dist: 19000, el: 38 } };
  function camAz() { var d = DATA()[api.state.site]; return d.sun_az[idx] + 180 + 28; }      // behind the lander, a little to one side, Sun ahead
  function setOrbit(dist, el, az) {
    camera.position.copy(dir(az, el)).multiplyScalar(dist).add(controls.target);
  }
  function setView(v, keepFollow) {
    if (!renderer || !api) return;
    view = v;
    if (!keepFollow) follow = true;
    [].forEach.call($("t3dViews").children, function (b) { b.setAttribute("aria-pressed", b.dataset.v === v); });
    if (ring) ring.visible = v === "eye";
    if (far) far.visible = v !== "eye";
    if (lander) lander.visible = v !== "eye";
    var eye = parseFloat(api.state.mast) * exag;     // same height the skyline was computed for
    if (v === "eye") {
      var d = DATA()[api.state.site], look = dir(d.sun_az[idx], 0);
      camera.near = 0.5; camera.fov = 55;
      camera.position.set(0, eye, 0);
      controls.target.set(look.x, eye, look.z);
      controls.enableZoom = false; controls.enablePan = false; controls.rotateSpeed = -0.35;
      controls.minDistance = controls.maxDistance = 1; controls.maxPolarAngle = Math.PI * 0.6;
    } else {
      camera.fov = 50;
      controls.enableZoom = true; controls.enablePan = true; controls.rotateSpeed = 0.6;
      controls.minDistance = 9; controls.maxDistance = 160000; controls.maxPolarAngle = 89.2 * D2R;
      controls.target.set(0, 1.6 * exag, 0);
      setOrbit(CAM[v].dist, CAM[v].el, camAz());
    }
    camera.updateProjectionMatrix(); controls.update(); onMove(); place();
  }
  // keep the camera sensible while you move: above the ground, not too flat when far out
  var moving = false;
  function onMove() {
    if (moving || !api || view === "eye") { render(); return; }
    moving = true;
    var t = siteShown && window.LANDER_TERRAIN && window.LANDER_TERRAIN[siteShown] ? heights(siteShown) : null, tg = controls.target, flat = Math.sqrt(tg.x * tg.x + tg.z * tg.z);
    if (flat > FINE_R - 600) { tg.x *= (FINE_R - 600) / flat; tg.z *= (FINE_R - 600) / flat; }       // stay over the detailed ground
    if (t) { var gt = groundAt(t, tg.x, tg.z); if (gt !== null) tg.y = gt * exag + 1.6 * exag; }
    var dist = camera.position.distanceTo(tg);
    controls.maxPolarAngle = (dist < 400 ? 89.2 : dist < 4000 ? 86 : 80) * D2R;
    if (t) { var gc = groundAt(t, camera.position.x, camera.position.z); if (gc !== null && camera.position.y < gc * exag + 1.2) camera.position.y = gc * exag + 1.2; }
    if (ground) ground.material.normalScale.setScalar(0.75 * clamp((700 - dist) / 520, 0, 1));
    var near = clamp(dist * 0.02, 0.4, 60);
    if (Math.abs(near - camera.near) / camera.near > 0.2) { camera.near = near; camera.updateProjectionMatrix(); }
    camera.lookAt(tg);
    moving = false;
    render();
  }
  function lookAt(az) {            // turn so the given direction is ahead
    if (!renderer || !api) return;
    follow = false;
    if (view === "eye") { var y = camera.position.y, l = dir(az, 0); controls.target.set(l.x, y, l.z); controls.update(); render(); return; }
    var off = camera.position.clone().sub(controls.target), dist = off.length();
    setOrbit(dist, Math.min(8, Math.asin(clamp(off.y / dist, -1, 1)) / D2R), az + 180 + 18);
    controls.update(); onMove();
  }
  function zoom(k) {
    if (!renderer || !api) return;
    if (view === "eye") { camera.fov = clamp(camera.fov * k, 16, 70); camera.updateProjectionMatrix(); render(); return; }
    var off = camera.position.clone().sub(controls.target);
    off.setLength(clamp(off.length() * k, controls.minDistance, controls.maxDistance));
    camera.position.copy(controls.target).add(off);
    controls.update(); onMove();
  }

  /* ---------- the Sun's line of sight ---------- */

  // where, if anywhere, the line from the panel to the Sun's centre meets the ground of the detailed square
  function nearBlock(t, az, el, mast) {
    var a = az * D2R, sx = Math.sin(a), sz = -Math.cos(a), tan = Math.tan(el * D2R), lim = t.size_m / 2 - t.step_m;
    for (var s = 30; s < lim; s += 30) {
      var x = sx * s, z = sz * s, g = groundAt(t, x, z);
      if (g === null) break;
      if (g > mast + s * tan) return { x: x, z: z, h: g, dist: s };
    }
    return null;
  }
  function sightLine(d) {
    var t = heights(api.state.site), mast = parseFloat(api.state.mast), eye = new T.Vector3(0, mast * exag, 0);
    var az = d.sun_az[idx], el = d.sun_el[idx], f = api.P.sun[idx], sun = sky(az, el), end, colour = 0xf2b544, b = null;
    if (f > 0) {
      end = eye.clone().add(sun.clone().multiplyScalar(view === "eye" ? 4000 : view === "ground" ? 1500 : 11000));
    } else {
      var near = nearBlock(t, az, el, mast);
      if (near) {
        b = { far: false, dist: near.dist, rise: Math.round(near.h), pos: new T.Vector3(near.x, near.h * exag, near.z) };
      } else {
        var R = window.LANDER_RIDGES && window.LANDER_RIDGES[api.state.site], hor = d.horizons[api.state.mast], step = d.horizon_step_deg;
        var i = Math.round((((az % 360) + 360) % 360) / step) % hor.length, ridge = R && R.by_height && R.by_height[api.state.mast];
        var top = Math.max(el, hor[i]) * D2R;
        b = { far: true, dist: ridge ? ridge.dist_km[i] * 1000 : null, rise: ridge ? ridge.rise_m[i] : null,
              pos: new T.Vector3(Math.sin(az * D2R) * RING_R, (mast + Math.tan(Math.min(top, el * D2R + 0.0001)) * RING_R) * exag, -Math.cos(az * D2R) * RING_R) };
        if (b.pos.y < (t.min_m * exag - 400)) b.pos.y = t.min_m * exag - 400;
      }
      b.sunBelow = el + d.sun_width_deg / 2 < 0;       // even flat ground would hide it
      end = b.pos.clone(); colour = 0xec6049;
    }
    sight.geometry.setFromPoints([eye, end]);
    sight.material.color.set(colour);
    sight.visible = view !== "eye" || !!b;              // from the lander's eye, a line straight at the Sun is only a dot
    blockMark.visible = !!b;
    if (b) blockMark.position.copy(b.pos);
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

  // which side of the Earth faces the Moon: from the hours the Moon is highest over Port Louis (57.5 E)
  var transits = null;
  function earthLon(i) {
    var M = window.LANDER_MORIS, rate = 360 / 24.84;
    if (!M || !M.up) return -i * rate;
    if (!transits) {
      transits = [];
      for (var k = 0, from = -1; k <= M.up.length; k++) {
        var up = k < M.up.length && M.up.charAt(k) === "1";
        if (up && from < 0) from = k;
        if (!up && from >= 0) { transits.push((from + k - 1) / 2); from = -1; }
      }
    }
    if (!transits.length) return -i * rate;
    var lo = 0, hi = transits.length - 1;
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (transits[mid] <= i) lo = mid; else hi = mid; }
    var m = Math.abs(transits[lo] - i) < Math.abs(transits[hi] - i) ? transits[lo] : transits[hi];
    return 57.5 - (i - m) * rate;
  }

  var mW = new T.Matrix4(), mL = new T.Matrix4();
  function place() {
    if (!api || !ground || !lander || siteShown !== api.state.site || !window.LANDER_TERRAIN || !window.LANDER_TERRAIN[api.state.site]) return;
    var d = DATA()[api.state.site], P = api.P, t = heights(api.state.site);
    var sun = sky(d.sun_az[idx], d.sun_el[idx]), ed = sky(d.earth_az[idx], d.earth_el[idx]), f = P.sun[idx];
    sunLight.position.copy(sun).multiplyScalar(60000);
    sunLight.intensity = 2.6 * f;                         // dims as the far hills cover the Sun
    renderer.shadowMap.needsUpdate = true;
    sunSprite.position.copy(sun).multiplyScalar(SKY_R); sunSprite.scale.setScalar(SKY_R * 0.115);

    // Earth: where it really is, its north the way the Moon's north points, the right side toward us, lit from the Sun's side
    var er = Math.tan((d.earth_width_deg || 1.9) / 2 * BIG * D2R) * SKY_R, la = d.lat * D2R;
    earth.position.copy(ed).multiplyScalar(SKY_R); earth.scale.setScalar(er);
    var toMoon = ed.clone().negate(), north = new T.Vector3(0, Math.sin(la), -Math.cos(la));
    north.sub(toMoon.clone().multiplyScalar(north.dot(toMoon))).normalize();
    var lon = earthLon(idx) * D2R, a = new T.Vector3(Math.cos(lon), 0, -Math.sin(lon)), yv = new T.Vector3(0, 1, 0);
    mW.makeBasis(toMoon, north, toMoon.clone().cross(north));
    mL.makeBasis(a, yv, a.clone().cross(yv)).transpose();
    earth.quaternion.setFromRotationMatrix(mW.multiply(mL));
    earth.material.uniforms.sunDir.value.copy(sun);
    stars.setRotationFromAxisAngle(new T.Vector3(0, Math.sin(la), -Math.cos(la)).normalize(), -idx / (27.32 * 24) * Math.PI * 2);

    var h = idx - api.state.start, dead = !api.run.alive && h >= api.run.died;
    var status = dead ? 0xec6049 : f * 3 >= 1 ? 0x58d08a : 0xf2b544;
    landerMat.color.set(status); statusMat.color.set(status);
    panelPivot.lookAt(panelPivot.getWorldPosition(new T.Vector3()).add(dir(d.sun_az[idx], Math.max(0, d.sun_el[idx]))));

    // the lander's shadow, laid over the ground away from the Sun
    var sp = shadowStrip.geometry.attributes.position, az = d.sun_az[idx] * D2R, ax = -Math.sin(az), azz = Math.cos(az);
    var len = Math.min(70, 3.3 / Math.tan(Math.max(d.sun_el[idx], 0.7) * D2R)), SEG = sp.count / 2 - 1;
    for (var k = 0; k <= SEG; k++) {
      var s = 0.6 + len * k / SEG, wdt = 1.15 * (1 - 0.5 * k / SEG);
      for (var q = 0; q < 2; q++) {
        var x = ax * s + (q ? 1 : -1) * azz * wdt, z = azz * s - (q ? 1 : -1) * ax * wdt, g = groundAt(t, x, z) || 0;
        sp.setXYZ(k * 2 + q, x, g * exag + 0.07, z);
      }
    }
    sp.needsUpdate = true;
    shadowStrip.material.opacity = 0.5 * f; shadowStrip.visible = f > 0.02 && view !== "eye";

    if (view === "eye") {
      var y = parseFloat(api.state.mast) * exag;
      camera.position.set(0, y, 0);                       // pinned at the panel, so it cannot drift
      if (follow) { var look = dir(d.sun_az[idx], 0); controls.target.set(look.x, y, look.z); }
      else { var fwd = controls.target.clone().sub(camera.position).normalize(); controls.target.copy(camera.position).add(fwd); }
      controls.update();
    } else if (follow) {                                  // keep the Sun ahead until you look around yourself
      var off = camera.position.clone().sub(controls.target), dist = off.length();
      setOrbit(dist, Math.asin(clamp(off.y / dist, -1, 1)) / D2R, camAz());
      controls.update();
    }
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

  /* ---------- drawing: only when something changed, and at a size this computer keeps up with ---------- */

  function resize() {
    if (!renderer) return;
    var w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix(); render();
  }
  var queued = false, onScreen = true, lastT = 0, slow = 0;
  if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; if (onScreen) render(); }).observe(section);
  function render() {          // at most one draw per screen frame, however often things change
    if (!renderer || queued || !onScreen) return;
    queued = true;
    requestAnimationFrame(function (now) {
      queued = false;
      // the far marker and the block marker keep a steady size on screen
      var dist = camera.position.length();
      beacon.visible = view !== "eye" && dist > 700; beacon.scale.setScalar(clamp(dist / 20000, 0.04, 2));
      if (blockMark.visible) blockMark.scale.setScalar(Math.max(8, camera.position.distanceTo(blockMark.position) * 0.035));
      renderer.render(scene, camera);
      placeLabels();
      // if frames keep coming slowly while things move, draw fewer pixels
      var dt = now - lastT; lastT = now;
      if (dt < 120) { slow = dt > 34 ? slow + 1 : Math.max(0, slow - 1); if (slow > 12 && ratio > 0.75) { ratio = Math.max(0.75, ratio - 0.25); slow = 0; renderer.setPixelRatio(ratio); resize(); } }
    });
  }
  function placeLabels() {
    var w = host.clientWidth, h = host.clientHeight;
    function put(el, obj, text, show) {
      if (!show) { el.style.display = "none"; return; }
      var p = obj.position.clone().project(camera);
      if (p.z > 1 || p.x < -1.05 || p.x > 1.05 || p.y < -1.05 || p.y > 1.05) { el.style.display = "none"; return; }
      if (text !== undefined) el.textContent = text;
      el.style.display = "block"; el.style.left = ((p.x + 1) / 2 * w) + "px"; el.style.top = ((1 - p.y) / 2 * h) + "px";
    }
    put(labels.sun, sunSprite, undefined, true);
    // the Earth's name sits above the ball, not on it
    var top = { position: earth.position.clone().add(new T.Vector3(0, 1, 0).applyQuaternion(camera.quaternion).multiplyScalar(earth.scale.x)) };
    put(labels.earth, top, undefined, true);
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
        buildGround(id); buildFar(id);
        note("");
        sync();
      });
      return;
    }
    if ($("t3dNote").textContent.indexOf("Loading") === 0) note("");
    if (mast !== mastShown) { mastShown = mast; buildRing(id, mast); buildLander(parseFloat(mast)); setView(view, true); return; }
    place();
  }

  APP.onRefresh(function (a) { api = a; idx = a.state.start + Math.round(a.state.hour); sync(); });
  APP.onHour(function (i) { idx = i; if (api && siteShown === api.state.site) place(); });

  [].forEach.call($("t3dViews").children, function (b) { b.onclick = function () { setView(b.dataset.v); }; });
  $("t3dExag").onclick = function () {
    if (!renderer || !siteShown || !lander) return;
    exag = exag === 1 ? 3 : 1;
    this.setAttribute("aria-pressed", exag === 3);
    buildGround(siteShown); buildFar(siteShown); buildRing(siteShown, api.state.mast); lander.scale.y = exag; setView(view, true);
  };
  if ($("t3dReset")) $("t3dReset").onclick = function () { setView(view); };
  if ($("t3dEarth")) $("t3dEarth").onclick = function () { if (api && siteShown) lookAt(DATA()[api.state.site].earth_az[idx]); };
  if ($("t3dIn")) $("t3dIn").onclick = function () { zoom(0.66); };
  if ($("t3dOut")) $("t3dOut").onclick = function () { zoom(1 / 0.66); };
  // the page scrolls as usual over the 3D view; zooming takes Ctrl + scroll (a trackpad pinch counts), like an embedded map
  var tipTimer = null;
  host.addEventListener("wheel", function (e) {
    if (!e.ctrlKey && !e.metaKey) {
      e.stopPropagation();
      var tip = $("t3dTip");
      if (tip && started) { tip.classList.add("on"); clearTimeout(tipTimer); tipTimer = setTimeout(function () { tip.classList.remove("on"); }, 1600); }
      return;
    }
    if (view === "eye") { e.preventDefault(); e.stopPropagation(); zoom(e.deltaY < 0 ? 0.92 : 1 / 0.92); }
  }, { capture: true, passive: false });
  // the flat view lives in a fold; draw it when it opens
  if ($("flatView")) $("flatView").addEventListener("toggle", function () { window.dispatchEvent(new Event("resize")); });

  // build only when the section comes near the screen, so the page stays quick to open
  function webgl() {             // ask before three.js does, so a browser without WebGL gets a clean message
    try { var c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl") || c.getContext("experimental-webgl")); }
    catch (e) { return false; }
  }
  function begin() {
    var fail = function () { note("This browser cannot show 3D graphics. The flat 360° view below shows the same hills."); if ($("flatView")) $("flatView").open = true; };
    if (!webgl()) { fail(); return; }
    try { init(); } catch (e) { if (window.console) console.warn("3D view could not start:", e); fail(); return; }
    started = true; sync();
  }
  window.LANDER_T3D = { view: function () { return view; }, block: function () { return block; }, follow: function () { return follow; },
    lookAt: lookAt,
    cam: function () { return camera && controls ? { dist: camera.position.distanceTo(controls.target), y: camera.position.y, fov: camera.fov, ratio: ratio } : null; },
    ready: function () { return !!ground && !!lander && siteShown === (api && api.state.site); } };   // for tests
  if (!("IntersectionObserver" in window)) { begin(); return; }      // very old browsers: build straight away
  var io = new IntersectionObserver(function (es) {
    if (!es.some(function (e) { return e.isIntersecting; })) return;
    io.disconnect();
    begin();
  }, { rootMargin: "300px" });
  io.observe(section);
})();
