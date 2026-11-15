/* "Somewhere else": land at any place south of 85° S, typed in or tapped on the map.
   The maths is in customcalc.js. This file loads the map pieces, shows progress, and adds the new
   place to the page as a seventh landing place, so every section works for it.
   Written with AI assistance (Claude). */
(function () {
  "use strict";
  var APP = window.LANDER_APP, CALC = window.LANDER_CUSTOM_CALC;
  var $ = function (id) { return document.getElementById(id); };
  var open = $("customOpen"), form = $("customForm"), msg = $("customMsg"), disc = $("moon");
  if (!APP || !CALC || !open || !form || !msg || !disc) return;

  var MOON_R = 1737400, MAP_HALF = 215000;
  var ready = false, waiting = null, busy = false, current = null;

  APP.onRefresh(function () {
    if (ready) return;
    ready = true;
    if (waiting) { var w = waiting; waiting = null; w(); }
  });
  function whenReady(f) { if (ready) f(); else waiting = f; }

  function say(text, kind) {
    msg.textContent = text; msg.className = "customMsg" + (kind ? " " + kind : "");
    // other parts of the page can show the same progress
    try { window.dispatchEvent(new CustomEvent("lander-custom-msg", { detail: { text: text, kind: kind || "" } })); } catch (e) { /* very old browser */ }
  }
  function fmt(lat, lon) { return Math.abs(lat).toFixed(2) + "° S, " + Math.abs(lon).toFixed(2) + "° " + (lon < 0 ? "W" : "E"); }

  /* ---------- loading the map pieces ---------- */

  var loaded = {};
  function script(src, done) {
    if (loaded[src] === true) return done(null);
    if (loaded[src]) { loaded[src].push(done); return; }
    loaded[src] = [done];
    var s = document.createElement("script"), finish = function (err) {
      var cbs = loaded[src]; loaded[src] = err ? undefined : true;
      if (err && s.parentNode) s.parentNode.removeChild(s);
      cbs.forEach(function (cb) { cb(err); });
    };
    var timer = setTimeout(function () { s.onload = s.onerror = null; finish("timeout"); }, 30000);
    s.onload = function () { clearTimeout(timer); finish(null); };
    s.onerror = function () { clearTimeout(timer); finish("error"); };
    s.src = src;
    document.head.appendChild(s);
  }
  function loadAll(lat, lon, done) {
    var keys = CALC.needed(lat, lon), files = ["data/dem/coarse.js"];
    keys.forEach(function (k) { if (!CALC.hasTiles([k])) files.push("data/dem/f_" + k + ".js"); });
    var left = files.length, failed = false;
    files.forEach(function (f) {
      script(f, function (err) {
        if (err) failed = true;
        if (--left === 0) done(failed);
      });
    });
  }

  /* ---------- adding the place to the page ---------- */

  function addPlace(out) {
    var sites = APP.get().sites, data = APP.get().data;
    // replace the previous custom place, if any (its data stays, so nothing that still points at it breaks)
    for (var i = sites.length - 1; i >= 0; i--) if (sites[i].custom) sites.splice(i, 1);
    [].forEach.call(document.querySelectorAll('#sites [data-custom], #moon [data-custom]'), function (el) { el.parentNode.removeChild(el); });
    sites.push(out.site);
    data[out.site.id] = out.data;
    window.LANDER_RIDGES = window.LANDER_RIDGES || {};
    window.LANDER_RIDGES[out.site.id] = out.ridges;
    window.LANDER_TERRAIN = window.LANDER_TERRAIN || {};
    window.LANDER_TERRAIN[out.site.id] = out.terrain;

    var b = document.createElement("button");
    b.type = "button"; b.setAttribute("role", "radio"); b.dataset.id = out.site.id; b.dataset.custom = "1";
    b.textContent = out.site.name; b.title = out.site.region;
    b.onclick = function () { APP.setSite(out.site.id); };
    $("sites").appendChild(b);

    var r = 2 * MOON_R * Math.tan(Math.PI / 4 + out.site.lat * Math.PI / 360), lon = out.site.lon * Math.PI / 180;
    var dot = document.createElement("button");
    dot.type = "button"; dot.className = "dot dotCustom"; dot.setAttribute("role", "radio"); dot.dataset.id = out.site.id; dot.dataset.custom = "1";
    dot.setAttribute("aria-label", out.site.name + ", " + out.site.region);
    dot.style.left = (50 + r * Math.sin(lon) / MAP_HALF * 50) + "%";
    dot.style.top = (50 - r * Math.cos(lon) / MAP_HALF * 50) + "%";
    dot.innerHTML = "<span>" + out.site.name + "</span>";
    dot.onclick = function (e) { e.stopPropagation(); APP.setSite(out.site.id); };
    disc.appendChild(dot);
    current = out.site;
  }

  // a shared link that could not be rebuilt: put it back in the address bar, so reloading later tries again
  function keepLink(quiet) {
    if (!quiet || !window.LANDER_HASH0) return;
    try { history.replaceState(null, "", window.LANDER_HASH0); } catch (e) { /* opened from disk: fine */ }
  }

  var reqId = 0;
  function land(lat, lon, quiet, noScroll) {
    if (busy) return;
    var err = CALC.check(lat, lon);
    if (err) { say(err, "bad"); return; }
    lon = ((lon + 180) % 360 + 360) % 360 - 180;
    // work with exactly the precision the place's id and link keep, so the same id always means the same place
    lat = Math.round(lat * 1e4) / 1e4; lon = Math.round(lon * 1e4) / 1e4;
    if (current && Math.abs(current.lat - lat) < 1e-5 && Math.abs(current.lon - lon) < 1e-5) { APP.setSite(current.id); return; }
    busy = true; form.classList.add("busy");
    var req = ++reqId, picked = APP.selection ? APP.selection() : 0;   // to notice if the user moves on meanwhile
    say("Loading NASA's height map around " + fmt(lat, lon) + "…");
    loadAll(lat, lon, function (failed) {
      if (failed) {
        busy = false; form.classList.remove("busy");
        say("Could not load the height map for this place. The first time you use a new place, the page needs the internet." +
            (quiet ? " Showing Haworth for now; reload the page to try the shared place again." : ""), "bad");
        whenReady(function () { keepLink(quiet); });
        return;
      }
      say("Working out the hills in every direction, out to 200 km… (a few seconds)");
      setTimeout(function () {             // let the message show before the heavy sums
        var out = null;
        try {
          var a = APP.get();
          out = CALC.build(lat, lon, a.sites, a.data, {});
        } catch (e) {
          busy = false; form.classList.remove("busy");
          say("Could not work out this place: " + e.message, "bad");
          whenReady(function () { keepLink(quiet); });
          return;
        }
        whenReady(function () {
          addPlace(out);
          busy = false; form.classList.remove("busy");
          // the user picked something else while we were working: keep the new place ready, but do not take over
          if (req !== reqId || (APP.selection && APP.selection() !== picked)) {
            say("Ready: " + fmt(lat, lon) + " is now in the list of places. Tap it to see its result.", "good");
            return;
          }
          APP.setSite(out.site.id);
          var ref = APP.get().data[out.data.ref];
          say("Done: " + fmt(lat, lon) + ", ground " + Math.round(out.data.ground_m) + " m from the Moon's average height. " +
              "Hills from NASA's height map (80 m detail near the lander, 640 m beyond 10 km); Sun and Earth from the NASA/JPL Horizons table of " +
              (ref ? ref.name : "the nearest site") + ".", "good");
          if (!quiet && !noScroll) { try { $("verdict").scrollIntoView({ block: "start", behavior: "smooth" }); } catch (e) { /* old browser */ } }
        });
      }, 40);
    });
  }

  /* ---------- the form and the map ---------- */

  function show(on, noFocus) {
    form.hidden = !on;
    open.setAttribute("aria-expanded", on);
    disc.classList.toggle("picking", on);
    if (on && !noFocus) $("customLat").focus();
  }
  // On a touch screen, focusing the box would pop the keyboard up over the map people are told to tap,
  // so only put the cursor in the box for a mouse, or when the button was pressed with the keyboard.
  var coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  open.onclick = function (e) { show(form.hidden, coarse && !(e && e.detail === 0)); };
  function num(v) { v = String(v).trim().replace(",", ".").replace("−", "-"); return v === "" ? NaN : Number(v); }
  form.onsubmit = function (e) {
    e.preventDefault();
    var la = num($("customLat").value), lo = num($("customLon").value);
    if (isNaN(la) || isNaN(lo)) { say("Type both numbers, for example 86.1 and 12.3.", "bad"); return; }
    land(-Math.abs(la), lo, false);
  };
  // tap the map to choose (only while the form is open, so a missed tap on a dot does not move the lander)
  disc.addEventListener("click", function (e) {
    if (form.hidden || (e.target.closest && e.target.closest(".dot"))) return;
    var r = disc.getBoundingClientRect();
    var x = ((e.clientX - r.left) / r.width - 0.5) * 2 * MAP_HALF, y = (0.5 - (e.clientY - r.top) / r.height) * 2 * MAP_HALF;
    var rr = Math.sqrt(x * x + y * y), lat = -90 + 2 * Math.atan(rr / (2 * MOON_R)) * 180 / Math.PI, lon = Math.atan2(x, y) * 180 / Math.PI;
    $("customLat").value = Math.abs(lat).toFixed(3);
    $("customLon").value = lon.toFixed(3);
    if (lat > -85) { say("That spot is " + Math.abs(lat).toFixed(1) + "° S. Choose a place inside the dashed circle (85° S).", "bad"); return; }
    land(lat, lon, false);
  });

  // a shared link to a custom place: site=P<lat>_<lon>
  var m = /(?:^#|&)site=P(-?\d+(?:\.\d+)?)_(-?\d+(?:\.\d+)?)(?:&|$)/.exec(window.LANDER_HASH0 || "");
  if (m) {
    var la0 = parseFloat(m[1]), lo0 = parseFloat(m[2]);
    if (!CALC.check(la0, lo0)) {
      $("customLat").value = Math.abs(la0); $("customLon").value = lo0;
      show(true, true);
      land(la0, lo0, true);
    }
  }
  // land at a place from script (stays where it is, no scrolling); the tests use it
  window.LANDER_CUSTOM = { land: function (lat, lon) { land(lat, lon, false, true); }, check: CALC.check };
})();
