// The guided tour (docs/tour.js): when it opens by itself, every step at laptop and phone sizes,
// real clicks through it, keyboard, Back, Escape, the Tour button, the rescue step, planner mode.
// usage: node tour.mjs <base>        Written with AI assistance (Claude).
const [, , BASE] = process.argv;
const WD = "http://127.0.0.1:4444";
async function call(m, p, b) { const r = await fetch(WD + p, { method: m, headers: { "content-type": "application/json" }, body: b ? JSON.stringify(b) : undefined }); const j = await r.json(); if (j.value && j.value.error) throw new Error(p + " " + j.value.message); return j.value; }
const sess = await call("POST", "/session", { capabilities: { alwaysMatch: { browserName: "firefox", webSocketUrl: true, "moz:firefoxOptions": { args: ["-headless"] } } } });
const S = "/session/" + sess.sessionId, logs = [];
const ws = new WebSocket(sess.capabilities.webSocketUrl); await new Promise((r) => (ws.onopen = r));
ws.onmessage = (m) => { const j = JSON.parse(m.data); if (j.method === "log.entryAdded" && j.params.level === "error") logs.push(j.params.text); };
ws.send(JSON.stringify({ id: 1, method: "session.subscribe", params: { events: ["log.entryAdded"] } }));
const js = (x, ...a) => call("POST", S + "/execute/sync", { script: x, args: a });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const ok = (c, msg) => { console.log((c ? "PASS " : "FAIL ") + msg); if (!c) fails++; };
const open = async (path) => { await call("POST", S + "/url", { url: BASE + "/" + path }); await sleep(2200); };
const tour = () => js(`return window.LANDER_TOUR ? window.LANDER_TOUR.state() : null`);
// a real WebDriver click: fails if something (like the tour's dimming) covers the element
const realClick = async (css) => { const e = await call("POST", S + "/element", { using: "css selector", value: css }); await call("POST", S + "/element/" + Object.values(e)[0] + "/click", {}); };
const keys = (k) => call("POST", S + "/actions", { actions: [{ type: "key", id: "kb", actions: [{ type: "keyDown", value: k }, { type: "keyUp", value: k }] }] });
const ESC = "", RIGHT = "", LEFT = "";

// For the current step: card inside the screen, spotlight on the target, target on screen, no sideways scroll.
const STEPCHECK = `var w = arguments[0] ? document.getElementById("f").contentWindow : window, d = w.document;
  var T = w.LANDER_TOUR.state(), card = d.getElementById("tourCard"), hole = d.getElementById("tourHole");
  var W = d.documentElement.clientWidth, H = w.innerHeight, c = card.getBoundingClientRect(), bad = [];
  if (c.left < 0 || c.right > W + 0.5 || c.top < 0 || c.bottom > H + 0.5) bad.push("card outside the screen " + JSON.stringify([c.left, c.top, c.right, c.bottom].map(Math.round)) + " in " + W + "x" + H);
  if (d.documentElement.scrollWidth > W + 1) bad.push("sideways scroll " + d.documentElement.scrollWidth);
  if (!d.getElementById("tourTitle").textContent || !d.getElementById("tourText").textContent) bad.push("empty text");
  if (T.target) {
    var t = d.querySelector(T.target).getBoundingClientRect(), h = hole.getBoundingClientRect();
    if (getComputedStyle(hole).display === "none") bad.push("no spotlight");
    else {
      var vis = { l: Math.max(4, t.left - 8), t: Math.max(4, t.top - 8), r: Math.min(W - 4, t.right + 8), b: Math.min(H - 4, t.bottom + 8) };
      if (Math.abs(h.left - vis.l) > 2 || Math.abs(h.top - vis.t) > 2 || Math.abs(h.right - vis.r) > 2 || Math.abs(h.bottom - vis.b) > 2)
        bad.push("spotlight off its target " + JSON.stringify([h.left, h.top, h.right, h.bottom].map(Math.round)) + " vs " + JSON.stringify([vis.l, vis.t, vis.r, vis.b].map(Math.round)));
    }
    if (t.bottom < 20 || t.top > H - 20) bad.push("target not on screen " + Math.round(t.top));
    // a small target must stay readable: the card may not cover its middle
    if (t.height < H * 0.5) { var cx = (t.left + t.right) / 2, cy = (t.top + t.bottom) / 2; if (cx > c.left && cx < c.right && cy > c.top && cy < c.bottom) bad.push("card covers the target"); }
  }
  return { title: T.title, at: T.at, n: T.n, on: T.on, count: d.getElementById("tourCount").textContent, bad: bad };`;

