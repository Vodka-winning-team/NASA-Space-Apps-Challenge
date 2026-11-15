// "Watch the mission" in 3D. usage: node replay.mjs <base> [shotDir]   Written with AI assistance (Claude).
import fs from "node:fs";
const [, , BASE, OUT] = process.argv;
const WD = "http://127.0.0.1:4444";
async function call(m, p, b) { const r = await fetch(WD + p, { method: m, headers: { "content-type": "application/json" }, body: b ? JSON.stringify(b) : undefined }); const j = await r.json(); if (j.value && j.value.error) throw new Error(p + " " + j.value.message); return j.value; }
const sess = await call("POST", "/session", { capabilities: { alwaysMatch: { browserName: "firefox", webSocketUrl: true, "moz:firefoxOptions": { args: ["-headless"] } } } });
const S = "/session/" + sess.sessionId, logs = [];
const ws = new WebSocket(sess.capabilities.webSocketUrl); await new Promise((r) => (ws.onopen = r));
ws.onmessage = (m) => { const j = JSON.parse(m.data); if (j.method === "log.entryAdded" && j.params.level === "error") logs.push(j.params.text); };
ws.send(JSON.stringify({ id: 1, method: "session.subscribe", params: { events: ["log.entryAdded"] } }));
const js = (x, ...a) => call("POST", S + "/execute/sync", { script: x, args: a });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rep = []; const ok = (c, m) => rep.push((c ? "PASS " : "FAIL ") + m);
const mouse = (acts) => call("POST", S + "/actions", { actions: [{ type: "pointer", id: "m", parameters: { pointerType: "mouse" }, actions: acts }] });
await call("POST", S + "/window/rect", { width: 1366, height: 950 });
await call("POST", S + "/url", { url: BASE + "/index.html?mode=simple#site=HW06&date=2027-07-28&days=14&batt=96&panel=2" });
await sleep(2500);
await js(`document.getElementById("terrain3d").scrollIntoView({ block: "start" })`);
const up = await (async () => { const t = Date.now(); while (Date.now() - t < 20000) { if (await js(`return !!(window.LANDER_T3D && window.LANDER_T3D.ready());`)) return true; await sleep(300); } return false; })();
await sleep(1200);
const s0 = await js(`return { simple: document.body.classList.contains("mode-simple"), canvas: !!document.querySelector("#t3dCanvas canvas"), view: window.LANDER_T3D.view(), follow: window.LANDER_T3D.follow(), hud: document.getElementById("hudWhen").textContent, cam: window.LANDER_T3D.cam(), cursor: getComputedStyle(document.querySelector("#t3dCanvas canvas")).cursor };`);
ok(up && s0.simple && s0.canvas, "the 3D replay is part of 'Watch the mission', also in Simple mode");
ok(s0.view === "ground" && s0.follow && s0.cam.dist < 60 && s0.cam.y < 15, `it starts beside the lander, near the ground, following the Sun (${s0.view}, ${Math.round(s0.cam.dist)} m away, ${s0.cam.y.toFixed(1)} m up); readout "${s0.hud}"`);
ok(s0.cursor === "default", `the pointer stays a normal arrow over the 3D view (cursor: ${s0.cursor})`);
// the mouse wheel scrolls the page; Ctrl + wheel zooms
const r = await js(`var r = document.querySelector("#t3dCanvas canvas").getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height };`);
// a plain wheel turn goes through the browser (so the page really scrolls); Ctrl + wheel is sent as the event a browser makes for it
const wheel = (dy, ctrl) => ctrl
  ? js(`var c = document.querySelector("#t3dCanvas canvas"), r = c.getBoundingClientRect(); return c.dispatchEvent(new WheelEvent("wheel", { deltaY: arguments[0], ctrlKey: true, bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }));`, dy)
  : call("POST", S + "/actions", { actions: [{ type: "wheel", id: "w", actions: [{ type: "scroll", x: Math.round(r.x + r.w / 2), y: Math.round(r.y + r.h / 2), deltaX: 0, deltaY: dy, origin: "viewport" }] }] });
