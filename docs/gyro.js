/* 360° lunar look-around: turn your phone to look around the 3D replay. Written with AI assistance (Claude).
   Uses the phone's orientation sensors only. No camera, no location. Directions are relative to the
   virtual Moon scene ("forward" is set when you enter or re-centre), not to the real sky.
   The 3D view (terrain3d.js) owns the camera; this file only hands it a pose through LANDER_T3D.look. */
(function (root) {
  "use strict";

  /* ---------- pure maths (also loaded by tests/gyro.mjs) ----------
     Quaternions are [x, y, z, w]. World: +y up, the camera looks down -z, +x to its right (three.js). */
  var D2R = Math.PI / 180;
  function mul(a, b) {
    return [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
            a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
            a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
            a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
  }
  function rotate(q, v) {                      // v rotated by q
    var x = q[0], y = q[1], z = q[2], w = q[3];
    var ix = w * v[0] + y * v[2] - z * v[1], iy = w * v[1] + z * v[0] - x * v[2], iz = w * v[2] + x * v[1] - y * v[0], iw = -x * v[0] - y * v[1] - z * v[2];
    return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x];
  }
  function usable(e) {
    return !!e && typeof e.alpha === "number" && typeof e.beta === "number" && typeof e.gamma === "number" &&
           isFinite(e.alpha) && isFinite(e.beta) && isFinite(e.gamma);
  }
  // Phone orientation (degrees, W3C deviceorientation) and screen rotation (degrees) -> camera orientation.
  // Same convention as three.js's DeviceOrientationControls: the camera looks out of the back of the phone.
  function fromDevice(alpha, beta, gamma, screenAngle) {
    var x = beta * D2R, y = alpha * D2R, z = -gamma * D2R;
    var c1 = Math.cos(x / 2), c2 = Math.cos(y / 2), c3 = Math.cos(z / 2), s1 = Math.sin(x / 2), s2 = Math.sin(y / 2), s3 = Math.sin(z / 2);
    var q = [s1 * c2 * c3 + c1 * s2 * s3, c1 * s2 * c3 - s1 * c2 * s3, c1 * c2 * s3 - s1 * s2 * c3, c1 * c2 * c3 + s1 * s2 * s3];   // Euler order YXZ
    q = mul(q, [-Math.SQRT1_2, 0, 0, Math.SQRT1_2]);                    // look out of the back, not the top
    var o = -(screenAngle || 0) * D2R;
    return mul(q, [0, 0, Math.sin(o / 2), Math.cos(o / 2)]);            // undo the screen's own rotation
  }
  function forward(q) { return rotate(q, [0, 0, -1]); }
  // Which way the pose faces, as a turn about the up axis (radians, anticlockwise seen from above; 0 = -z).
  // Looking almost straight down or up, the top edge of the phone says which way is "ahead".
  function heading(q) {
    var f = forward(q), h = Math.sqrt(f[0] * f[0] + f[2] * f[2]);
    if (h < 0.25) { var u = rotate(q, [0, 1, 0]); f = f[1] < 0 ? u : [-u[0], -u[1], -u[2]]; }
    return Math.atan2(-f[0], -f[2]);
  }
  function yawBy(q, angle) { return mul([0, Math.sin(angle / 2), 0, Math.cos(angle / 2)], q); }   // turn about the up axis only
  // The turn that makes this pose face azimuth az (degrees clockwise from north; north = -z, east = +x).
  // Only the heading is re-centred: tilt (up/down) and roll stay tied to real gravity.
  function offsetFor(q, azDeg) { return -azDeg * D2R - heading(q); }
  function slerp(a, b, t) {
    var d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
    if (d < 0) { b = [-b[0], -b[1], -b[2], -b[3]]; d = -d; }           // shortest way round: no spin at 359° -> 0°
    var s0, s1;
    if (d > 0.9995) { s0 = 1 - t; s1 = t; }
    else { var th = Math.acos(d), sn = Math.sin(th); s0 = Math.sin((1 - t) * th) / sn; s1 = Math.sin(t * th) / sn; }
    var q = [a[0] * s0 + b[0] * s1, a[1] * s0 + b[1] * s1, a[2] * s0 + b[2] * s1, a[3] * s0 + b[3] * s1];
    var n = Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]) || 1;
    return [q[0] / n, q[1] / n, q[2] / n, q[3] / n];
  }
  function azEl(q) {                            // where the pose looks: azimuth (0-360, clockwise from north) and elevation, degrees
    var f = forward(q);
    return { az: (Math.atan2(f[0], -f[2]) / D2R + 360) % 360, el: Math.asin(Math.max(-1, Math.min(1, f[1]))) / D2R };
  }
  var MATH = { mul: mul, rotate: rotate, usable: usable, fromDevice: fromDevice, forward: forward, heading: heading,
               yawBy: yawBy, offsetFor: offsetFor, slerp: slerp, azEl: azEl };
  if (typeof module !== "undefined" && module.exports) { module.exports = MATH; return; }

  /* ---------- the mode itself (browser only) ---------- */
  var doc = root.document, $ = function (id) { return doc.getElementById(id); };
  var btn = $("t3dLook"), bar = $("lookBar"), say = $("lookSay"), wrap = $("terrain3d");
  if (!btn || !bar || !say || !wrap) return;

  var SMOOTH = 0.4, WAIT_MS = 2500;
  var INTRO = "Turn your phone to look around the Moon. Your camera is not used.";
  var state = "off";                 // off -> asking -> waiting -> on
  var offset = 0, smoothed = null, last = null, timer = null, listening = false, attached = 0, attempt = 0;
  var LABEL = btn.textContent;

  function T3D() { return root.LANDER_T3D && root.LANDER_T3D.look ? root.LANDER_T3D : null; }
  function tell(text, kind) { say.textContent = text; say.className = "lookSay" + (kind ? " " + kind : ""); }
  function screenAngle() {
    var o = root.screen && root.screen.orientation;
    return o && typeof o.angle === "number" ? o.angle : (typeof root.orientation === "number" ? root.orientation : 0);
  }
  function listen(on) {
    if (on === listening) return;
    listening = on; attached += on ? 1 : -1;
    root[on ? "addEventListener" : "removeEventListener"]("deviceorientation", onReading);
  }

  function onReading(e) {
    if (!usable(e) || doc.hidden) return;                   // nothing sensible, or the page is in the background
    last = fromDevice(e.alpha, e.beta, e.gamma, screenAngle());
    if (state === "waiting") { start(); return; }
    if (state !== "on") return;
    var target = yawBy(last, offset);
    smoothed = smoothed ? slerp(smoothed, target, SMOOTH) : target;
    T3D().look.apply(smoothed);                              // the 3D view draws at most once per frame
  }

  function start() {                 // first usable reading arrived
    var t = T3D();
    if (!t || !t.ready()) return;                            // the ground is still loading: keep waiting (the timer bounds it)
    var entered = t.look.enter(ended);
    if (!entered) return;
    clearTimeout(timer); timer = null;
    state = "on";
    offset = offsetFor(last, entered.az); smoothed = null;
    wrap.classList.add("looking"); bar.hidden = false; btn.hidden = true;
    btn.textContent = LABEL;
    syncPlay();
    smoothed = yawBy(last, offset); t.look.apply(smoothed);            // the very first reading already sets the tilt
    try { $("lookExit").focus({ preventScroll: true }); } catch (err) { /* old browser */ }
    tell("Turn your phone to look around. Re-centre to set forward. Directions are for this Moon scene, not the real sky.", "on");
    var r = wrap.getBoundingClientRect(), vh = root.innerHeight, mid = r.top + r.height / 2;
    if (mid < vh * 0.3 || mid > vh * 0.7) {                  // bring the picture to the middle, once
      var calm = root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches;
      try { wrap.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "center" }); } catch (err) { wrap.scrollIntoView(); }
    }
  }

  function fail(text) {
    clearTimeout(timer); timer = null; listen(false); attempt++;
    state = "off"; btn.textContent = LABEL;
    tell(text || "Motion controls are unavailable. You can still drag to look around.", "bad");
  }

  function begin() {                 // called straight from the tap, so a permission prompt is allowed
    if (state === "asking" || state === "waiting") {         // a second tap while it is still starting: cancel, never get stuck
      fail("Cancelled. You can still drag to look around.");
      return;
    }
    if (state !== "off") return;
    var DOE = root.DeviceOrientationEvent;
    if (!DOE) { fail(); return; }
    var mine = ++attempt;                                    // answers to an older tap are ignored
    state = "asking"; last = null; btn.textContent = "Cancel";
    tell("Waiting for motion access… If nothing happens, tap Cancel and drag to look around instead.");
    var go = function () {
      state = "waiting"; listen(true);
      tell("Waiting for your phone's motion sensors…");
      timer = setTimeout(function () { if (state === "waiting") fail(); }, WAIT_MS);
    };
    if (typeof DOE.requestPermission === "function") {
      var p;
      try { p = DOE.requestPermission(); } catch (err) { fail(); return; }
      p.then(function (answer) {
        if (state !== "asking" || mine !== attempt) return;
        if (answer === "granted") go();
        else fail("Motion access was not allowed. You can still drag to look around.");
      }, function () { if (state === "asking" && mine === attempt) fail(); });
    } else go();                     // no permission step on this browser: just see whether readings arrive
  }

  function reset(text) {             // back to ordinary controls
    clearTimeout(timer); timer = null; listen(false); attempt++;
    state = "off"; smoothed = null;
    setFull(false);
    wrap.classList.remove("looking"); bar.hidden = true; btn.hidden = false; btn.textContent = LABEL;
    tell(text || INTRO);
  }
  function ended(reason) {           // the 3D view closed the mode itself (place, panel or camera changed, graphics lost)
    reset(reason === "gl" ? "Look-around ended: 3D graphics stopped." : "Look-around ended because the view changed. Tap the button to start again.");
  }
  function leave() {
    if (state === "on") { var t = T3D(); if (t) t.look.exit(); }
    reset();
    try { btn.focus({ preventScroll: true }); } catch (err) { /* old browser */ }
  }
  function recentre() {
    if (state !== "on" || !last) return;
    var t = T3D(), sun = t.look.sunAz();
    offset = offsetFor(last, sun); smoothed = null;         // what you face now becomes "towards the Sun's side of the sky"
    t.look.apply(yawBy(last, offset));
    tell("Re-centred: you now face the Sun's direction. Turn your phone to look around.", "on");
  }
  // Full screen: the picture fills the screen (works everywhere); where the browser allows it, also hide the browser's bars.
  var host = $("t3dCanvas");
  function fullOn() { return host.classList.contains("lookFull"); }
  function setFull(on) {
    if (on === fullOn()) return;
    host.classList.toggle("lookFull", on); doc.documentElement.classList.toggle("lookFullPage", on);
    var b = $("lookFull"); b.setAttribute("aria-pressed", on); b.textContent = on ? "Exit full screen" : "Full screen";
    try {
      if (on) { var ask = host.requestFullscreen || host.webkitRequestFullscreen; if (ask) { var p = ask.call(host); if (p && p.catch) p.catch(function () {}); } }
      else if (doc.fullscreenElement || doc.webkitFullscreenElement) { var out = doc.exitFullscreen || doc.webkitExitFullscreen; if (out) out.call(doc); }
    } catch (err) { /* the fill-the-screen layout still applies */ }
    root.dispatchEvent(new Event("resize"));
  }
  ["fullscreenchange", "webkitfullscreenchange"].forEach(function (n) {
    doc.addEventListener(n, function () { if (!doc.fullscreenElement && !doc.webkitFullscreenElement && fullOn()) setFull(false); });   // left with the back gesture
  });
  $("lookFull").onclick = function () { setFull(!fullOn()); };

  function syncPlay() { var p = $("play"), b = $("lookPlay"); if (p && b) b.textContent = /pause/i.test(p.textContent) ? "Pause" : "Play"; }

  btn.onclick = begin;
  $("lookExit").onclick = leave;
  $("lookCentre").onclick = recentre;
  $("lookPlay").onclick = function () { var p = $("play"); if (p) p.click(); syncPlay(); };
  if ($("play") && root.MutationObserver) new MutationObserver(syncPlay).observe($("play"), { childList: true, characterData: true, subtree: true });
  doc.addEventListener("visibilitychange", function () { if (!doc.hidden) smoothed = null; });   // back from the background: no slow swing
  root.addEventListener("pagehide", function () { if (state !== "off") leave(); });

  // Offer it where it can work: a touch device whose browser knows about orientation events. (?gyro=1 forces it, for testing.)
  var touch = root.matchMedia && root.matchMedia("(pointer: coarse)").matches;
  if (root.DeviceOrientationEvent && (touch || /[?&]gyro=1\b/.test(root.location.search))) { btn.hidden = false; say.hidden = false; tell(INTRO); }

  root.LANDER_GYRO = { math: MATH, state: function () { return state; }, listeners: function () { return attached; } };   // for tests
})(typeof window !== "undefined" ? window : this);
