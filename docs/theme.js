/* Local-only preference: also works when storage is unavailable (e.g. file://). */
(function () {
  "use strict";
  var root = document.documentElement, theme = "dark", saved;
  function valid(value) { return value === "light" || value === "dark"; }
  try { saved = localStorage.getItem("lander-theme"); } catch (_) {}
  if (valid(saved)) theme = saved;
  var forced = new URLSearchParams(window.location.search).get("theme");
  if (valid(forced)) theme = forced;

  var prefs = document.getElementById("prefs");
  var button = document.getElementById("themeBtn");
  if (prefs && !button) {
    button = document.createElement("button");
    button.id = "themeBtn";
    button.type = "button";
    prefs.appendChild(button);
  }
  function apply() {
    root.dataset.theme = theme;
    var next = theme === "dark" ? "light" : "dark";
    if (button) {
      // a sliding switch: sun on the left for light, moon on the right for dark (the word stays for screen readers)
      button.innerHTML = '<span class="tsTrack" aria-hidden="true"><i class="tsStar s1"></i><i class="tsStar s2"></i><i class="tsStar s3"></i><i class="tsKnob"></i></span>' +
        '<span class="tsText">' + (next === "light" ? "Light" : "Dark") + "</span>";
      button.className = "themeBtn is-" + theme;
      button.setAttribute("role", "switch"); button.setAttribute("aria-checked", theme === "dark");
      button.setAttribute("aria-label", "Switch to " + next + " mode");
    }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === "light" ? "#f7f6f2" : "#0e1014";
  }
  apply();
  if (button) button.onclick = function () {
    theme = theme === "dark" ? "light" : "dark";
    try { localStorage.setItem("lander-theme", theme); } catch (_) {}
    apply();
    window.dispatchEvent(new Event("resize"));
  };
})();
