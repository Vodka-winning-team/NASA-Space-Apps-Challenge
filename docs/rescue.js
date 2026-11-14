/* "How do we save it?" Written with AI assistance (Claude).
   When the lander is lost, try five changes one at a time, each with the same battery
   calculation as the main answer, and say plainly which of them work. */
(function () {
  "use strict";
  var APP = window.LANDER_APP, box = document.getElementById("rescue");
  if (!APP || !box) return;

  var $ = function (id) { return document.getElementById(id); };
  var LATER_DAYS = 30;                 // how far ahead to look for a better landing date
  var cache = {};                      // Sun and Earth visibility for other panel heights
  var applied = null;                  // the fix the user last tried, so it can be undone

  function horizonAt(hor, step, az) {
    var n = hor.length, p = (((az % 360) + 360) % 360) / step, i = Math.floor(p), f = p - i;
    return hor[i % n] * (1 - f) + hor[(i + 1) % n] * f;
  }
  // Same rule as the main calculation: share of the Sun's disc above the hills, and Earth by its centre.
  function visibility(id, mast) {
    var key = id + "|" + mast;
    if (cache[key]) return cache[key];
    var d = APP.get().data[id], hor = d.horizons[mast], step = d.horizon_step_deg, r = d.sun_width_deg / 2;
    var sun = new Float32Array(d.n), earth = new Uint8Array(d.n);
    for (var i = 0; i < d.n; i++) {
      var f = (d.sun_el[i] + r - horizonAt(hor, step, d.sun_az[i])) / (2 * r);
      sun[i] = f < 0 ? 0 : f > 1 ? 1 : f;
      earth[i] = d.earth_el[i] > horizonAt(hor, step, d.earth_az[i]) ? 1 : 0;
    }
    return (cache[key] = { sun: sun, earth: earth });
  }

  function days(h) { var d = h / 24; return (d % 1 ? d.toFixed(1) : d) + (d === 1 ? " day" : " days"); }
  function low(r) {
    var pct = Math.round(r.min * 100);
    if (pct >= 100) return "The battery stays full the whole time.";
    if (pct < 10) return "It only just makes it: the battery drops to " + (pct < 1 ? "almost zero" : pct + "%") + ".";
    return "The battery never drops below " + pct + "%.";
  }
  function snapshot(s) { return { site: s.site, start: s.start, days: s.days, batt: s.batt, mast: s.mast }; }
  function same(a, b) { return a.site === b.site && a.start === b.start && a.days === b.days && a.batt === b.batt && a.mast === b.mast; }

  function fixes(a) {
    var s = a.state, P = a.P, hours = a.hours, out = [], k, r;
    var lastStart = a.data[s.site].n - 1 - hours;

    // 1. land later
    var later = null;
    for (k = 1; k <= LATER_DAYS && s.start + k * 24 <= lastStart; k++) {
      r = a.sim(P, s.start + k * 24, hours, s.batt, false);
      if (r.alive) { later = { k: k, r: r }; break; }
    }
    out.push(later
      ? { ok: true, title: "Land " + a.plural(later.k, "day") + " later",
          text: "Land on " + a.shortDate(s.start + later.k * 24) + " instead of " + a.shortDate(s.start) + ". " + low(later.r),
          set: { start: s.start + later.k * 24 }, done: "landing " + a.plural(later.k, "day") + " later" }
      : { ok: false, title: "Land later", text: "No landing date in the next " + LATER_DAYS + " days works at this place." });

    // 2. a bigger battery (the slider goes up to 10 days)
    var batt = null, need = null;
    for (k = s.batt + 12; k <= 720; k += 12) {
      r = a.sim(P, s.start, hours, k, false);
      if (r.alive) { if (k <= 240) batt = { b: k, r: r }; else need = k; break; }
    }
    out.push(batt
      ? { ok: true, title: "Carry a bigger battery",
          text: "One that lasts " + days(batt.b) + " without Sun, instead of " + days(s.batt) + ". " + low(batt.r),
          set: { batt: batt.b }, done: "a battery that lasts " + days(batt.b) }
      : { ok: false, title: "Carry a bigger battery",
          text: need ? "It would need to last " + days(need) + " without Sun. That is more than the 10 days this tool allows."
                     : "Even a battery lasting 30 days would not be enough." });

    // 3. raise the solar panel
    var masts = a.masts, at = masts.indexOf(s.mast), mast = null;
    for (k = at + 1; k < masts.length; k++) {
      r = a.sim(visibility(s.site, masts[k]), s.start, hours, s.batt, false);
      if (r.alive) { mast = { m: masts[k], r: r }; break; }
    }
    out.push(mast
      ? { ok: true, title: "Raise the solar panel",
          text: "Put it " + mast.m + " m above the ground instead of " + s.mast + " m, so it sees over more of the hills. " + low(mast.r),
          set: { mast: mast.m }, done: "a panel " + mast.m + " m high" }
      : { ok: false, title: "Raise the solar panel",
          text: at === masts.length - 1 ? "The panel is already at the highest setting, " + s.mast + " m."
                                        : "Even at " + masts[masts.length - 1] + " m the hills still hide the Sun for too long." });

    // 4. another place, same date
    var places = [];
    a.sites.forEach(function (x) {
      if (x.id === s.site) return;
      var rr = a.sim(a.prep(x.id), s.start, hours, s.batt, false);
      if (rr.alive) places.push({ id: x.id, name: x.name, r: rr });
    });
    places.sort(function (p, q) { return q.r.min - p.r.min; });
    out.push(places.length
      ? { ok: true, title: "Land at " + places[0].name,
          text: "Same date, same lander, a different place. " + low(places[0].r) +
                (places.length > 1 ? " Also works: " + places.slice(1).map(function (p) { return p.name; }).join(", ") + "." : ""),
          set: { site: places[0].id }, done: "landing at " + places[0].name }
      : { ok: false, title: "Land somewhere else", text: "None of the other five places works on this date either." });

    // 5. a shorter mission
    var shorter = null;
    a.dayChoices.forEach(function (n) {
      if (n >= s.days) return;
      var rr = a.sim(P, s.start, n * 24, s.batt, false);
      if (rr.alive) shorter = { n: n, r: rr };            // keeps the longest one that works
    });
    out.push(shorter
      ? { ok: true, title: "Plan a " + shorter.n + "-day mission",
          text: "Finish in " + shorter.n + " days instead of " + s.days + ", before the long dark stretch. " + low(shorter.r),
          set: { days: shorter.n }, done: "a " + shorter.n + "-day mission" }
      : { ok: false, title: "Plan a shorter mission",
          text: s.days === a.dayChoices[0] ? "This is already the shortest mission, " + s.days + " days."
                                           : "Even the shortest mission here, " + a.dayChoices[0] + " days, runs out of power." });

    return out;
  }

  function draw() {
    var a = APP.get(), s = a.state;

    if (a.run.alive) {
      // show the "it worked" note only while the page still shows exactly what the fix produced
      if (applied && same(applied.after, s)) {
        box.hidden = false;
        box.className = "rescue saved";
        $("rescueTitle").textContent = "Saved.";
        $("rescueSay").innerHTML = "One change did it: <b>" + applied.done + "</b>. Everything else is as before.";
        $("rescueList").innerHTML = '<button type="button" class="rescueUndo" id="rescueUndo">Put it back the way it was</button>';
        $("rescueUndo").onclick = function () { var b = applied.before; applied = null; APP.set(b); };
      } else { applied = null; box.hidden = true; }
      return;
    }

    applied = null;
    var list = fixes(a), n = list.filter(function (f) { return f.ok; }).length;
    box.hidden = false;
    box.className = "rescue";
    $("rescueTitle").textContent = "How do we save it?";
    $("rescueSay").innerHTML = n === 0
      ? "None of the usual fixes works for this mission. Try a different place and date together."
      : "We tried five changes, one at a time. <b>" + n + " of 5</b> would save this mission.";
    $("rescueList").innerHTML = list.map(function (f, i) {
      return '<div class="rescueCard ' + (f.ok ? "ok" : "no") + '"><p class="rescueMark" aria-hidden="true">' + (f.ok ? "✓" : "✕") + "</p>" +
        '<p class="rescueName">' + f.title + '</p><p class="rescueText">' + (f.ok ? "" : '<span class="rescueNo">Does not work. </span>') + f.text + "</p>" +
        (f.ok ? '<button type="button" data-i="' + i + '">Try it</button>' : "") + "</div>";
    }).join("");
    [].forEach.call($("rescueList").querySelectorAll("button"), function (b) {
      b.onclick = function () {
        var f = list[+b.dataset.i], before = snapshot(s), after = snapshot(s);
        Object.keys(f.set).forEach(function (key) { after[key] = f.set[key]; });
        applied = { before: before, after: after, done: f.done };
        APP.set(f.set);
        var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        $("verdict").scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
      };
    });
  }

  APP.onRefresh(draw);
})();