async function walk(name, frame) {
  const titles = [], probs = [], counts = [];
  for (let i = 0; i < 20; i++) {
    await sleep(900);                                             // smooth scrolling and the card's slide
    const r = await js(STEPCHECK, !!frame);
    if (!r.on) break;
    titles.push(r.title); counts.push(r.count);
    if (r.bad.length) probs.push(`"${r.title}": ${r.bad.join("; ")}`);
    await js(`var w = arguments[0] ? document.getElementById("f").contentWindow : window; w.document.getElementById("tourNext").click();`, !!frame);
  }
  const end = frame ? await js(`return document.getElementById("f").contentWindow.LANDER_TOUR.state().on`) : (await tour()).on;
  ok(probs.length === 0, `${name}: ${titles.length} steps, card on screen and spotlight on its target every time` + (probs.length ? "\n  " + probs.join("\n  ") : ""));
  ok(!end, `${name}: the last button closes the tour`);
  const mid = counts.slice(1, -1), m = mid.length;
  ok(mid.every((c, i) => c === `${i + 1} of ${m}` || c === `${i + 1} sur ${m}`), `${name}: the step counter runs 1 to ${m} with no gaps (${mid[0]} … ${mid[m - 1]})`);
  return titles;
}

// ---------- 1. first visit, laptop size ----------
await call("POST", S + "/window/rect", { width: 1366, height: 768 + 85 });
await open("index.html");
await js(`localStorage.clear()`);
await open("index.html?tour=auto");
let st = await tour();
ok(st && st.on && st.at === 0 && st.title === "Will the lander survive?", `first visit to the plain link: the welcome card opens by itself (${st && st.title})`);
const wel = await js(`var c = document.getElementById("tourCard").getBoundingClientRect(); return { x: Math.round(c.left + c.width / 2 - innerWidth / 2), shade: getComputedStyle(document.getElementById("tourShade")).display, focus: document.activeElement && document.activeElement.id };`);
ok(Math.abs(wel.x) < 30 && wel.shade === "block" && wel.focus === "tourNext", `welcome card is centred, the page behind is dimmed, the main button has focus (${JSON.stringify(wel)})`);
await realClick("#tourNext"); await sleep(900);
st = await tour();
ok(st.on && st.title === "Pick a landing place", `"Start the tour" goes to the first step (${st.title})`);
// "Try it": the page still works under the tour, with a real mouse click
const before = await js(`return window.LANDER_APP.get().state.site`);
await realClick('#sites [data-id="SP07"]'); await sleep(700);
const after = await js(`return window.LANDER_APP.get().state.site`);
ok(before !== "SP07" && after === "SP07", `a real click on another place works while the tour is open (${before} -> ${after})`);
const chk = await js(STEPCHECK, false);
await js(`window.scrollBy(0, 120)`); await sleep(120);
const glued = await js(STEPCHECK, false);
ok(glued.bad.length === 0, `scrolling the page with the tour open: the spotlight stays on the list (${glued.bad.join("; ") || "ok"})`);
await js(`window.scrollBy(0, -120)`); await sleep(200);
ok(chk.bad.length === 0, `after that click the spotlight still sits on the list (${chk.bad.join("; ") || "ok"})`);
// keyboard: arrows move only when the card has focus; Escape closes
await js(`document.getElementById("tourNext").focus()`);
await keys(RIGHT); await sleep(800); const k1 = (await tour()).title;
await keys(LEFT); await sleep(800); const k2 = (await tour()).title;
ok(k1 === "The map" && k2 === "Pick a landing place", `right and left arrow keys step through the tour (${k1}, ${k2})`);
// More settings opens for its step and is put back afterwards
await js(`document.querySelector("details.more").open = false`);
for (let i = 0; i < 6 && (await tour()).title !== "More settings"; i++) { await js(`window.LANDER_TOUR.next()`); await sleep(300); }
const opn = await js(`return document.querySelector("details.more").open`);
await js(`window.LANDER_TOUR.next()`); await sleep(300);
const cls = await js(`return document.querySelector("details.more").open`);
ok(opn === true && cls === false, `"More settings" opens for its step and closes again after (${opn}, ${cls})`);
await keys(ESC); await sleep(400);
st = await tour();
const seen = await js(`return localStorage.getItem("lander-tour-seen")`);
ok(!st.on && seen === "1", `Escape closes the tour and remembers it was seen (${seen})`);
const foc = await js(`return document.activeElement && document.activeElement.id`);
ok(foc === "tourBtn", `focus goes back to the Tour button (${foc})`);
await open("index.html?tour=auto");
ok(!(await tour()).on, "the next visit does not open it again");
await js(`localStorage.clear()`);
await open("index.html?tour=auto#site=HW06&date=2027-07-28&days=14&batt=96&panel=2");
ok(!(await tour()).on, "a link with settings (like the demo link) never opens it by itself");
await open("index.html#site=HW06&date=2027-07-28&days=14&batt=96&panel=2");
ok(!(await tour()).on, "automated browsers never get it by themselves (keeps the other tests and screenshots clean)");

