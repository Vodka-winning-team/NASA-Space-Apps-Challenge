// Phone look-around with simulated sensor readings, in headless Chrome at real speed. Written with AI assistance (Claude).
// usage: copy tests/_gyro_sim.html into docs/, serve docs/, then: node tests/gyro_sim.mjs http://localhost:PORT/_gyro_sim.html
// (delete the copy afterwards). Simulated readings prove the logic, not that a real phone grants motion access.
import { spawn } from "node:child_process";
const [, , url, wait = "90"] = process.argv;
const ch = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--remote-debugging-port=9333", "--user-data-dir=" + process.env.TEMP + "/cdp-prof", "--window-size=700,950", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let tabs; for (let i = 0; i < 40; i++) { try { tabs = await (await fetch("http://127.0.0.1:9333/json")).json(); break; } catch { await sleep(250); } }
const ws = new WebSocket(tabs.find((t) => t.type === "page").webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map(); ws.onmessage = (m) => { const j = JSON.parse(m.data); if (pend.has(j.id)) { pend.get(j.id)(j.result); pend.delete(j.id); } };
const cmd = (method, params = {}) => new Promise((r) => { pend.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
await cmd("Page.navigate", { url });
let text = "";
for (let i = 0; i < +wait * 2; i++) { await sleep(500); const r = await cmd("Runtime.evaluate", { expression: "(document.getElementById('r')||{}).textContent||''" }); text = r.result.value || ""; if (/DONE/.test(text)) break; }
console.log(text); ch.kill(); process.exit(0);
