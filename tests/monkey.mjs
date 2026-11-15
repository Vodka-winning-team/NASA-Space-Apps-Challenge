// Random judge-like clicking: many actions in a row, checking after each one that nothing broke.
// usage: node monkey.mjs <base> [steps] [seed] [webdriverPort]     Written with AI assistance (Claude).
const [, , BASE, STEPS = "250", SEED = "20271115", PORT = "4444"] = process.argv;
const WD = "http://127.0.0.1:" + PORT;
async function call(m, p, b) { const r = await fetch(WD + p, { method: m, headers: { "content-type": "application/json" }, body: b ? JSON.stringify(b) : undefined }); const j = await r.json(); if (j.value && j.value.error) throw new Error(p + " " + j.value.message); return j.value; }
const sess = await call("POST", "/session", { capabilities: { alwaysMatch: { browserName: "firefox", webSocketUrl: true, "moz:firefoxOptions": { args: ["-headless"] } } } });
const S = "/session/" + sess.sessionId, logs = [];
const ws = new WebSocket(sess.capabilities.webSocketUrl); await new Promise((r) => (ws.onopen = r));
ws.onmessage = (m) => { const j = JSON.parse(m.data); if (j.method === "log.entryAdded" && j.params.level === "error") logs.push(j.params.text + (j.params.stackTrace && j.params.stackTrace.callFrames[0] ? " @" + j.params.stackTrace.callFrames[0].url.split("/").pop() + ":" + (j.params.stackTrace.callFrames[0].lineNumber + 1) : "")); };
ws.send(JSON.stringify({ id: 1, method: "session.subscribe", params: { events: ["log.entryAdded"] } }));
const js = (x, ...a) => call("POST", S + "/execute/sync", { script: x, args: a });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let seed = +SEED; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
await call("POST", S + "/window/rect", { width: 1366, height: 768 + 85 });
await call("POST", S + "/url", { url: BASE + "/index.html?mode=planner#site=HW06&date=2027-07-28&days=14&batt=96&panel=2" });
await sleep(2500);
await js(`document.getElementById("terrain3d").scrollIntoView({ block: "start" })`);
for (let i = 0; i < 60; i++) { if (await js(`return !!(window.LANDER_T3D && window.LANDER_T3D.ready())`)) break; await sleep(300); }

