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
    apply(b.getAttribute("data-mode"), true);
    var to = b.getAttribute("data-scroll");
    if (to && document.querySelector(to)) {
      var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      document.querySelector(to).scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
    }
  });
})();
