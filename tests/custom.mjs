// End-to-end test of "Somewhere else" in headless Firefox. usage: node custom_test.mjs <base> <shotDir>
import fs from "node:fs";
const [, , BASE, OUT] = process.argv;
const WD = "http://127.0.0.1:4444";
async function call(m, p, b) { const r = await fetch(WD + p, { method: m, headers: { "content-type": "application/json" }, body: b ? JSON.stringify(b) : undefined }); const j = await r.json(); if (j.value && j.value.error) throw new Error(p + " " + j.value.message); return j.value; }
const sess = await call("POST", "/session", { capabilities: { alwaysMatch: { browserName: "firefox", webSocketUrl: true, "moz:firefoxOptions": { args: ["-headless"] } } } });
const S = "/session/" + sess.sessionId;
const logs = [];
const ws = new WebSocket(sess.capabilities.webSocketUrl); await new Promise((r) => (ws.onopen = r));
ws.onmessage = (m) => { const j = JSON.parse(m.data); if (j.method === "log.entryAdded" && (j.params.level === "error")) logs.push(j.params.text + (j.params.stackTrace && j.params.stackTrace.callFrames[0] ? " @" + j.params.stackTrace.callFrames[0].url.split("/").pop() + ":" + j.params.stackTrace.callFrames[0].lineNumber : "")); };
ws.send(JSON.stringify({ id: 1, method: "session.subscribe", params: { events: ["log.entryAdded"] } }));
const js = (x, ...a) => call("POST", S + "/execute/sync", { script: x, args: a });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rep = []; const ok = (c, m) => rep.push((c ? "PASS " : "FAIL ") + m);
async function until(cond, ms = 30000) { const t = Date.now(); while (Date.now() - t < ms) { if (await js(cond)) return true; await sleep(300); } return false; }
await call("POST", S + "/window/rect", { width: 1366, height: 950 });

await call("POST", S + "/url", { url: BASE + "/index.html?mode=planner#site=HW06&date=2027-07-28&days=14&batt=96&panel=2" });
await sleep(2500);
// 1. out-of-range input
await js(`document.getElementById("customOpen").click();`); await sleep(300);
await js(`document.getElementById("customLat").value = "80"; document.getElementById("customLon").value = "10"; document.querySelector("#customForm .customGo").click();`); await sleep(300);
const bad = await js(`return document.getElementById("customMsg").textContent;`);
ok(/85/.test(bad), `latitude 80 is refused with a clear message: "${bad}"`);
await js(`document.getElementById("customLat").value = "abc"; document.getElementById("customLon").value = ""; document.querySelector("#customForm .customGo").click();`); await sleep(200);
ok(/Type both numbers/.test(await js(`return document.getElementById("customMsg").textContent;`)), "empty / non-numbers refused");
// 2. typed place
const t0 = Date.now();
await js(`document.getElementById("customLat").value = "88.5"; document.getElementById("customLon").value = "-40"; document.querySelector("#customForm .customGo").click();`);
const done = await until(`return /^Done/.test(document.getElementById("customMsg").textContent);`, 60000);
ok(done, `typed 88.5 S, 40 W: worked out in ${((Date.now() - t0) / 1000).toFixed(1)} s: "${(await js(`return document.getElementById("customMsg").textContent;`)).slice(0, 120)}..."`);
await sleep(1500);
const st = await js(`var A = window.LANDER_APP.get(), s = A.state;
  return { site: s.site, label: document.getElementById("vLabel").textContent, verdict: document.getElementById("vText").textContent,
    hash: location.hash, nSites: A.sites.length, chip: !!document.querySelector('#sites [data-custom][aria-checked="true"]'),
    dot: !!document.querySelector('#moon .dotCustom[aria-checked="true"]'), ridge: document.getElementById("ridgeSay").textContent,
    cal: document.getElementById("calSay").textContent, vs: document.getElementById("vsPick").textContent, t3d: document.getElementById("t3dNow").textContent,
    t3dNote: document.getElementById("t3dNote").textContent, moris: document.getElementById("morisText").textContent, sure: (document.getElementById("sureSay")||{}).textContent };`);