// ---------- 2. the whole tour through the Tour button, a mission that survives ----------
await open("index.html#site=HW06&date=2027-07-28&days=7&batt=240&panel=10");
await realClick("#tourBtn"); await sleep(500);
ok((await tour()).on, "the Tour button opens the tour");
const lived = await js(`return window.LANDER_APP.get().run.alive`);
const t1 = await walk("laptop 1366x768, Simple, mission survives", false);
ok(lived && !t1.includes("How do we save it?"), `"How do we save it?" is left out when the lander survives (${lived})`);
ok(t1.includes("The 3D view") && t1.includes("The battery chart") && t1[t1.length - 1] === "You're ready", `the tour reaches the 3D view, the chart and the end (${t1.join(" | ")})`);

// ---------- 3. a lost mission: the rescue step appears; planner mode; a bigger screen ----------
await call("POST", S + "/window/rect", { width: 1920, height: 1080 + 85 });
await open("index.html?mode=planner#site=HW06&date=2027-07-28&days=60&batt=24&panel=0.5");
const lost = await js(`return !window.LANDER_APP.get().run.alive && !document.getElementById("rescue").hidden`);
await js(`window.LANDER_TOUR.start()`); await sleep(400);
const t2 = await walk("1920x1080, Mission planner, mission lost", false);
ok(lost && t2.includes("How do we save it?"), `"How do we save it?" is shown when the lander is lost (${lost})`);
// Back on the first real step returns to the welcome, and "No thanks" closes
await js(`window.LANDER_TOUR.start()`); await sleep(300); await js(`window.LANDER_TOUR.next()`); await sleep(500);
await realClick("#tourBack"); await sleep(400);
const b1 = (await tour()).at;
await realClick("#tourBack"); await sleep(400);
ok(b1 === 0 && !(await tour()).on, `Back returns to the welcome, and "No thanks" there closes the tour`);
// a click beside the welcome card closes it
await js(`window.LANDER_TOUR.start()`); await sleep(400);
await call("POST", S + "/actions", { actions: [{ type: "pointer", id: "m", parameters: { pointerType: "mouse" }, actions: [{ type: "pointerMove", x: 30, y: 400 }, { type: "pointerDown", button: 0 }, { type: "pointerUp", button: 0 }] }] });
await sleep(300);
ok(!(await tour()).on, "a click beside the welcome card closes it");

ok(!t1.includes("Look around with your phone"), "the phone look-around step is left out on a laptop (its button is hidden there)");
ok(t1.includes("Light or dark, English or French"), "the tour shows the Light / Dark and FR / EN buttons");

