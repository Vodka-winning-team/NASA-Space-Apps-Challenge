/* Pure science helpers. Angular inputs use the same units (degrees in our data). */
(function (root) {
  "use strict";
  function visibleDiscFraction(elevation, horizon, radius) {
    var x = (elevation - horizon) / radius;
    if (x <= -1) return 0;
    if (x >= 1) return 1;
    // Clamp roundoff at the limbs, where the two area terms nearly cancel.
    return Math.max(0, Math.min(1, (Math.acos(-x) + x * Math.sqrt(1 - x * x)) / Math.PI));
  }

  // Sample i describes [i, i+1) hours since 2027-01-01T00:00Z.
  // Windows are clipped to [start, start+hours); ties keep the earliest outage.
  // nextVisible is the first visible interval at/after start, including one already open.
  function earthWindows(earth, start, hours) {
    var end = Math.min(earth.length, start + hours), longest = null, next = null, visibleHours = 0;
    function interval(a, b) {
      var utc = function (i) { return new Date(Date.UTC(2027, 0, 1) + i * 3600000).toISOString(); };
      return { start: a, end: b, hours: b - a, startUTC: utc(a), endUTC: utc(b) };
    }
    for (var i = start; i < end;) {
      var a = i, up = earth[i] > 0;
      while (i < end && (earth[i] > 0) === up) i++;
      var w = interval(a, i);
      if (up) { visibleHours += w.hours; if (!next) next = w; }
      else if (!longest || w.hours > longest.hours) longest = w;
    }
    return { longestHidden: longest, nextVisible: next, visibleHours: visibleHours, hours: Math.max(0, end - start) };
  }
  root.LANDER_SCIENCE = { visibleDiscFraction: visibleDiscFraction, earthWindows: earthWindows };
}(typeof window !== "undefined" ? window : globalThis));
