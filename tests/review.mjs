// Checks for the fixes from the Codex review (15 Nov 2026). usage: node review.mjs <base http url>
// Written with AI assistance (Claude).
const [, , BASE] = process.argv;
const WD = "http://127.0.0.1:4444";
async function call(m, p, b) { const r = await fetch(WD + p, { method: m, headers: { "content-type": "application/json" }, body: b ? JSON.stringify(b) : undefined }); const j = await r.json(); if (j.value && j.value.error) throw new Error(p + " " + j.value.message); return j.value; }
const sess = await call("POST", "/session", { capabilities: { alwaysMatch: { browserName: "firefox", webSocketUrl: true, "moz:firefoxOptions": { args: ["-headless"] } } } });
const S = "/session/" + sess.sessionId, logs = [];
const ws = new WebSocket(sess.capabilities.webSocketUrl); await new Promise((r) => (ws.onopen = r));
ws.onmessage = (m) => { const j = JSON.parse(m.data); if (j.method === "log.entryAdded" && j.params.level === "error") logs.push(j.params.text); };
ws.send(JSON.stringify({ id: 1, method: "session.subscribe", params: { events: ["log.entryAdded"] } }));
const js = (x, ...a) => call("POST", S + "/execute/sync", { script: x, args: a });
const ajs = (x) => call("POST", S + "/execute/async", { script: x, args: [] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rep = []; const ok = (c, m) => rep.push((c ? "PASS " : "FAIL ") + m);
await call("POST", S + "/window/rect", { width: 1366, height: 900 });
await call("POST", S + "/url", { url: BASE + "/index.html?mode=planner#site=HW06&date=2027-07-28&days=14&batt=96&panel=2" });
await sleep(2500);

// "Switch to ..." goes where its label says, twice in a row
const sw = await js(`var A = window.LANDER_APP, out = [];
  var pick = [].filter.call(document.querySelectorAll("#vsPick button"), function (b) { return /Nobile/.test(b.textContent); })[0]; if (pick) pick.click();
  for (var k = 0; k < 3; k++) { var label = document.getElementById("vsSwitch").textContent.replace("Switch to ", ""); document.getElementById("vsSwitch").click();
    out.push(label + "=" + A.get().data[A.get().state.site].name); }
  return out;`);
ok(sw.every((x) => x.split("=")[0] === x.split("=")[1]), `"Switch to" lands on the named place every time: ${sw.join(", ")}`);

// countdown at the end of the data
await js(`window.LANDER_APP.set({ site: "HW06", days: 7, start: (Date.UTC(2028, 11, 25) - Date.UTC(2027, 0, 1)) / 3600000 }); window.LANDER_APP.setHour(168);`); await sleep(300);
const nowTxt = await js(`return document.getElementById("nowGrid").textContent;`);
ok(!/60\+ days/.test(nowTxt), `countdown at the end of 2028 does not claim "60+ days": "${nowTxt.replace(/\s+/g, " ").slice(0, 160)}"`);

// keyboard hour selection on the battery chart
await js(`window.LANDER_APP.set({ site: "HW06", days: 14, start: 4992 }); document.getElementById("time").focus();`);
const key = async (k, shift) => call("POST", S + "/actions", { actions: [{ type: "key", id: "k", actions: (shift ? [{ type: "keyDown", value: "" }] : []).concat([{ type: "keyDown", value: k }, { type: "keyUp", value: k }]).concat(shift ? [{ type: "keyUp", value: "" }] : []) }] });
await key(""); await key(""); await key("", true);
const h1 = await js(`return window.LANDER_APP.get().state.hour;`);
await key("");
const h2 = await js(`return [window.LANDER_APP.get().state.hour, document.getElementById("time").getAttribute("aria-valuetext")];`);
ok(h1 === 26 && h2[0] === 0, `arrow keys choose the hour (right, right, shift+right = ${h1}; Home = ${h2[0]}; "${h2[1]}")`);

// public setters refuse bad values without breaking the page
const set = await js(`var A = window.LANDER_APP, before = JSON.stringify(A.get().state);
  A.setSite("__proto__"); A.setSite("constructor"); A.set({ start: NaN }); A.setStart(NaN); A.setHour(NaN); A.set(null); A.set({ site: "toString" });
  return [before === JSON.stringify(A.get().state), document.getElementById("vText").textContent];`);
ok(set[0] && set[1].length > 3, `bad values through the hooks are ignored (state unchanged, verdict "${set[1]}")`);

// sim() options of zero are used, not ignored
const z = await js(`var a = window.LANDER_APP.get(); var r = a.sim(a.P, a.state.start, 48, 96, true, { charge: 0 }); var s = a.sim(a.P, a.state.start, 48, 96, true, { sunScale: 0 });
  return [r.series[0], r.alive, s.series[48], s.alive];`);
ok(z[0] === 0 && Math.abs(z[2] - 48) < 1e-6, `sim options of 0 are used, not ignored (empty battery starts at ${z[0]}; with sunScale 0 a 96 h battery has ${z[2]} h left after 48 h)`);

// the exact pole is refused with a reason
await js(`document.getElementById("customOpen").click(); document.getElementById("customLat").value = "90"; document.getElementById("customLon").value = "0"; document.querySelector("#customForm .customGo").click();`); await sleep(300);
ok(/pole itself/.test(await js(`return document.getElementById("customMsg").textContent;`)), "90° S is refused with a reason");

// nearby coordinates that round to the same id give the same place
await js(`document.getElementById("customLat").value = "86.10001"; document.getElementById("customLon").value = "12.3"; document.querySelector("#customForm .customGo").click();`);
for (let i = 0; i < 60; i++) { if (await js(`return /^Done/.test(document.getElementById("customMsg").textContent);`)) break; await sleep(300); }
const p1 = await js(`var a = window.LANDER_APP.get(); return [a.state.site, a.data[a.state.site].lat, a.P.d.lat];`);
ok(p1[0] === "P-86.1000_12.3000" && p1[1] === -86.1 && p1[2] === -86.1, `coordinates are rounded to the id's precision before working out (${p1.join(", ")})`);

// service worker: an error answer is never saved, good files are
const swr = await ajs(`var done = arguments[arguments.length - 1];
  navigator.serviceWorker.ready.then(function () { return fetch("data/no-such-file.js"); }).then(function (r) { return new Promise(function (res) { setTimeout(function () { res(r.status); }, 800); }); })
  .then(function (st) { return caches.keys().then(function (keys) { return Promise.all(keys.map(function (k) { return caches.open(k).then(function (c) { return c.match("data/no-such-file.js"); }); })).then(function (m) { done({ status: st, saved: m.some(Boolean), keys: keys }); }); }); })
  .catch(function (e) { done({ error: String(e) }); }); setTimeout(function () { done({ error: "timeout" }); }, 15000);`);
ok(swr.status === 404 && swr.saved === false, `offline copy: a 404 is not saved (status ${swr.status}, saved ${swr.saved}, caches ${swr.keys})`);
const dem = await js(`return caches.keys();`).catch(() => null);
ok(true, `caches now: ${JSON.stringify(swr.keys)}`);
ok(logs.length === 0, "no JavaScript errors" + (logs.length ? ": " + logs.slice(0, 4).join(" | ") : ""));
console.log(rep.join("\n"));
await call("DELETE", S); ws.close(); process.exit(0);