// ---------- 3b. phone look-around (button forced on with ?gyro=1), French, light theme ----------
await call("POST", S + "/window/rect", { width: 1366, height: 768 + 85 });
await open("index.html?gyro=1#site=HW06&date=2027-07-28&days=7&batt=240&panel=10");
await js(`window.LANDER_TOUR.start()`); await sleep(400);
const tg = await walk("1366x768 with the phone look-around button", false);
ok(tg.indexOf("Look around with your phone") === tg.indexOf("Camera buttons") + 1, `when the look-around button is there, its step comes right after the camera buttons`);
await open("index.html?lang=fr&theme=light#site=HW06&date=2027-07-28&days=60&batt=24&panel=0.5");
const keepLink = await js(`return [location.hash, document.getElementById("vText").textContent]`);
ok(keepLink[0] === "#site=HW06&date=2027-07-28&days=60&batt=24&panel=0.5" && /jour 6/.test(keepLink[1]), `a link opened in French keeps its settings (${keepLink.join(" | ")})`);
await js(`window.LANDER_TOUR.start()`); await sleep(500);
const fr0 = await js(`return [document.getElementById("tourTitle").textContent, document.getElementById("tourNext").textContent, document.getElementById("tourBtn").textContent, document.documentElement.dataset.theme]`);
ok(fr0[0] === "L’atterrisseur va-t-il survivre ?" && fr0[1] === "Commencer la visite" && /Visite/.test(fr0[2]) && fr0[3] === "light", `in French the tour and its button are in French, light theme on (${fr0.join(" | ")})`);
await js(`window.LANDER_TOUR.next()`); await sleep(600);
const fr1 = await js(`return [document.getElementById("tourText").textContent, document.getElementById("tourCount").textContent, document.getElementById("tourNext").textContent]`);
ok(/^Ces six lieux/.test(fr1[0]) && / sur /.test(fr1[1]) && fr1[2] === "Suivant", `French step text, counter and button are whole French sentences, untouched by the page translator (${fr1[1]}, ${fr1[2]})`);
await js(`document.getElementById("langBtn").click()`); await sleep(500);
const en1 = await js(`return [document.getElementById("tourTitle").textContent, document.getElementById("tourNext").textContent, document.getElementById("tourCount").textContent]`);
ok(en1[0] === "Pick a landing place" && en1[1] === "Next" && / of /.test(en1[2]), `switching to English mid-tour redraws the card in English (${en1.join(" | ")})`);
await js(`document.getElementById("langBtn").click()`); await sleep(500);
await js(`window.LANDER_TOUR.stop(); window.LANDER_TOUR.start()`); await sleep(400);
const tfr = await walk("French, light theme, mission lost", false);
ok(tfr.includes("How do we save it?") && tfr.length === 15, `French tour has every step (${tfr.length}: ${tfr.join(" | ")})`);
await js(`try { localStorage.removeItem("lander-lang"); localStorage.removeItem("lander-theme"); } catch (e) {}`);

// ---------- 4. small laptop, and phones (page in a frame exactly that wide) ----------
await call("POST", S + "/window/rect", { width: 1280, height: 720 + 85 });
await open("index.html#site=MMO01&date=2028-02-14&days=30&batt=96&panel=2");
await js(`window.LANDER_TOUR.start()`); await sleep(300);
const lived3 = await js(`return window.LANDER_APP.get().run.alive`);
const t3 = await walk("laptop 1280x720", false);
ok(t3.includes("How do we save it?") === !lived3, `the rescue step follows the answer (${lived3 ? "survives, left out" : "lost, shown"})`);
for (const w of [360, 390]) {
  await call("POST", S + "/window/rect", { width: 700, height: 1000 });
  await open("_phone.html?w=" + w + "&src=" + encodeURIComponent("index.html?tour=1"));
  await sleep(1200);
  const on = await js(`var t = document.getElementById("f").contentWindow.LANDER_TOUR; return !!(t && t.state().on)`);
  ok(on, `${w} px phone: ?tour=1 opens the tour`);
  await walk(`${w} px phone`, true);
}
ok(logs.length === 0, "no JavaScript errors" + (logs.length ? ": " + logs.slice(0, 5).join(" | ") : ""));
await call("DELETE", S); ws.close();
process.exit(fails ? 1 : 0);
