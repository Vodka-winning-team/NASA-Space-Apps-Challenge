/* Will the lander survive? — app logic. Written with AI assistance (Claude).
   Data: docs/data/*.js, built by engine/ from NASA LOLA and NASA/JPL Horizons. */
(function () {
  "use strict";

  var SITES = window.LANDER_SITES, DATA = window.LANDER_DATA, MORIS = window.LANDER_MORIS;
  var T0 = Date.UTC(2027, 0, 1), HOUR = 3600000;
  var RATE = 3;                      // energy made per hour in full Sun; the lander uses 1 per hour
  var DAY_CHOICES = [7, 14, 30, 60];
  var MAST_CHOICES = ["0.5", "2", "10"];   // solar panel height above the ground, metres
  var C = { bg: "#0e1014", text: "#ece8dc", t2: "#b9b5a9", t3: "#918e84",
            sun: "#f2b544", earth: "#6ea8e6", live: "#58d08a", close: "#c9c14a", dead: "#ec6049",
            line: "rgba(232,228,216,0.10)", line2: "rgba(232,228,216,0.22)" };
  var MONO = '"Archivo", system-ui, "Segoe UI", sans-serif';   // chart labels use the same face as the page
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  var $ = function (id) { return document.getElementById(id); };
  var state = { site: "HW06", start: 0, days: 14, batt: 96, mast: "2", hour: 0 };
  var prepCache = {}, playing = null;

  /* ---------- the science ---------- */

  function horizonAt(d, az) {
    var step = d.horizon_step_deg, n = d.horizon.length;
    var p = (((az % 360) + 360) % 360) / step, i = Math.floor(p), f = p - i;
    return d.horizon[i % n] * (1 - f) + d.horizon[(i + 1) % n] * f;
  }

  // For every hour: how much of the Sun's disc is above the hills (0 to 1),
  // and whether the centre of the Earth is above the hills.
  function prep(id) {
    var key = id + "|" + state.mast;
    if (prepCache[key]) return prepCache[key];
    var d = Object.create(DATA[id]);            // same site, hill line for the chosen panel height
    d.horizon = DATA[id].horizons[state.mast];
    var n = d.n, r = d.sun_width_deg / 2;
    var sun = new Float32Array(n), earth = new Uint8Array(n);
    for (var i = 0; i < n; i++) {
      var f = (d.sun_el[i] + r - horizonAt(d, d.sun_az[i])) / (2 * r);
      sun[i] = f < 0 ? 0 : f > 1 ? 1 : f;
      earth[i] = d.earth_el[i] > horizonAt(d, d.earth_az[i]) ? 1 : 0;
    }
    return (prepCache[key] = { d: d, sun: sun, earth: earth });
  }

  // Run the battery through a mission. Charge is in "hours of life without Sun".
  // opts (optional): { rate, load, charge (start, 0-1), sunScale } for the "how sure" scenarios
  function sim(P, start, hours, batt, keep, opts) {
    var o = opts || {}, rate = o.rate || RATE, load = o.load || 1, sunScale = o.sunScale || 1;
    var c = batt * (o.charge || 1), min = c, died = -1, sunSum = 0, earthSum = 0, dark = 0, longest = 0, lastFull = 0;
    var series = keep ? new Float32Array(hours + 1) : null;
    if (series) series[0] = c;
    for (var h = 0; h < hours; h++) {
      var s = P.sun[start + h];
      sunSum += s; earthSum += P.earth[start + h];
      if (s * rate * sunScale < load) { dark++; if (dark > longest) longest = dark; } else dark = 0;
      if (died < 0) {
        c += s * sunScale * rate - load;
        if (c >= batt) { c = batt; lastFull = h + 1; }
        if (c < min) min = c;
        if (c <= 0) { c = 0; min = 0; died = h + 1; }
      }
      if (series) series[h + 1] = c;
    }
    return { alive: died < 0, died: died, min: min / batt, sun: sunSum / hours, earth: earthSum / hours,
             longestDark: longest, lastFull: lastFull, series: series };
  }

  function maxStart() { return DATA[state.site].n - 1 - state.days * 24; }
  function hoursTotal() { return state.days * 24; }

  /* ---------- small helpers ---------- */

  function fmtDate(idx, withDow) {
    var t = new Date(T0 + idx * HOUR);
    return (withDow ? DOW[t.getUTCDay()] + " " : "") + t.getUTCDate() + " " + MONTHS[t.getUTCMonth()] + " " + t.getUTCFullYear();
  }
  function iso(idx) { return new Date(T0 + idx * HOUR).toISOString().slice(0, 10); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function morisTime(idx) {           // Mauritius is UTC+4
    var t = new Date(T0 + (idx + 4) * HOUR);
    return DOW[t.getUTCDay()] + " " + t.getUTCDate() + " " + MONTHS[t.getUTCMonth()] + ", " + pad(t.getUTCHours()) + ":00";
  }
  function fit(canvas) {
    var r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    var w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    }
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx: ctx, w: w, h: h };
  }
  function gut() { return parseFloat(getComputedStyle(document.querySelector(".slip")).paddingLeft) || 16; }

  /* ---------- controls ---------- */

  function buildControls() {
    SITES.forEach(function (s) {
      var b = document.createElement("button");
      b.type = "button"; b.setAttribute("role", "radio"); b.dataset.id = s.id; b.textContent = s.name;
      b.onclick = function () { state.site = s.id; clampStart(); state.hour = 0; refresh(); };
      $("sites").appendChild(b);
    });
    // the same six places as dots on the map of the south pole
    var MOON_R = 1737400, MAP_HALF = 215000;
    SITES.forEach(function (s) {
      var r = 2 * MOON_R * Math.tan(Math.PI / 4 + s.lat * Math.PI / 360), lon = s.lon * Math.PI / 180;
      var b = document.createElement("button");
      b.type = "button"; b.className = "dot"; b.setAttribute("role", "radio"); b.dataset.id = s.id;
      b.setAttribute("aria-label", s.name);
      b.style.left = (50 + r * Math.sin(lon) / MAP_HALF * 50) + "%";
      b.style.top = (50 - r * Math.cos(lon) / MAP_HALF * 50) + "%";
      b.innerHTML = "<span>" + s.name + "</span>";
      b.onclick = function () { state.site = s.id; clampStart(); state.hour = 0; refresh(); };
      $("moon").appendChild(b);
    });
    DAY_CHOICES.forEach(function (n) {
      var b = document.createElement("button");
      b.type = "button"; b.setAttribute("role", "radio"); b.dataset.n = n; b.textContent = n + " days";
      b.setAttribute("aria-label", n + " days");
      b.onclick = function () { state.days = n; clampStart(); state.hour = 0; refresh(); };
      $("days").appendChild(b);
    });
    MAST_CHOICES.forEach(function (m) {
      var b = document.createElement("button");
      b.type = "button"; b.setAttribute("role", "radio"); b.dataset.m = m; b.textContent = m + " m";
      b.setAttribute("aria-label", m + " metres");
      b.onclick = function () { state.mast = m; refresh(); };
      $("mast").appendChild(b);
    });
    $("date").onchange = function () {
      var t = Date.parse(this.value + "T00:00:00Z");
      if (isNaN(t)) return;
      state.start = Math.round((t - T0) / HOUR); clampStart(); state.hour = 0; refresh();
    };
    $("batt").oninput = function () { state.batt = +this.value; state.hour = Math.min(state.hour, hoursTotal()); refresh(); };
    $("play").onclick = togglePlay;
  }
  function clampStart() {
    state.start = Math.max(0, Math.min(maxStart(), Math.round(state.start / 24) * 24));
  }
  function syncControls() {
    [].forEach.call($("sites").children, function (b) { b.setAttribute("aria-checked", b.dataset.id === state.site); });
    [].forEach.call($("moon").querySelectorAll(".dot"), function (b) { b.setAttribute("aria-checked", b.dataset.id === state.site); });
    [].forEach.call($("days").children, function (b) { b.setAttribute("aria-checked", +b.dataset.n === state.days); });
    [].forEach.call($("mast").children, function (b) { b.setAttribute("aria-checked", b.dataset.m === state.mast); });
    $("date").value = iso(state.start);
    $("date").max = iso(maxStart());
    $("batt").value = state.batt;
    var d = Math.floor(state.batt / 24), h = state.batt % 24;
    $("battOut").textContent = (d ? d + (d === 1 ? " day" : " days") : "") + (d && h ? " " : "") + (h ? h + " h" : "");
    $("setSum").textContent = state.days + "-day mission · battery lasts " + $("battOut").textContent +
      " without Sun · panel " + state.mast + " m high";
  }

  /* ---------- verdict ---------- */

  var run;   // result of the current mission, with the battery series

  function drawVerdict() {
    var v = $("verdict");
    $("vLabel").textContent = DATA[state.site].name + " · landing " + fmtDate(state.start) + " · " + state.days + "-day mission";
    v.classList.toggle("dead", !run.alive);
    if (run.alive) {
      var low = run.min < 0.25;
      $("vText").textContent = low ? "Survived, just." : "Survived.";
      $("vWhy").textContent = (low ? "The battery fell to " + Math.round(run.min * 100) + "%, so there is little room for error. " : "") + (run.longestDark === 0
        ? "The Sun never stayed behind the hills long enough to drain the battery."
        : "The longest stretch without enough Sun was " + run.longestDark + " hours. The battery lasts " + state.batt + " hours.");
    } else {
      var day = Math.floor((run.died - 1) / 24) + 1;
      $("vText").textContent = "Lost on day " + day + ".";
      $("vWhy").textContent = "The hills hid the Sun for too long. The battery was last full " +
        (run.lastFull === 0 ? "at landing" : "on day " + (Math.floor(run.lastFull / 24) + 1)) +
        " and ran out " + (run.died - run.lastFull) + " hours later.";
    }
    $("vFacts").innerHTML = "Over these " + state.days + " days, the Sun is above the hills <b>" + Math.round(run.sun * 100) +
      "%</b> of the time and Earth is in view <b>" + Math.round(run.earth * 100) + "%</b> of the time.";
  }

  /* ---------- the view from the lander ---------- */

  function drawPano() {
    var P = prep(state.site), d = P.d, o = fit($("pano")), ctx = o.ctx, W = o.w, H = o.h;
    var i = Math.min(d.n - 1, state.start + Math.round(state.hour));
    var hi = Math.max.apply(null, d.horizon), lo = Math.min.apply(null, d.horizon);
    if (!P.top) {   // highest the Earth or Sun ever gets here, so neither leaves the picture
      P.top = Math.max(Math.max.apply(null, d.earth_el) + d.earth_width_deg / 2, Math.max.apply(null, d.sun_el));
    }
    var elMax = Math.max(9, Math.ceil(hi) + 2.5, P.top + 2.2), elMin = Math.min(-6.5, Math.floor(lo) - 3);   // leaves room for the ground and the lander
    var ys = H / (elMax - elMin);
    var X = function (az) { return ((((az + 180) % 360) + 360) % 360) / 360 * W; };
    var Y = function (el) { return H - (el - elMin) * ys; };

    var sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#07080b"); sky.addColorStop(1, "#11141a");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

    // level line and compass
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.setLineDash([2, 6]);
    ctx.beginPath(); ctx.moveTo(0, Y(0)); ctx.lineTo(W, Y(0)); ctx.stroke(); ctx.setLineDash([]);
    ctx.font = "500 12px " + MONO; ctx.fillStyle = C.t3; ctx.textBaseline = "top";
    [["S", -180], ["W", -90], ["N", 0], ["E", 90]].forEach(function (c) {
      var x = X(c[1]); ctx.textAlign = c[0] === "S" ? "left" : "center";
      ctx.fillText(c[0], c[0] === "S" ? gut() : x, 12);
      if (c[0] !== "S") { ctx.fillStyle = C.line2; ctx.fillRect(x, 28, 1, 6); ctx.fillStyle = C.t3; }
    });

    // where the Sun and Earth go during the mission
    var hours = hoursTotal(), k;
    ctx.fillStyle = "rgba(242,181,68,0.30)";
    for (k = 0; k <= hours; k += 3) ctx.fillRect(X(d.sun_az[state.start + k]) - 0.75, Y(d.sun_el[state.start + k]) - 0.75, 1.5, 1.5);
    ctx.fillStyle = "rgba(110,168,230,0.30)";
    for (k = 0; k <= hours; k += 3) ctx.fillRect(X(d.earth_az[state.start + k]) - 0.75, Y(d.earth_el[state.start + k]) - 0.75, 1.5, 1.5);

    // Earth, then Sun (the hills are drawn over them afterwards)
    var ex = X(d.earth_az[i]), ey = Y(d.earth_el[i]), er = Math.max(9, d.earth_width_deg / 2 * ys);
    ctx.fillStyle = C.earth; ctx.beginPath(); ctx.arc(ex, ey, er, 0, 6.2832); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.beginPath(); ctx.arc(ex - er * 0.25, ey - er * 0.3, er * 0.45, 0, 6.2832); ctx.fill();

    var sx = X(d.sun_az[i]), sy = Y(d.sun_el[i]), sr = Math.max(5, d.sun_width_deg / 2 * ys);
    var glow = ctx.createRadialGradient(sx, sy, sr * 0.5, sx, sy, sr * 9);
    glow.addColorStop(0, "rgba(242,181,68,0.55)"); glow.addColorStop(1, "rgba(242,181,68,0)");
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(sx, sy, sr * 9, 0, 6.2832); ctx.fill();
    ctx.fillStyle = "#fff3d0"; ctx.beginPath(); ctx.arc(sx, sy, sr, 0, 6.2832); ctx.fill();

    // the hills
    var n = d.horizon.length, step = d.horizon_step_deg, j, az;
    ctx.beginPath(); ctx.moveTo(0, H);
    for (j = 0; j <= n; j++) { az = -180 + j * step; ctx.lineTo(j / n * W, Y(horizonAt(d, az))); }
    ctx.lineTo(W, H); ctx.closePath();
    var g = ctx.createLinearGradient(0, Y(hi), 0, H);
    g.addColorStop(0, "#2b2e35"); g.addColorStop(1, "#16181d");
    ctx.fillStyle = g; ctx.fill();
    ctx.beginPath();
    for (j = 0; j <= n; j++) { az = -180 + j * step; var yy = Y(horizonAt(d, az)); if (j) ctx.lineTo(j / n * W, yy); else ctx.moveTo(0, yy); }
    ctx.strokeStyle = P.sun[i] > 0 ? "rgba(255,236,196,0.55)" : "rgba(232,228,216,0.22)"; ctx.lineWidth = 1.25; ctx.stroke();

    // the direction picked in "Which hill hid the Sun?"
    if (ridgePick) {
      var rxp = X(ridgePick.az), ryp = Y(horizonAt(d, ridgePick.az));
      ctx.strokeStyle = C.dead; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(rxp, ryp - 8); ctx.lineTo(rxp, H); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(rxp - 5, ryp); ctx.lineTo(rxp, ryp - 5); ctx.lineTo(rxp + 5, ryp); ctx.lineTo(rxp, ryp + 5); ctx.closePath(); ctx.stroke();
    }

    // "you are here": the lander on the ground, and a name for the ground itself
    var lx = W / 2, ly = H - 12;
    ctx.strokeStyle = C.text; ctx.lineWidth = 1.5; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(lx - 7, ly - 10); ctx.lineTo(lx - 14, ly); ctx.moveTo(lx + 7, ly - 10); ctx.lineTo(lx + 14, ly);   // legs
    ctx.moveTo(lx - 17, ly); ctx.lineTo(lx - 11, ly); ctx.moveTo(lx + 11, ly); ctx.lineTo(lx + 17, ly);           // feet
    ctx.moveTo(lx, ly - 20); ctx.lineTo(lx, ly - 30);                                                             // mast
    ctx.stroke();
    ctx.fillStyle = C.text; ctx.fillRect(lx - 9, ly - 20, 18, 10);                                                // body
    ctx.fillStyle = C.sun; ctx.fillRect(lx - 13, ly - 35, 26, 5);                                                 // solar panel
    ctx.font = "600 13px " + MONO; ctx.textBaseline = "middle"; ctx.textAlign = "left"; ctx.fillStyle = C.text;
    ctx.fillText("The lander is here", lx + 26, ly - 12);
    ctx.font = "500 13px " + MONO; ctx.fillStyle = C.t2; ctx.textAlign = "left";
    ctx.fillText("The Moon's surface", gut(), ly - 12);

    // labels
    ctx.font = "600 12px " + MONO; ctx.textBaseline = "middle";
    var label = function (txt, x, y, r, col, side) {
      var tw = ctx.measureText(txt).width;
      var right = side ? side > 0 : x + r + 10 + tw < W - 8;
      if (right && x + r + 10 + tw > W - 4) right = false;
      if (!right && x - r - 10 - tw < 4) right = true;
      ctx.textAlign = right ? "left" : "right"; ctx.fillStyle = col;
      ctx.fillText(txt, right ? x + r + 8 : x - r - 8, Math.max(14, Math.min(H - 12, y)));
    };
    var sly = Math.min(sy, Y(horizonAt(d, d.sun_az[i])) - 12), ely = Math.min(ey, Y(horizonAt(d, d.earth_az[i])) - 12);
    var near = Math.abs(sx - ex) < 110 && Math.abs(sly - ely) < 16;   // keep the two names apart
    label("SUN", sx, sly, sr, C.sun, near ? (sx < ex ? -1 : 1) : 0);
    label("EARTH", ex, ely, er, C.earth, near ? (sx < ex ? 1 : -1) : 0);

    // status
    var hr = Math.round(state.hour), day = Math.floor(hr / 24) + 1;
    $("now").textContent = (hr >= hours ? "End of mission" : "Day " + day + " of " + state.days) + " · " + fmtDate(state.start + hr) + ", " + pad((state.start + hr) % 24) + ":00 UTC";
    hourListeners.forEach(function (f) { try { f(i); } catch (e) { console.error(e); } });
    var sunPct = Math.round(P.sun[i] * 100), charge = Math.round(run.series[Math.min(hr, hours)] / state.batt * 100);
    var lost = !run.alive && hr >= run.died, mUp = MORIS.up.charAt(i) === "1";
    $("chips").innerHTML =
      '<span class="' + (sunPct ? "" : "off") + '"><i style="background:' + C.sun + '"></i>' + (sunPct >= 99 ? "<b>Sun is out</b>" : sunPct ? "<b>Sun is " + sunPct + "% out</b>" : "<b>Sun is hidden</b>") + "</span>" +
      '<span class="' + (P.earth[i] ? "" : "off") + '"><i style="background:' + C.earth + '"></i>' + (lost ? "<b>No contact</b>, lander lost" : P.earth[i] ? "<b>Earth in view</b>, can talk home" : "<b>Earth is hidden</b>, no contact") + "</span>" +
      '<span><i style="background:' + (lost ? C.dead : C.live) + '"></i>' + (lost ? "<b>Lander lost</b>" : "Battery <b>" + charge + "%</b>") + "</span>";
  }

  /* ---------- mission timeline ---------- */

  var timeGeom = null;

  function drawTime() {
    var P = prep(state.site), o = fit($("time")), ctx = o.ctx, W = o.w, H = o.h;
    var hours = hoursTotal(), L = gut(), Rr = W - gut(), pw = Rr - L;
    var top = 22, stripH = 14, gap = 26, strips = 2;
    var chartB = H - 22 - strips * (stripH + gap) - 4, ch = chartB - top;
    var X = function (h) { return L + h / hours * pw; };
    timeGeom = { L: L, pw: pw, hours: hours };

    // battery frame
    ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    [0, 0.5, 1].forEach(function (f) { var y = Math.round(chartB - f * ch) + 0.5; ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(Rr, y); ctx.stroke(); });
    ctx.font = "500 12px " + MONO; ctx.fillStyle = C.t3; ctx.textAlign = "left"; ctx.textBaseline = "bottom";
    ctx.fillText("Battery full", L, top - 4);
    ctx.textBaseline = "bottom"; ctx.fillText("Empty", L, chartB - 4);

    // range of outcomes under other assumptions (see "How sure is this?")
    if (sure && sure.lo && !document.body.classList.contains("mode-simple")) {   // planner view only
      ctx.beginPath();
      for (h = 0; h <= hours; h++) ctx.lineTo(X(h), chartB - sure.hi[h] / state.batt * ch);
      for (h = hours; h >= 0; h--) ctx.lineTo(X(h), chartB - sure.lo[h] / state.batt * ch);
      ctx.closePath(); ctx.fillStyle = "rgba(236,232,220,0.07)"; ctx.fill();
      ctx.setLineDash([3, 4]); ctx.strokeStyle = "rgba(236,232,220,0.35)"; ctx.lineWidth = 1;
      ctx.beginPath(); for (h = 0; h <= hours; h++) ctx.lineTo(X(h), chartB - sure.lo[h] / state.batt * ch); ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = "500 12px " + MONO; ctx.fillStyle = C.t3; ctx.textAlign = "right"; ctx.textBaseline = "bottom";
      ctx.fillText("Dashed line: if everything goes wrong", Rr, top - 4);
    }

    // battery curve
    var endH = run.alive ? hours : run.died, h;
    var col = run.alive ? C.live : C.dead;
    ctx.beginPath(); ctx.moveTo(X(0), chartB);
    for (h = 0; h <= endH; h++) ctx.lineTo(X(h), chartB - run.series[h] / state.batt * ch);
    ctx.lineTo(X(endH), chartB); ctx.closePath();
    var g = ctx.createLinearGradient(0, top, 0, chartB);
    g.addColorStop(0, run.alive ? "rgba(88,208,138,0.30)" : "rgba(232,87,63,0.30)"); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fill();
    ctx.beginPath();
    for (h = 0; h <= endH; h++) { var y = chartB - run.series[h] / state.batt * ch; if (h) ctx.lineTo(X(h), y); else ctx.moveTo(X(0), y); }
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.lineJoin = "round"; ctx.stroke();
    if (!run.alive) {
      var dx = X(run.died);
      ctx.fillStyle = "rgba(232,87,63,0.07)"; ctx.fillRect(dx, top, Rr - dx, chartB - top);
      ctx.strokeStyle = C.dead; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);   // a marker, not a recharge
      ctx.beginPath(); ctx.moveTo(dx, top); ctx.lineTo(dx, chartB); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.dead; ctx.font = "600 12px " + MONO; ctx.textBaseline = "top";
      var txt = "Battery empty: lander lost"; var right = dx + 8 + ctx.measureText(txt).width < Rr;
      ctx.textAlign = right ? "left" : "right"; ctx.fillText(txt, right ? dx + 8 : dx - 8, top + 4);
    }

    // strips: Sun, Earth, Mauritius moment
    var y0 = chartB + gap + 2, names = ["Sun on the panels", "Earth in view (can talk home)"], s, x0, x1;
    for (s = 0; s < strips; s++) {
      var sy = y0 + s * (stripH + gap);
      ctx.font = "500 12px " + MONO; ctx.fillStyle = C.t3; ctx.textAlign = "left"; ctx.textBaseline = "bottom";
      ctx.fillText(names[s], L, sy - 4);
      ctx.fillStyle = "rgba(232,228,216,0.05)"; ctx.fillRect(L, sy, pw, stripH);
      for (h = 0; h < hours; h++) {
        var idx = state.start + h, a = 0;
        a = s === 0 ? P.sun[idx] : P.earth[idx];
        if (a <= 0) continue;
        x0 = X(h); x1 = X(h + 1);
        ctx.globalAlpha = s === 0 ? 0.25 + 0.75 * a : 1;
        ctx.fillStyle = s === 0 ? C.sun : s === 1 ? C.earth : C.text;
        ctx.fillRect(x0, sy, Math.max(x1 - x0 + 0.5, 0.75), stripH);
      }
      ctx.globalAlpha = 1;
    }

    // day ticks
    var every = 1, nice = [1, 2, 5, 7, 10, 15, 20, 30];
    for (var q = 0; q < nice.length; q++) { every = nice[q]; if (pw / state.days * every >= 70) break; }
    ctx.font = "500 12px " + MONO; ctx.fillStyle = C.t3; ctx.textBaseline = "bottom";
    for (var dd = 0; dd <= state.days; dd += every) {
      if (dd !== 0 && dd !== state.days && state.days - dd < every * 0.9) continue;   // keep clear of the last label
      ctx.textAlign = dd === 0 ? "left" : dd === state.days ? "right" : "center";
      ctx.fillText(dd === 0 ? "Landing" : "Day " + dd, X(dd * 24), H - 2);
    }
    if (state.days % every) { ctx.textAlign = "right"; ctx.fillText("Day " + state.days, X(hours), H - 2); }

    // cursor
    var cx = Math.round(X(state.hour)) + 0.5;
    ctx.strokeStyle = C.text; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, top - 6); ctx.lineTo(cx, H - 18); ctx.stroke();
    ctx.fillStyle = C.text; ctx.beginPath(); ctx.arc(cx, chartB - run.series[Math.round(state.hour)] / state.batt * ch, 4, 0, 6.2832); ctx.fill();
  }

  function bindTime() {
    var c = $("time"), down = false;
    var move = function (e) {
      if (!timeGeom) return;
      var r = c.getBoundingClientRect();
      var h = (e.clientX - r.left - timeGeom.L) / timeGeom.pw * timeGeom.hours;
      state.hour = Math.max(0, Math.min(timeGeom.hours, Math.round(h)));
      stopPlay(); drawPano(); drawTime();
    };
    c.addEventListener("pointerdown", function (e) { down = true; c.setPointerCapture(e.pointerId); move(e); });
    c.addEventListener("pointermove", function (e) { if (down) move(e); });
    c.addEventListener("pointerup", function () { down = false; });
    c.addEventListener("pointercancel", function () { down = false; });
  }

  function togglePlay() { if (playing) stopPlay(); else startPlay(); }
  function stopPlay() {
    if (playing) cancelAnimationFrame(playing);
    playing = null; $("play").textContent = "Play the mission";
  }
  function startPlay() {
    var hours = hoursTotal(), end = run.alive ? hours : Math.min(hours, run.died + 6);
    if (state.hour >= end) state.hour = 0;
    var from = state.hour, t0 = performance.now(), dur = 9000 * (end - from) / end + 600;
    $("play").textContent = "Pause";
    var tick = function (t) {
      var p = Math.min(1, (t - t0) / dur);
      state.hour = from + (end - from) * p;
      drawPano(); drawTime();
      if (p < 1) playing = requestAnimationFrame(tick); else stopPlay();
    };
    playing = requestAnimationFrame(tick);
  }

  /* ---------- what if we land late ---------- */

  function grade(r) { return !r.alive ? "dead" : r.min < 0.25 ? "close" : "live"; }
  function shortDate(idx) { var t = new Date(T0 + idx * HOUR); return t.getUTCDate() + " " + MONTHS[t.getUTCMonth()]; }
  function plural(n, word) { return n + " " + word + (n === 1 ? "" : "s"); }

  function drawSlip() {
    var P = prep(state.site), box = $("slip"), hours = hoursTotal(), html = "", res = [];
    for (var k = 0; k < 15; k++) {
      var st = state.start + k * 24;
      if (st > maxStart()) break;
      var r = sim(P, st, hours, state.batt, false), g = grade(r);
      res.push(r);
      var say = fmtDate(st) + ": " + (r.alive ? (g === "close" ? "lander survives, battery drops below 25%" : "lander survives") : "lander lost on day " + (Math.floor((r.died - 1) / 24) + 1));
      // a symbol as well as a colour, so the answer does not depend on seeing red and green
      html += '<button type="button" class="' + g + '" data-k="' + k + '"' + (k === 0 ? ' aria-current="true"' : "") +
              ' title="' + say + '" aria-label="' + say + '"><span class="sym">' + (g === "dead" ? "\u2715" : g === "close" ? "!" : "\u2713") +
              '</span><span class="when">' + shortDate(st) + '</span><span class="plus">' + (k === 0 ? "chosen" : "+" + k + (k === 1 ? " day" : " days")) + "</span></button>";
    }
    box.innerHTML = html;
    [].forEach.call(box.children, function (b) {
      b.onclick = function () { state.start += (+b.dataset.k) * 24; clampStart(); state.hour = 0; refresh(); };
    });

    // the takeaway, in one sentence
    var flip = -1;
    for (k = 1; k < res.length; k++) if (res[k].alive !== res[0].alive) { flip = k; break; }
    var msg;
    if (!res[0].alive) {
      msg = flip > 0 ? "Wait <b>" + plural(flip, "day") + "</b>, land on " + shortDate(state.start + flip * 24) + ", and the lander <b>survives</b>."
                     : (res.length < 15 ? "No later landing date we have data for works here." : "No landing date in the next two weeks works here.") + " Try another place or a bigger battery.";
    } else {
      msg = flip > 0 ? "This date works. But slip by <b>" + plural(flip, "day") + "</b> and the lander <b>would be lost</b>."
                     : res.length < 15 ? "This date works, and so does every later date we have data for (" + plural(res.length - 1, "more day") + ")."
                     : "This date works, and so does every day for the next two weeks.";
      if (res[0].min < 0.25) msg += " But the battery drops below 25%, so it is close.";
    }
    if (res.length < 15 && !(res[0].alive && flip < 0)) msg += " Our data ends after " + shortDate(state.start + (res.length - 1) * 24) + ".";
    $("slipSay").innerHTML = msg;
  }

  /* ---------- two-year calendar ---------- */

  var calGeom = null;

  function drawCal() {
    var o = fit($("cal")), ctx = o.ctx, W = o.w, H = o.h, hours = hoursTotal();
    var nDays = Math.floor(maxStart() / 24) + 1, axisH = 22;
    var pitch = (H - axisH) / SITES.length, barH = Math.max(12, pitch - 22);
    var X = function (day) { return day / nDays * W; };
    calGeom = { nDays: nDays, axisH: axisH, pitch: pitch, W: W };

    // months
    ctx.font = "500 12px " + MONO; ctx.textBaseline = "top"; ctx.textAlign = "left";
    for (var m = 0; m < 24; m++) {
      var day = (Date.UTC(2027, m, 1) - T0) / 86400000;
      if (day >= nDays) break;
      var x = Math.round(X(day)) + 0.5;
      ctx.strokeStyle = m % 12 === 0 ? C.line2 : C.line; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      var wide = W / 24 > 30;
      if (wide || m % 3 === 0) {
        ctx.fillStyle = m % 12 === 0 ? C.t2 : C.t3;
        ctx.fillText(m % 12 === 0 ? String(2027 + m / 12) : (wide ? MONTHS[m % 12] : MONTHS[m % 12].charAt(0)), x + 4, 2);
      }
    }

    var stats = [];
    SITES.forEach(function (s, row) {
      var P = prep(s.id), y = axisH + row * pitch + 18, sel = s.id === state.site;
      ctx.font = (sel ? "600" : "500") + " 11px " + MONO; ctx.fillStyle = sel ? C.text : C.t3;
      ctx.textBaseline = "bottom"; ctx.textAlign = "left";
      ctx.fillStyle = C.bg; ctx.fillRect(0, y - 15, ctx.measureText(s.name).width + 8, 14);
      ctx.fillStyle = sel ? C.text : C.t3; ctx.fillText(s.name, 0, y - 3);
      var alive = 0;
      for (var d = 0; d < nDays; d++) {
        var r = sim(P, d * 24, hours, state.batt, false), g = grade(r);
        if (r.alive) alive++;
        ctx.fillStyle = g === "live" ? C.live : g === "close" ? C.close : C.dead;
        ctx.globalAlpha = g === "dead" ? 0.45 + 0.4 * (r.died / hours) : 1;
        ctx.fillRect(X(d), y, X(d + 1) - X(d) + 0.4, barH);
      }
      ctx.globalAlpha = 1;
      var share = Math.round(alive / nDays * 100), pct = share + "% of dates safe";
      stats.push({ name: s.name, share: share });
      ctx.font = "500 12px " + MONO; ctx.textAlign = "right";
      ctx.fillStyle = C.bg; ctx.fillRect(W - ctx.measureText(pct).width - 8, y - 15, ctx.measureText(pct).width + 8, 14);
      ctx.fillStyle = sel ? C.text : C.t3; ctx.fillText(pct, W, y - 3);
      if (sel) {
        var sx = X(state.start / 24), sw = Math.max(2, X(1) - X(0));
        ctx.fillStyle = C.text; ctx.fillRect(sx - 1, y - 4, sw + 2, barH + 8);
        ctx.fillStyle = C.bg; ctx.fillRect(sx, y - 3, sw, barH + 6);
        ctx.fillStyle = run.alive ? (run.min < 0.25 ? C.close : C.live) : C.dead; ctx.fillRect(sx, y, sw, barH);
      }
    });
    stats.sort(function (a, b) { return b.share - a.share; });
    var best = stats[0], worst = stats[stats.length - 1];
    $("calSay").innerHTML = "With these settings, <b>" + best.name + "</b> is the safest: the lander survives on " + best.share +
      "% of landing dates. <b>" + worst.name + "</b> is the riskiest, at " + worst.share + "%.";
  }

  function bindCal() {
    var c = $("cal");
    c.addEventListener("click", function (e) {
      if (!calGeom) return;
      var r = c.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      var row = Math.floor((y - calGeom.axisH) / calGeom.pitch);
      if (row < 0 || row >= SITES.length) return;
      state.site = SITES[row].id;
      state.start = Math.floor(x / calGeom.W * calGeom.nDays) * 24;
      clampStart(); state.hour = 0; refresh();
    });
  }

  /* ---------- Mauritius moment ---------- */

  function drawMoris() {
    var P = prep(state.site), hours = hoursTotal(), total = 0, first = -1, firstEnd = -1;
    var alive = run.alive ? hours : run.died;   // no contact after the lander is lost
    for (var h = 0; h < alive; h++) {
      var idx = state.start + h, on = P.earth[idx] && MORIS.up.charAt(idx) === "1";
      if (on) { total++; if (first < 0) first = idx; }
      else if (first >= 0 && firstEnd < 0) firstEnd = idx;
    }
    if (first >= 0 && firstEnd < 0) firstEnd = state.start + alive;
    if (total === 0) {
      $("morisText").innerHTML = (run.alive ? "Not on this mission." : "Not before the lander is lost.") + " The lander never has Earth in view while the Moon is over Port Louis.";
      $("morisSub").textContent = "Try another site or date.";
    } else {
      $("morisText").innerHTML = "Yes. For <b>" + total + " hours</b> of this mission, the lander can see Earth while the Moon is in the sky over Port Louis.";
      var t = new Date(T0 + (firstEnd + 4) * HOUR), t0 = new Date(T0 + (first + 4) * HOUR);
      var endTxt = t.getUTCDate() === t0.getUTCDate() ? pad(t.getUTCHours()) + ":00" : morisTime(firstEnd);
      $("morisSub").textContent = "The first time: " + morisTime(first) + " to " + endTxt + ", Mauritius time. " +
        "Go outside, look at the Moon, and the lander is looking back.";
    }
  }

  /* ---------- how sure is this answer? ---------- */

  // 16 what-ifs: every mix of four assumptions, each either as modelled or worse.
  var FACTORS = [
    { key: "sunScale", off: 1, on: 0.85, name: "15% less sunlight" },
    { key: "rate", off: RATE, on: 2.5, name: "weaker solar panels" },
    { key: "load", off: 1, on: 1.2, name: "20% more power use" },
    { key: "charge", off: 1, on: 0.8, name: "a battery only 80% full at landing" }
  ];
  var sure = null;

  function computeSure() {
    var P = prep(state.site), hours = hoursTotal(), cells = [];
    var lo = new Float32Array(hours + 1), hi = new Float32Array(hours + 1);
    lo.fill(Infinity); hi.fill(-Infinity);
    for (var m = 0; m < 16; m++) {
      var opts = {};
      FACTORS.forEach(function (f, b) { opts[f.key] = (m >> b) & 1 ? f.on : f.off; });
      var r = sim(P, state.start, hours, state.batt, true, opts);
      for (var h = 0; h <= hours; h++) { var v = r.series[h]; if (v < lo[h]) lo[h] = v; if (v > hi[h]) hi[h] = v; }
      cells.push({ mask: m, r: r, g: grade(r) });
    }
    var single = FACTORS.map(function (f, b) { return { f: f, r: cells[1 << b].r }; });
    // smallest battery (in 12 h steps, up to 30 days) that survives the worst mix of all four
    var worst = null, opts15 = {};
    FACTORS.forEach(function (f) { opts15[f.key] = f.on; });
    for (var b = 12; b <= 720; b += 12) if (sim(P, state.start, hours, b, false, opts15).alive) { worst = b; break; }
    var first = Infinity;
    cells.forEach(function (c) { if (!c.r.alive && c.r.died < first) first = c.r.died; });
    sure = { cells: cells, lo: lo, hi: hi, single: single, need: worst, firstDeath: first,
             ok: cells.filter(function (c) { return c.r.alive; }).length };
  }

  function drawSure() {
    computeSure();
    var ok = sure.ok, word, cls;
    if (!run.alive) { word = "Lost before anything goes wrong."; cls = "dead"; }
    else if (ok === 16) { word = "Solid."; cls = "live"; }
    else if (ok >= 12) { word = "Likely."; cls = "live"; }
    else { word = "Fragile."; cls = "close"; }
    $("sureNum").innerHTML = ok + "<span>/16</span>";
    $("sureWord").textContent = word;
    $("sureWord").className = "sureWord " + cls;

    var breaks = sure.single.filter(function (x) { return !x.r.alive; });
    var msg;
    if (run.alive && ok === 16) msg = "The lander survives all 16 tougher versions, even with everything going wrong at once.";
    else if (run.alive && breaks.length) msg = "One thing going wrong is enough: with <b>" + breaks.map(function (x) { return x.f.name; }).join("</b> or <b>") + "</b> the lander is lost.";
    else if (run.alive) msg = "No single problem kills it, but some combinations do. It survives " + ok + " of the 16 tougher versions.";
    else msg = "Making things worse only brings the end sooner: as early as <b>day " + (Math.floor((sure.firstDeath - 1) / 24) + 1) + "</b>.";
    var days = function (h) { var d = h / 24; return (d % 1 ? d.toFixed(1) : d) + (d === 1 ? " day" : " days"); };
    if (ok < 16) msg += sure.need ? " To survive all 16, the battery would need to last <b>" + days(sure.need) + "</b> without Sun (now " + days(state.batt) + ")."
                                  : " Even a battery lasting 30 days would not survive all 16.";
    $("sureSay").innerHTML = msg;

    // rows = sunlight x panels, columns = power use x starting charge
    var rowName = ["Normal Sun<br> normal panels", "Normal Sun<br> weaker panels", "15% less Sun<br> normal panels", "15% less Sun<br> weaker panels"];
    var colName = ["Normal power use<br> full battery", "Normal power use<br> battery 80% full", "20% more power use<br> full battery", "20% more power use<br> battery 80% full"];
    var html = '<div class="sureCorner" aria-hidden="true"></div>';
    colName.forEach(function (n) { html += '<div class="sureCol" aria-hidden="true">' + n + "</div>"; });
    for (var ri = 0; ri < 4; ri++) {
      html += '<div class="sureRow" aria-hidden="true">' + rowName[ri] + "</div>";
      for (var ci = 0; ci < 4; ci++) {
        var m = (ri >> 1) | ((ri & 1) << 1) | ((ci >> 1) << 2) | ((ci & 1) << 3);
        var c = sure.cells[m], r = c.r;
        var txt = r.alive ? "lowest " + Math.round(r.min * 100) + "%" : "day " + (Math.floor((r.died - 1) / 24) + 1);
        var label = rowName[ri].replace("<br> ", ", ") + ", " + colName[ci].replace("<br> ", ", ") + ": " +
                    (r.alive ? "survives, lowest charge " + Math.round(r.min * 100) + "%" : "lost on " + txt);
        html += '<div class="sureCell ' + c.g + (m === 0 ? " base" : "") + '" role="img" aria-label="' + label + '"><span class="sym">' +
                (c.g === "dead" ? "✕" : c.g === "close" ? "!" : "✓") + '</span><span class="v">' + txt + "</span></div>";
      }
    }
    $("sureGrid").innerHTML = html;
  }

  /* ---------- which hill hid the Sun? ---------- */

  var RIDGES = window.LANDER_RIDGES || {}, ridgePick = null;   // {az, from, len} for a dark spell, or {az} from a tap
  var COMPASS = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"];
  function compass(az) { return COMPASS[Math.round((((az % 360) + 360) % 360) / 45) % 8]; }

  // dark spells: hours when the panels make less than the lander uses
  function darkSpells() {
    var P = prep(state.site), hours = hoursTotal(), out = [], from = -1;
    for (var h = 0; h <= hours; h++) {
      var dark = h < hours && P.sun[state.start + h] * RATE < 1;
      if (dark && from < 0) from = h;
      if (!dark && from >= 0) { out.push({ from: from, len: h - from }); from = -1; }
    }
    out.forEach(function (sp) { sp.az = P.d.sun_az[state.start + sp.from + Math.floor(sp.len / 2)]; });
    return out;
  }

  function ridgeAt(az) {
    var R = RIDGES[state.site];
    if (!R) return null;
    var H = R.by_height[state.mast], n = H.dist_km.length, every = R.profile_every;
    // snap to the nearest direction that has a side view, so the words and the picture describe the same hill
    var i = (Math.round((((az % 360) + 360) % 360) / R.step_deg / every) * every) % n;
    return { dist: H.dist_km[i], rise: H.rise_m[i], el: prep(state.site).d.horizon[i], prof: R.profiles[String(i)], profAz: i * R.step_deg };
  }

  function drawRidge() {
    var R = RIDGES[state.site], spells = darkSpells(), box = $("ridgeSpells");
    if (!R) { $("ridgeSay").textContent = "Hill data is missing for this place."; box.innerHTML = ""; drawSection(null); return; }
    var pick = ridgePick;
    if (!pick) {
      var killer = !run.alive ? spells.filter(function (s) { return s.from < run.died && s.from + s.len >= run.died; })[0] : null;
      pick = killer || spells.slice().sort(function (a, b) { return b.len - a.len; })[0] || null;
      ridgePick = pick;
    }
    var isFatal = function (sp) { return !run.alive && sp.from < run.died && sp.from + sp.len >= run.died; };
    var top = spells.slice().sort(function (a, b) { return b.len - a.len; }).slice(0, 5);
    spells.forEach(function (sp) { if ((isFatal(sp) || (pick && pick.from === sp.from)) && top.indexOf(sp) < 0) top.push(sp); });
    top.sort(function (a, b) { return a.from - b.from; });
    box.innerHTML = top.map(function (sp) {
      var on = !!pick && pick.from === sp.from;
      var fatal = isFatal(sp);
      return '<button type="button" data-from="' + sp.from + '" aria-pressed="' + on + '"' + (fatal ? ' class="fatal"' : "") + "><b>" +
             plural(sp.len, "hour") + "</b><span>day " + (Math.floor(sp.from / 24) + 1) + " · Sun in the " + compass(sp.az) + (fatal ? " · ended the mission" : "") + "</span></button>";
    }).join("");
    [].forEach.call(box.children, function (b) {
      b.onclick = function () { ridgePick = spells.filter(function (s) { return s.from === +b.dataset.from; })[0]; drawRidge(); drawPano(); };
    });
    if (!pick) {
      $("ridgeSay").innerHTML = "The Sun never stays hidden for long on this mission. Tap the sky picture above to look in any direction.";
      drawSection(null);
      return;
    }
    var rg = ridgeAt(pick.az), d = prep(state.site).d, spell = pick.from !== undefined;
    var sunEl = spell ? d.sun_el[state.start + pick.from + Math.floor(pick.len / 2)] : null;
    var where = rg.dist < 1 ? Math.round(rg.dist * 1000) + " m" : rg.dist.toFixed(1) + " km";
    var msg = spell
      ? "For <b>" + plural(pick.len, "hour") + "</b> from day " + (Math.floor(pick.from / 24) + 1) + " the Sun was low in the " + compass(pick.az) + ", behind "
      : "Looking " + compass(rg.profAz) + ", the highest thing in the way is ";
    if (rg.dist < 0.5) msg += "the slope the lander stands on, only " + where + " away.";
    else msg += "a hill <b>" + where + "</b> away, its top <b>" + Math.abs(rg.rise) + " m " + (rg.rise >= 0 ? "above" : "below") + "</b> the lander.";
    if (spell && sunEl + d.sun_width_deg / 2 < 0) msg += " The Sun sat " + Math.abs(sunEl).toFixed(1) + "° below level ground, so even a flat plain would have hidden all of it.";
    else if (spell) msg += " The Sun sat " + (sunEl < 0 ? Math.abs(sunEl).toFixed(1) + "° below level ground" : "only " + sunEl.toFixed(1) + "° above level ground") + ", and the top of that hill reaches " + rg.el.toFixed(1) + "°.";
    $("ridgeSay").innerHTML = msg;
    drawSection(rg, sunEl);
  }

  // side view from the lander out past the hill; heights stretched so the shape is visible
  function drawSection(rg, sunEl) {
    var o = fit($("ridgeCut")), ctx = o.ctx, W = o.w, H = o.h, L = gut(), Rr = W - gut(), pw = Rr - L;
    if (!rg || !rg.prof) { $("ridgeCap").textContent = ""; return; }
    var endM = rg.prof.end_km * 1000, k, eye = parseFloat(state.mast);
    // even samples plus the exact blocking summits, sorted by distance
    var pts = [];
    rg.prof.z.forEach(function (v, j) { if (v !== null) pts.push([endM * j / (rg.prof.z.length - 1), v]); });
    (rg.prof.peaks || []).forEach(function (pk) { pts.push([pk[0] * 1000, pk[1]]); });
    pts.sort(function (a, b) { return a[0] - b[0]; });
    var zs = pts.map(function (q) { return q[1]; }).concat([0, eye]);
    var skyEnd = eye + Math.tan(rg.el * Math.PI / 180) * endM;
    zs.push(skyEnd);
    if (sunEl !== null) zs.push(eye + Math.tan(sunEl * Math.PI / 180) * endM);
    var zMax = Math.max.apply(null, zs), zMin = Math.min.apply(null, zs);
    var span = Math.max(40, zMax - zMin), topPad = 30, botPad = 34, ph = H - topPad - botPad;
    var Y = function (m) { return topPad + (zMax - m) / span * ph; };
    var X = function (m) { return L + m / endM * pw; };
    var ex = (endM / pw) / (span / ph);

    ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    ctx.font = "500 12px " + MONO; ctx.fillStyle = C.t3; ctx.textBaseline = "top";
    for (k = 0; k <= 4; k++) {
      var gx = Math.round(X(endM * k / 4)) + 0.5;
      ctx.beginPath(); ctx.moveTo(gx, topPad - 10); ctx.lineTo(gx, H - botPad); ctx.stroke();
      var km = rg.prof.end_km * k / 4;
      ctx.textAlign = k === 0 ? "left" : k === 4 ? "right" : "center";
      ctx.fillText(k === 0 ? "Lander" : (km < 1 ? Math.round(km * 1000) + " m" : km.toFixed(km < 10 ? 1 : 0) + " km"), X(endM * k / 4), H - botPad + 8);
    }

    ctx.beginPath(); ctx.moveTo(X(0), H - botPad);
    for (k = 0; k < pts.length; k++) ctx.lineTo(X(pts[k][0]), Y(pts[k][1]));
    ctx.lineTo(X(endM), H - botPad); ctx.closePath();
    var g = ctx.createLinearGradient(0, topPad, 0, H - botPad);
    g.addColorStop(0, "#2b2e35"); g.addColorStop(1, "#16181d");
    ctx.fillStyle = g; ctx.fill();
    ctx.beginPath();
    for (k = 0; k < pts.length; k++) { if (k) ctx.lineTo(X(pts[k][0]), Y(pts[k][1])); else ctx.moveTo(X(pts[k][0]), Y(pts[k][1])); }
    ctx.strokeStyle = "rgba(232,228,216,0.45)"; ctx.lineWidth = 1.25; ctx.stroke();

    // straight lines stay straight when heights are stretched, so the sight lines are exact
    var x0 = X(0), y0 = Y(eye);
    var ray = function (deg, col, dash, label, below) {
      var h = eye + Math.tan(deg * Math.PI / 180) * endM;
      ctx.setLineDash(dash); ctx.strokeStyle = col; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(X(endM), Y(h)); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = col; ctx.font = "600 12px " + MONO; ctx.textAlign = "right"; ctx.textBaseline = below ? "top" : "bottom";
      ctx.fillText(label, Rr - 4, Math.max(4, Math.min(H - botPad - 16, Y(h) + (below ? 6 : -6))));
    };
    ray(rg.el, "rgba(236,232,220,0.6)", [2, 4], "Line to the hill top, " + rg.el.toFixed(1) + "°", sunEl !== null && sunEl > rg.el);
    if (sunEl !== null) ray(sunEl, C.sun, [7, 4], "Line to the Sun, " + sunEl.toFixed(1) + "°", sunEl <= rg.el);
    ctx.fillStyle = C.text; ctx.fillRect(x0 - 1, y0, 3, Math.max(4, Y(0) - y0));
    ctx.beginPath(); ctx.arc(x0 + 0.5, y0, 4, 0, 6.2832); ctx.fill();

    var ridgeM = rg.dist * 1000;
    if (rg.dist >= 0.5 && ridgeM <= endM) {
      var rx = X(ridgeM), ry = Y(eye + Math.tan(rg.el * Math.PI / 180) * ridgeM);
      ctx.strokeStyle = C.dead; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(rx - 6, ry); ctx.lineTo(rx, ry - 6); ctx.lineTo(rx + 6, ry); ctx.lineTo(rx, ry + 6); ctx.closePath(); ctx.stroke();
      ctx.fillStyle = C.dead; ctx.font = "600 12px " + MONO; ctx.textBaseline = "bottom";
      var t = "The hill in the way", right = rx + 12 + ctx.measureText(t).width < Rr - 130;
      ctx.textAlign = right ? "left" : "right"; ctx.fillText(t, right ? rx + 12 : rx - 12, ry - 8);
    }
    $("ridgeCap").textContent = "Side view, looking " + compass(rg.profAz) + ". Heights are drawn " +
      (ex >= 10 ? Math.round(ex) : ex.toFixed(1)) + "× taller so the hills show. The Moon's curve is included. Drawn from NASA's height map.";
  }

  function bindRidge() {
    var c = $("pano");
    c.style.cursor = "crosshair";
    c.addEventListener("click", function (e) {
      var r = c.getBoundingClientRect(), az = (e.clientX - r.left) / r.width * 360 - 180;
      ridgePick = { az: (az + 360) % 360 };
      drawRidge(); drawPano();
    });
  }

  /* ---------- everything together ---------- */

  function refresh() {
    stopPlay();
    var key = state.site + "|" + state.start + "|" + state.days + "|" + state.mast;
    if (key !== refresh.key) { ridgePick = null; refresh.key = key; }
    run = sim(prep(state.site), state.start, hoursTotal(), state.batt, true);
    state.hour = Math.max(0, Math.min(hoursTotal(), state.hour));
    syncControls(); drawVerdict(); drawSure(); drawPano(); drawTime(); drawRidge(); drawSlip(); drawCal(); drawMoris();
    var q = "site=" + state.site + "&date=" + iso(state.start) + "&days=" + state.days + "&batt=" + state.batt + "&panel=" + state.mast;
    try { history.replaceState(null, "", "#" + q); } catch (e) { /* opened from disk: fine */ }
    listeners.forEach(function (f) { try { f(api()); } catch (e) { console.error(e); } });
  }

  // Shared hook so add-on sections (e.g. planner.js) can read the mission without editing this file.
  var listeners = [], hourListeners = [];
  function api() {
    return { state: state, run: run, P: prep(state.site), hours: hoursTotal(), RATE: RATE, C: C,
             sim: sim, fmtDate: fmtDate, shortDate: shortDate, plural: plural,
             prep: prep, sites: SITES, data: DATA, masts: MAST_CHOICES, dayChoices: DAY_CHOICES };
  }
  window.LANDER_APP = {
    onRefresh: function (f) { listeners.push(f); if (run) f(api()); },
    get: api,
    onHour: function (f) { hourListeners.push(f); },   // f(dataIndex) whenever the shown hour changes
    setHour: function (h) { state.hour = Math.max(0, Math.min(hoursTotal(), h)); stopPlay(); drawPano(); drawTime(); },
    setStart: function (idx) { state.start = idx; clampStart(); state.hour = 0; refresh(); },
    setSite: function (id) { if (DATA[id]) { state.site = id; clampStart(); state.hour = 0; refresh(); } },
    // change any of: site, start (hour index), days, batt, mast; anything not valid is ignored
    set: function (p) {
      if (p.site && DATA[p.site]) state.site = p.site;
      if (DAY_CHOICES.indexOf(p.days) >= 0) state.days = p.days;
      if (MAST_CHOICES.indexOf(p.mast) >= 0) state.mast = p.mast;
      if (p.batt >= 24 && p.batt <= 240) state.batt = Math.round(p.batt / 12) * 12;
      if (typeof p.start === "number") state.start = p.start;
      clampStart(); state.hour = 0; refresh();
    }
  };

  function readHash() {
    var p = {};
    location.hash.replace(/^#/, "").split("&").forEach(function (kv) { var a = kv.split("="); if (!a[1]) return;
      try { p[a[0]] = decodeURIComponent(a[1]); } catch (e) { /* bad encoding: ignore this value */ } });
    if (p.site && Object.prototype.hasOwnProperty.call(DATA, p.site)) state.site = p.site;
    if (DAY_CHOICES.indexOf(+p.days) >= 0) state.days = +p.days;
    if (+p.batt >= 24 && +p.batt <= 240) state.batt = Math.round(+p.batt / 12) * 12;
    if (MAST_CHOICES.indexOf(p.panel) >= 0) state.mast = p.panel;
    var t = Date.parse((p.date || "2027-07-28") + "T00:00:00Z");
    state.start = isNaN(t) ? 0 : Math.round((t - T0) / HOUR);
    clampStart();
  }

  function drawValidation() {
    var rows = window.LANDER_VALIDATION, t = $("val");
    if (!rows || !t) return;
    var h = "<thead><tr><th>Site</th><th>Sun, ours 0.5 m</th><th>Sun, ours 2 m</th><th>Sun, NASA</th><th>Earth, ours 2 m</th><th>Earth, NASA</th></tr></thead><tbody>";
    rows.forEach(function (r) {
      h += "<tr><td>" + r.name + "</td><td>" + r["sun_0.5"].toFixed(0) + "%</td><td>" + r.sun_2.toFixed(0) + "%</td><td>" + r.nasa_sun.toFixed(0) +
           "%</td><td>" + r.earth_2.toFixed(0) + "%</td><td>" + r.nasa_earth.toFixed(0) + "%</td></tr>";
    });
    t.innerHTML = h + "</tbody>";
  }

  function start() {
    drawValidation();
    buildControls(); bindTime(); bindCal(); bindRidge(); readHash(); refresh();
    window.addEventListener("hashchange", function () { readHash(); state.hour = 0; refresh(); });
    var again = null;
    window.addEventListener("resize", function () {
      clearTimeout(again); again = setTimeout(function () { drawPano(); drawTime(); drawCal(); drawRidge(); }, 80);
    });
    if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    }
  }

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else start();
})();
