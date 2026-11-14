/* Will the lander survive? — app logic. Written with AI assistance (Claude).
   Data: docs/data/*.js, built by engine/ from NASA LOLA and NASA/JPL Horizons. */
(function () {
  "use strict";

  var SITES = window.LANDER_SITES, DATA = window.LANDER_DATA, MORIS = window.LANDER_MORIS;
  var T0 = Date.UTC(2027, 0, 1), HOUR = 3600000;
  var RATE = 3;                      // energy made per hour in full Sun; the lander uses 1 per hour
  var DAY_CHOICES = [7, 14, 30, 60];
  var C = { bg: "#0e1014", text: "#ece8dc", t2: "#b4b0a4", t3: "#8b887e", t4: "#5f5d57",
            sun: "#f2b544", earth: "#6ea8e6", live: "#58d08a", close: "#c9c14a", dead: "#e8573f",
            line: "rgba(232,228,216,0.10)", line2: "rgba(232,228,216,0.22)" };
  var MONO = '"JetBrains Mono", ui-monospace, Consolas, monospace';
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  var $ = function (id) { return document.getElementById(id); };
  var state = { site: "HW06", start: 0, days: 14, batt: 96, hour: 0 };
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
    if (prepCache[id]) return prepCache[id];
    var d = DATA[id], n = d.n, r = d.sun_width_deg / 2;
    var sun = new Float32Array(n), earth = new Uint8Array(n);
    for (var i = 0; i < n; i++) {
      var f = (d.sun_el[i] + r - horizonAt(d, d.sun_az[i])) / (2 * r);
      sun[i] = f < 0 ? 0 : f > 1 ? 1 : f;
      earth[i] = d.earth_el[i] > horizonAt(d, d.earth_az[i]) ? 1 : 0;
    }
    return (prepCache[id] = { d: d, sun: sun, earth: earth });
  }

  // Run the battery through a mission. Charge is in "hours of life without Sun".
  function sim(P, start, hours, batt, keep) {
    var c = batt, min = batt, died = -1, sunSum = 0, earthSum = 0, dark = 0, longest = 0, lastFull = 0;
    var series = keep ? new Float32Array(hours + 1) : null;
    if (series) series[0] = c;
    for (var h = 0; h < hours; h++) {
      var s = P.sun[start + h];
      sunSum += s; earthSum += P.earth[start + h];
      if (s * RATE < 1) { dark++; if (dark > longest) longest = dark; } else dark = 0;
      if (died < 0) {
        c += s * RATE - 1;
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
  function gut() { return Math.max(16, Math.min(56, window.innerWidth * 0.04)); }

  /* ---------- controls ---------- */

  function buildControls() {
    SITES.forEach(function (s) {
      var b = document.createElement("button");
      b.type = "button"; b.setAttribute("role", "radio"); b.dataset.id = s.id; b.textContent = s.name;
      b.onclick = function () { state.site = s.id; clampStart(); state.hour = 0; refresh(); };
      $("sites").appendChild(b);
    });
    DAY_CHOICES.forEach(function (n) {
      var b = document.createElement("button");
      b.type = "button"; b.setAttribute("role", "radio"); b.dataset.n = n; b.textContent = n + " d";
      b.setAttribute("aria-label", n + " days");
      b.onclick = function () { state.days = n; clampStart(); state.hour = 0; refresh(); };
      $("days").appendChild(b);
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
    [].forEach.call($("days").children, function (b) { b.setAttribute("aria-checked", +b.dataset.n === state.days); });
    $("date").value = iso(state.start);
    $("date").max = iso(maxStart());
    $("batt").value = state.batt;
    var d = Math.floor(state.batt / 24), h = state.batt % 24;
    $("battOut").textContent = (d ? d + (d === 1 ? " day" : " days") : "") + (d && h ? " " : "") + (h ? h + " h" : "");
    var s = DATA[state.site];
    $("coords").textContent = Math.abs(s.lat).toFixed(2) + "° S  " + Math.abs(s.lon).toFixed(2) + "° " + (s.lon < 0 ? "W" : "E") + "  ·  " + Math.round(s.ground_m) + " m";
  }

  /* ---------- verdict ---------- */

  var run;   // result of the current mission, with the battery series

  function drawVerdict() {
    var hours = hoursTotal(), v = $("verdict");
    $("vLabel").textContent = state.days + "-day mission · " + DATA[state.site].name + " · lands " + fmtDate(state.start);
    v.classList.toggle("dead", !run.alive);
    if (run.alive) {
      $("vText").textContent = "Survived.";
      $("vWhy").textContent = run.longestDark === 0
        ? "The Sun never dropped behind the hills for long enough to drain the battery."
        : "The longest stretch without enough Sun was " + run.longestDark + " hours. The battery lasts " + state.batt + ".";
    } else {
      var day = Math.floor((run.died - 1) / 24) + 1;
      $("vText").textContent = "Died on day " + day + ".";
      $("vWhy").textContent = "The hills hid the Sun for too long. The battery was last full " +
        (run.lastFull === 0 ? "at landing" : "on day " + (Math.floor(run.lastFull / 24) + 1)) +
        " and ran out " + (run.died - run.lastFull) + " hours later.";
    }
    var facts = [
      ["Sun in view", Math.round(run.sun * 100), "%"],
      ["Longest dark", run.longestDark, "h"],
      ["Earth in view", Math.round(run.earth * 100), "%"],
      ["Lowest battery", Math.round(run.min * 100), "%"]
    ];
    $("facts").innerHTML = facts.map(function (f) {
      return "<div><dt>" + f[0] + "</dt><dd>" + f[1] + "<small>" + f[2] + "</small></dd></div>";
    }).join("");
  }

  /* ---------- the view from the lander ---------- */

  function drawPano() {
    var P = prep(state.site), d = P.d, o = fit($("pano")), ctx = o.ctx, W = o.w, H = o.h;
    var i = Math.min(d.n - 1, state.start + Math.round(state.hour));
    var hi = Math.max.apply(null, d.horizon), lo = Math.min.apply(null, d.horizon);
    if (!P.top) {   // highest the Earth or Sun ever gets here, so neither leaves the picture
      P.top = Math.max(Math.max.apply(null, d.earth_el) + d.earth_width_deg / 2, Math.max.apply(null, d.sun_el));
    }
    var elMax = Math.max(9, Math.ceil(hi) + 2.5, P.top + 2.2), elMin = Math.min(-5, Math.floor(lo) - 1.5);
    var ys = H / (elMax - elMin);
    var X = function (az) { return ((((az + 180) % 360) + 360) % 360) / 360 * W; };
    var Y = function (el) { return H - (el - elMin) * ys; };

    var sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#07080b"); sky.addColorStop(1, "#11141a");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

    // level line and compass
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.setLineDash([2, 6]);
    ctx.beginPath(); ctx.moveTo(0, Y(0)); ctx.lineTo(W, Y(0)); ctx.stroke(); ctx.setLineDash([]);
    ctx.font = "500 11px " + MONO; ctx.fillStyle = C.t4; ctx.textBaseline = "top";
    [["S", -180], ["W", -90], ["N", 0], ["E", 90]].forEach(function (c) {
      var x = X(c[1]); ctx.textAlign = c[0] === "S" ? "left" : "center";
      ctx.fillText(c[0], c[0] === "S" ? gut() : x, 12);
      if (c[0] !== "S") { ctx.fillStyle = C.line2; ctx.fillRect(x, 28, 1, 6); ctx.fillStyle = C.t4; }
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

    // labels
    ctx.font = "600 11px " + MONO; ctx.textBaseline = "middle";
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
    $("now").textContent = "Day " + day + " · " + fmtDate(state.start + hr) + " · " + pad((state.start + hr) % 24) + ":00 UTC";
    var sunPct = Math.round(P.sun[i] * 100), charge = Math.round(run.series[Math.min(hr, hours)] / state.batt * 100);
    var lost = !run.alive && hr >= run.died, mUp = MORIS.up.charAt(i) === "1";
    $("chips").innerHTML =
      '<span class="' + (sunPct ? "" : "off") + '"><i style="background:' + C.sun + '"></i>' + (sunPct ? "Sun <b>" + sunPct + "% in view</b>" : "Sun <b>behind the hills</b>") + "</span>" +
      '<span class="' + (P.earth[i] ? "" : "off") + '"><i style="background:' + C.earth + '"></i>' + (P.earth[i] ? "Earth <b>in view</b>, contact possible" : "Earth <b>behind the hills</b>, no contact") + "</span>" +
      '<span><i style="background:' + (lost ? C.dead : C.live) + '"></i>' + (lost ? "<b>Lander lost</b>" : "Battery <b>" + charge + "%</b>") + "</span>" +
      (P.earth[i] && mUp ? '<span><i style="background:' + C.text + '"></i><b>Mauritius moment</b>: Moon is up over Port Louis</span>' : "");
  }

  /* ---------- mission timeline ---------- */

  var timeGeom = null;

  function drawTime() {
    var P = prep(state.site), o = fit($("time")), ctx = o.ctx, W = o.w, H = o.h;
    var hours = hoursTotal(), L = gut(), Rr = W - gut(), pw = Rr - L;
    var top = 14, stripH = 12, gap = 17, strips = 3;
    var chartB = H - 22 - strips * (stripH + gap) - 4, ch = chartB - top;
    var X = function (h) { return L + h / hours * pw; };
    timeGeom = { L: L, pw: pw, hours: hours };

    // battery frame
    ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    [0, 0.5, 1].forEach(function (f) { var y = Math.round(chartB - f * ch) + 0.5; ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(Rr, y); ctx.stroke(); });
    ctx.font = "500 10px " + MONO; ctx.fillStyle = C.t4; ctx.textAlign = "left"; ctx.textBaseline = "bottom";
    ctx.fillText("BATTERY 100%", L, top - 2);

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
      ctx.strokeStyle = C.dead; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(dx, top); ctx.lineTo(dx, chartB); ctx.stroke();
      ctx.fillStyle = C.dead; ctx.font = "600 11px " + MONO; ctx.textBaseline = "top";
      var txt = "BATTERY EMPTY"; var right = dx + 8 + ctx.measureText(txt).width < Rr;
      ctx.textAlign = right ? "left" : "right"; ctx.fillText(txt, right ? dx + 8 : dx - 8, top + 4);
    }

    // strips: Sun, Earth, Mauritius moment
    var y0 = chartB + gap + 2, names = ["SUN", "EARTH IN VIEW", "MAURITIUS MOMENT"], s, x0, x1;
    for (s = 0; s < strips; s++) {
      var sy = y0 + s * (stripH + gap);
      ctx.font = "500 10px " + MONO; ctx.fillStyle = C.t4; ctx.textAlign = "left"; ctx.textBaseline = "bottom";
      ctx.fillText(names[s], L, sy - 3);
      ctx.fillStyle = "rgba(232,228,216,0.05)"; ctx.fillRect(L, sy, pw, stripH);
      for (h = 0; h < hours; h++) {
        var idx = state.start + h, a = 0;
        if (s === 0) a = P.sun[idx];
        else if (s === 1) a = P.earth[idx];
        else a = P.earth[idx] && MORIS.up.charAt(idx) === "1" ? 1 : 0;
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
    for (var q = 0; q < nice.length; q++) { every = nice[q]; if (pw / state.days * every >= 62) break; }
    ctx.font = "500 10px " + MONO; ctx.fillStyle = C.t3; ctx.textBaseline = "bottom";
    for (var dd = 0; dd <= state.days; dd += every) {
      if (dd !== 0 && dd !== state.days && state.days - dd < every * 0.9) continue;   // keep clear of the last label
      ctx.textAlign = dd === 0 ? "left" : dd === state.days ? "right" : "center";
      ctx.fillText(dd === 0 ? "LANDING" : "DAY " + dd, X(dd * 24), H - 2);
    }
    if (state.days % every) { ctx.textAlign = "right"; ctx.fillText("DAY " + state.days, X(hours), H - 2); }

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

  function drawSlip() {
    var P = prep(state.site), box = $("slip"), hours = hoursTotal(), html = "";
    for (var k = 0; k < 15; k++) {
      var st = state.start + k * 24;
      if (st > maxStart()) break;
      var r = sim(P, st, hours, state.batt, false), g = grade(r);
      var say = fmtDate(st) + ": " + (r.alive ? "survives" : "dies on day " + (Math.floor((r.died - 1) / 24) + 1));
      html += '<button type="button" class="' + g + '" data-k="' + k + '"' + (k === 0 ? ' aria-current="true"' : "") +
              ' title="' + say + '" aria-label="' + say + '">' + (k === 0 ? "now" : "+" + k) + "</button>";
    }
    box.innerHTML = html;
    [].forEach.call(box.children, function (b) {
      b.onclick = function () { state.start += (+b.dataset.k) * 24; clampStart(); state.hour = 0; refresh(); };
    });
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
    ctx.font = "500 10px " + MONO; ctx.textBaseline = "top"; ctx.textAlign = "left";
    for (var m = 0; m < 24; m++) {
      var day = (Date.UTC(2027, m, 1) - T0) / 86400000;
      if (day >= nDays) break;
      var x = Math.round(X(day)) + 0.5;
      ctx.strokeStyle = m % 12 === 0 ? C.line2 : C.line; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      var wide = W / 24 > 30;
      if (wide || m % 3 === 0) {
        ctx.fillStyle = m % 12 === 0 ? C.t2 : C.t4;
        ctx.fillText(m % 12 === 0 ? String(2027 + m / 12) : (wide ? MONTHS[m % 12].toUpperCase() : MONTHS[m % 12].charAt(0)), x + 4, 2);
      }
    }

    SITES.forEach(function (s, row) {
      var P = prep(s.id), y = axisH + row * pitch + 18, sel = s.id === state.site;
      ctx.font = (sel ? "600" : "500") + " 11px " + MONO; ctx.fillStyle = sel ? C.text : C.t3;
      ctx.textBaseline = "bottom"; ctx.textAlign = "left";
      ctx.fillStyle = C.bg; ctx.fillRect(0, y - 15, ctx.measureText(s.name.toUpperCase()).width + 8, 14);
      ctx.fillStyle = sel ? C.text : C.t3; ctx.fillText(s.name.toUpperCase(), 0, y - 3);
      var alive = 0;
      for (var d = 0; d < nDays; d++) {
        var r = sim(P, d * 24, hours, state.batt, false), g = grade(r);
        if (r.alive) alive++;
        ctx.fillStyle = g === "live" ? C.live : g === "close" ? C.close : C.dead;
        ctx.globalAlpha = g === "dead" ? 0.45 + 0.4 * (r.died / hours) : 1;
        ctx.fillRect(X(d), y, X(d + 1) - X(d) + 0.4, barH);
      }
      ctx.globalAlpha = 1;
      var pct = Math.round(alive / nDays * 100) + "% OF DATES SAFE";
      ctx.font = "500 11px " + MONO; ctx.textAlign = "right";
      ctx.fillStyle = C.bg; ctx.fillRect(W - ctx.measureText(pct).width - 8, y - 15, ctx.measureText(pct).width + 8, 14);
      ctx.fillStyle = sel ? C.text : C.t3; ctx.fillText(pct, W, y - 3);
      if (sel) {
        var sx = X(state.start / 24), sw = Math.max(2, X(1) - X(0));
        ctx.fillStyle = C.text; ctx.fillRect(sx - 1, y - 4, sw + 2, barH + 8);
        ctx.fillStyle = C.bg; ctx.fillRect(sx, y - 3, sw, barH + 6);
        ctx.fillStyle = run.alive ? (run.min < 0.25 ? C.close : C.live) : C.dead; ctx.fillRect(sx, y, sw, barH);
      }
    });
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
    for (var h = 0; h < hours; h++) {
      var idx = state.start + h, on = P.earth[idx] && MORIS.up.charAt(idx) === "1";
      if (on) { total++; if (first < 0) first = idx; }
      else if (first >= 0 && firstEnd < 0) firstEnd = idx;
    }
    if (first >= 0 && firstEnd < 0) firstEnd = state.start + hours;
    if (total === 0) {
      $("morisText").innerHTML = "On this mission, the lander never has Earth in view while the Moon is over Port Louis.";
      $("morisSub").textContent = "Try another site or date.";
    } else {
      $("morisText").innerHTML = "For <b>" + total + " hours</b> of this mission, the lander and Mauritius can look at each other.";
      var t = new Date(T0 + (firstEnd + 4) * HOUR);
      $("morisSub").textContent = "The first time: " + morisTime(first) + " to " + pad(t.getUTCHours()) + ":00, Mauritius time. " +
        "That is when Earth is above the hills at the landing site and the Moon is at least 10° above the horizon at Port Louis.";
    }
  }

  /* ---------- everything together ---------- */

  function refresh() {
    stopPlay();
    run = sim(prep(state.site), state.start, hoursTotal(), state.batt, true);
    state.hour = Math.max(0, Math.min(hoursTotal(), state.hour));
    syncControls(); drawVerdict(); drawPano(); drawTime(); drawSlip(); drawCal(); drawMoris();
    var q = "site=" + state.site + "&date=" + iso(state.start) + "&days=" + state.days + "&batt=" + state.batt;
    try { history.replaceState(null, "", "#" + q); } catch (e) { /* opened from disk: fine */ }
  }

  function readHash() {
    var p = {};
    location.hash.replace(/^#/, "").split("&").forEach(function (kv) { var a = kv.split("="); if (a[1]) p[a[0]] = decodeURIComponent(a[1]); });
    if (p.site && DATA[p.site]) state.site = p.site;
    if (DAY_CHOICES.indexOf(+p.days) >= 0) state.days = +p.days;
    if (+p.batt >= 24 && +p.batt <= 240) state.batt = Math.round(+p.batt / 12) * 12;
    var t = Date.parse((p.date || "2027-07-28") + "T00:00:00Z");
    state.start = isNaN(t) ? 0 : Math.round((t - T0) / HOUR);
    clampStart();
  }

  function start() {
    buildControls(); bindTime(); bindCal(); readHash(); refresh();
    var again = null;
    window.addEventListener("resize", function () {
      clearTimeout(again); again = setTimeout(function () { drawPano(); drawTime(); drawCal(); }, 80);
    });
    if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    }
  }

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else start();
})();
