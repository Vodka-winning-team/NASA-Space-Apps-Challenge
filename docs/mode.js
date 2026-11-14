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
    if (!fromClick) return;
    try { localStorage.setItem(KEY, mode); } catch (e) { /* private window: the switch still works for this visit */ }
    // sections that were hidden have no size yet; ask every chart to redraw itself
    window.dispatchEvent(new Event("resize"));
  }

  apply(saved(), false);

  document.addEventListener("click", function (e) {
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
