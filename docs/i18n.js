/* Display-time localisation. The simulation and its English source stay untouched. */
(function () {
  "use strict";
  var dictionary = window.LANDER_FR || { exact: {}, rules: [] };
  var originals = new WeakMap(), attributes = new WeakMap(), cache = new Map();
  var names = ["aria-label", "title", "placeholder", "alt"];
  var options = { childList: true, characterData: true, subtree: true,
    attributes: true, attributeFilter: names };
  var language = "en";
  try { if (localStorage.getItem("lander-lang") === "fr") language = "fr"; } catch (e) {}
  var forced = /[?&]lang=(fr|en)(?:&|$)/.exec(location.search);
  if (forced) language = forced[1];

  function translate(value) {
    if (cache.has(value)) return cache.get(value);
    var text = value.trim(), result = text;
    if (Object.prototype.hasOwnProperty.call(dictionary.exact, text)) result = dictionary.exact[text];
    else {
      var first = dictionary.first || 0, done = false;
      dictionary.rules.forEach(function (rule, i) {
        if (done) return;
        rule[0].lastIndex = 0;
        var next = result.replace(rule[0], rule[1]);
        if (i < first && next !== result) done = true;        // a whole-sentence rule matched: stop there
        result = next;
      });
      // A sentence that is still mostly English after the word rules reads worse half-translated: leave it in English.
      if (!done && result !== text && /(^| )(the|and|is|are|with|you|this|that|of|to|it|not)( |[.,:;]|$)/i.test(result) &&
          (result.match(/(^| )(the|and|is|are|with|you|this|that|of|to|it|not)(?= |[.,:;]|$)/gi) || []).length >= 2) result = text;
    }
    result = value.slice(0, value.length - value.trimStart().length) + result +
      value.slice(value.trimEnd().length);
    // Playback can produce many unique strings. Bound memory while retaining hot labels.
    if (cache.size >= 12000) cache.clear();
    cache.set(value, result);
    return result;
  }
  function excluded(node) {
    var el = node.nodeType === 1 ? node : node.parentElement;
    return !el || !!el.closest("script,style,canvas,#langBtn");
  }
  function updateText(node) {
    if (excluded(node) || !node.data.trim()) return;
    var current = node.data, record = originals.get(node);
    // A new application write replaces the source, even on a reused text node.
    if (!record || current !== record.shown) record = { source: current, shown: current };
    var next = language === "fr" ? translate(record.source) : record.source;
    if (next !== current) node.data = next;
    record.shown = next; originals.set(node, record);
  }
  function updateAttributes(el) {
    if (el.id === "langBtn" || el.closest("script,style")) return;
    var records = attributes.get(el) || Object.create(null);
    names.forEach(function (name) {
      if (!el.hasAttribute(name)) { delete records[name]; return; }
      var current = el.getAttribute(name), record = records[name];
      if (!record || record.shown !== current) record = { source: current, shown: current };
      var next = language === "fr" ? translate(record.source) : record.source;
      if (next !== current) el.setAttribute(name, next);
      record.shown = next; records[name] = record;
    });
    attributes.set(el, records);
  }
  function walk(root) {
    if (root.nodeType === 3) { updateText(root); return; }
    if (root.nodeType !== 1 || excluded(root)) return;
    updateAttributes(root);
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        return excluded(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    }), node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === 3) updateText(node); else updateAttributes(node);
    }
  }
  function process(records) {
    var roots = new Set();
    records.forEach(function (record) {
      if (record.type === "childList") record.addedNodes.forEach(function (node) { roots.add(node); });
      else roots.add(record.target);
    });
    roots.forEach(function (root) {
      if (!root.isConnected) return;
      for (var p = root.parentNode; p; p = p.parentNode) if (roots.has(p)) return;
      if (root.nodeType === 1 && records.some(function (r) { return r.target === root && r.type === "attributes"; })) updateAttributes(root);
      else walk(root);
    });
  }
  // Disconnect only during our synchronous writes: no self-generated records can loop.
  var observer = new MutationObserver(function (records) {
    observer.disconnect();
    try { process(records); } finally { observer.observe(document.body, options); }
  });
  var canvas = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
  var fillText = canvas && canvas.fillText, measureText = canvas && canvas.measureText;
  function canvasLanguage() {
    if (!canvas) return;
    if (language === "en") { canvas.fillText = fillText; canvas.measureText = measureText; return; }
    canvas.fillText = function (text) {
      var args = Array.prototype.slice.call(arguments); args[0] = translate(String(text));
      return fillText.apply(this, args);
    };
    canvas.measureText = function (text) { return measureText.call(this, translate(String(text))); };
  }
  var button = document.getElementById("langBtn");
  if (!button) {
    button = document.createElement("button"); button.type = "button"; button.id = "langBtn";
    var prefs = document.getElementById("prefs");
    if (prefs) prefs.appendChild(button);
  }
  function apply(next, redraw) {
    var pending = observer.takeRecords(); observer.disconnect();
    try {
      process(pending);
      language = next;
      document.documentElement.lang = language;
      button.textContent = language === "fr" ? "EN" : "FR";
      button.setAttribute("aria-label", language === "fr" ? "Switch to English" : "Passer en français");
      canvasLanguage(); walk(document.body);
      // Title is outside the body; retain the same restoration guarantees.
      if (document.querySelector("title").firstChild) updateText(document.querySelector("title").firstChild);
      try { localStorage.setItem("lander-lang", language); } catch (e) {}
      if (redraw) {
        window.dispatchEvent(new Event("resize"));
        if (window.LANDER_APP && window.LANDER_APP.set) window.LANDER_APP.set({});
        walk(document.body);
      }
    } finally { observer.observe(document.body, options); }
  }
  button.addEventListener("click", function () { apply(language === "fr" ? "en" : "fr", true); });
  apply(language, language === "fr");
})();
