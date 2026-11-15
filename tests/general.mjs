// General browser test: load, verdict, layout, sweep, Play, links, rescue, modes, offline cache. Written with AI assistance (Claude).
// Minimal WebDriver (classic + BiDi logs) client for headless Firefox via geckodriver. No dependencies.
// usage: node wd.mjs <baseUrl> <label> <outDir>
import fs from "node:fs";
const [, , BASE, LABEL, OUT] = process.argv;
const WD = "http://127.0.0.1:4444";
async function call(method, path, body) {
  const r = await fetch(WD + path, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json();
  if (j.value && j.value.error) throw new Error(path + ": " + j.value.error + " " + j.value.message);
  return j.value;
}
const ONLY = process.argv[5], DPR = process.argv[6] || "1.0";
const sess = await call("POST", "/session", { capabilities: { alwaysMatch: { browserName: "firefox", webSocketUrl: true,
  "moz:firefoxOptions": { args: ["-headless"], prefs: { "layout.css.devPixelsPerPx": DPR } } } } });
const S = "/session/" + sess.sessionId;
const logs = [];
const ws = new WebSocket(sess.capabilities.webSocketUrl);
await new Promise((res) => (ws.onopen = res));
let id = 0; const pend = {};
ws.onmessage = (m) => { const j = JSON.parse(m.data);
  if (j.method === "log.entryAdded") { const p = j.params; if (p.level === "error" || p.level === "warn" || p.type === "javascript") logs.push(`[${p.level}] ${p.text}` + (p.stackTrace && p.stackTrace.callFrames && p.stackTrace.callFrames[0] ? ` @ ${p.stackTrace.callFrames[0].url.split("/").pop()}:${p.stackTrace.callFrames[0].lineNumber}` : "")); }
  if (j.id && pend[j.id]) pend[j.id](j); };
const bidi = (method, params) => new Promise((res) => { const i = ++id; pend[i] = res; ws.send(JSON.stringify({ id: i, method, params })); });
await bidi("session.subscribe", { events: ["log.entryAdded"] });

const js = (script, ...args) => call("POST", S + "/execute/sync", { script, args });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const report = [];
const ok = (cond, msg) => { report.push((cond ? "PASS " : "FAIL ") + msg); };
async function shot(name) { const b = await call("GET", S + "/moz/screenshot/full"); fs.writeFileSync(`${OUT}/${LABEL}-${name}.png`, Buffer.from(b, "base64")); }

const SIZES = [["desktop", 1366, 900], ["phone390", 390, 844], ["phone360", 360, 780]];
for (const [sz, w, h] of SIZES) {
  if (ONLY && sz !== ONLY) continue;
  await call("POST", S + "/window/rect", { width: Math.round(w * DPR), height: Math.round(h * DPR) + 85 });
  logs.length = 0;
  await call("POST", S + "/url", { url: BASE + "/index.html" });
  await sleep(2500);
  const st = await js(`var a = window.LANDER_APP && window.LANDER_APP.get();
    var cv = [].map.call(document.querySelectorAll("canvas"), function (c) { return c.id + ":" + c.width + "x" + c.height + (c.offsetParent ? "" : "(hidden)"); });
    return { inner: innerWidth, scrollW: document.documentElement.scrollWidth, hasApp: !!a, alive: a && a.run.alive,
      verdict: (document.getElementById("vText")||{}).textContent, canvases: cv,
      wide: [].filter.call(document.querySelectorAll("body *"), function (e) { var r = e.getBoundingClientRect(); if (!r.width || r.right <= innerWidth + 1 || getComputedStyle(e).position === "fixed") return false; for (var p = e.parentElement; p; p = p.parentElement) { var o = getComputedStyle(p).overflowX; if (o === "auto" || o === "scroll" || o === "hidden") return false; } return true; }).slice(0, 5).map(function (e) { return e.tagName + "#" + e.id + "." + e.className; }),
      t3d: (document.getElementById("t3dNote")||{}).textContent, sw: !!navigator.serviceWorker };`);
  ok(st.hasApp, `${sz}: app loaded`);
  ok(st.verdict && st.verdict.length > 3, `${sz}: verdict shown: "${st.verdict}"`);
  ok(st.scrollW <= st.inner, `${sz}: no sideways scroll (page ${st.scrollW}px, window ${st.inner}px)` + (st.wide.length ? " overflowing: " + st.wide.join(", ") : ""));
  const empty = st.canvases.filter((c) => /:0x|x0/.test(c) && !/hidden/.test(c));
  ok(empty.length === 0, `${sz}: visible canvases have size ${empty.length ? empty.join(" ") : ""}`);
  report.push(`INFO ${sz}: canvases ${st.canvases.join(" ")} | 3D note: "${st.t3d}"`);
  await shot(sz + "-default");
  if (sz === "desktop" || sz === "phone390") {
    // every site, every panel height, and a sweep of dates
    const sweep = await js(`var A = window.LANDER_APP, out = [], dead = null, sites = A.get().sites;
      sites.forEach(function (s) { A.setSite(s.id); for (var k = 0; k < 24; k++) { A.setStart(k * 30 * 24); var r = A.get().run; out.push(r.alive ? 1 : 0); if (!r.alive && !dead) dead = { site: s.id, start: k * 30 * 24 }; } });
      A.setSite("HW06"); A.setStart(0); return { n: out.length, alive: out.reduce(function (a, b) { return a + b; }, 0), dead: dead };`);
    ok(sweep.n === 144, `${sz}: swept 6 sites x 24 dates without throwing (${sweep.alive} alive, ${sweep.n - sweep.alive} lost)`);
    // play the mission for a moment
    await js(`document.getElementById("play").click();`); await sleep(1500);
    const hr = await js(`var h = window.LANDER_APP.get().state.hour; document.getElementById("play").click(); return h;`);
    ok(hr > 0, `${sz}: Play moves time forward (hour ${hr})`);
    // URL hash round trip
    await call("POST", S + "/url", { url: BASE + "/index.html#site=SP07&date=2027-03-10&days=30&batt=48&panel=10" });
    await call("POST", S + "/refresh", {}); await sleep(1500);
    const hs = await js(`var s = window.LANDER_APP.get().state; return s.site + "|" + s.days + "|" + s.batt + "|" + s.mast;`);
    ok(hs === "SP07|30|48|10", `${sz}: link with settings opens those settings (${hs})`);
    if (sweep.dead) {
      // rescue section (plain-words only)
      const hasRescue = await js(`return !!document.getElementById("rescue");`);
      if (hasRescue) {
        await js(`var A = window.LANDER_APP; A.set({ days: 14, batt: 96, mast: "2" }); A.setSite(arguments[0]); A.setStart(arguments[1]);`, sweep.dead.site, sweep.dead.start); await sleep(500);
        const r1 = await js(`var b = document.getElementById("rescue"); return { hidden: b.hidden, say: document.getElementById("rescueSay").textContent, buttons: b.querySelectorAll("button[data-i]").length, alive: window.LANDER_APP.get().run.alive };`);
        ok(!r1.alive && !r1.hidden, `${sz}: lost mission shows "How do we save it?": ${JSON.stringify(r1)}`);
        await shot(sz + "-lost");
        if (r1.buttons) {
          await js(`document.querySelector("#rescue button[data-i]").click();`); await sleep(800);
          const r2 = await js(`return { alive: window.LANDER_APP.get().run.alive, title: document.getElementById("rescueTitle").textContent };`);
          ok(r2.alive && r2.title === "Saved.", `${sz}: "Try it" saves the mission (alive=${r2.alive}, "${r2.title}")`);
          await js(`var u = document.getElementById("rescueUndo"); if (u) u.click();`); await sleep(500);
          const r3 = await js(`return window.LANDER_APP.get().run.alive;`);
          ok(r3 === false, `${sz}: "Put it back" undoes the fix (alive after undo: ${r3})`);
        }
      }
      const hasModes = await js(`return document.querySelectorAll(".modes [data-mode]").length;`);
      if (hasModes) {
        await js(`document.querySelector('.modes [data-mode="planner"]').click();`); await sleep(600);
        const m = await js(`return { planner: document.body.classList.contains("mode-planner"), shown: [].filter.call(document.querySelectorAll(".pro"), function (e) { return e.offsetParent; }).length, total: document.querySelectorAll(".pro").length };`);
        ok(m.planner && m.shown > 0, `${sz}: "Mission planner" shows the detailed sections (${m.shown}/${m.total})`);
        await shot(sz + "-planner");
        await js(`document.querySelector('.modes [data-mode="simple"]').click();`); await sleep(1300);   // the switch has a short animation
        const m2 = await js(`return [].filter.call(document.querySelectorAll(".pro"), function (e) { return e.offsetParent; }).length;`);
        ok(m2 === 0, `${sz}: "Simple" hides them again (${m2} shown)`);
      }
    }
  }
  const errs = logs.filter((l) => /^\[error\]/.test(l));
  ok(errs.length === 0, `${sz}: no JavaScript errors` + (errs.length ? ": " + errs.slice(0, 5).join(" | ") : ""));
  if (logs.length > errs.length) report.push(`INFO ${sz}: warnings: ` + logs.filter((l) => !/^\[error\]/.test(l)).slice(0, 5).join(" | "));
}
// offline: service worker registered and caching (http only)
const swState = await js(`return navigator.serviceWorker.getRegistration().then ? "async" : "sync";`).catch(() => "n/a");
const sw = await call("POST", S + "/execute/async", { script: `var done = arguments[arguments.length - 1];
  navigator.serviceWorker.ready.then(function () { return caches.keys(); }).then(function (k) { return caches.open(k[0]).then(function (c) { return c.keys(); }).then(function (r) { done(k.join(",") + " files=" + r.length); }); }).catch(function (e) { done("error " + e); });
  setTimeout(function () { done("timeout"); }, 8000);`, args: [] });
const nFiles = (await js(`return 0;`), null);
report.push("INFO service worker cache: " + sw);
console.log(report.join("\n"));
await call("DELETE", S);
ws.close();
process.exit(0);
