/* Work out a landing place chosen by the user: its horizon, hills, 3D ground, and Sun and Earth positions.
   Same method as engine/moonmap.py, build_sites.py, build_ridges.py and build_terrain.py, but in the browser:
   - ground within 10 km: NASA LOLA 80 m map (docs/data/dem/f_*.js tiles, loaded on demand)
   - hills beyond 10 km:  the same map averaged to 640 m (docs/data/dem/coarse.js)
   - Sun and Earth: taken from the nearest prepared site's NASA/JPL Horizons table and turned to the new
     place's sky (same directions in space; Earth corrected for the few hundred km between the two places).
   Checked against the six prepared sites by engine/check_custom.mjs.
   No page code here, so it also runs in Node. Written with AI assistance (Claude). */
(function (root) {
  "use strict";
  var R = 1737400, SCALE = 80, N = 7600, C0 = 3799.5, TILE = 128;
  var NEAR_M = 10000, MAX_M = 200000, HEIGHTS = ["0.5", "2", "10"];
  var D_EARTH = 384400e3, D_SUN = 149.6e9;          // metres; only used for the small parallax correction
  var RAD = Math.PI / 180;

  var tiles = {};        // decoded Int16Array per tile key "row_col"
  var coarse = null;     // { k, n, off, z: Int16Array }

  function decode(b64) {
    var bin = (typeof atob === "function") ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
    var buf = new ArrayBuffer(bin.length), u8 = new Uint8Array(buf);
    for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return new Int16Array(buf);
  }
  function store() { return root.LANDER_DEM || {}; }
  function tile(key) {
    if (tiles[key]) return tiles[key];
    var t = store()["f_" + key];
    if (!t) return null;
    tiles[key] = decode(t.z_b64);
    delete t.z_b64;                                   // free the text copy
    return tiles[key];
  }
  function coarseMap() {
    if (coarse) return coarse;
    var c = store().coarse;
    if (!c) return null;
    coarse = { k: c.k, n: c.n, off: c.off, z: decode(c.z_b64) };
    delete c.z_b64;
    return coarse;
  }

  /* ---------- map geometry (polar stereographic, as in moonmap.py) ---------- */

  function toPix(latDeg, lonDeg) {
    var lat = latDeg * RAD, lon = lonDeg * RAD, r = 2 * R * Math.tan(Math.PI / 4 + lat / 2);
    return [C0 - r * Math.cos(lon) / SCALE, C0 + r * Math.sin(lon) / SCALE];
  }
  function fromPix(row, col) {
    var x = (col - C0) * SCALE, y = (C0 - row) * SCALE, r = Math.sqrt(x * x + y * y);
    return [-90 + 2 * Math.atan(0.5 * r / R) / RAD, ((Math.atan2(x, y) / RAD) % 360 + 360) % 360];
  }
  // point reached from (lat, lon) going dist metres along a great circle; bearing clockwise from north
  function destination(lat1, lon1, sinLat1, cosLat1, b, dist) {
    var a = dist / R, sa = Math.sin(a), ca = Math.cos(a);
    var sinLat2 = sinLat1 * ca + cosLat1 * sa * Math.cos(b);
    if (sinLat2 > 1) sinLat2 = 1; else if (sinLat2 < -1) sinLat2 = -1;
    var lat2 = Math.asin(sinLat2);
    var lon2 = lon1 + Math.atan2(Math.sin(b) * sa * cosLat1, ca - sinLat1 * sinLat2);
    return [lat2, lon2];
  }
  function pixOf(lat2, lon2) {      // radians in, pixel coords out
    var r = 2 * R * Math.tan(Math.PI / 4 + lat2 / 2);
    return [C0 - r * Math.cos(lon2) / SCALE, C0 + r * Math.sin(lon2) / SCALE];
  }

  /* ---------- heights in metres, bilinear; NaN where there is no data ---------- */

  function px(r, c) {
    var t = tile((r >> 7) + "_" + (c >> 7));
    return t ? t[(r & 127) * TILE + (c & 127)] : NaN;
  }
  function fine(row, col) {
    if (!(row >= 0 && row <= N - 1.001 && col >= 0 && col <= N - 1.001)) return NaN;
    var r0 = Math.min(Math.floor(row), N - 2), c0 = Math.min(Math.floor(col), N - 2), fr = row - r0, fc = col - c0;
    return (px(r0, c0) * (1 - fr) * (1 - fc) + px(r0, c0 + 1) * (1 - fr) * fc +
            px(r0 + 1, c0) * fr * (1 - fc) + px(r0 + 1, c0 + 1) * fr * fc) * 0.5;
  }
  function rough(row, col) {
    var m = coarseMap();
    if (!m) return NaN;
    var r = (row - m.off) / m.k, c = (col - m.off) / m.k, n = m.n;
    if (!(r >= 0 && r <= n - 1.001 && c >= 0 && c <= n - 1.001)) return NaN;
    var r0 = Math.min(Math.floor(r), n - 2), c0 = Math.min(Math.floor(c), n - 2), fr = r - r0, fc = c - c0, z = m.z;
    return z[r0 * n + c0] * (1 - fr) * (1 - fc) + z[r0 * n + c0 + 1] * (1 - fr) * fc +
           z[(r0 + 1) * n + c0] * fr * (1 - fc) + z[(r0 + 1) * n + c0 + 1] * fr * fc;
  }
  function best(row, col) { var h = fine(row, col); return h === h ? h : rough(row, col); }

  /* ---------- which data files a place needs ---------- */

  var REACH_PX = Math.ceil(18200 / SCALE) + 2;       // 3D square corner, 12.8 km x sqrt(2)
  function check(lat, lon) {
    if (!(lat >= -90 && lat <= -85)) return "Choose a place between 85° and 90° south.";
    if (!(lon >= -360 && lon <= 360)) return "Longitude must be between −180° and 360°.";
    return "";
  }
  function needed(lat, lon) {
    var p = toPix(lat, lon), out = [];
    var r0 = Math.floor((p[0] - REACH_PX) / TILE), r1 = Math.floor((p[0] + REACH_PX) / TILE);
    var c0 = Math.floor((p[1] - REACH_PX) / TILE), c1 = Math.floor((p[1] + REACH_PX) / TILE);
    for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) out.push(r + "_" + c);
    return out;
  }

  /* ---------- the horizon and the hills that make it ---------- */

  function distances() {
    var d = [], x;
    for (x = 20; x < NEAR_M; x += 20) d.push(x);                // fine map, same steps as the engine
    var nNear = d.length;
    for (x = NEAR_M; x < 20000; x += 200) d.push(x);           // coarse map
    for (x = 20000; x <= MAX_M + 1; x += 640) d.push(x);
    return { d: d, nNear: nNear };
  }
  var DIST = distances();

  function horizon(lat, lon) {
    var la = lat * RAD, lo = lon * RAD, sl = Math.sin(la), cl = Math.cos(la);
    var p0 = toPix(lat, lon), z0 = fine(p0[0], p0[1]);
    if (z0 !== z0) throw new Error("no 80 m ground data under this place");
    var d = DIST.d, nd = d.length, nNear = DIST.nNear, nAz = 720;
    var z = new Float64Array(nd), th = new Float64Array(nd), drop = new Float64Array(nd);
    for (var k = 0; k < nd; k++) { th[k] = d[k] / R; drop[k] = R * (1 - Math.cos(th[k])); }
    var out = {}, ridge = {};
    HEIGHTS.forEach(function (h) { out[h] = new Array(nAz); ridge[h] = { dist_km: new Array(nAz), rise_m: new Array(nAz) }; });
    var reach = Infinity, farthest = new Float64Array(nAz), peaks = new Array(nAz);
    for (var i = 0; i < nAz; i++) {
      var b = i * 0.5 * RAD, last = 0;
      for (k = 0; k < nd; k++) {
        var q = destination(la, lo, sl, cl, b, d[k]), pp = pixOf(q[0], q[1]);
        z[k] = k < nNear ? fine(pp[0], pp[1]) : rough(pp[0], pp[1]);
        if (z[k] === z[k]) last = d[k];
      }
      reach = Math.min(reach, last / 1000);
      var far = 0, pk = [];
      for (var hi = 0; hi < HEIGHTS.length; hi++) {
        var r1 = R + z0 + parseFloat(HEIGHTS[hi]), top = -90, at = -1;
        for (k = 0; k < nd; k++) {
          if (z[k] !== z[k]) continue;
          var r2 = R + z[k], el = Math.atan2(r2 * Math.cos(th[k]) - r1, r2 * Math.sin(th[k]));
          if (el > top) { top = el; at = k; }
        }
        var H = HEIGHTS[hi];
        out[H][i] = top / RAD;
        var rise = at < 0 ? 0 : Math.round(z[at] - z0 - drop[at]), dk = at < 0 ? 0 : d[at];
        ridge[H].dist_km[i] = Math.round(dk / 10) / 100;
        ridge[H].rise_m[i] = rise;
        if (dk > far) far = dk;
        pk.push([Math.round(dk) / 1000, rise]);
      }
      farthest[i] = far; peaks[i] = pk;
    }
    return { z0: z0, horizons: out, ridge: ridge, reach: reach, farthest: farthest, peaks: peaks };
  }

  // side views every 2 degrees, as build_ridges.py makes them
  function profiles(lat, lon, z0, farthest, peaks) {
    var la = lat * RAD, lo = lon * RAD, sl = Math.sin(la), cl = Math.cos(la), out = {};
    for (var i = 0; i < 720; i += 4) {
      var end = Math.max(3000, farthest[i] * 1.3), b = i * 0.5 * RAD, zs = [];
      for (var k = 0; k < 90; k++) {
        var x = end * k / 89, q = destination(la, lo, sl, cl, b, Math.max(x, 1)), pp = pixOf(q[0], q[1]);
        var h = best(pp[0], pp[1]);
        zs.push(h === h ? Math.round(h - z0 - R * (1 - Math.cos(x / R))) : null);
      }
      out[String(i)] = { end_km: Math.round(end / 10) / 100, z: zs, peaks: peaks[i] };
    }
    return out;
  }

  // 25.6 km square of ground for the 3D view, as build_terrain.py makes it
  function terrain(lat, lon, z0) {
    var n = 321, half = 12800, la = lat * RAD, lo = lon * RAD, sl = Math.sin(la), cl = Math.cos(la);
    var z = new Int16Array(n * n), mn = Infinity, mx = -Infinity;
    for (var r = 0; r < n; r++) {
      var north = half - r * 80;
      for (var c = 0; c < n; c++) {
        var east = -half + c * 80, dist = Math.sqrt(east * east + north * north);
        var q = destination(la, lo, sl, cl, Math.atan2(east, north), Math.max(dist, 0.01)), pp = pixOf(q[0], q[1]);
        var h = best(pp[0], pp[1]);
        var v = Math.round((h === h ? h : z0) - z0 - dist * dist / (2 * R));
        z[r * n + c] = v; if (v < mn) mn = v; if (v > mx) mx = v;
      }
    }
    return { n: n, step_m: 80, size_m: 25600, min_m: mn, max_m: mx, z: z };
  }

  /* ---------- Sun and Earth: same directions in space, seen from the new place ---------- */

  function frame(lat, lon) {
    var la = lat * RAD, lo = lon * RAD, sa = Math.sin(la), ca = Math.cos(la), so = Math.sin(lo), co = Math.cos(lo);
    return { E: [-so, co, 0], N: [-sa * co, -sa * so, ca], U: [ca * co, ca * so, sa] };
  }
  function track(ref, refZ, lat, lon, z0, azs, els, dist) {
    var A = frame(ref.lat, ref.lon), B = frame(lat, lon), n = azs.length;
    var pa = A.U.map(function (u) { return u * (R + refZ); }), pb = B.U.map(function (u) { return u * (R + z0); });
    var dx = pb[0] - pa[0], dy = pb[1] - pa[1], dz = pb[2] - pa[2];
    var az = new Array(n), el = new Array(n);
    for (var i = 0; i < n; i++) {
      var a = azs[i] * RAD, e = els[i] * RAD, ce = Math.cos(e), se = Math.sin(e), x = ce * Math.sin(a), y = ce * Math.cos(a);
      var vx = (x * A.E[0] + y * A.N[0] + se * A.U[0]) * dist - dx;
      var vy = (x * A.E[1] + y * A.N[1] + se * A.U[1]) * dist - dy;
      var vz = (x * A.E[2] + y * A.N[2] + se * A.U[2]) * dist - dz;
      var len = Math.sqrt(vx * vx + vy * vy + vz * vz);
      var ue = (vx * B.E[0] + vy * B.E[1] + vz * B.E[2]) / len;
      var un = (vx * B.N[0] + vy * B.N[1] + vz * B.N[2]) / len;
      var uu = (vx * B.U[0] + vy * B.U[1] + vz * B.U[2]) / len;
      az[i] = ((Math.atan2(ue, un) / RAD) % 360 + 360) % 360;
      el[i] = Math.asin(Math.max(-1, Math.min(1, uu))) / RAD;
    }
    return { az: az, el: el };
  }
  function nearestSite(sites, data, lat, lon, skipId) {
    var U = frame(lat, lon).U, bestId = null, bestDot = -2;
    sites.forEach(function (s) {
      if (s.id === skipId || !data[s.id] || data[s.id].custom) return;
      var V = frame(s.lat, s.lon).U, dot = U[0] * V[0] + U[1] * V[1] + U[2] * V[2];
      if (dot > bestDot) { bestDot = dot; bestId = s.id; }
    });
    return bestId;
  }

  /* ---------- everything the page needs, in the same shape as a prepared site file ---------- */

  function build(lat, lon, sites, data, opts) {
    var o = opts || {}, err = check(lat, lon);
    if (err) throw new Error(err);
    lon = ((lon + 180) % 360 + 360) % 360 - 180;
    var refId = nearestSite(sites, data, lat, lon, o.skipRef), ref = data[refId];
    if (!ref) throw new Error("no prepared site to take the Sun and Earth from");
    var hz = horizon(lat, lon);
    var sun = track(ref, ref.ground_m + ref.observer_m, lat, lon, hz.z0 + 2, ref.sun_az, ref.sun_el, D_SUN);
    var earth = track(ref, ref.ground_m + ref.observer_m, lat, lon, hz.z0 + 2, ref.earth_az, ref.earth_el, D_EARTH);
    var id = o.id || ("P" + lat.toFixed(4) + "_" + lon.toFixed(4));
    var site = {
      id: id, name: o.name || "Your place", region: Math.abs(lat).toFixed(2) + "° S, " + Math.abs(lon).toFixed(2) + "° " + (lon < 0 ? "W" : "E"),
      lat: lat, lon: lon, custom: true, ref: refId,
      source: "Chosen on the map. Horizon worked out in the browser from NASA LOLA (80 m near, 640 m far); Sun and Earth from the NASA/JPL Horizons table of " + ref.name + "."
    };
    var d = {};
    for (var key in site) d[key] = site[key];
    d.ground_m = Math.round(hz.z0 * 10) / 10;
    d.observer_m = 2;
    d.horizon_step_deg = 0.5;
    d.horizons = hz.horizons;
    d.horizon = hz.horizons["2"];
    d.horizon_reach_km_min = Math.round(hz.reach * 10) / 10;
    d.t0 = ref.t0; d.step_h = ref.step_h; d.n = ref.n;
    d.sun_az = sun.az; d.sun_el = sun.el; d.earth_az = earth.az; d.earth_el = earth.el;
    d.sun_width_deg = ref.sun_width_deg; d.earth_width_deg = ref.earth_width_deg;
    var ridges = null, ground = null;
    if (!o.skipExtras) {
      ridges = { step_deg: 0.5, ground_m: d.ground_m, by_height: hz.ridge, profile_every: 4,
                 profiles: profiles(lat, lon, hz.z0, hz.farthest, hz.peaks) };
      ground = terrain(lat, lon, hz.z0);
      ground.id = id;
    }
    return { site: { id: id, name: site.name, region: site.region, lat: lat, lon: lon, custom: true }, data: d, ridges: ridges, terrain: ground };
  }

  root.LANDER_CUSTOM_CALC = { build: build, check: check, needed: needed, toPix: toPix, fromPix: fromPix,
                              hasTiles: function (keys) { return keys.every(function (k) { return !!store()["f_" + k] || !!tiles[k]; }); } };
})(typeof window !== "undefined" ? window : globalThis);
