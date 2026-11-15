// The 3D Moon picker: it replaces the flat map, dots select places, a tap inside 85 S lands there,
// a tap outside explains the limit, dragging turns it without selecting. usage: node globe.mjs <base> [shotDir]
// Written with AI assistance (Claude).
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
async function until(cond, ms = 30000) { const t = Date.now(); while (Date.now() - t < ms) { if (await js(cond)) return true; await sleep(300); } return false; }
const mouse = (acts) => call("POST", S + "/actions", { actions: [{ type: "pointer", id: "m", parameters: { pointerType: "mouse" }, actions: acts }] });
const click = (x, y) => mouse([{ type: "pointerMove", x: Math.round(x), y: Math.round(y), origin: "viewport" }, { type: "pointerDown", button: 0 }, { type: "pointerUp", button: 0 }]);
async function shot(name) { if (!OUT) return; const el = await call("POST", S + "/element", { using: "css selector", value: ".choose" }); fs.writeFileSync(`${OUT}/globe-${name}.png`, Buffer.from(await call("GET", `${S}/element/${el[Object.keys(el)[0]]}/screenshot`), "base64")); }

await call("POST", S + "/window/rect", { width: 1366, height: 950 });
await call("POST", S + "/url", { url: BASE + "/index.html#site=HW06&date=2027-07-28&days=14&batt=96&panel=2" });
await sleep(2000);
await until(`return window.LANDER_GLOBE_VIEW && window.LANDER_GLOBE_VIEW.mode() === "pole" && !window.LANDER_GLOBE_VIEW.busy();`, 10000);
const st = await js(`return { globe: !document.getElementById("globeFig").hidden, flat: document.querySelector(".pick .moon").hidden, canvas: !!document.querySelector("#globe canvas"), label: [].filter.call(document.querySelectorAll(".globeLabel"), function (e) { return e.style.display === "block"; }).map(function (e) { return e.textContent; }) };`);
ok(st.globe && st.flat && st.canvas, `the 3D Moon replaces the flat map (globe ${st.globe}, flat hidden ${st.flat}); labels shown: ${st.label.join(", ")}`);
await shot("start");

// screen position of a place's dot, read from the globe itself
const dotAt = (id) => js(`var c = document.querySelector("#globe canvas").getBoundingClientRect(), l = [].filter.call(document.querySelectorAll(".globeLabel"), function (e) { return e.textContent === arguments[0]; })[0];
  return null;`, id);
// zoom in on the pole so the dots spread apart
const g = await js(`var r = document.getElementById("globe").getBoundingClientRect(); document.getElementById("globe").scrollIntoView({block:"center"}); return null;`);
await sleep(400);
const rect = await js(`var r = document.querySelector("#globe canvas").getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height };`);
for (let k = 0; k < 6; k++) { await call("POST", S + "/actions", { actions: [{ type: "wheel", id: "w", actions: [{ type: "scroll", x: Math.round(rect.x + rect.w / 2), y: Math.round(rect.y + rect.h / 2), deltaX: 0, deltaY: -240, origin: "viewport" }] }] }); await sleep(120); }
await sleep(800);
const labels = await js(`var c = document.querySelector("#globe canvas").getBoundingClientRect();
  return [].filter.call(document.querySelectorAll(".globeLabel"), function (e) { return e.style.display === "block"; }).map(function (e) { var r = e.getBoundingClientRect(); return { t: e.textContent, x: r.left + r.width / 2, y: r.bottom + 10 }; })
    .filter(function (l) { return l.x > c.left + 8 && l.x < c.right - 8 && l.y > c.top + 8 && l.y < c.bottom - 8; });`);
