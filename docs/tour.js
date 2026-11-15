/* First-visit guided tour: a welcome card, then short spotlight steps over the real page.
   Opens by itself once, for a first visit to the plain link (a link with settings, like the demo link,
   never opens it). The "Tour" button at the top replays it. ?tour=1 forces it open.
   Does not change any calculation; it only points at the page. Written with AI assistance (Claude). */
(function () {
  "use strict";
  var KEY = "lander-tour-seen";
  var $ = function (id) { return document.getElementById(id); };
  var q = function (s) { return document.querySelector(s); };

  // Each step: target (CSS selector, or none for a centred card), and its words in English and French
  // (label, title, text, an optional "Try it" line). skip(): leave the step out when it does not apply right now.
  // The page's French switch (i18n.js) leaves the tour alone; the tour picks its own language.
  var STEPS = [
    { en: { label: "Welcome", title: "Will the lander survive?",
            text: "A lander at the Moon's south pole lives on sunlight. The Sun stays so low there that hills hide it for days. " +
                  "If the battery runs out before the Sun comes back, the mission is over. This tour shows you how to find out, in about a minute.",
            next: "Start the tour", back: "No thanks" },
      fr: { label: "Bienvenue", title: "L’atterrisseur va-t-il survivre ?",
            text: "Au pôle Sud de la Lune, un atterrisseur vit de la lumière du Soleil. Le Soleil y reste si bas que les collines le cachent pendant des jours. " +
                  "Si la batterie se vide avant son retour, la mission est perdue. Cette visite vous montre comment le savoir, en une minute environ.",
            next: "Commencer la visite", back: "Non merci" } },
    { target: ".field-sites",
      en: { label: "1. Where", title: "Pick a landing place",
            text: "These six places come from a 2026 study of good landing spots near the south pole. Choose one and every answer on the page updates.",
            tip: "Tap a different place and watch the answer below change." },
      fr: { label: "1. Où", title: "Choisissez un lieu d’atterrissage",
            text: "Ces six lieux viennent d’une étude de 2026 sur les bons sites d’atterrissage près du pôle Sud. Choisissez-en un : toutes les réponses de la page se mettent à jour.",
            tip: "Touchez un autre lieu et regardez la réponse changer plus bas." } },
    { target: ".moon",
      en: { label: "1. Where", title: "The map",
            text: "The south pole from above, drawn from NASA's height map. Each dot is a landing place; you can pick one here too. The dashed ring is 85° S.",
            tip: "Want a spot that is not on the list? Press “Somewhere else…”, then tap inside the dashed ring. The page works out that spot's hills in a few seconds." },
      fr: { label: "1. Où", title: "La carte",
            text: "Le pôle Sud vu d’en haut, dessiné à partir de la carte des altitudes de la NASA. Chaque point est un lieu d’atterrissage ; vous pouvez aussi le choisir ici. Le cercle en pointillés marque 85° S.",
            tip: "Un endroit qui n’est pas dans la liste ? Appuyez sur « Ailleurs… », puis touchez la carte dans le cercle en pointillés. La page calcule ses collines en quelques secondes." } },
    { target: ".field-date",
      en: { label: "2. When", title: "Pick a landing date",
            text: "The Sun goes once around the horizon every 29.5 days, so the date decides whether you land into sunlight or into a long shadow. Dates run from January 2027 to November 2028." },
      fr: { label: "2. Quand", title: "Choisissez une date d’atterrissage",
            text: "Le Soleil fait le tour de l’horizon en 29,5 jours : la date décide si vous arrivez au soleil ou dans une longue ombre. Les dates vont de janvier 2027 à novembre 2028." } },
    { target: "details.more", open: "details.more",
      en: { label: "3. The lander", title: "More settings",
            text: "<b>Mission length</b>: how many days the lander must last. <b>Battery</b>: how many hours it can keep going with no sunlight at all. " +
                  "<b>Panel height</b>: a solar panel on a taller mast sees over nearby rocks and hills." },
      fr: { label: "3. L’atterrisseur", title: "Autres réglages",
            text: "<b>Durée de la mission</b> : combien de jours l’atterrisseur doit tenir. <b>Batterie</b> : combien d’heures il tient sans aucun soleil. " +
                  "<b>Hauteur du panneau</b> : un panneau solaire sur un mât plus haut voit par-dessus les rochers et les collines proches." } },
    { target: "#verdict",
      en: { label: "4. The answer", title: "Does it survive?",
            text: "Here is the answer: it survives, or it is lost on a given day. It comes from a simple battery model: an hour of full Sun " +
                  "gives 3 hours of power and the lander uses 1 per hour. Treat it as a first check, not a final design." },
      fr: { label: "4. La réponse", title: "Survit-il ?",
            text: "Voici la réponse : il survit, ou il est perdu tel jour. Elle vient d’un modèle de batterie simple : une heure en plein soleil " +
                  "donne 3 heures d’énergie et l’atterrisseur en consomme 1 par heure. C’est une première vérification, pas un plan final." } },
    { target: "#rescue", skip: function () { var r = $("rescue"); return !r || r.hidden; },
      en: { label: "4. The answer", title: "How do we save it?",
            text: "When the lander is lost, the page tries five single changes for you: land later, a bigger battery, a higher panel, " +
                  "another place or a shorter mission. Press one to try it; you can undo it." },
      fr: { label: "4. La réponse", title: "Comment le sauver ?",
            text: "Quand l’atterrisseur est perdu, la page essaie pour vous cinq changements, un à la fois : atterrir plus tard, une plus grosse batterie, un panneau plus haut, " +
                  "un autre lieu ou une mission plus courte. Appuyez sur l’un d’eux pour l’essayer ; vous pouvez revenir en arrière." } },
    { target: ".watch .head",
      en: { label: "5. Why", title: "Watch the mission",
            text: "Press <b>Play the mission</b> to run it hour by hour. Watch the Sun skim the horizon, and the battery fall when a hill hides it." },
      fr: { label: "5. Pourquoi", title: "Regardez la mission",
            text: "Appuyez sur <b>Lire la mission</b> pour la dérouler heure par heure. Regardez le Soleil frôler l’horizon, et la batterie baisser quand une colline le cache." } },
    { target: "#t3dCanvas",
      en: { label: "5. Why", title: "The 3D view",
            text: "The real ground around the lander, from NASA's height map. <b>Drag</b> to look around, <b>right-drag</b> to move, " +
                  "and hold <b>Ctrl</b> and scroll (or use <b>+</b> and <b>−</b>) to zoom. Scrolling without Ctrl moves the page as usual.",
            tip: "A yellow line runs from the lander to the Sun. When a hill is in the way it turns red and names the ridge." },
      fr: { label: "5. Pourquoi", title: "La vue 3D",
            text: "Le vrai relief autour de l’atterrisseur, d’après la carte des altitudes de la NASA. <b>Faites glisser</b> pour regarder autour, <b>clic droit et glisser</b> pour vous déplacer, " +
                  "et <b>Ctrl</b> + molette (ou <b>+</b> et <b>−</b>) pour zoomer. Sans Ctrl, la molette fait défiler la page comme d’habitude.",
            tip: "Une ligne jaune relie l’atterrisseur au Soleil. Quand une colline le cache, elle devient rouge et nomme la crête." } },
    { target: ".t3dCtl",
      en: { label: "5. Why", title: "Camera buttons",
            text: "<b>Beside the lander</b> is the starting view. <b>From above</b> shows the craters around you. <b>Lander's eye</b> is what the solar panel sees. " +
                  "<b>Look at Earth</b> turns to Earth, which matters for radio contact. <b>Hills 3× taller</b> makes ridges easier to see.",
            tip: "The Sun and Earth are drawn 3× bigger than real so you can spot them." },
      fr: { label: "5. Pourquoi", title: "Les boutons de la caméra",
            text: "<b>Près de l’atterrisseur</b> est la vue de départ. <b>Vue de dessus</b> montre les cratères autour. <b>Vue de l’atterrisseur</b> montre ce que voit le panneau solaire. " +
                  "<b>Regarder la Terre</b> se tourne vers la Terre, importante pour la radio. <b>Relief amplifié ×3</b> rend les crêtes plus faciles à voir.",
            tip: "Le Soleil et la Terre sont dessinés 3 fois plus gros qu’en réalité pour qu’on les repère." } },
    // only on phones and tablets with motion sensors (gyro.js shows the button there)
    { target: "#t3dLook",
      en: { label: "5. Why", title: "Look around with your phone",
            text: "Press this, then hold your phone up and turn on the spot: the phone becomes a window onto the Moon. " +
                  "Only the motion sensors are used, never the camera. <b>Re-centre</b> sets which way is forward; <b>Exit look-around</b> goes back.",
            tip: "Turn until you find the Sun low on the horizon. Directions belong to this Moon scene, not to the real sky." },
      fr: { label: "5. Pourquoi", title: "Regardez autour avec le téléphone",
            text: "Appuyez ici, levez le téléphone et tournez sur vous-même : il devient une fenêtre sur la Lune. " +
                  "Seuls les capteurs de mouvement servent, jamais la caméra. <b>Recentrer</b> choisit la direction devant vous ; <b>Quitter cette vue</b> revient en arrière.",
            tip: "Tournez jusqu’à trouver le Soleil, bas sur l’horizon. Les directions sont celles de cette scène lunaire, pas du vrai ciel." } },
    { target: "#time",
      en: { label: "5. Why", title: "The battery chart",
            text: "The line is the battery from landing to the end of the mission. Drag across it, or use the arrow keys, to jump to any hour. The 3D view follows." },
      fr: { label: "5. Pourquoi", title: "Le graphique de la batterie",
            text: "La courbe montre la batterie de l’atterrissage à la fin de la mission. Faites glisser dessus, ou utilisez les flèches du clavier, pour aller à n’importe quelle heure. La vue 3D suit." } },
    { target: ".slip",
      en: { label: "6. Try again", title: "What if we land later?",
            text: "The same mission, landing one day later, two days later, and so on. Tap a square to switch to that date and compare." },
      fr: { label: "6. Réessayer", title: "Et si l’on atterrissait plus tard ?",
            text: "La même mission, avec un atterrissage un jour plus tard, deux jours plus tard, etc. Touchez un carré pour passer à cette date et comparer." } },
    { target: ".modes",
      en: { label: "7. Go deeper", title: "Simple or Mission planner",
            text: "<b>Simple</b> shows the answer and why. <b>Mission planner</b> adds more: how sure the answer is, science jobs, two places side by side, " +
                  "a two-year calendar of safe dates and every number as a CSV file." },
      fr: { label: "7. Aller plus loin", title: "Simple ou Planifier la mission",
            text: "<b>Simple</b> montre la réponse et pourquoi. <b>Planifier la mission</b> ajoute : la fiabilité de la réponse, les tâches scientifiques, deux lieux côte à côte, " +
                  "un calendrier de deux ans des dates sûres et tous les chiffres en fichier CSV." } },
    { target: "#prefs",
      en: { label: "7. Go deeper", title: "Light or dark, English or French",
            text: "Switch to a <b>light</b> page for a bright room or a projector, and between <b>English</b> and <b>French</b>. The page remembers your choice." },
      fr: { label: "7. Aller plus loin", title: "Clair ou sombre, anglais ou français",
            text: "Passez à une page <b>claire</b> pour une pièce lumineuse ou un projecteur, et entre <b>anglais</b> et <b>français</b>. La page retient votre choix." } },
    { en: { label: "Done", title: "You're ready",
            text: "Pick a place and a date and see if the lander makes it. The address bar always holds your settings, " +
                  "so copying it shares exactly what you see. Press <b>Tour</b> at the top to see this again.",
            next: "Start exploring" },
      fr: { label: "Terminé", title: "À vous de jouer",
            text: "Choisissez un lieu et une date, et voyez si l’atterrisseur tient le coup. La barre d’adresse contient toujours vos réglages : " +
                  "la copier partage exactement ce que vous voyez. Appuyez sur <b>Visite</b> en haut pour revoir cette visite.",
            next: "Explorer" } }
  ];
  var UI = {
    en: { next: "Next", finish: "Finish", back: "Back", of: " of ", tryIt: "Try it", close: "Close the tour" },
    fr: { next: "Suivant", finish: "Terminer", back: "Retour", of: " sur ", tryIt: "Essayez", close: "Fermer la visite" }
  };
  function lang() { return document.documentElement.lang === "fr" ? "fr" : "en"; }

  var on = false, steps = [], at = 0, raf = 0, opened = null, lastFocus = null, last = "", shownLang = "";
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
    var s = steps[i];
    fill();
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

  // The words on the card, in the page's language (also called again if the language changes mid-tour).
  function fill() {
    var s = steps[at], n = steps.length - 1, L = lang(), w = s[L], u = UI[L];
    shownLang = L;
    labelEl.textContent = w.label;
    // count only the steps that apply right now (the rescue step is there only when the lander is lost)
    var mine = 0, all = 0;
    for (var k = 1; k < n; k++) if (k === at || applies(steps[k])) { all++; if (k <= at) mine++; }
    countEl.textContent = at > 0 && at < n ? mine + u.of + all : "";
    titleEl.textContent = w.title;
    textEl.innerHTML = w.text;
    tipEl.innerHTML = w.tip ? "<b>" + u.tryIt + "</b> " + w.tip : "";
    tipEl.hidden = !w.tip;
    nextBtn.textContent = w.next || (at === n - 1 ? u.finish : u.next);
    backBtn.textContent = w.back || u.back;
    backBtn.hidden = at === n;
    skipBtn.setAttribute("aria-label", u.close);
    bar.style.width = Math.round(100 * at / n) + "%";
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

  function loop() { if (!on) return; if (lang() !== shownLang) fill(); place(); raf = requestAnimationFrame(loop); }

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
    state: function () { return { on: on, at: at, n: steps.length, title: on ? steps[at].en.title : "", shown: on ? titleEl.textContent : "", target: on ? steps[at].target || "" : "" }; },
    next: function () { if (on) go(at + 1); }, back: function () { if (on) go(at - 1); }
  };
})();
