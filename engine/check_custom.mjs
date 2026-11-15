// Check the "land anywhere" calculation (docs/customcalc.js) against the six prepared sites.
// For each site we build a custom place at the same coordinates, but without using that site's own
// Sun/Earth table (the nearest OTHER site is used), then compare horizon, Sun, Earth and the verdict.
// Usage: node engine/check_custom.mjs        (needs docs/data/dem, built by build_custom.py)
// Written with AI assistance (Claude).
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
const DOCS = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "docs");
const ctx = { Buffer, Math, Array, Float64Array, Int16Array, Uint8Array, ArrayBuffer, Error, String, Infinity, NaN, isNaN, parseFloat, JSON };
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
const load = (f) => vm.runInContext(fs.readFileSync(path.join(DOCS, f), "utf8"), ctx, { filename: f });
["science.js", "data/sites.js", "data/MMA_K2023.js", "data/MMO01.js", "data/NR101.js", "data/dGR201.js", "data/HW06.js", "data/SP07.js",
 "data/dem/coarse.js", "customcalc.js"].forEach(load);
const C = ctx.LANDER_CUSTOM_CALC, SITES = ctx.LANDER_SITES, DATA = ctx.LANDER_DATA;

// same as prep() and sim() in app.js
function prep(d, mast) {
  const hor = d.horizons[mast], n = hor.length, step = d.horizon_step_deg, r = d.sun_width_deg / 2;
  const at = (az) => { const p = (((az % 360) + 360) % 360) / step, i = Math.floor(p), f = p - i; return hor[i % n] * (1 - f) + hor[(i + 1) % n] * f; };
  const sun = new Float32Array(d.n), earth = new Uint8Array(d.n);
  for (let i = 0; i < d.n; i++) {
    sun[i] = ctx.LANDER_SCIENCE.visibleDiscFraction(d.sun_el[i], at(d.sun_az[i]), r);
    assert(Number.isFinite(sun[i]) && sun[i] >= 0 && sun[i] <= 1, "invalid sunlight fraction");
    assert(Number.isFinite(d.earth_el[i]) && Number.isFinite(at(d.earth_az[i])), "invalid Earth geometry");
    earth[i] = d.earth_el[i] > at(d.earth_az[i]) ? 1 : 0;
  }
  return { sun, earth };
}
function alive(P, start, hours, batt) {
  let c = batt;
  for (let h = 0; h < hours; h++) { c += P.sun[start + h] * 3 - 1; if (c >= batt) c = batt; if (c <= 0) return false; }
  return true;
}
const sep = (az1, el1, az2, el2) => {           // angle between two sky directions, degrees
  const r = Math.PI / 180, a = Math.sin(el1 * r) * Math.sin(el2 * r) + Math.cos(el1 * r) * Math.cos(el2 * r) * Math.cos((az1 - az2) * r);
  return Math.acos(Math.min(1, a)) / r;
};

// Gate fixed from the audited 96.9% baseline: allow <1 percentage point drift.
// Six-site consistency only; this is not a physical accuracy threshold.
const MIN_AGREEMENT = 96;
let worst = 100;
for (const s of SITES) {
  for (const k of C.needed(s.lat, s.lon)) { const f = `data/dem/f_${k}.js`; if (fs.existsSync(path.join(DOCS, f))) load(f); }
  const t0 = Date.now();
  const out = C.build(s.lat, s.lon, SITES, DATA, { skipRef: s.id, id: "TEST" });
  const ms = Date.now() - t0;
  const ref = DATA[s.id], d = out.data;
  const hz = ["0.5", "2", "10"].map((h) => {
    const a = ref.horizons[h], b = d.horizons[h]; let mx = 0, sum = 0;
    for (let i = 0; i < a.length; i++) { const e = Math.abs(a[i] - b[i]); assert(Number.isFinite(e), "invalid horizon"); mx = Math.max(mx, e); sum += e; }
    return `${h} m: mean ${(sum / a.length).toFixed(3)}° max ${mx.toFixed(2)}°`;
  });
  let sunErr = 0, earthErr = 0;
  for (let i = 0; i < ref.n; i++) {
    assert([ref.sun_az[i], ref.sun_el[i], d.sun_az[i], d.sun_el[i], ref.earth_az[i], ref.earth_el[i], d.earth_az[i], d.earth_el[i]].every(Number.isFinite), "invalid sky geometry");
    sunErr = Math.max(sunErr, sep(ref.sun_az[i], ref.sun_el[i], d.sun_az[i], d.sun_el[i]));
    earthErr = Math.max(earthErr, sep(ref.earth_az[i], ref.earth_el[i], d.earth_az[i], d.earth_el[i]));
  }
  const lines = [];
  for (const [days, batt] of [[14, 96], [30, 96], [14, 48], [60, 240]]) {
    const hours = days * 24, A = prep(ref, "2"), B = prep(d, "2");
    let same = 0, n = 0;
    for (let st = 0; st + hours < ref.n; st += 24) { n++; if (alive(A, st, hours, batt) === alive(B, st, hours, batt)) same++; }
    assert(n > 0, "empty verdict comparison");
    worst = Math.min(worst, 100 * same / n);
    lines.push(`${days}d/${batt}h ${(100 * same / n).toFixed(1)}%`);
  }
  console.log(`${s.id.padEnd(10)} built in ${ms} ms, Sun/Earth from ${out.site && d.ref}`);
  console.log(`  horizon vs 80 m site file: ${hz.join(" | ")}`);
  console.log(`  largest sky error over 2 years: Sun ${sunErr.toFixed(4)}°, Earth ${earthErr.toFixed(4)}°`);
  console.log(`  same survive/lost answer, every landing day of 2027-28: ${lines.join(", ")}`);
}
console.log(`\nWorst agreement over all sites and settings: ${worst.toFixed(1)}%`);

// Every map tile the page asks for must exist, for any place it accepts (85 S to the pole, all longitudes).
let asked = 0, absent = [];
for (let lat = -85; lat >= -89.99; lat -= (lat > -85.6 ? 0.02 : 0.25)) {
  for (let lon = -180; lon < 180; lon += 1.5) {
    if (C.check(lat, lon)) continue;
    for (const k of C.needed(lat, lon)) { asked++; if (!fs.existsSync(path.join(DOCS, "data/dem/f_" + k + ".js"))) absent.push(`${lat.toFixed(2)},${lon} -> f_${k}`); }
  }
}
console.log(`Tiles asked for over the whole accepted area: ${asked}, missing: ${absent.length}` + (absent.length ? " e.g. " + absent.slice(0, 5).join("; ") : ""));
// and an edge place (Codex's example) works out with no gaps
for (const k of C.needed(-85.1, 132)) load(`data/dem/f_${k}.js`);
const edge = C.build(-85.1, 132, SITES, DATA, { id: "EDGE" });
const bad = ["0.5", "2", "10"].some((h) => edge.data.horizons[h].some((v) => !isFinite(v)));
console.log(`Edge place 85.1 S 132 E: horizon ${bad ? "HAS GAPS" : "complete"}`);
if (absent.length || bad) process.exitCode = 1;
assert(Number.isFinite(worst) && worst >= MIN_AGREEMENT, `Agreement ${worst}% below ${MIN_AGREEMENT}% regression floor`);
