// Full self-test sweep in headless Chrome at real speed. usage: node sweep.mjs <base> <shotDir>
import { spawn } from "node:child_process"; import fs from "node:fs";
const [, , BASE, OUT] = process.argv;
const ch = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--remote-debugging-port=9340", "--user-data-dir=" + process.env.TEMP + "/cdp-sweep-" + Date.now(), "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch("http://127.0.0.1:9340/json")).json(); break; } catch { await sleep(250); } }
const ws = new WebSocket(tabs.find((t) => t.type === "page").webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map(); let errs = [];
ws.onmessage = (m) => { const j = JSON.parse(m.data); if (pend.has(j.id)) { pend.get(j.id)(j.result || j.error); pend.delete(j.id); }
  if (j.method === "Runtime.exceptionThrown") errs.push("EXC " + (j.params.exceptionDetails.exception?.description || j.params.exceptionDetails.text).slice(0, 220));
  if (j.method === "Runtime.consoleAPICalled" && j.params.type === "error") errs.push("CONSOLE " + j.params.args.map((a) => a.value || a.description || "").join(" ").slice(0, 220));
  if (j.method === "Network.loadingFailed" && !j.params.canceled) errs.push("NET " + j.params.errorText);
  if (j.method === "Network.responseReceived" && j.params.response.status >= 400) errs.push("HTTP " + j.params.response.status + " " + j.params.response.url.slice(-60)); };
const cmd = (method, params = {}) => new Promise((r) => { pend.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (e) => { const r = await cmd("Runtime.evaluate", { expression: e, awaitPromise: true, returnByValue: true }); return r.result ? r.result.value : "EVAL-ERR " + JSON.stringify(r).slice(0, 200); };
await cmd("Runtime.enable"); await cmd("Network.enable"); await cmd("Page.enable");
const rep = []; const ok = (c, m) => { rep.push((c ? "PASS " : "FAIL ") + m); };
async function open(q, hash, w, h, mobile) {
  errs = [];
  await cmd("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: !!mobile });
  await cmd("Emulation.setTouchEmulationEnabled", { enabled: !!mobile });
  await cmd("Page.navigate", { url: "about:blank" }); await sleep(150);
  await cmd("Page.navigate", { url: BASE + "/index.html" + q + "#" + hash }); await sleep(2600);
}
const shot = async (name) => { const s = await cmd("Page.captureScreenshot", { format: "jpeg", quality: 60 }); fs.writeFileSync(OUT + "/" + name + ".jpg", Buffer.from(s.data, "base64")); };
const LOST = "site=HW06&date=2027-07-28&days=14&batt=96&panel=2", LIVE = "site=HW06&date=2027-08-04&days=14&batt=96&panel=2";
const overflow = `(function(){var d=document.documentElement;var bad=[];if(d.scrollWidth>innerWidth+1){[].forEach.call(document.querySelectorAll("body *"),function(e){var r=e.getBoundingClientRect();if(r.width>0&&r.right>innerWidth+2&&getComputedStyle(e).position!=="fixed"&&!e.closest(".sites,.valWrap,[class*=scroll],.numbersWrap,table"))bad.push(e.tagName+"."+String(e.className).slice(0,30)+":"+Math.round(r.right));});}return JSON.stringify({sw:d.scrollWidth,iw:innerWidth,bad:bad.slice(0,6)});})()`;
const walkAll = `(async function(){var s=function(ms){return new Promise(function(r){setTimeout(r,ms)})};document.querySelectorAll("details").forEach(function(d){d.open=true});for(var y=0;y<document.body.scrollHeight;y+=700){scrollTo(0,y);await s(250);}await s(1200);return document.body.scrollHeight;})()`;

// 1. every combination loads with no errors and no sideways overflow
for (const lang of ["en", "fr"]) for (const theme of ["dark", "light"]) for (const mode of ["simple", "planner"]) for (const [w, h, mob] of [[1366, 900, 0], [390, 780, 1], [360, 740, 1]]) {
  if (w === 360 && (theme === "light") && lang === "en") continue;
  const tag = `${lang}/${theme}/${mode}/${w}`;
  await open(`?lang=${lang}&theme=${theme}&mode=${mode}`, mode === "planner" ? LOST : LIVE, w, h, mob);
  await ev(walkAll);
  const o = JSON.parse(await ev(overflow));
  const st = JSON.parse(await ev(`JSON.stringify({v:document.getElementById("vText").textContent,lang:document.documentElement.lang,theme:document.documentElement.dataset.theme,mode:document.body.className,t3d:!!(window.LANDER_T3D&&LANDER_T3D.ready())})`));
  ok(errs.length === 0, `${tag}: no errors` + (errs.length ? " -> " + [...new Set(errs)].slice(0, 3).join(" | ") : ""));
  ok(o.sw <= o.iw + 1, `${tag}: no sideways overflow (${o.sw} vs ${o.iw})` + (o.bad.length ? " " + o.bad.join(", ") : ""));
  ok(st.lang === lang && st.theme === theme && st.mode.includes("mode-" + mode) && st.v.length > 3, `${tag}: language/theme/mode applied, verdict "${st.v}"`);
  if ((w === 390 || w === 1366) && mode === "planner") { await ev(`scrollTo(0,0)`); await sleep(300); await shot(`top_${lang}_${theme}_${w}`); }
}

// 2. French leftovers, including the tour
await open("?lang=fr&mode=planner&tour=1", LOST, 1366, 900, 0);
let tourTexts = [];
for (let i = 0; i < 25; i++) {
  const t = await ev(`(function(){var c=document.querySelector(".tourCard,[class*=tourCard],.tour [role=dialog],[class^=tour]");var all=[].map.call(document.querySelectorAll("[class*=tour]"),function(e){return e.offsetParent||getComputedStyle(e).position==="fixed"?e.innerText:""}).join(" || ");var btn=document.getElementById("tourNext");if(btn)btn.click();return all.slice(0,900);})()`);
  if (!t) break; tourTexts.push(t); await sleep(500);
}
fs.writeFileSync(OUT + "/tour_fr.txt", tourTexts.join("\n----\n"));
const eng = /(^| )(the|and|is|are|with|you|this|that|of|to|it|not|your|for)( |[.,:;]|$)/gi;
const tourEng = tourTexts.filter((t) => (t.match(eng) || []).length >= 3).length;
ok(tourEng === 0, `guided tour in French: ${tourEng} of ${tourTexts.length} steps still look English`);
ok(errs.length === 0, "tour in French: no errors" + (errs.length ? " -> " + errs.slice(0, 2).join(" | ") : ""));

// 3. interactions (English, desktop)
await open("?lang=en&theme=dark&mode=simple", LOST, 1366, 900, 0);
const I = async (code) => JSON.parse(await ev(`(async function(){var s=function(ms){return new Promise(function(r){setTimeout(r,ms)})},$=function(i){return document.getElementById(i)};${code}})()`));
let r = await I(`document.querySelector('[data-mode="planner"]').click(); await s(120); var on=!!document.querySelector(".modeLoader.on"); await s(1100); return JSON.stringify({on:on, planner:document.body.classList.contains("mode-planner"), gone:!document.querySelector(".modeLoader.on"), say:$("modeSay").textContent.slice(0,30)});`);
ok(r.on && r.planner && r.gone && /Mission planner view/.test(r.say), "mode switch: loader shows, planner view opens, loader goes, text explains");
r = await I(`document.querySelector('[data-mode="simple"]').click(); await s(1000); return JSON.stringify({simple:document.body.classList.contains("mode-simple"), gone:!document.querySelector(".modeLoader.on")});`);
ok(r.simple && r.gone, "mode switch back to Simple");
r = await I(`document.querySelector("details.more").open=true; var b=$("batt"); b.value=24; b.dispatchEvent(new Event("input",{bubbles:true})); var dim=document.body.classList.contains("recalc"), out=$("battOut").textContent; await s(500); return JSON.stringify({dim:dim,out:out,after:document.body.classList.contains("recalc"),batt:LANDER_APP.get().state.batt,sum:$("setSum").textContent,v:$("vText").textContent});`);
ok(r.dim && r.out === "1 day" && !r.after && r.batt === 24 && /1 day/.test(r.sum), `battery slider: dims, shows "${r.out}", settles on 24 h (${r.v})`);
r = await I(`LANDER_APP.set({batt:96}); await s(300); var row=$("slip").children; var first=row[0].dataset.start; row[6].click(); await s(400); var row2=$("slip").children; return JSON.stringify({same:row2[0].dataset.start===first, cur:[].findIndex.call(row2,function(b){return b.getAttribute("aria-current")==="true"}), date:$("date").value, now:$("slipNow").textContent});`);
ok(r.same && r.cur === 6 && r.date === "2027-08-03", `landing-date row stays put, selection moves to the 7th square (${r.now})`);
r = await I(`LANDER_APP.set({start:(Date.UTC(2027,6,28)-Date.UTC(2027,0,1))/3600000}); await s(400); var b=[].filter.call(document.querySelectorAll("#rescueList button"),function(x){return /try/i.test(x.textContent)})[0]; b.click(); await s(900); var v=$("vText").textContent, saved=$("rescueTitle").textContent; $("rescueUndo").click(); await s(600); return JSON.stringify({v:v,saved:saved,back:$("vText").textContent});`);
ok(/Survived/.test(r.v) && /Saved/.test(r.saved) && /Lost/.test(r.back), `rescue "Try it" saves the mission and "Put it back" undoes it (${r.v} -> ${r.back})`);
r = await I(`$("sites").querySelector('[data-id="HW06"]').focus(); var e=new KeyboardEvent("keydown",{key:"ArrowRight",bubbles:true}); document.activeElement.dispatchEvent(e); await s(400); return JSON.stringify({site:LANDER_APP.get().state.site, focus:document.activeElement.dataset.id, tab:$("sites").querySelectorAll('[tabindex="0"]').length});`);
ok(r.site === "SP07" && r.focus === "SP07" && r.tab === 1, "arrow key moves to the next place and selects it; one tab stop");
r = await I(`LANDER_APP.setSite("HW06"); await s(300); $("terrain3d").scrollIntoView(); for(var i=0;i<60&&!(window.LANDER_T3D&&LANDER_T3D.ready());i++) await s(300); scrollTo(0,0); await s(300); $("play").click(); await s(1500); var p=/pause/i.test($("play").textContent), rc=$("terrain3d").getBoundingClientRect(), h1=LANDER_APP.get().state.hour; $("play").click(); await s(200); return JSON.stringify({playing:p, mid:(rc.top+rc.height/2)/innerHeight, hour:h1, ready:LANDER_T3D.ready()});`);
ok(r.ready && r.playing && r.hour > 0 && r.mid > 0.25 && r.mid < 0.75, `Play: 3D ready, time advances (hour ${Math.round(r.hour)}), picture centred (${r.mid.toFixed(2)})`);
r = await I(`var t=$("themeBtn"), l=$("langBtn"); t.click(); await s(300); var th=document.documentElement.dataset.theme; l.click(); await s(600); var v=$("vText").textContent, lg=document.documentElement.lang; l.click(); t.click(); await s(500); return JSON.stringify({th:th,v:v,lg:lg,back:$("vText").textContent,th2:document.documentElement.dataset.theme});`);
ok(r.th === "light" && r.lg === "fr" && /Perdu|surv/i.test(r.v) && /Lost|Survived/.test(r.back) && r.th2 === "dark", `theme and language buttons toggle and return (${r.v} / ${r.back})`);
r = await I(`document.querySelector('[data-mode="planner"]').click(); await s(1200); var a=$("plannerAuto")||[].filter.call(document.querySelectorAll("#planner button"),function(b){return /plan it/i.test(b.textContent)})[0]; a.click(); await s(500); var sc=$("plannerScore").textContent; var csv=[].filter.call(document.querySelectorAll("a,button"),function(b){return /CSV/.test(b.textContent)})[0]; return JSON.stringify({score:sc, csv:!!csv});`);
ok(/\d \/ 4/.test(r.score) && r.csv, `planner auto-plan gives "${r.score}"; CSV download control present`);
ok(errs.length === 0, "interactions: no errors" + (errs.length ? " -> " + [...new Set(errs)].slice(0, 4).join(" | ") : ""));

// 4. phone, French, light: look-around entry visible, screenshots down the page
await open("?lang=fr&theme=light&mode=simple", LIVE, 390, 780, 1);
await ev(`document.getElementById("terrain3d").scrollIntoView({block:"center"})`); for (let i = 0; i < 50; i++) { if (await ev(`!!(window.LANDER_T3D&&LANDER_T3D.ready())`)) break; await sleep(300); }
await sleep(800); await shot("phone_fr_light_3d");
r = JSON.parse(await ev(`JSON.stringify({hidden:document.getElementById("t3dLook").hidden,text:document.getElementById("t3dLook").textContent,say:document.getElementById("lookSay").textContent})`));
ok(!r.hidden && /t.l.phone/i.test(r.text), `phone: look-around button shown, in French ("${r.text}")`);
for (const [n, sel] of [["verdict", "#verdict"], ["slip", ".slip"], ["moris", ".moris"]]) { await ev(`document.querySelector("${sel}").scrollIntoView({block:"start"})`); await sleep(500); await shot("phone_fr_light_" + n); }
ok(errs.length === 0, "phone French light: no errors" + (errs.length ? " -> " + errs.slice(0, 3).join(" | ") : ""));

console.log(rep.join("\n")); console.log(rep.filter((x) => x.startsWith("FAIL")).length + " FAILED of " + rep.length);
ch.kill(); process.exit(0);
