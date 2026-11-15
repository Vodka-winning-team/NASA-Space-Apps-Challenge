// Pure maths of the phone look-around (docs/gyro.js). usage: node tests/gyro.mjs   Written with AI assistance (Claude).
// Simulated readings only: this checks the conversion, not that a real phone grants motion access.
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
const require = createRequire(import.meta.url);
const G = require(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "docs", "gyro.js"));

let failed = 0;
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) failed++; };
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;
const vec = (v, w, tol = 1e-6) => v.every((x, i) => near(x, w[i], tol));
const angDiff = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
const fwdAngle = (p, q) => { const a = G.forward(p), b = G.forward(q); return Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) * 180 / Math.PI; };

// neutral pose: phone upright in portrait looks level, straight ahead (-z = north), top edge up
const up = G.fromDevice(0, 90, 0, 0);
ok(vec(G.forward(up), [0, 0, -1]) && vec(G.rotate(up, [0, 1, 0]), [0, 1, 0]), "upright portrait phone looks level and straight ahead, right way up");
// flat on a table, screen up: the back of the phone looks straight down
ok(vec(G.forward(G.fromDevice(0, 0, 0, 0)), [0, -1, 0]), "phone flat on a table looks straight down");
// tilt back 45 degrees from upright: looks 45 degrees up
ok(near(G.azEl(G.fromDevice(0, 135, 0, 0)).el, 45, 1e-6), "tilting the top of the phone back 45 degrees looks 45 degrees up");
// turning the body left (alpha grows anticlockwise) turns the view left: north -> west
const left = G.azEl(G.fromDevice(90, 90, 0, 0));
ok(near(left.az, 270, 1e-6) && near(left.el, 0, 1e-6), "turning 90 degrees to the left looks west (azimuth 270), still level");
ok(near(G.azEl(G.fromDevice(270, 90, 0, 0)).az, 90, 1e-6), "turning 90 degrees to the right looks east (azimuth 90)");

// landscape: phone on its side (right edge up), screen rotated 90: same view direction and the picture stays upright
const land = G.fromDevice(0, 0, -90, 90);
ok(vec(G.rotate(land, [0, 1, 0]), [0, 1, 0], 1e-6) && near(G.azEl(land).el, 0, 1e-6), "landscape (screen angle 90): level view, picture the right way up");
const land2 = G.fromDevice(0, 0, 90, 270);
ok(vec(G.rotate(land2, [0, 1, 0]), [0, 1, 0], 1e-6) && near(G.azEl(land2).el, 0, 1e-6), "landscape the other way (screen angle 270): level view, picture the right way up");
// turning the body by the same amount changes the heading by the same amount in portrait and landscape
const turn = (a0, a1, b, g, o) => angDiff(G.azEl(G.fromDevice(a1, b, g, o)).az, G.azEl(G.fromDevice(a0, b, g, o)).az);
ok(near(turn(10, 50, 90, 0, 0), 40, 1e-6) && near(turn(10, 50, 0, -90, 90), 40, 1e-6), "a 40 degree body turn is a 40 degree view turn in portrait and in landscape");

// re-centre: only the heading changes; tilt and roll stay tied to gravity
const pose = G.fromDevice(123, 110, 8, 0), off = G.offsetFor(pose, 200), centred = G.yawBy(pose, off);
ok(near(G.azEl(centred).az, 200, 1e-6) && near(G.azEl(centred).el, G.azEl(pose).el, 1e-6), "re-centre makes the current pose face the wanted azimuth and keeps the up/down tilt");
const upA = G.rotate(pose, [0, 1, 0]), upB = G.rotate(centred, [0, 1, 0]);
ok(near(upA[1], upB[1], 1e-9), "re-centre does not tip or roll the picture");
// after re-centring, a later body turn still moves the view by that turn
const later = G.yawBy(G.fromDevice(123 - 30, 110, 8, 0), off);
ok(near(angDiff(G.azEl(later).az, 200), 30, 1e-6), "after re-centre, turning 30 degrees right moves the view 30 degrees right");
// looking straight down: re-centre still gives a finite, usable answer
const down = G.fromDevice(40, 0, 0, 0), offD = G.offsetFor(down, 90);
ok(isFinite(offD) && G.yawBy(down, offD).every(isFinite), "re-centre while looking straight down stays finite");

// 359 -> 0 -> 1 degrees: smoothed view moves a little each step, never the long way round
let sm = G.fromDevice(355, 90, 0, 0), worst = 0, bad = false;
for (const a of [356, 357, 358, 359, 0, 1, 2, 3, 4, 5]) {
  const before = sm; sm = G.slerp(sm, G.fromDevice(a, 90, 0, 0), 0.4);
  worst = Math.max(worst, fwdAngle(before, sm)); if (!sm.every(isFinite)) bad = true;
}
ok(!bad && worst < 5, `crossing 359 -> 0 degrees is smooth (largest step ${worst.toFixed(2)} degrees), no NaN`);
// a pose and its negated quaternion are the same orientation: smoothing must not swing through the far side
const q = G.fromDevice(20, 95, 3, 0), neg = q.map((x) => -x);
ok(fwdAngle(q, G.slerp(q, neg, 0.4)) < 1e-4, "smoothing takes the short way when the sensor's numbers flip sign");
// smoothing converges on a steady reading
let s2 = G.fromDevice(0, 90, 0, 0); const goal = G.fromDevice(60, 100, 5, 0);
for (let i = 0; i < 40; i++) s2 = G.slerp(s2, goal, 0.4);
ok(fwdAngle(s2, goal) < 0.01, "smoothing settles on a steady reading");

// readings that must be ignored
ok(!G.usable(null) && !G.usable({ alpha: null, beta: 1, gamma: 2 }) && !G.usable({ alpha: NaN, beta: 1, gamma: 2 }) && !G.usable({ alpha: 1, beta: Infinity, gamma: 2 }) && G.usable({ alpha: 0, beta: 0, gamma: 0 }),
  "missing, null, NaN and infinite readings are ignored; zeros are fine");
// every result is a unit quaternion over a sweep of poses
let unit = true;
for (let a = 0; a < 360; a += 37) for (let b = -180; b <= 180; b += 45) for (let g = -90; g <= 90; g += 30) for (const o of [0, 90, 180, 270]) {
  const p = G.fromDevice(a, b, g, o), n = Math.hypot(...p); if (!near(n, 1, 1e-9) || !isFinite(G.heading(p))) unit = false;
}
ok(unit, "all poses over a wide sweep are valid rotations with a finite heading");

console.log(failed ? `${failed} FAILED` : "ALL PASSED");
process.exit(failed ? 1 : 0);