const SITES = ["MMA_K2023", "MMO01", "NR101", "dGR201", "HW06", "SP07"];
const actions = [
  ["play", `document.getElementById("play").click()`],
  ["site", () => `var b = document.querySelector('#sites [data-id="${pick(SITES)}"]'); if (b) b.click()`],
  ["panel", () => `document.querySelector('#mast [data-m="${pick(["0.5", "2", "10"])}"]').click()`],
  ["days", () => `document.querySelector('#days [data-n="${pick([7, 14, 30, 60])}"]').click()`],
  ["batt", () => `var s = document.getElementById("batt"); s.value = ${pick([24, 48, 96, 168, 240])}; s.dispatchEvent(new Event("input"))`],
  ["date", () => `var d = document.getElementById("date"); d.value = "${pick(["2027-01-01", "2027-07-28", "2028-02-14", "2028-11-30", "2027-12-31"])}"; d.dispatchEvent(new Event("change"))`],
  ["view", () => `document.querySelector('#t3dViews [data-v="${pick(["ground", "above", "eye"])}"]').click()`],
  ["exag", `document.getElementById("t3dExag").click()`],
  ["earth", `document.getElementById("t3dEarth").click()`],
  ["reset", `document.getElementById("t3dReset").click()`],
  ["zoomIn", `document.getElementById("t3dIn").click()`],
  ["zoomOut", `document.getElementById("t3dOut").click(); document.getElementById("t3dOut").click()`],
  ["hour", () => `window.LANDER_APP.setHour(${Math.floor(rnd() * 1500)})`],
  ["mode", () => `document.querySelector('.modes [data-mode="${pick(["simple", "planner"])}"]').click()`],
  ["rescue", `var b = document.querySelector("#rescue button[data-i]"); if (b) b.click(); else { var u = document.getElementById("rescueUndo"); if (u) u.click(); }`],
  ["custom", () => `window.LANDER_CUSTOM && window.LANDER_CUSTOM.land(${(-85.2 - rnd() * 4.7).toFixed(3)}, ${(rnd() * 360 - 180).toFixed(2)})`],
  ["cal", `var c = document.getElementById("cal"), r = c.getBoundingClientRect(); if (r.width > 10) c.dispatchEvent(new MouseEvent("click", { clientX: r.left + r.width * 0.37, clientY: r.top + 60, bubbles: true }))`],
  ["slip", `var b = document.querySelectorAll("#slip button"); if (b.length) b[Math.min(3, b.length - 1)].click()`],
  ["flat", `var f = document.getElementById("flatView"); f.open = !f.open`],
  ["keys", `var c = document.querySelector("#t3dCanvas canvas"); if (c) { c.focus(); c.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", shiftKey: true, bubbles: true })); c.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true })); }`],
  ["wheel", `var c = document.querySelector("#t3dCanvas canvas"); if (c) { var r = c.getBoundingClientRect(); c.dispatchEvent(new WheelEvent("wheel", { deltaY: ${"-1"} * 300, ctrlKey: true, bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 })); }`],
  ["export", `var a = window.LANDER_APP.get(); if (window.LANDER_EXPORT) { var c = window.LANDER_EXPORT.csv(a); if (/NaN|undefined/.test(c)) throw new Error("CSV has NaN/undefined"); }`],
];
const resize = async () => { const [w, h] = pick([[1366, 768], [1920, 1080], [1280, 720], [1440, 900]]); await call("POST", S + "/window/rect", { width: w, height: h + 85 }); };
const check = `var A = window.LANDER_APP.get(), s = A.state, d = A.data[s.site], v = document.getElementById("vText").textContent, c = window.LANDER_T3D && window.LANDER_T3D.cam();
  var bad = [];
  if (!d) bad.push("no data for site " + s.site);
  if (!(v.length > 3)) bad.push("verdict empty");
  if (!(s.start >= 0 && s.start + s.days * 24 <= d.n - 1)) bad.push("start out of range " + s.start);
  if (!(s.hour >= 0 && s.hour <= s.days * 24)) bad.push("hour out of range " + s.hour);
  if (c && !(isFinite(c.dist) && isFinite(c.y) && isFinite(c.fov))) bad.push("camera not finite " + JSON.stringify(c));
  if (document.documentElement.scrollWidth > window.innerWidth + 1) bad.push("sideways scroll " + document.documentElement.scrollWidth);
  var lab = document.querySelector(".t3dLabel-block"), cv = document.querySelector("#t3dCanvas");
  if (lab && lab.style.display === "block") { var lr = lab.getBoundingClientRect(), cr = cv.getBoundingClientRect(); if (lr.left < cr.left - 2 || lr.right > cr.right + 2) bad.push("block label outside the 3D view"); }
  return bad;`;
const counts = {}, problems = [];
const n = +STEPS;
for (let i = 0; i < n; i++) {
  const a = pick(actions), name = a[0], code = typeof a[1] === "function" ? a[1]() : a[1];
  counts[name] = (counts[name] || 0) + 1;
  try { await js(code); } catch (e) { problems.push(`step ${i} ${name}: threw ${e.message.slice(0, 160)}`); }
  if (rnd() < 0.04) { await resize(); counts.resize = (counts.resize || 0) + 1; }
  await sleep(name === "custom" ? 900 : 120 + rnd() * 250);
  const before = logs.length;
  const bad = await js(check).catch((e) => ["check threw " + e.message]);
  if (bad.length) problems.push(`step ${i} after ${name}: ${bad.join("; ")}`);
  if (logs.length > before) problems.push(`step ${i} after ${name}: console error ${logs.slice(before).join(" | ").slice(0, 200)}`);
  if (problems.length > 12) break;
}
// let things settle, then the 3D view must be ready for the current place
await js(`var p = document.getElementById("play"); if (/Pause/.test(p.textContent)) p.click();`);
await js(`document.getElementById("terrain3d").scrollIntoView({ block: "start" })`);
let ready = false; for (let i = 0; i < 60; i++) { if (await js(`return !!(window.LANDER_T3D && window.LANDER_T3D.ready())`)) { ready = true; break; } await sleep(300); }
console.log((problems.length ? "FAIL" : "PASS") + ` monkey: ${n} random actions at laptop sizes (seed ${SEED}), ${problems.length} problems` + (problems.length ? "\n  " + problems.join("\n  ") : ""));
console.log((ready ? "PASS" : "FAIL") + " monkey: the 3D view is ready for the current place at the end");
console.log((logs.length ? "FAIL" : "PASS") + " monkey: no JavaScript errors" + (logs.length ? ": " + logs.slice(0, 5).join(" | ") : ""));
console.log("INFO actions:", JSON.stringify(counts));
await call("DELETE", S); ws.close(); process.exit(0);
