/* First-visit guided tour: a welcome card, then short spotlight steps over the real page.
   Opens by itself once, for a first visit to the plain link (a link with settings, like the demo link,
   never opens it). The "Tour" button at the top replays it. ?tour=1 forces it open.
   Does not change any calculation; it only points at the page. Written with AI assistance (Claude). */
(function () {
  "use strict";
  var KEY = "lander-tour-seen";
  var $ = function (id) { return document.getElementById(id); };
  var q = function (s) { return document.querySelector(s); };

  // Each step: target (CSS selector, or none for a centred card), a short label, a title, the text,
  // an optional "Try it" line. skip(): leave the step out when it does not apply right now.
  var STEPS = [
    { label: "Welcome", title: "Will the lander survive?",
      text: "A lander at the Moon's south pole lives on sunlight. The Sun stays so low there that hills hide it for days. " +
            "If the battery runs out before the Sun comes back, the mission is over. This tour shows you how to find out, in about a minute.",
      next: "Start the tour", back: "No thanks" },
    { target: ".field-sites", label: "1. Where", title: "Pick a landing place",
      text: "These six places come from a 2026 study of good landing spots near the south pole. Choose one and every answer on the page updates.",
      tip: "Tap a different place and watch the answer below change." },
    { target: ".moon", label: "1. Where", title: "The map",
      text: "The south pole from above, drawn from NASA's height map. Each dot is a landing place; you can pick one here too. " +
            "The dashed ring is 85° S.",
      tip: "Want a spot that is not on the list? Press “Somewhere else…”, then tap inside the dashed ring. The page works out that spot's hills in a few seconds." },
    { target: ".field-date", label: "2. When", title: "Pick a landing date",
      text: "The Sun goes once around the horizon every 29.5 days, so the date decides whether you land into sunlight or into a long shadow. " +
            "Dates run from January 2027 to November 2028." },
    { target: "details.more", label: "3. The lander", title: "More settings",
      open: "details.more",
      text: "<b>Mission length</b>: how many days the lander must last. <b>Battery</b>: how many hours it can keep going with no sunlight at all. " +
            "<b>Panel height</b>: a solar panel on a taller mast sees over nearby rocks and hills." },
    { target: "#verdict", label: "4. The answer", title: "Does it survive?",
      text: "Here is the answer: it survives, or it is lost on a given day. It comes from a simple battery model: an hour of full Sun " +
            "gives 3 hours of power and the lander uses 1 per hour. Treat it as a first check, not a final design." },
    { target: "#rescue", label: "4. The answer", title: "How do we save it?",
      skip: function () { var r = $("rescue"); return !r || r.hidden; },
      text: "When the lander is lost, the page tries five single changes for you: land later, a bigger battery, a higher panel, " +
            "another place or a shorter mission. Press one to try it; you can undo it." },
    { target: ".watch .head", label: "5. Why", title: "Watch the mission",
      text: "Press <b>Play the mission</b> to run it hour by hour. Watch the Sun skim the horizon, and the battery fall when a hill hides it." },
    { target: "#t3dCanvas", label: "5. Why", title: "The 3D view",
      text: "The real ground around the lander, from NASA's height map. <b>Drag</b> to look around, <b>right-drag</b> to move, " +
            "and hold <b>Ctrl</b> and scroll (or use <b>+</b> and <b>−</b>) to zoom. Scrolling without Ctrl moves the page as usual.",
      tip: "A yellow line runs from the lander to the Sun. When a hill is in the way it turns red and names the ridge." },
    { target: ".t3dCtl", label: "5. Why", title: "Camera buttons",
      text: "<b>Beside the lander</b> is the starting view. <b>From above</b> shows the craters around you. <b>Lander's eye</b> is what the solar panel sees. " +
            "<b>Look at Earth</b> turns to Earth, which matters for radio contact. <b>Hills 3× taller</b> makes ridges easier to see.",
      tip: "The Sun and Earth are drawn 3× bigger than real so you can spot them." },
    { target: "#time", label: "5. Why", title: "The battery chart",
      text: "The line is the battery from landing to the end of the mission. Drag across it, or use the arrow keys, to jump to any hour. " +
            "The 3D view follows." },
    { target: ".slip", label: "6. Try again", title: "What if we land later?",
      text: "The same mission, landing one day later, two days later, and so on. Tap a square to switch to that date and compare." },
    { target: ".modes", label: "7. Go deeper", title: "Simple or Mission planner",
      text: "<b>Simple</b> shows the answer and why. <b>Mission planner</b> adds more: how sure the answer is, science jobs, two places side by side, " +
            "a two-year calendar of safe dates and every number as a CSV file." },
    { label: "Done", title: "You're ready",
      text: "Pick a place and a date and see if the lander makes it. The address bar always holds your settings, " +
            "so copying it shares exactly what you see. Press <b>Tour</b> at the top to see this again.",
      next: "Start exploring", done: true }
  ];

  var on = false, steps = [], at = 0, raf = 0, opened = null, lastFocus = null, last = "";
  var root, hole, card, bar, labelEl, countEl, titleEl, textEl, tipEl, nextBtn, backBtn, skipBtn;

  function build() {
    if (root) return;
    root = document.createElement("div");
    root.className = "tour"; root.id = "tour";
    root.innerHTML =
      '<div class="tourShade" id="tourShade"></div>' +
      '<div class="tourHole" id="tourHole" aria-hidden="true"></div>' +
      '<div class="tourCard" id="tourCard" role="dialog" aria-modal="false" aria-labelledby="tourTitle" aria-describedby="tourText">' +
        '<div class="tourBar" aria-hidden="true"><i id="tourBarFill"></i></div>' +
        '<div class="tourTop"><span class="tourLabel" id="tourLabel"></span><span class="tourCount" id="tourCount"></span>' +
        '<button type="button" class="tourX" id="tourSkip" aria-label="Close the tour">×</button></div>' +
        '<h2 class="tourTitle" id="tourTitle"></h2>' +
        '<p class="tourText" id="tourText"></p>' +
        '<p class="tourTip" id="tourTip"></p>' +
        '<div class="tourBtns"><button type="button" class="tourBack" id="tourBack">Back</button>' +
        '<button type="button" class="tourNext" id="tourNext">Next</button></div>' +
      "</div>";
    document.body.appendChild(root);
    hole = $("tourHole"); card = $("tourCard"); bar = $("tourBarFill");
    labelEl = $("tourLabel"); countEl = $("tourCount"); titleEl = $("tourTitle"); textEl = $("tourText"); tipEl = $("tourTip");
    nextBtn = $("tourNext"); backBtn = $("tourBack"); skipBtn = $("tourSkip");
    nextBtn.onclick = function () { go(at + 1); };
    backBtn.onclick = function () { if (at === 0) stop(); else go(at - 1); };
    skipBtn.onclick = function () { stop(); };
    $("tourShade").onclick = function () { if (!steps[at].target) stop(); };   // a click beside the welcome card closes it
  }

  function visible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    return r.width > 2 && r.height > 2;
  }

  function applies(s) { return !(s.skip && s.skip()) && visible(q(s.target)); }

  function restoreOpen() {
    if (opened) { opened.el.open = opened.was; opened = null; }
  }

  function go(i) {
    if (i >= steps.length) { stop(); return; }
    if (i < 0) i = 0;
    restoreOpen();
    // a step whose target is missing or hidden right now is passed over, in the direction of travel
    var dir = i >= at ? 1 : -1;
    while (i > 0 && i < steps.length - 1) {
      var s0 = steps[i];
      if (s0.target && !(s0.skip && s0.skip()) && (prepOpen(s0), visible(q(s0.target)))) break;
      restoreOpen();
      i += dir;
    }
    at = i;
    var s = steps[i], n = steps.length - 1;
    labelEl.textContent = s.label;
    // count only the steps that apply right now (the rescue step is there only when the lander is lost)
    var mine = 0, all = 0;
    for (var k = 1; k < n; k++) if (k === i || applies(steps[k])) { all++; if (k <= i) mine++; }
    countEl.textContent = i > 0 && i < n ? mine + " of " + all : "";
    titleEl.textContent = s.title;
    textEl.innerHTML = s.text;
    tipEl.innerHTML = s.tip ? "<b>Try it</b> " + s.tip : "";
    tipEl.hidden = !s.tip;
    nextBtn.textContent = s.next || (i === n - 1 ? "Finish" : "Next");
    backBtn.textContent = s.back || "Back";
    backBtn.hidden = i === n;
    bar.style.width = Math.round(100 * i / n) + "%";
    root.classList.toggle("tourCentre", !s.target);
    card.classList.remove("tourIn"); void card.offsetWidth; card.classList.add("tourIn");
    if (s.target) {
      var el = q(s.target), still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      var tall = el.getBoundingClientRect().height > window.innerHeight * 0.6;
      el.scrollIntoView({ behavior: still ? "auto" : "smooth", block: tall ? "start" : "center" });
    }
    last = ""; place();
    try { nextBtn.focus({ preventScroll: true }); } catch (e) { nextBtn.focus(); }
  }

  function prepOpen(s) {
    if (!s.open) return;
    var el = q(s.open);
    if (el && !opened) { opened = { el: el, was: el.open }; el.open = true; }
  }

  // Keep the spotlight on its target (the page may scroll, resize or redraw), and the card beside it.
  function place() {
    if (!on) return;
    var s = steps[at], W = document.documentElement.clientWidth, H = window.innerHeight;
    var phone = W < 640, cw = card.offsetWidth, ch = card.offsetHeight, pad = 8, gap = 14, m = 12;
    var key, x, y, r = null;
    if (s.target) {
      var el = q(s.target);
      if (!visible(el)) { go(at + 1); return; }      // it disappeared (e.g. the rescue closed after a fix)
      r = el.getBoundingClientRect();
    }
    if (!r) {
      hole.style.display = "none";
      x = (W - cw) / 2; y = Math.max(m, (H - ch) / 2);
      if (phone) y = H - ch - m;
    } else {
      var L = Math.max(4, r.left - pad), T = Math.max(4, r.top - pad);
      var R = Math.min(W - 4, r.right + pad), B = Math.min(H - 4, r.bottom + pad);
      hole.style.display = B > T && R > L ? "block" : "none";
      hole.style.transform = "translate(" + L + "px," + T + "px)";
      hole.style.width = Math.max(0, R - L) + "px"; hole.style.height = Math.max(0, B - T) + "px";
      if (phone) {                                   // phones: the card always sits at the bottom of the screen
        x = (W - cw) / 2;
        y = r.bottom + pad + gap + ch < H - m ? r.bottom + pad + gap : H - ch - m;
      } else if (H - B - gap >= ch + m) {            // below the target
        x = r.left; y = B + gap;
      } else if (T - gap >= ch + m) {                // above it
        x = r.left; y = T - gap - ch;
      } else if (W - R - gap >= cw + m) {            // to its right
        x = R + gap; y = Math.max(m, Math.min(H - ch - m, r.top));
      } else if (L - gap >= cw + m) {                // to its left
        x = L - gap - cw; y = Math.max(m, Math.min(H - ch - m, r.top));
      } else {                                       // a big target: the card sits on its lower part
        x = W - cw - m - 12; y = H - ch - m - 12;
      }
      x = Math.max(m, Math.min(W - cw - m, x));
    }
    y = Math.max(m, Math.min(H - ch - m, y));
    key = Math.round(x) + "," + Math.round(y);
    if (key !== last) { card.style.transform = "translate(" + Math.round(x) + "px," + Math.round(y) + "px)"; last = key; }
  }

  function loop() { if (!on) return; place(); raf = requestAnimationFrame(loop); }

  function key(e) {
    if (!on) return;
    if (e.key === "Escape") { e.preventDefault(); stop(); return; }
    if (!card.contains(document.activeElement)) return;       // arrows elsewhere still move the battery chart
    if (e.key === "ArrowRight") { e.preventDefault(); go(at + 1); }
    else if (e.key === "ArrowLeft" && at > 0) { e.preventDefault(); go(at - 1); }
  }

  function start() {
    build();
    if (on) { go(0); return; }
    lastFocus = document.activeElement;
    steps = STEPS; on = true; at = 0;
    root.classList.add("on");
    document.addEventListener("keydown", key, true);
    go(0);
    cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  }

  function stop() {
    if (!on) return;
    on = false; cancelAnimationFrame(raf);
    restoreOpen();
    root.classList.remove("on");
    document.removeEventListener("keydown", key, true);
    try { localStorage.setItem(KEY, "1"); } catch (e) { /* private window: it may show again next visit */ }
    var back = $("tourBtn") || lastFocus;
    if (back && back.focus) { try { back.focus({ preventScroll: true }); } catch (e) { back.focus(); } }
  }

  function seen() { try { return !!localStorage.getItem(KEY); } catch (e) { return true; } }

  var btn = $("tourBtn");
  if (btn) btn.addEventListener("click", start);

  // Open by itself only for a first visit to the plain link, never over a shared link or the demo link,
  // and never for automated browsers (the tests ask for it with ?tour=1 or ?tour=auto).
  var ask = (/[?&]tour=([^&#]*)/.exec(location.search) || [])[1];
  var auto = ask === "1" || (ask !== "0" && !seen() && !(location.hash.length > 1) && (ask === "auto" || !navigator.webdriver));
  if (auto) setTimeout(start, 700);

  window.LANDER_TOUR = {
    start: start, stop: stop,
    state: function () { return { on: on, at: at, n: steps.length, title: on ? steps[at].title : "", target: on ? steps[at].target || "" : "" }; },
    next: function () { if (on) go(at + 1); }, back: function () { if (on) go(at - 1); }
  };
})();