const y0 = await js(`return window.scrollY;`);
await wheel(240, false); await sleep(500);
const w1 = await js(`return { y: window.scrollY, dist: window.LANDER_T3D.cam().dist, tip: document.getElementById("t3dTip").classList.contains("on") };`);
ok(w1.y > y0 && Math.abs(w1.dist - s0.cam.dist) < 0.01 && w1.tip, `the mouse wheel scrolls the page and does not zoom (page moved ${Math.round(w1.y - y0)} px); a tip explains Ctrl + scroll`);
await js(`document.getElementById("terrain3d").scrollIntoView({ block: "start" })`); await sleep(400);
await wheel(240, true); await wheel(240, true); await sleep(500);
const w2 = await js(`return window.LANDER_T3D.cam().dist;`);
ok(w2 > s0.cam.dist * 1.05, `Ctrl + wheel zooms (${Math.round(s0.cam.dist)} m -> ${Math.round(w2)} m)`);
await js(`document.getElementById("t3dIn").click(); document.getElementById("t3dIn").click();`); await sleep(300);
ok((await js(`return window.LANDER_T3D.cam().dist;`)) < w2, "the + button zooms in");
// Play moves the 3D view and the readout
await js(`document.getElementById("play").click()`); await sleep(2000);
const h1 = await js(`var h = window.LANDER_APP.get().state.hour; document.getElementById("play").click(); return [h, document.getElementById("hudWhen").textContent];`);
ok(h1[0] > 0 && !/Day 1 · 28 Jul · 00:00/.test(h1[1]), `Play moves the 3D replay on: "${h1[1]}"`);
// turning the view by hand stops the Sun-following; Reset brings it back
await mouse([{ type: "pointerMove", x: Math.round(r.x + r.w * 0.5), y: Math.round(r.y + r.h * 0.4), origin: "viewport" }, { type: "pointerDown", button: 0 },
  { type: "pointerMove", duration: 300, x: Math.round(r.x + r.w * 0.75), y: Math.round(r.y + r.h * 0.4), origin: "viewport" }, { type: "pointerUp", button: 0 }]);
await sleep(400);
const f1 = await js(`return window.LANDER_T3D.follow();`);
if (f1 !== false) rep.push("INFO drag: follow still " + f1 + "; element under pointer: " + await js(`var e = document.elementFromPoint(arguments[0], arguments[1]); return e ? e.tagName + "." + e.className : "none";`, Math.round(r.x + r.w * 0.5), Math.round(r.y + r.h * 0.4)));
await js(`document.getElementById("t3dReset").click()`); await sleep(400);
ok(f1 === false && (await js(`return window.LANDER_T3D.follow();`)), "dragging looks around (stops following the Sun); Reset view brings it back");
// from above, zoomed far out, and the lander's eye
await js(`document.querySelector('#t3dViews [data-v="above"]').click()`); await sleep(600);
const ab = await js(`for (var k = 0; k < 8; k++) document.getElementById("t3dOut").click(); return { v: window.LANDER_T3D.view(), cam: window.LANDER_T3D.cam() };`);
ok(ab.v === "above" && ab.cam.dist > 100000 && ab.cam.dist <= 160001, `'From above' zooms out over the whole region (${Math.round(ab.cam.dist / 1000)} km away)`);
const ex = await js(`document.getElementById("t3dExag").click(); var a = window.LANDER_T3D.cam().dist; document.getElementById("t3dExag").click(); return [a, window.LANDER_T3D.cam().dist];`);
ok(Math.abs(ex[0] - ab.cam.dist) < ab.cam.dist * 0.05 && Math.abs(ex[1] - ab.cam.dist) < ab.cam.dist * 0.05, `'Hills 3x taller' keeps you as far out as you were (${ex.map(function (d) { return Math.round(d / 1000); }).join(" km, ")} km)`);
await js(`document.querySelector('#t3dViews [data-v="eye"]').click()`); await sleep(600);
const ey = await js(`document.getElementById("t3dIn").click(); return { v: window.LANDER_T3D.view(), cam: window.LANDER_T3D.cam() };`);
ok(ey.v === "eye" && Math.abs(ey.cam.y - 2) < 0.01 && ey.cam.fov < 55, `"Lander's eye" stands at panel height (${ey.cam.y} m); + zooms the lens (${ey.cam.fov.toFixed(0)}°)`);
await js(`document.getElementById("t3dEarth").click()`); await sleep(400);
ok(!(await js(`return window.LANDER_T3D.follow();`)), "'Look at Earth' turns the view");
await js(`document.querySelector('#t3dViews [data-v="above"]').click()`); await sleep(600);
// find a mission hour where a ridge in the 3D square (not a far hill) hides the Sun, at any place
const near = await js(`var A = window.LANDER_APP, out = null;
  A.get().sites.forEach(function (s) { if (out) return; A.set({ site: s.id, start: 4992 }); return; });
  return null;`);
