/* Two ways to read the page. Written with AI assistance (Claude).
   Simple: place, date, answer, the view, landing later, Mauritius.
   Mission planner: everything, including the detailed sections (marked with class "pro").
   The choice is remembered on this device. Add ?mode=planner or ?mode=simple to a link to force one. */
(function () {
  "use strict";
  var KEY = "lander-mode";

  function saved() {
    var m = /[?&]mode=(simple|planner)\b/.exec(location.search);
    if (m) return m[1];
    try { return localStorage.getItem(KEY) === "planner" ? "planner" : "simple"; } catch (e) { return "simple"; }
  }

  function apply(mode, fromClick) {
    document.body.classList.toggle("mode-simple", mode !== "planner");
    document.body.classList.toggle("mode-planner", mode === "planner");
    [].forEach.call(document.querySelectorAll(".modes [data-mode]"), function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-mode") === mode);
    });
    say(mode, fromClick);
    if (!fromClick) return;
    try { localStorage.setItem(KEY, mode); } catch (e) { /* private window: the switch still works for this visit */ }
    // sections that were hidden have no size yet; ask every chart to redraw itself
    window.dispatchEvent(new Event("resize"));
  }

  // Say what changed, right next to the switch, because the sections it adds or hides are further down.
  function say(mode, fromClick) {
    var el = document.getElementById("modeSay");
    if (!el) return;
    if (mode === "planner") {
      el.innerHTML = "Mission planner view: adds sensitivity checks, science jobs, site comparisons and hourly numbers further down. " +
        '<a href="#" class="modeJump" data-jump=".sure">View planner details</a>';
    } else {
      el.textContent = fromClick ? "Simple view: the result, the replay and other landing dates. The planner details are hidden."
                                 : "Simple view: the result, the replay and other landing dates.";
    }
    el.classList.remove("flash"); void el.offsetWidth;
    if (fromClick) el.classList.add("flash");
  }

  apply(saved(), false);

  document.addEventListener("click", function (e) {
    var j = e.target.closest ? e.target.closest("[data-jump]") : null;
    if (j) {
      e.preventDefault();
      var t = document.querySelector(j.getAttribute("data-jump"));
      var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (t) { t.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" }); t.setAttribute("tabindex", "-1"); t.focus({ preventScroll: true }); }
      return;
    }
    var b = e.target.closest ? e.target.closest("[data-mode]") : null;
    if (!b) return;
    var want = b.getAttribute("data-mode");
    if (document.body.classList.contains("mode-" + want)) return;     // already there
    switchTo(want, b.getAttribute("data-scroll"));
  });

  // A short "opening the planner" moment, then the new sections rise in one after another.
  // Going back to Simple is quicker: exits should be faster than entrances.
  var busy = false;
  function loader() {
    var el = document.getElementById("modeLoader");
    if (el) return el;
    el = document.createElement("div");
    el.id = "modeLoader"; el.className = "modeLoader"; el.setAttribute("aria-hidden", "true");
    el.innerHTML = '<div class="mlCard"><div class="mlOrbit"><span class="mlMoon"></span><span class="mlRing"></span><span class="mlCraft"></span></div>' +
      '<p class="mlText"></p><span class="mlBar"><i></i></span></div>';
    document.body.appendChild(el);
    return el;
  }
  function switchTo(mode, scrollTo) {
    if (busy) return;
    var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var toPlanner = mode === "planner", wait = calm ? 0 : toPlanner ? 540 : 220;
    var el = loader();
    el.querySelector(".mlText").textContent = toPlanner ? "Opening the mission planner…" : "Back to the simple view…";
    el.classList.toggle("toSimple", !toPlanner);
    busy = true;
    document.body.classList.add("modeSwitching");
    el.classList.remove("out"); el.classList.add("on");
    setTimeout(function () {
      apply(mode, true);
      if (toPlanner) {
        // stagger the newly shown sections (capped, so the last one is in within half a second)
        [].forEach.call(document.querySelectorAll("main > .pro"), function (sec, i) {
          sec.style.setProperty("--rise-delay", Math.min(i * 70, 420) + "ms");
          sec.classList.remove("rise"); void sec.offsetWidth; sec.classList.add("rise");
          setTimeout(function () { sec.classList.remove("rise"); }, 1200);
        });
      }
      el.classList.add("out");
      setTimeout(function () { el.classList.remove("on", "out"); document.body.classList.remove("modeSwitching"); busy = false; }, calm ? 0 : 260);
      if (scrollTo && document.querySelector(scrollTo)) {
        document.querySelector(scrollTo).scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
      }
    }, wait);
  }

})();
