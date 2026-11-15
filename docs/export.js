/* Mission numbers and hourly CSV. Written with AI assistance (OpenAI Codex, Claude). */
(function () {
  "use strict";

  var T0 = Date.UTC(2027, 0, 1), HOUR = 3600000;

  function utc(i) { return new Date(T0 + i * HOUR).toISOString().slice(0, 16) + "Z"; }
  function percent(value, full) { return (value / full * 100).toFixed(1); }
  function cell(value) {
    var s = String(value);
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function comment(value) { return String(value).replace(/[\r\n]+/g, " "); }

  // Same interpolation as app.js, with the selected panel's hill line.
  function horizonAt(d, az) {
    var step = d.horizon_step_deg, n = d.horizon.length;
    var p = (((az % 360) + 360) % 360) / step, i = Math.floor(p), f = p - i;
    return d.horizon[i % n] * (1 - f) + d.horizon[(i + 1) % n] * f;
  }

  function csv(a) {
    if (!a || !a.state || !a.data || !a.P || !a.run || !a.run.series) return "";
    var s = a.state, d = a.data[s.site];
    if (!d || !d.horizons || !d.horizons[s.mast]) return "";
    var hills = { horizon_step_deg: d.horizon_step_deg, horizon: d.horizons[s.mast] };
    var lines = [
      "# Will the lander survive? https://vodka-winning-team.github.io/NASA-Space-Apps-Challenge/",
      "# Place: " + comment(d.name) + "; id: " + comment(s.site) + "; lat: " + d.lat + "; lon: " + d.lon,
      "# Panel height: " + s.mast + " m; battery: " + s.batt + " hours without Sun",
      "# battery: charges 3 units per hour in full Sun, uses 1 per hour; simple model, not mission-grade",
      "# Geometry sampled at interval start; battery at interval end; initial battery is 100%",
      "# Full-sun-equivalent hours: " + a.run.fullSunHours + "; partly sunlit hours: " + a.run.sunHours,
      "# Sources: NASA/JPL Horizons; NASA LRO LOLA LDEM_80S_80M",
      "interval_start_utc,interval_end_utc,mission_hour,sun_azimuth_deg,sun_elevation_deg,hills_at_sun_azimuth_deg,sun_disc_visible_fraction,earth_azimuth_deg,earth_elevation_deg,hills_at_earth_azimuth_deg,earth_centre_in_view,battery_at_interval_end_percent"
    ];
    for (var h = 0; h < a.hours; h++) {
      var i = s.start + h;
      lines.push([
        utc(i), utc(i + 1), h, d.sun_az[i].toFixed(2), d.sun_el[i].toFixed(2),
        horizonAt(hills, d.sun_az[i]).toFixed(2), (+a.P.sun[i]).toFixed(3),
        d.earth_az[i].toFixed(2), d.earth_el[i].toFixed(2),
        horizonAt(hills, d.earth_az[i]).toFixed(2), a.P.earth[i],
        percent(a.run.series[h + 1], s.batt)
      ].map(cell).join(","));
    }
    return lines.join("\r\n") + "\r\n";
  }

  window.LANDER_EXPORT = { csv: csv };
  if (typeof document === "undefined") return;
  var section = document.getElementById("exportSection"), APP = window.LANDER_APP;
  if (!section || !APP || !APP.onRefresh) return;
  var figures = document.getElementById("exportFigures");
  var days = document.getElementById("exportDays");
  var button = document.getElementById("exportDownload");
  var status = document.getElementById("exportStatus");
  var current = null;

  function figure(label, value, cls) {
    if (!figures) return;
    var wrap = document.createElement("div"), dt = document.createElement("dt"), dd = document.createElement("dd");
    dt.textContent = label; dd.textContent = value;
    if (cls) dd.className = cls;
    wrap.appendChild(dt); wrap.appendChild(dd); figures.appendChild(wrap);
  }

  function render(a) {
    current = null;
    try {
      var s = a.state, r = a.run, d = a.data[s.site], both = 0, h;
      if (figures) figures.textContent = "";
      if (days) days.textContent = "";
      if (status) status.textContent = "";
      for (h = 0; h < a.hours; h++) {
        if (a.P.sun[s.start + h] > 0 && a.P.earth[s.start + h]) both++;
      }
      figure("Place", d.name + " (" + s.site + ")");
      figure("Coordinates", d.lat.toFixed(4) + "° latitude, " + d.lon.toFixed(4) + "° longitude");
      figure("Landing (UTC)", utc(s.start));
      figure("Mission length", s.days + " days (" + a.hours + " hours)");
      figure("Panel height", s.mast + " m");
      figure("Battery size", s.batt + " hours without Sun");
      figure("Full-sun-equivalent hours", r.fullSunHours.toFixed(1) + " hours");
      figure("Partly sunlit hours", r.sunHours + " hours");
      figure("Earth centre above hills", percent(r.earth, 1) + "%");
      function windowText(w) { return w ? w.hours + " hours; " + w.startUTC + " to " + w.endUTC : "None within this interval"; }
      figure("Longest Earth-centre outage (full mission)", windowText(r.earthWindows.longestHidden));
      figure("Next Earth-centre visible interval (full mission)", windowText(r.earthWindows.nextVisible));
      figure("Longest Earth-centre outage (before depletion / mission end)", windowText(r.poweredEarthWindows.longestHidden));
      figure("Next Earth-centre visible interval (before depletion / mission end)", windowText(r.poweredEarthWindows.nextVisible));
      figure("Earth-centre visible hours before depletion / mission end", r.poweredEarthWindows.visibleHours + " hours; geometry only, no radio link model");
      figure("Longest stretch without enough Sun", r.longestDark + " hours");
      figure("Lowest battery", percent(r.min, 1) + "%");
      // Hour 24 is the end of day 1; hour 25 is hour 1 of day 2.
      figure("Outcome", r.alive ? "Survived" : "Lost on day " + (Math.floor((r.died - 1) / 24) + 1) +
        ", in hour " + (((r.died - 1) % 24) + 1) + " of that day", r.alive ? "exportLive" : "exportDead");
      figure("Both Sun and Earth in view", both + " hours");

      for (var day = 0; days && day < s.days; day++) {
        var begin = day * 24, end = Math.min(begin + 24, a.hours);
        var sun = 0, sunHours = 0, earth = 0, low = r.series[begin];
        for (h = begin; h < end; h++) {
          sun += a.P.sun[s.start + h]; if (a.P.sun[s.start + h] > 0) sunHours++; earth += a.P.earth[s.start + h];
          low = Math.min(low, r.series[h + 1]);
        }
        var tr = document.createElement("tr");
        var values = [utc(s.start + begin).slice(0, 10), sun.toFixed(1), sunHours, earth,
          percent(r.series[end], s.batt), percent(low, s.batt)];
        for (var col = 0; col < values.length; col++) {
          var td = document.createElement(col === 0 ? "th" : "td");
          if (col === 0) td.setAttribute("scope", "row");
          td.textContent = values[col]; tr.appendChild(td);
        }
        days.appendChild(tr);
      }
      current = a;
    } catch (e) {
      if (status) status.textContent = "The mission numbers are unavailable. Try changing the mission settings.";
    }
    if (button) button.disabled = !current;
  }

  if (button) button.onclick = function () {
    if (!current) return;
    var link = null, url = null, URL = window.URL;
    try {
      var s = current.state;
      url = URL.createObjectURL(new Blob([csv(current)], { type: "text/csv;charset=utf-8" }));
      link = document.createElement("a");
      link.href = url;
      link.download = "lander_" + String(s.site).replace(/[^A-Za-z0-9_.-]/g, "_") + "_" +
        utc(s.start).slice(0, 10) + "_" + s.days + "d.csv";
      document.body.appendChild(link); link.click();
      if (status) status.textContent = "CSV download requested.";
    } catch (e) {
      if (status) status.textContent = "The CSV could not be downloaded in this browser.";
    } finally {
      if (link && link.parentNode) link.parentNode.removeChild(link);
      if (url) window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }
  };
  APP.onRefresh(render);
}());