let found = null;
for (const site of ["MMA_K2023", "MMO01", "NR101", "dGR201", "SP07", "HW06"]) {
  await js(`window.LANDER_APP.set({ site: arguments[0], start: 4992, days: 30 })`, site); await sleep(1500);
  const hrs = await js(`var a = window.LANDER_APP.get(), out = []; for (var h = 0; h < a.hours; h += 3) if (a.P.sun[a.state.start + h] === 0) out.push(h); return out.slice(0, 80);`);
  for (const h of hrs) {
    await js(`window.LANDER_APP.setHour(arguments[0])`, h);
    const b = await js(`var b = window.LANDER_T3D.block(); return b ? { far: b.far, dist: b.dist, label: document.querySelector(".t3dLabel-block").textContent } : null;`);
    if (b && !b.far) { found = { site, h, ...b }; break; }
  }
  if (found) break;
}
ok(!!found, found ? `a nearby ridge is found and labelled: ${found.site}, hour ${found.h}: "${found.label}"` : "no hour with a nearby blocking ridge found (only far hills)");
if (OUT && found) { await sleep(800); const el = await call("POST", S + "/element", { using: "css selector", value: "#t3dCanvas" }); fs.writeFileSync(`${OUT}/replay-near-ridge.png`, Buffer.from(await call("GET", `${S}/element/${el[Object.keys(el)[0]]}/screenshot`), "base64")); }
// the label on what blocks the Sun stays wholly on the picture, even when the Sun is at the edge of the view
await js(`window.LANDER_APP.set({ site: "HW06", start: 4992, days: 14 })`); await sleep(1500);
await js(`document.querySelector('#t3dViews [data-v="ground"]').click(); window.LANDER_APP.setHour(104);`); await sleep(900);
const lab = await js(`var e = document.querySelector(".t3dLabel-block"), r = e.getBoundingClientRect(), c = document.getElementById("t3dCanvas").getBoundingClientRect();
  return { shown: e.style.display === "block", inside: r.left >= c.left && r.right <= c.right && r.top >= c.top, text: e.textContent };`);
ok(lab.shown && lab.inside, `the blocking-hill label stays inside the 3D view ("${lab.text}")`);
// the Earth turns smoothly: no jump from one hour to the next beyond its normal turn (about 14.5 degrees an hour)
const spin = await js(`var m = 0; for (var i = 1; i < 17000; i++) { var d = ((window.LANDER_T3D.earthLon(i) - window.LANDER_T3D.earthLon(i - 1)) % 360 + 540) % 360 - 180; m = Math.max(m, Math.abs(d)); } return m;`);
ok(spin < 16, `the Earth turns evenly hour by hour (largest step ${spin.toFixed(1)} degrees)`);
// each place's ground file is asked for once, however many changes are made while it loads
const tags = await js(`var n = {}; [].forEach.call(document.scripts, function (s) { if (/terrain_/.test(s.src)) n[s.src] = (n[s.src] || 0) + 1; }); return Object.keys(n).filter(function (k) { return n[k] > 1; });`);
ok(tags.length === 0, "each ground file is loaded once" + (tags.length ? ": twice: " + tags.join(", ") : ""));
// the flat view still works, folded away
await js(`document.getElementById("flatView").open = true`); await sleep(800);
const pano = await js(`var c = document.getElementById("pano"); return [c.width, c.height];`);
ok(pano[0] > 100 && pano[1] > 100, `the flat 360° view opens and draws (${pano.join("x")})`);
ok(logs.length === 0, "no JavaScript errors" + (logs.length ? ": " + logs.slice(0, 4).join(" | ") : ""));
console.log(rep.join("\n"));
await call("DELETE", S); ws.close(); process.exit(0);
