/* Add-ons asked for by the official challenge text. Written with AI assistance (Claude).
   1. Right now: the Sun's and Earth's height, and time left before sunset and Earthset.
   2. Side-by-side comparison of two landing places on the same date.
   Uses the LANDER_APP hook in app.js; does not change the main calculations. */
(function () {
  "use strict";
  var APP = window.LANDER_APP;
  if (!APP || !document.getElementById("nowGrid")) return;

  var $ = function (id) { return document.getElementById(id); };
  var FONT = '"Archivo", system-ui, "Segoe UI", sans-serif';
  var other = null;      // id of the second place in the comparison

  function horizonAt(d, az) {
    var step = d.horizon_step_deg, n = d.horizon.length;
    var p = (((az % 360) + 360) % 360) / step, i = Math.floor(p), f = p - i;
    return d.horizon[i % n] * (1 - f) + d.horizon[(i + 1) % n] * f;
  }
  function span(h) {
    if (h < 48) return h + (h === 1 ? " hour" : " hours");
    var d = Math.round(h / 24);
    return d + " days";
  }
  function deg(x) { return Math.abs(x).toFixed(1) + "°"; }
  function signed(x) { return (x < 0 ? "−" : "") + deg(x); }
  function level(x) { return x < 0 ? "below level ground" : "above level ground"; }

  /* ---------- 1. right now ---------- */

  // Hours until a body next changes between "in view" and "hidden", looking up to 60 days ahead.
  function untilChange(arr, i) {
    var now = arr[i] > 0, limit = Math.min(arr.length - 1, i + 60 * 24);
    for (var k = i + 1; k <= limit; k++) if ((arr[k] > 0) !== now) return k - i;
    return -1;
  }

  function tile(label, value, sub, cls) {
    return '<div class="' + (cls || "") + '"><p class="nowLabel">' + label + '</p><p class="nowValue">' + value + '</p><p class="nowSub">' + sub + "</p></div>";
  }

  function drawNow() {
    var a = APP.get(), P = a.P, d = P.d;
    var i = Math.min(d.n - 1, a.state.start + Math.round(a.state.hour));
    var sunUp = P.sun[i] > 0, earthUp = P.earth[i] > 0;
    var sunGap = d.sun_el[i] - horizonAt(d, d.sun_az[i]), earthGap = d.earth_el[i] - horizonAt(d, d.earth_az[i]);
    var sunIn = untilChange(P.sun, i), earthIn = untilChange(P.earth, i);
    var when = function (h) { return h < 0 ? "60+ days away" : "in " + span(h); };

    $("nowGrid").innerHTML =
      tile("Sun's height", signed(d.sun_el[i]),
           level(d.sun_el[i]) + "; " + (sunUp ? deg(Math.max(0, sunGap)) + " clear of the hills" : "the hills are " + deg(sunGap) + " higher"), "sun") +
      tile(sunUp ? "Sunset" : "Sunrise", when(sunIn),
           sunUp ? "then the lander runs on battery" : "until then the lander runs on battery", "sun") +
      tile("Earth's height", signed(d.earth_el[i]),
           level(d.earth_el[i]) + "; " + (earthUp ? deg(Math.max(0, earthGap)) + " clear of the hills" : "the hills are " + deg(earthGap) + " higher"), "earth") +
      tile(earthUp ? "Earthset" : "Earthrise", when(earthIn),
           earthUp ? "then no direct contact with Earth" : "until then no direct contact with Earth", "earth");
  }

  /* ---------- 2. compare two places ---------- */

  function gut() { return parseFloat(getComputedStyle(document.querySelector(".slip")).paddingLeft) || 16; }
  function dayOf(r) { return Math.floor((r.died - 1) / 24) + 1; }
  function verdict(r) { return r.alive ? "Survived" : "Lost on day " + dayOf(r); }

  function card(name, r, colour, isMain) {
    return '<div class="vsCard ' + (r.alive ? "live" : "dead") + '">' +
      '<p class="vsName"><i style="background:' + colour + '"></i>' + name + (isMain ? " <span>chosen</span>" : "") + "</p>" +
      '<p class="vsVerdict">' + verdict(r) + ".</p>" +
      '<dl><div><dt>Sun above the hills</dt><dd>' + Math.round(r.sun * 100) + "%</dd></div>" +
      "<div><dt>Earth in view</dt><dd>" + Math.round(r.earth * 100) + "%</dd></div>" +
      "<div><dt>Longest stretch without enough Sun</dt><dd>" + span(r.longestDark) + "</dd></div>" +
      "<div><dt>Lowest battery</dt><dd>" + Math.round(r.min * 100) + "%</dd></div></dl></div>";
  }

  function drawVs() {
    var a = APP.get(), s = a.state, sites = a.sites;
    if (!other || other === s.site) other = sites.filter(function (x) { return x.id !== s.site; })[0].id;

    var box = $("vsPick"), html = "";
    sites.forEach(function (x) {
      if (x.id === s.site) return;
      html += '<button type="button" role="radio" data-id="' + x.id + '" aria-checked="' + (x.id === other) + '">' + x.name + "</button>";
    });
    box.innerHTML = html;
    [].forEach.call(box.children, function (b) { b.onclick = function () { other = b.dataset.id; drawVs(); }; });

    var A = a.run, B = a.sim(a.prep(other), s.start, a.hours, s.batt, true);
    var nameA = a.data[s.site].name, nameB = a.data[other].name, cA = a.C.text, cB = a.C.sun;
    $("vsCards").innerHTML = card(nameA, A, cA, true) + card(nameB, B, cB, false);

    var say;
    if (A.alive && B.alive && Math.round(A.min * 100) === Math.round(B.min * 100)) {
      say = "Both places work on this date" + (A.min > 0.995 ? ", and the battery stays full at both" : ", and both keep the battery above " + Math.round(A.min * 100) + "%") + ". Nothing separates them here.";
    } else if (A.alive && B.alive) {
      var better = A.min >= B.min ? [nameA, A, B] : [nameB, B, A];
      say = "Both places work on this date. <b>" + better[0] + "</b> keeps more in reserve: its battery never drops below " +
            Math.round(better[1].min * 100) + "%, against " + Math.round(better[2].min * 100) + "%.";
    } else if (A.alive !== B.alive) {
      say = "Same date, same lander: <b>" + (A.alive ? nameA : nameB) + " survives</b>, while " + (A.alive ? nameB : nameA) +
            " is lost on day " + dayOf(A.alive ? B : A) + ".";
    } else {
      var longer = A.died >= B.died ? [nameA, A, B] : [nameB, B, A];
      say = "Neither place works on this date. <b>" + longer[0] + "</b> lasts longer: day " + dayOf(longer[1]) + " against day " + dayOf(longer[2]) + ".";
    }
    $("vsSay").innerHTML = say;
    $("vsSwitch").textContent = "Switch to " + nameB;
    $("vsSwitch").onclick = function () { var from = s.site; APP.setSite(other); other = from; };

    // both battery lines on one chart
    var c = $("vsChart"), r = c.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    var W = Math.max(1, Math.round(r.width)), H = Math.max(1, Math.round(r.height));
    c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
    var ctx = c.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    var L = gut(), R = W - gut(), top = 22, bot = H - 26, hours = a.hours;
    var X = function (h) { return L + h / hours * (R - L); }, Y = function (v) { return bot - v / s.batt * (bot - top); };
    ctx.strokeStyle = "rgba(232,228,216,0.10)"; ctx.lineWidth = 1;
    [0, 0.5, 1].forEach(function (f) { var y = Math.round(bot - f * (bot - top)) + 0.5; ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(R, y); ctx.stroke(); });
    ctx.font = "500 12px " + FONT; ctx.fillStyle = a.C.t3; ctx.textAlign = "left"; ctx.textBaseline = "bottom";
    ctx.fillText("Battery full", L, top - 4); ctx.fillText("Empty", L, bot - 4);
    var line = function (run, colour, dash) {
      var end = run.alive ? hours : run.died;
      ctx.beginPath();
      for (var h = 0; h <= end; h++) { if (h) ctx.lineTo(X(h), Y(run.series[h])); else ctx.moveTo(X(0), Y(run.series[0])); }
      ctx.strokeStyle = colour; ctx.lineWidth = 2.5; ctx.lineJoin = "round"; ctx.setLineDash(dash); ctx.stroke(); ctx.setLineDash([]);
      if (!run.alive) {   // mark where it ran out
        ctx.fillStyle = a.C.dead; ctx.beginPath(); ctx.arc(X(end), Y(0), 5, 0, 6.2832); ctx.fill();
      }
    };
    line(B, cB, [7, 5]);     // dashed, so the two lines differ by more than colour
    line(A, cA, []);
    ctx.fillStyle = a.C.t3; ctx.textBaseline = "bottom";
    ctx.textAlign = "left"; ctx.fillText("Landing", L, H - 4);
    ctx.textAlign = "right"; ctx.fillText("Day " + s.days, R, H - 4);
    ctx.textAlign = "center"; ctx.fillText("Day " + Math.round(s.days / 2), X(hours / 2), H - 4);
  }

  APP.onRefresh(function () { drawNow(); drawVs(); });
  APP.onHour(drawNow);
  window.addEventListener("resize", function () { drawVs(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawVs);
})();
