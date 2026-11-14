// True phone-width test + screenshots: the page runs inside an iframe exactly W CSS px wide
// (Firefox windows cannot be narrower than ~500 px). Media queries use the iframe's width.
// usage: node phone.mjs <baseUrl serving docs + _phone.html> <width> <outDir|-> [shots]
import fs from "node:fs";
const [, , BASE, WIDTH, OUT, SHOTS] = process.argv;
const W = +WIDTH, DPR = 2;
const WD = "http://127.0.0.1:4444";
async function call(m, p, b) { const r = await fetch(WD + p, { method: m, headers: { "content-type": "application/json" }, body: b ? JSON.stringify(b) : undefined }); const j = await r.json(); if (j.value && j.value.error) throw new Error(p + " " + j.value.message); return j.value; }
const sess = await call("POST", "/session", { capabilities: { alwaysMatch: { browserName: "firefox", webSocketUrl: true,
  "moz:firefoxOptions": { args: ["-headless"], prefs: { "layout.css.devPixelsPerPx": String(DPR) } } } } });
const S = "/session/" + sess.sessionId;
const logs = [];
const ws = new WebSocket(sess.capabilities.webSocketUrl); await new Promise((r) => (ws.onopen = r));
ws.onmessage = (m) => { const j = JSON.parse(m.data); if (j.method === "log.entryAdded" && j.params.level === "error") logs.push(j.params.text); };
ws.send(JSON.stringify({ id: 1, method: "session.subscribe", params: { events: ["log.entryAdded"] } }));
const js = (x, ...a) => call("POST", S + "/execute/sync", { script: x, args: a });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const report = []; const ok = (c, m) => report.push((c ? "PASS " : "FAIL ") + `${W}px: ` + m);
await call("POST", S + "/window/rect", { width: 700, height: 1000 });

// F = code run inside the iframe's window (same origin)
const F = (code, ...a) => js(`var w = document.getElementById("f").contentWindow, document_ = w.document; return (function (window, document) { ${code} }).apply(null, [w, w.document].concat([].slice.call(arguments)));`, ...a);

async function open(query, hash) {
  await call("POST", S + "/url", { url: `${BASE}/_phone.html?w=${W}&src=${encodeURIComponent("index.html?" + query + "#" + hash)}` });
  await sleep(3000);
}
async function tall() {           // make the iframe as tall as its page, so a screenshot shows everything
  await js(`var f = document.getElementById("f"); f.style.height = f.contentWindow.document.documentElement.scrollHeight + "px";`);
  await sleep(600);
  await js(`var f = document.getElementById("f"); f.style.height = f.contentWindow.document.documentElement.scrollHeight + "px";`);
  await sleep(600);
}
async function shots(tag, mode) {
  await F(`var b = document.querySelector('.modes [data-mode="' + arguments[2] + '"]'); if (b) b.click();`, mode); await sleep(800);
  if (mode === "planner") { await F(`var e = document.getElementById("terrain3d"); if (e) e.scrollIntoView();`); await sleep(4000); }
  await tall();
  const frame = await call("POST", S + "/element", { using: "css selector", value: "#f" });
  const fref = frame[Object.keys(frame)[0]];
  fs.writeFileSync(`${OUT}/phone-${tag}-${mode}-0-fullpage.png`, Buffer.from(await call("GET", `${S}/moz/screenshot/full`), "base64"));
  await call("POST", S + "/frame", { id: frame });
  const els = await call("POST", S + "/elements", { using: "css selector", value: "header, section" });
  let i = 0;
  for (const el of els) {
    const ref = el[Object.keys(el)[0]];
    const info = await js(`var e = arguments[0], h = e.querySelector("h1, h2"); return { shown: !!e.offsetParent && !e.hidden && e.getBoundingClientRect().height > 20, name: e.id || e.getAttribute("aria-label") || (h && h.textContent) || "" };`, el);
    if (!info.shown || !info.name) continue;
    await js(`arguments[0].scrollIntoView({ block: "start" });`, el); await sleep(700);
    i++;
    const name = info.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
    fs.writeFileSync(`${OUT}/phone-${tag}-${mode}-${String(i).padStart(2, "0")}-${name}.png`, Buffer.from(await call("GET", `${S}/element/${ref}/screenshot`), "base64"));
  }
  await call("POST", S + "/frame/parent", {});
  console.log("shots", tag, mode, i);
}

