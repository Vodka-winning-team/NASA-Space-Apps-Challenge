/* Illustrative science operations. No network, dependencies or storage required. */
(function () {
  "use strict";

  // Edit the illustrative instrument assumptions here. Conditions apply every hour.
  var TYPES = [
    { name: "Drill sample", load: 1.5, duration: 6, condition: "any", rule: "Sun-independent" },
    { name: "Camera panorama", load: 0.5, duration: 2, condition: "sun", rule: "Needs Sun above hills" },
    { name: "Send data home", load: 1.0, duration: 3, condition: "earth", rule: "Needs Earth in view" },
    { name: "Spectrometer", load: 0.8, duration: 4, condition: "any", rule: "No visibility requirement" }
  ];
  var api, key, tasks = [], selected = 0, cursor = 0, result, baseline, geom, drag;
  var notice = "", $ = function (id) { return document.getElementById(id); };
  var canvas = $("plannerChart");
  if (!canvas || !window.LANDER_APP) return;

  function conditionHolds(a, task) {
    var type = TYPES[task.type];
    if (task.start < 0 || task.start + type.duration > a.hours) return false;
    for (var h = task.start; h < task.start + type.duration; h++) {
      var idx = a.state.start + h;
      if (type.condition === "sun" && !(a.P.sun[idx] > 0)) return false;
      if (type.condition === "earth" && !a.P.earth[idx]) return false;
    }
    return true;
  }

  // Like app.js sim: start full, cap charge, and never revive after reaching zero.
  // Even a task with failed visibility consumes its scheduled power.
  function simulate(a, plan) {
    var load = new Float64Array(a.hours), series = new Float64Array(a.hours + 1);
    plan.forEach(function (task) {
      var t = TYPES[task.type];
      for (var h = task.start; h < Math.min(a.hours, task.start + t.duration); h++) load[h] += t.load;
    });
    var charge = a.state.batt, min = charge, died = -1;
    series[0] = charge;
    for (var h = 0; h < a.hours; h++) {
      if (died < 0) {
        charge = Math.min(a.state.batt, charge + a.P.sun[a.state.start + h] * a.RATE - 1 - load[h]);
        if (charge <= 0) { charge = 0; died = h + 1; }
        min = Math.min(min, charge);
      }
      series[h + 1] = charge;
    }
    var outcomes = plan.map(function (task) {
      var visible = conditionHolds(a, task);
      // An instrument must stay powered through its final hour to complete.
      var powered = died < 0 || task.start + TYPES[task.type].duration < died;
      return { done: visible && powered, visible: visible, powered: powered };
    });
    return { series: series, min: min / a.state.batt, died: died, outcomes: outcomes };
  }

  function greedy(a) {
    var plan = [];
    TYPES.forEach(function (type, i) {
      for (var h = 0; h <= a.hours - type.duration; h++) {
        var task = { type: i, start: h };
        if (!conditionHolds(a, task)) continue;
        if (simulate(a, plan.concat([task])).min > 0.25) { plan.push(task); break; }
      }
    });
    return plan;
  }

  function clamp(h, type) { return Math.max(0, Math.min(api.hours - TYPES[type].duration, Math.round(h))); }
  function when(h) { return "day " + (Math.floor(h / 24) + 1) + ", hour " + h; }
  function select(i) {
    selected = i;
    [].forEach.call($("plannerTypes").children, function (b, n) { b.setAttribute("aria-pressed", String(n === i)); });
    $("plannerHour").max = api ? api.hours - TYPES[i].duration : 0;
    if (api) { cursor = clamp(cursor, i); $("plannerHour").value = cursor; }
    $("plannerAdd").textContent = "Place " + TYPES[i].name.toLowerCase();
  }
  function place(h) {
    var existing = tasks.filter(function (task) { return task.type === selected; })[0];
    if (existing) existing.start = clamp(h, selected);
    else tasks.push({ type: selected, start: clamp(h, selected) });
    cursor = clamp(h, selected); $("plannerHour").value = cursor;
    notice = ""; render();
  }
  function remove(task, focusChart) {
    tasks.splice(tasks.indexOf(task), 1); notice = TYPES[task.type].name + " removed.";
    render(); if (focusChart) canvas.focus();
  }
  function failure(outcome, task) {
    if (!outcome.powered) return "Failed: battery empty";
    if (!outcome.visible) return TYPES[task.type].condition === "sun" ? "Failed: Sun hidden" : "Failed: Earth hidden";
    return "Done";
  }
  function takeaway() {
    if (!tasks.length) return "Pick a task and place it on the timeline, or try Auto-plan to find hours with power to spare.";
    var bad = result.outcomes.findIndex(function (o) { return !o.done; });
    if (bad >= 0) {
      var task = tasks[bad], type = TYPES[task.type], out = result.outcomes[bad];
      var alternative = -1;
      for (var h = 0; h <= api.hours - type.duration; h++) {
        var trial = tasks.map(function (t, i) { return i === bad ? { type: t.type, start: h } : t; });
        var check = simulate(api, trial);
        if (check.outcomes[bad].done && check.min > 0.25) { alternative = h; break; }
      }
      var reason = !out.powered ? "cannot finish before the battery empties" : type.condition === "sun" ? "has no lighting for part of its run" : "loses sight of Earth during its run";
      return "The " + type.name.toLowerCase() + " on " + when(task.start) + " " + reason + "; " +
        (alternative >= 0 ? "move it to " + when(alternative) + " for a safer run." : "try a bigger battery or another landing date.");
    }
    if (result.died >= 0) return "The scheduled science finishes, but the lander runs out of power on " + when(result.died) + "; remove a task or try another landing date.";
    return "The plan completes " + tasks.length + " of 4 tasks and leaves a minimum battery reserve of " + Math.round(result.min * 100) + "%" + (result.min <= 0.25 ? "; move or remove a task to keep more than 25%." : " through the mission.");
  }

  function render() {
    if (!api) return;
    result = simulate(api, tasks);
    baseline = api.sim(api.P, api.state.start, api.hours, api.state.batt, true);
    $("plannerScore").textContent = result.outcomes.filter(function (o) { return o.done; }).length + " / 4";
    document.querySelector(".planner-plan").style.color = result.died < 0 ? api.C.live : api.C.dead;
    $("plannerTakeaway").textContent = takeaway();
    $("plannerNotice").textContent = notice;
    $("plannerClear").disabled = tasks.length === 0;
    var activeType = document.activeElement && document.activeElement.dataset.plannerTask;
    var list = $("plannerTasks"); list.textContent = "";
    tasks.forEach(function (task, i) {
      var b = document.createElement("button"), t = TYPES[task.type];
      b.type = "button"; b.dataset.plannerTask = String(task.type);
      b.dataset.failed = String(!result.outcomes[i].done);
      var name = document.createElement("strong"), detail = document.createElement("span");
      name.textContent = t.name;
      detail.textContent = "H" + task.start + "–" + (task.start + t.duration) + " / " + failure(result.outcomes[i], task);
      b.appendChild(name); b.appendChild(detail);
      b.setAttribute("aria-label", t.name + ", " + when(task.start) + ", " + t.duration + " hours. " + failure(result.outcomes[i], task) + ". Click to remove; arrows move; Delete removes.");
      b.onclick = function () { remove(task, true); };
      b.onkeydown = function (e) {
        if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].indexOf(e.key) >= 0) {
          e.preventDefault(); task.start = clamp(task.start + (e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : -1), task.type); notice = ""; render();
        } else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); remove(task, true); }
      };
      list.appendChild(b);
      if (activeType === String(task.type)) b.focus({ preventScroll: true });
    });
    draw();
  }

  function draw() {
    if (!api) return;
    var rect = canvas.getBoundingClientRect(), W = Math.max(1, rect.width), H = 460;
    var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = Math.round(W * dpr); canvas.height = H * dpr;
    var ctx = canvas.getContext("2d"), C = api.C, L = 32, R = W - 8, pw = R - L;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var X = function (h) { return L + h / api.hours * pw; };
    geom = { L: L, pw: pw, blocks: [] };
    ctx.font = '500 11px "JetBrains Mono", monospace'; ctx.textBaseline = "bottom";
    function text(txt, x, y, col) { ctx.fillStyle = col || C.t3; ctx.fillText(txt, x, y); }
    function line(x, y, xx, yy, col) { ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(xx, yy); ctx.stroke(); }
    // Hour axis and ticks remain readable on narrow screens and 60-day missions.
    text("MISSION HOURS", L, 14);
    var ticks = W < 600 ? 4 : 8;
    for (var j = 0; j <= ticks; j++) {
      var hour = Math.round(j / ticks * api.hours), x = X(hour);
      ctx.textAlign = j === ticks ? "right" : "left";
      text(String(hour), x, 32); line(x, 36, x, 41, C.t3);
    }
    ctx.textAlign = "left";
    ["SUN ABOVE HILLS", "EARTH IN VIEW"].forEach(function (label, row) {
      var y = 60 + row * 36; text(label, L, y - 3);
      ctx.fillStyle = C.line; ctx.fillRect(L, y, pw, 10);
      for (var h = 0; h < api.hours; h++) {
        var value = row ? api.P.earth[api.state.start + h] : api.P.sun[api.state.start + h];
        if (!value) continue;
        ctx.globalAlpha = value; ctx.fillStyle = row ? C.earth : C.sun;
        ctx.fillRect(X(h), y, pw / api.hours + 0.3, 10);
      }
      ctx.globalAlpha = 1;
    });
    // Four stable lanes: overlap remains visible and individual blocks stay hittable.
    TYPES.forEach(function (type, row) {
      var y = 138 + row * 44;
      line(L, y + 26, R, y + 26, C.line);
      text(String(row + 1), 10, y + 19);
      var index = tasks.findIndex(function (t) { return t.type === row; });
      if (index < 0) { text(type.name + " / not placed", L, y - 3); return; }
      var task = tasks[index], x = X(task.start), end = X(task.start + type.duration);
      // True duration is the solid bar; wider outlined target allows touch at long scales.
      var width = Math.max(28, end - x), bx = Math.min(x, R - width), failed = !result.outcomes[index].done;
      ctx.fillStyle = C.line2; ctx.fillRect(bx, y, width, 26);
      ctx.fillStyle = failed ? C.dead : C.live; ctx.fillRect(x, y + 23, Math.max(1, end - x), 3);
      ctx.strokeStyle = failed ? C.dead : C.text; ctx.strokeRect(bx, y, width, 26);
      if (failed) { line(bx + 4, y + 4, bx + 13, y + 13, C.dead); line(bx + 13, y + 4, bx + 4, y + 13, C.dead); }
      var label = type.name + " / H" + task.start;
      text(label, L, y - 3, C.text);
      geom.blocks.push({ x: bx, y: y, w: width, h: 26, task: task });
    });
    var top = 338, bottom = 446, height = bottom - top;
    text("BATTERY / %", L, top - 10);
    [0, 0.25, 1].forEach(function (f) {
      var y = bottom - f * height;
      ctx.textAlign = "right"; text(String(f * 100), L - 5, y + 4); ctx.textAlign = "left";
      ctx.setLineDash(f === 0.25 ? [2, 4] : []); line(L, y, R, y, C.line2); ctx.setLineDash([]);
    });
    if (result.died >= 0) {
      var dx = X(result.died);
      ctx.save(); ctx.beginPath(); ctx.rect(dx, 42, R - dx, bottom - 42); ctx.clip();
      ctx.globalAlpha = 0.35;
      for (var sx = dx - H; sx < R; sx += 10) line(sx, bottom, sx + H, 42, C.dead);
      ctx.restore(); line(dx, 42, dx, bottom, C.dead);
    }
    function curve(series, col, dashed) {
      ctx.strokeStyle = col; ctx.lineWidth = dashed ? 1.5 : 2; ctx.setLineDash(dashed ? [5, 4] : []); ctx.beginPath();
      for (var h = 0; h <= api.hours; h++) {
        var y = bottom - series[h] / api.state.batt * height;
        if (!h) ctx.moveTo(X(h), y); else ctx.lineTo(X(h), y);
      }
      ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1;
    }
    curve(baseline.series, C.t2, true); curve(result.series, result.died < 0 ? C.live : C.dead, false);
    line(X(cursor), 37, X(cursor), bottom, C.sun);
    canvas.setAttribute("aria-label", "Science timeline, " + api.hours + " hours. Placement cursor at hour " + cursor + ". " + $("plannerScore").textContent + " tasks done. " + $("plannerTakeaway").textContent);
  }

  TYPES.forEach(function (type, i) {
    var b = document.createElement("button"); b.type = "button";
    var name = document.createElement("strong"), detail = document.createElement("span");
    name.textContent = type.name;
    detail.textContent = "+" + type.load.toFixed(1) + " units/h / " + type.duration + " h / " + type.rule;
    b.appendChild(name); b.appendChild(detail); b.onclick = function () { select(i); };
    $("plannerTypes").appendChild(b);
  });
  select(0);
  $("plannerPlace").onsubmit = function (e) { e.preventDefault(); if (api) place(+$("plannerHour").value); };
  $("plannerHour").oninput = function () { if (api && this.validity.valid) { cursor = clamp(+this.value, selected); draw(); } };
  $("plannerAuto").onclick = function () {
    if (!api) return;
    tasks = greedy(api);
    if (!api.run.alive) notice = "No safe plan: the lander runs out of power on this mission even without any science, so Auto-plan placed " + tasks.length + " task" + (tasks.length === 1 ? "" : "s") + ".";
    else if (!tasks.length) notice = "No safe plan: no task fits while keeping the battery above 25%.";
    else notice = "Auto-plan replaced the previous plan: " + tasks.length + " of 4 tasks placed with more than 25% battery throughout the mission" +
      (tasks.length < 4 ? "; no safe slot was found for the remaining tasks." : ".");
    render();
  };
  $("plannerClear").onclick = function () { tasks = []; notice = "Plan cleared."; render(); };
  canvas.onkeydown = function (e) {
    if (!api) return;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].indexOf(e.key) >= 0) {
      e.preventDefault(); cursor = clamp(e.key === "Home" ? 0 : e.key === "End" ? api.hours : cursor + (e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : -1), selected);
      $("plannerHour").value = cursor; draw();
    } else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); place(cursor); }
  };
  function pointer(e) {
    var r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  canvas.onpointerdown = function (e) {
    if (!api || !geom || (e.button !== undefined && e.button !== 0)) return;
    var p = pointer(e), block = geom.blocks.find(function (b) { return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h; });
    drag = { x: p.x, y: p.y, task: block && block.task, start: block ? block.task.start : 0, moved: false };
    canvas.setPointerCapture(e.pointerId);
  };
  canvas.onpointermove = function (e) {
    if (!drag || !drag.task) return;
    var p = pointer(e);
    if (Math.abs(p.x - drag.x) > 4) drag.moved = true;
    if (drag.moved) { drag.task.start = clamp(drag.start + (p.x - drag.x) / geom.pw * api.hours, drag.task.type); notice = ""; render(); }
  };
  canvas.onpointerup = function (e) {
    if (!drag) return;
    var p = pointer(e), d = drag; drag = null;
    if (d.task) { if (!d.moved) remove(d.task, false); }
    else if (Math.abs(p.x - d.x) < 5 && Math.abs(p.y - d.y) < 5 && p.x >= geom.L && p.x <= geom.L + geom.pw) place((p.x - geom.L) / geom.pw * api.hours);
  };
  canvas.onpointercancel = function () { if (drag && drag.task) { drag.task.start = drag.start; render(); } drag = null; };
  window.addEventListener("resize", draw);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
  window.LANDER_APP.onRefresh(function (next) {
    var nextKey = [next.state.site, next.state.start, next.state.days].join("|");
    if (key !== undefined && key !== nextKey) { tasks = []; cursor = 0; notice = "Mission changed; plan cleared."; drag = null; }
    key = nextKey; api = next; select(selected); render();
  });
})();
