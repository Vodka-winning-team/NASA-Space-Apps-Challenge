// Stress test: bad links, blocked storage, no WebGL, rapid clicking. usage: node hostile.mjs <base>
const [, , BASE] = process.argv;
const WD = "http://127.0.0.1:4444";
async function call(m, p, b) { const r = await fetch(WD + p, { method: m, headers: { "content-type": "application/json" }, body: b ? JSON.stringify(b) : undefined }); const j = await r.json(); if (j.value && j.value.error) throw new Error(p + " " + j.value.message); return j.value; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rep = []; const ok = (c, m) => rep.push((c ? "PASS " : "FAIL ") + m);
async function session(prefs) {
  const s = await call("POST", "/session", { capabilities: { alwaysMatch: { browserName: "firefox", webSocketUrl: true, "moz:firefoxOptions": { args: ["-headless"], prefs: prefs || {} } } } });
  const S = "/session/" + s.sessionId, logs = [];
  const ws = new WebSocket(s.capabilities.webSocketUrl); await new Promise((r) => (ws.onopen = r));
  ws.onmessage = (m) => { const j = JSON.parse(m.data); if (j.method === "log.entryAdded" && j.params.level === "error") logs.push(j.params.text + (j.params.stackTrace && j.params.stackTrace.callFrames[0] ? " @" + j.params.stackTrace.callFrames[0].url.split("/").pop() + ":" + j.params.stackTrace.callFrames[0].lineNumber : "")); };
  ws.send(JSON.stringify({ id: 1, method: "session.subscribe", params: { events: ["log.entryAdded"] } }));
  await call("POST", S + "/window/rect", { width: 1280, height: 900 });
  return { S, logs, js: (x, ...a) => call("POST", S + "/execute/sync", { script: x, args: a }), close: async () => { await call("DELETE", S); ws.close(); } };
}
const state = `var a = window.LANDER_APP && window.LANDER_APP.get(); if (!a) return null; var s = a.state;
  return { site: s.site, start: s.start, days: s.days, batt: s.batt, mast: s.mast, verdict: document.getElementById("vText").textContent, n: a.data[s.site].n };`;

// 1. hostile / broken links
{
  const B = await session();
  const cases = [
    "site=__proto__&date=2027-07-28", "site=constructor", "site=toString&batt=NaN&days=NaN&panel=NaN",
    "batt=-5&days=-1&panel=../../x", "batt=99999&days=9999", "date=garbage", "date=1999-01-01", "date=2028-12-31&days=60",
    "date=2028-11-30&days=60", "site=P999_999", "site=P-89_0&date=2027-03-01", "site=P-84.9_10", "site=%E0%A4%A",
    "site=SP07&date=2027-02-30", "&&&==&", "site=<img src=x onerror=alert(1)>",
  ];
  for (const h of cases) {
    B.logs.length = 0;
    await call("POST", B.S + "/url", { url: "about:blank" });
    await call("POST", B.S + "/url", { url: BASE + "/index.html#" + h });
    await sleep(h.indexOf("P-89_0") >= 0 ? 4000 : 1600);
    const st = await B.js(state);
    const sane = st && st.start >= 0 && st.start + st.days * 24 <= st.n - 1 && [7, 14, 30, 60].includes(st.days) && st.batt >= 24 && st.batt <= 240 && ["0.5", "2", "10"].includes(st.mast) && st.verdict.length > 3;
    ok(sane && B.logs.length === 0, `link #${h} -> ${st ? `${st.site} start=${st.start} ${st.days}d batt=${st.batt} panel=${st.mast} "${st.verdict}"` : "app missing"}` + (B.logs.length ? " ERR " + B.logs.join(" | ") : ""));
  }
  const xss = await B.js(`return !!document.querySelector("img[src=x]");`);
  ok(!xss, "no HTML injected from the link");
  // 2. rapid clicking
  await call("POST", B.S + "/url", { url: BASE + "/index.html?mode=planner#site=HW06&date=2027-07-28" }); await sleep(2500);
  B.logs.length = 0;
  await B.js(`var ids = ["MMA_K2023","MMO01","NR101","dGR201","HW06","SP07"], A = window.LANDER_APP;
    document.getElementById("play").click();
    for (var i = 0; i < 60; i++) {
      document.querySelector('#sites [data-id="' + ids[i % 6] + '"]').click();
      if (i % 7 === 0) document.querySelector('.modes [data-mode="' + (i % 2 ? "simple" : "planner") + '"]').click();
      if (i % 5 === 0) document.querySelector('#mast [data-m="' + ["0.5","2","10"][i % 3] + '"]').click();
      if (i % 3 === 0) document.querySelector('#days [data-n="' + [7,14,30,60][i % 4] + '"]').click();
      var b = document.querySelector("#rescue button[data-i]"); if (b) b.click();
      var u = document.getElementById("rescueUndo"); if (u) u.click();
    }`);
  await sleep(1500);
  await B.js(`document.getElementById("play").click(); document.getElementById("play").click();`); await sleep(1500);
  await B.js(`window.dispatchEvent(new Event("resize")); document.querySelector('.modes [data-mode="planner"]').click(); window.dispatchEvent(new Event("resize"));`); await sleep(800);
  ok(B.logs.length === 0 && (await B.js(state)).verdict.length > 3, "60 rapid clicks across places, modes, panels, days, rescue, Play: no errors" + (B.logs.length ? " ERR " + B.logs.slice(0, 4).join(" | ") : ""));
  // 3. click while a custom place is being worked out, then change place before it finishes
  B.logs.length = 0;
  await B.js(`document.getElementById("customOpen").click(); document.getElementById("customLat").value = "87.2"; document.getElementById("customLon").value = "60";
    document.querySelector("#customForm .customGo").click(); document.querySelector("#customForm .customGo").click();
    document.querySelector('#sites [data-id="SP07"]').click(); document.getElementById("play").click();`);
  for (let i = 0; i < 40; i++) { if (await B.js(`return /^Done|Could not/.test(document.getElementById("customMsg").textContent);`)) break; await sleep(300); }
  await B.js(`document.getElementById("play").click();`);
  const c = await B.js(`return { msg: document.getElementById("customMsg").textContent, n: window.LANDER_APP.get().sites.length, site: window.LANDER_APP.get().state.site };`);
  ok(/^Done/.test(c.msg) && c.n === 7 && B.logs.length === 0, `double-click "Land here" while switching place and playing: ${c.n} places, now ${c.site}` + (B.logs.length ? " ERR " + B.logs.join(" | ") : ""));
  await B.close();
}
// 4. storage blocked + WebGL off
{
  const B = await session({ "dom.storage.enabled": false, "webgl.disabled": true });
  await call("POST", B.S + "/url", { url: BASE + "/index.html#site=HW06" }); await sleep(2500);
  await B.js(`document.querySelector('.modes [data-mode="planner"]').click();`); await sleep(500);
  await B.js(`document.getElementById("terrain3d").scrollIntoView();`); await sleep(2500);
  const st = await B.js(`return { planner: document.body.classList.contains("mode-planner"), note: document.getElementById("t3dNote").textContent, v: document.getElementById("vText").textContent };`);
  ok(st.planner && st.v.length > 3, `storage blocked: mode switch still works ("${st.v}")`);
  ok(/3D|cannot|WebGL/i.test(st.note), `WebGL off: 3D section explains it: "${st.note}"`);
  ok(B.logs.length === 0, "storage blocked + WebGL off: no script errors" + (B.logs.length ? " ERR " + B.logs.slice(0, 4).join(" | ") : ""));
  await B.close();
}
console.log(rep.join("\n"));
process.exit(0);
