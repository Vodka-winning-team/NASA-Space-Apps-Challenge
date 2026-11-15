// Check "The numbers" section and the CSV. usage: node export_test.mjs <base>
const [, , BASE] = process.argv;
const WD = "http://127.0.0.1:4444";
async function call(m, p, b) { const r = await fetch(WD + p, { method: m, headers: { "content-type": "application/json" }, body: b ? JSON.stringify(b) : undefined }); const j = await r.json(); if (j.value && j.value.error) throw new Error(p + " " + j.value.message); return j.value; }
const sess = await call("POST", "/session", { capabilities: { alwaysMatch: { browserName: "firefox", webSocketUrl: true, "moz:firefoxOptions": { args: ["-headless"], prefs: { "browser.download.folderList": 2, "browser.download.dir": process.env.TMPDIR || "/tmp", "browser.helperApps.neverAsk.saveToDisk": "text/csv" } } } } });
const S = "/session/" + sess.sessionId, logs = [];
const ws = new WebSocket(sess.capabilities.webSocketUrl); await new Promise((r) => (ws.onopen = r));
ws.onmessage = (m) => { const j = JSON.parse(m.data); if (j.method === "log.entryAdded" && j.params.level === "error") logs.push(j.params.text); };
ws.send(JSON.stringify({ id: 1, method: "session.subscribe", params: { events: ["log.entryAdded"] } }));
const js = (x, ...a) => call("POST", S + "/execute/sync", { script: x, args: a });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rep = []; const ok = (c, m) => rep.push((c ? "PASS " : "FAIL ") + m);
await call("POST", S + "/window/rect", { width: 1366, height: 900 });
await call("POST", S + "/url", { url: BASE + "/index.html?mode=planner#site=HW06&date=2027-07-28&days=14&batt=96&panel=2" });
await sleep(2500);
await js(`document.querySelector('.modes [data-mode="planner"]').click();`); await sleep(500);
for (const [days, site] of [[14, "HW06"], [60, "SP07"], [7, "MMA_K2023"]]) {
  await js(`window.LANDER_APP.set({ site: arguments[0], days: arguments[1] });`, site, days); await sleep(400);
  const r = await js(`var a = window.LANDER_APP.get(), csv = window.LANDER_EXPORT.csv(a), lines = csv.trim().split("\\r\\n"), data = lines.filter(function (l) { return l[0] !== "#"; });
    var rows = data.slice(1), last = rows[rows.length - 1].split(",");
    var bad = rows.filter(function (l) { return l.split(",").length !== 12 || /NaN|undefined|Infinity/.test(l); }).length;
    var verdictLost = !a.run.alive, endBatt = parseFloat(last[11]);
    return { rows: rows.length, hours: a.hours, cols: data[0].split(",").length, bad: bad, endBatt: endBatt, lost: verdictLost,
      tableRows: document.querySelectorAll("#exportDays tr").length, outcome: [].map.call(document.querySelectorAll("#exportFigures dd"), function (d) { return d.textContent; }).join(" | "),
      timing: rows.every(function (l, h) { var c = l.split(","); return Date.parse(c[0]) === Date.UTC(2027, 0, 1) + (a.state.start + h) * 3600000 && Date.parse(c[1]) === Date.parse(c[0]) + 3600000 && +c[2] === h; }),
      header: data[0], first: rows[0], visible: !!document.getElementById("exportSection").offsetParent };`);
  ok(r.visible && r.rows === r.hours && r.cols === 12 && r.bad === 0 && r.timing && /battery_at_interval_end_percent$/.test(r.header) && r.tableRows === days, `${site} ${days}d: CSV ${r.rows} rows x ${r.cols} cols, ${r.bad} bad rows; table ${r.tableRows} days; first row ${r.first}`);
  ok(r.lost ? r.endBatt === 0 : r.endBatt > 0, `${site} ${days}d: CSV battery at the end (${r.endBatt}%) matches the verdict (${r.lost ? "lost" : "survived"})`);
  rep.push(`INFO ${r.outcome.slice(0, 260)}`);
}
// A dark hour starts full and exports the end-of-interval battery, not the initial state.
const dark = await js(`var a = window.LANDER_APP.get(), d = a.data[a.state.site], P = {sun: new Float32Array(d.n), earth: new Uint8Array(d.n)};
  var r = a.sim(P, a.state.start, 24, 24, true), rows = window.LANDER_EXPORT.csv(Object.assign({}, a, {hours:24, P:P, run:r, state:Object.assign({},a.state,{batt:24})})).trim().split("\\r\\n").filter(function(l){return l[0]!=="#";}).slice(1);
  return { first: rows[0].split(","), last: rows[23].split(","), initial:r.series[0], firstCharge:r.series[1] };`);
ok(dark.initial === 24 && dark.firstCharge === 23 && +dark.first[11] === 95.8 && +dark.last[11] === 0 && Date.parse(dark.last[1]) - Date.parse(dark.first[0]) === 24*3600000, "24-unit dark battery: initial 100%, first interval 23 units / 95.8%, final interval at +24h");
// a custom place goes through too
await js(`document.getElementById("customOpen").click(); document.getElementById("customLat").value = "89.4"; document.getElementById("customLon").value = "200"; document.querySelector("#customForm .customGo").click();`);
for (let i = 0; i < 60; i++) { if (await js(`return /^Done/.test(document.getElementById("customMsg").textContent);`)) break; await sleep(300); }
const c = await js(`var a = window.LANDER_APP.get(), csv = window.LANDER_EXPORT.csv(a); return { site: a.state.site, rows: csv.trim().split("\\r\\n").filter(function (l) { return l[0] !== "#"; }).length - 1, hours: a.hours, nan: /NaN|undefined/.test(csv) };`);
ok(/^P/.test(c.site) && c.rows === c.hours && !c.nan, `custom place ${c.site}: CSV ${c.rows} rows, clean`);
await js(`document.getElementById("exportDownload").click();`); await sleep(1200);
ok(/requested/.test(await js(`return document.getElementById("exportStatus").textContent;`)), "Download button runs");
ok(logs.length === 0, "no JavaScript errors" + (logs.length ? ": " + logs.slice(0, 4).join(" | ") : ""));
console.log(rep.join("\n"));
await call("DELETE", S); ws.close(); process.exit(0);