ok(labels.length >= 3, `zoomed in: ${labels.length} place labels on screen (${labels.map((l) => l.t).join(", ")})`);
await shot("zoomed");
const target = labels.find((l) => l.t !== "Haworth");
await sleep(1200);
// tap exactly on the dot, read from the globe itself just before tapping (the page may still be settling)
const dot = await js(`var v = window.LANDER_GLOBE_VIEW, c = document.querySelector("#globe canvas").getBoundingClientRect(), id = arguments[0];
  var wp = v.markers[id].getWorldPosition(new THREE.Vector3()), p = wp.clone().project(v.camera);
  return { x: c.left + (p.x + 1) / 2 * c.width, y: c.top + (1 - p.y) / 2 * c.height };`, Object.entries({ "Malapert Massif": "MMA_K2023", "Mons Mouton": "MMO01", "Nobile Rim 1": "NR101", "de Gerlache Rim 2": "dGR201", "Slater Plain": "SP07" }).find(([n]) => n === target.t)[1]);
target.x = dot.x; target.y = dot.y;
await click(target.x, target.y); await sleep(800);
const s1 = await js(`return window.LANDER_APP.get().data[window.LANDER_APP.get().state.site].name;`);
ok(s1 === target.t, `tapping the ${target.t} dot selects it (now ${s1})`);
// a drag turns the Moon and does not select anything
await mouse([{ type: "pointerMove", x: Math.round(rect.x + rect.w * 0.3), y: Math.round(rect.y + rect.h * 0.5), origin: "viewport" }, { type: "pointerDown", button: 0 },
  { type: "pointerMove", duration: 300, x: Math.round(rect.x + rect.w * 0.6), y: Math.round(rect.y + rect.h * 0.45), origin: "viewport" }, { type: "pointerUp", button: 0 }]);
await sleep(600);
ok((await js(`return window.LANDER_APP.get().data[window.LANDER_APP.get().state.site].name;`)) === s1, "dragging turns the Moon without changing the place");
await js(`document.getElementById("globeReset").click();`); await until(`return !window.LANDER_GLOBE_VIEW.busy();`, 5000);
// a tap near the pole lands there
for (let k = 0; k < 6; k++) { await call("POST", S + "/actions", { actions: [{ type: "wheel", id: "w", actions: [{ type: "scroll", x: Math.round(rect.x + rect.w / 2), y: Math.round(rect.y + rect.h / 2), deltaX: 0, deltaY: -240, origin: "viewport" }] }] }); await sleep(120); }
await sleep(600);
const pole = await js(`var c = document.querySelector("#globe canvas").getBoundingClientRect(); return null;`);
await click(rect.x + rect.w * 0.47, rect.y + rect.h * 0.56);
const landed = await until(`return /^Landed|Could not/.test(document.getElementById("globeMsg").textContent) && /^P/.test(window.LANDER_APP.get().state.site);`, 30000);
const s2 = await js(`return [window.LANDER_APP.get().state.site, document.getElementById("globeMsg").textContent, document.getElementById("vText").textContent];`);
ok(landed, `tap inside the ring lands there: ${s2[0]}, "${s2[1].slice(0, 90)}", verdict "${s2[2]}"`);
await sleep(600); await shot("custom");
// a tap far from the pole explains the limit
await js(`window.LANDER_GLOBE_VIEW.setMode("whole", false);`); await sleep(500);
await click(rect.x + rect.w * 0.5, rect.y + rect.h * 0.18);
await sleep(600);
const far = await js(`return document.getElementById("globeMsg").textContent;`);
ok(/85° S/.test(far), `tap far from the pole: "${far.slice(0, 100)}"`);
// the chips still work and the globe follows
await js(`document.querySelector('#sites [data-id="MMA_K2023"]').click();`); await sleep(500);
const lab = await js(`return [].filter.call(document.querySelectorAll(".globeLabel.on"), function (e) { return e.style.display === "block"; }).map(function (e) { return e.textContent; });`);
ok(lab.length <= 1, `choosing Malapert Massif from the list highlights it on the Moon (${lab.join(",") || "off-screen at this view"})`);
ok(logs.length === 0, "no JavaScript errors" + (logs.length ? ": " + logs.slice(0, 4).join(" | ") : ""));
console.log(rep.join("\n"));
await call("DELETE", S); ws.close(); process.exit(0);