ok(/^P-88\.5000_-40\.0000$/.test(st.site), `custom place selected (${st.site})`);
ok(/^Your place/.test(st.label), `verdict label: "${st.label}" -> "${st.verdict}"`);
ok(/site=P-88\.5000_-40\.0000/.test(st.hash), "shareable link holds the place: " + st.hash);
ok(st.nSites === 7 && st.chip && st.dot, `7th place added, chip and map dot selected (${st.nSites})`);
ok(st.ridge.length > 20 && !/missing/.test(st.ridge), `which hill: "${st.ridge.slice(0, 110)}..."`);
ok(/Your place|%/.test(st.cal), `calendar: "${st.cal}"`);
ok(st.vs.length > 0, `compare picker: "${st.vs.slice(0, 120)}"`);
rep.push(`INFO 3D: "${st.t3d}" note: "${st.t3dNote}" | Mauritius: "${st.moris.slice(0, 80)}" | sure: "${(st.sure || "").slice(0, 80)}"`);
if (OUT) {
  for (const [sel, name] of [["#verdict", "verdict"], [".ridge", "ridge"], ["#terrain3d", "3d"], [".cal", "calendar"], [".pick", "pick"]]) {
    const el = await call("POST", S + "/element", { using: "css selector", value: sel });
    await js(`arguments[0].scrollIntoView({block:"start"})`, el); await sleep(sel === "#terrain3d" ? 4000 : 800);
    fs.writeFileSync(`${OUT}/custom-${name}.png`, Buffer.from(await call("GET", `${S}/element/${el[Object.keys(el)[0]]}/screenshot`), "base64"));
  }
}
// 3. switch sites back and forth, play, all mast heights, rescue
const sweep = await js(`var A = window.LANDER_APP, id = A.get().state.site, out = [];
  ["0.5","2","10"].forEach(function (m) { A.set({ mast: m }); out.push(A.get().run.alive); });
  A.setSite("HW06"); A.setSite(id); for (var k = 0; k < 20; k++) A.setStart(k * 30 * 24); return out.length;`);
ok(sweep === 3, "custom place: all 3 panel heights and 20 dates run");
// 4. a second place picked on the map (the flat map, or the 3D globe when it is shown; tests/globe.mjs taps the globe itself)
const globeOn = await js(`var g = document.getElementById("globeFig"); return !!g && !g.hidden;`);
let rect = null;
if (globeOn) {
  await js(`window.LANDER_CUSTOM.land(-87.7607, 49.9306);`);
} else {
  const disc = await call("POST", S + "/element", { using: "css selector", value: "#moon" });
  await js(`arguments[0].scrollIntoView({block:"center"})`, disc); await sleep(400);
  rect = await js(`var r = arguments[0].getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height };`, disc);
  await call("POST", S + "/actions", { actions: [{ type: "pointer", id: "m", parameters: { pointerType: "mouse" }, actions: [
    { type: "pointerMove", x: Math.round(rect.x + rect.w * 0.62), y: Math.round(rect.y + rect.h * 0.40), origin: "viewport" }, { type: "pointerDown", button: 0 }, { type: "pointerUp", button: 0 }] }] });
}
const tapped = await until(`return /^Done/.test(document.getElementById("customMsg").textContent) && /^P/.test(window.LANDER_APP.get().state.site) && window.LANDER_APP.get().state.site !== "P-88.5000_-40.0000";`, 60000);
const st2 = await js(`var A = window.LANDER_APP.get(); return { site: A.state.site, n: A.sites.length, chips: document.querySelectorAll("#sites [data-custom]").length, dots: document.querySelectorAll("#moon .dotCustom").length };`);
ok(tapped && st2.n === 7 && st2.chips === 1 && st2.dots === 1, `a new place replaces the old one (${st2.site}, ${st2.n} places, ${st2.chips} chip, ${st2.dots} dot)${globeOn ? " [3D globe shown]" : ""}`);
// outside the 85 S limit
if (globeOn) {
  await js(`window.LANDER_CUSTOM.land(-80, 10);`); await sleep(400);
  ok(/85° and 90° south/.test(await js(`return document.getElementById("customMsg").textContent;`)), "a place outside 85° S is refused with the reason");
} else {
  await call("POST", S + "/actions", { actions: [{ type: "pointer", id: "m", parameters: { pointerType: "mouse" }, actions: [
    { type: "pointerMove", x: Math.round(rect.x + rect.w * 0.95), y: Math.round(rect.y + rect.h * 0.5), origin: "viewport" }, { type: "pointerDown", button: 0 }, { type: "pointerUp", button: 0 }] }] });
  await sleep(400);
  ok(/dashed circle/.test(await js(`return document.getElementById("customMsg").textContent;`)), "tap outside 85° S explains the limit");
}
// 5. shared link opens the custom place
const link = await js(`return location.href;`);
await call("POST", S + "/url", { url: "about:blank" });
await call("POST", S + "/url", { url: link });
const restored = await until(`return window.LANDER_APP && window.LANDER_APP.get().state.site === ${JSON.stringify(st2.site)};`, 60000);
ok(restored, `opening the shared link rebuilds the same place (${link.split("#")[1]})`);
// 6. dots on the map still select prepared sites when the form is closed
await js(`if (!document.getElementById("customForm").hidden) document.getElementById("customOpen").click(); document.querySelector('#moon .dot[data-id="SP07"]').click();`); await sleep(500);
ok(await js(`return window.LANDER_APP.get().state.site === "SP07";`), "map dots still work");
ok(logs.length === 0, "no JavaScript errors" + (logs.length ? ": " + logs.slice(0, 5).join(" | ") : ""));
console.log(rep.join("\n"));
await call("DELETE", S); ws.close(); process.exit(0);