// ---------- checks ----------
await open("mode=simple", "site=HW06&date=2027-07-28&days=14&batt=96&panel=2");
for (const mode of ["simple", "planner"]) {
  await F(`var b = document.querySelector('.modes [data-mode="' + arguments[2] + '"]'); if (b) b.click();`, mode); await sleep(1200);
  const st = await F(`var a = window.LANDER_APP.get();
    var wide = [].filter.call(document.querySelectorAll("body *"), function (e) { var r = e.getBoundingClientRect(); if (!r.width || r.right <= window.innerWidth + 1) return false;
      for (var p = e.parentElement; p; p = p.parentElement) { var o = window.getComputedStyle(p).overflowX; if (o === "auto" || o === "scroll" || o === "hidden") return false; } return true; });
    var cv = [].filter.call(document.querySelectorAll("canvas"), function (c) { return c.offsetParent && (c.width < 50 || c.height < 50); }).map(function (c) { return c.id; });
    var small = [].filter.call(document.querySelectorAll("button, input, select, summary, a"), function (e) { var r = e.getBoundingClientRect(); return e.offsetParent && r.width && (r.height < 32 || r.width < 32); }).slice(0, 6).map(function (e) { return e.tagName + ":" + (e.textContent || e.id).trim().slice(0, 18) + " " + Math.round(e.getBoundingClientRect().width) + "x" + Math.round(e.getBoundingClientRect().height); });
    return { inner: window.innerWidth, scrollW: document.documentElement.scrollWidth, alive: a.run.alive, verdict: document.getElementById("vText").textContent,
      wide: wide.slice(0, 6).map(function (e) { return e.tagName + "#" + e.id + "." + String(e.className).slice(0, 20) + " right=" + Math.round(e.getBoundingClientRect().right); }), cv: cv, small: small };`);
  ok(st.inner === W, `${mode}: page really is ${W}px wide (innerWidth ${st.inner})`);
  ok(st.scrollW <= st.inner && st.wide.length === 0, `${mode}: no sideways scroll (page ${st.scrollW}px)` + (st.wide.length ? " overflowing: " + st.wide.join(", ") : ""));
  ok(st.cv.length === 0, `${mode}: every visible chart has a size` + (st.cv.length ? " empty: " + st.cv.join(",") : ""));
  ok(st.verdict.length > 3, `${mode}: verdict "${st.verdict}"`);
  if (st.small.length) report.push(`INFO ${W}px ${mode}: small tap targets (<32px): ${st.small.join(" | ")}`);
}
const r1 = await F(`var b = document.getElementById("rescue"); return { hidden: b.hidden, n: b.querySelectorAll("button[data-i]").length };`);
ok(!r1.hidden && r1.n > 0, `"How do we save it?" shows with ${r1.n} buttons`);
await F(`document.querySelector("#rescue button[data-i]").click();`); await sleep(800);
ok(await F(`return window.LANDER_APP.get().run.alive;`), `"Try it" saves the mission`);
await F(`document.getElementById("rescueUndo").click();`); await sleep(600);
ok(!(await F(`return window.LANDER_APP.get().run.alive;`)), `"Put it back" undoes it`);
await F(`document.getElementById("play").click();`); await sleep(1500);
ok((await F(`var h = window.LANDER_APP.get().state.hour; document.getElementById("play").click(); return h;`)) > 0, "Play moves time");
ok(logs.length === 0, "no JavaScript errors" + (logs.length ? ": " + logs.slice(0, 4).join(" | ") : ""));
console.log(report.join("\n"));

if (SHOTS) {
  await open("mode=simple", "site=HW06&date=2027-07-28&days=14&batt=96&panel=2");
  await shots("lost", "simple");
  await open("mode=simple", "site=HW06&date=2027-07-28&days=14&batt=96&panel=2");
  await shots("lost", "planner");
  await open("mode=simple", "site=MMA_K2023&date=2027-01-01&days=14&batt=96&panel=2");
  await shots("survived", "simple");
  ok(logs.length === 0, "no JavaScript errors during screenshots");
  console.log(report.slice(-1)[0]);
}
await call("DELETE", S); ws.close(); process.exit(0);
