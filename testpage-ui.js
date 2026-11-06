/* ============================================================
   Smartech Typing Tutor - speed-test UI layer
   Runs on testpage.html and paragraph.html after script.js /
   script2.js. It only adds presentation: it never changes how a
   test is timed, typed or scored.
     - language set-up (font, lang attribute, placeholder)
     - timer colour states (idle / run / warn / crit / done)
     - live counters (characters, words, backspaces)
   ============================================================ */
(function () {
  "use strict";

  var shell = document.querySelector("main.test-shell");
  var timer = document.getElementById("timer");
  var input = document.getElementById("typing-input");
  var section = document.getElementById("test-section");
  if (!shell || !timer || !input || !section) return;

  var WARN_AT = 120; // seconds left -> amber
  var CRIT_AT = 60;  // seconds left -> red

  var LANGS = {
    English: { code: "en", label: "English", mark: "A", placeholder: "Start typing here..." },
    Punjabi: { code: "pa", label: "\u0A2A\u0A70\u0A1C\u0A3E\u0A2C\u0A40", mark: "\u0A2A", placeholder: "\u0A07\u0A71\u0A25\u0A47 \u0A1F\u0A3E\u0A08\u0A2A \u0A15\u0A30\u0A28\u0A3E \u0A38\u0A3C\u0A41\u0A30\u0A42 \u0A15\u0A30\u0A4B..." },
    Hindi:   { code: "hi", label: "\u0939\u093F\u0928\u094D\u0926\u0940", mark: "\u0905", placeholder: "\u092F\u0939\u093E\u0901 \u091F\u093E\u0907\u092A \u0915\u0930\u0928\u093E \u0936\u0941\u0930\u0942 \u0915\u0930\u0947\u0902..." }
  };
  var langName = "English";
  try {
    var saved = localStorage.getItem("selectedExerciseLanguage");
    if (LANGS[saved]) langName = saved;
  } catch (e) {}
  var L = LANGS[langName];

  document.documentElement.setAttribute("data-tt-lang", L.code);
  input.setAttribute("lang", L.code);
  input.placeholder = L.placeholder;
  var ref = document.getElementById("paragraph");
  if (ref) ref.setAttribute("lang", L.code);
  var errBox = document.getElementById("error-highlight");
  if (errBox) errBox.setAttribute("lang", L.code);

  /* ---------- build the top bar ---------- */
  function stat(cls, label) {
    return '<div class="tt-stat"><strong class="' + cls + '">0</strong><span>' + label + "</span></div>";
  }
  var hud = document.createElement("div");
  hud.className = "tt-hud";
  hud.innerHTML =
    '<div class="tt-lang"><div class="tt-mark" aria-hidden="true"></div><div><strong class="tt-lang-name"></strong><span>Speed test</span></div></div>' +
    '<div class="tt-timewrap"></div>' +
    '<div class="tt-stats">' + stat("tt-chars", "Characters") + stat("tt-words", "Words") + stat("tt-bs", "Backspaces") + "</div>" +
    '<div class="tt-hint">The timer starts when you type the first character.</div>';
  hud.querySelector(".tt-mark").textContent = L.mark;
  hud.querySelector(".tt-lang-name").textContent = L.label;

  var wrap = hud.querySelector(".tt-timewrap");
  var seg = null;
  function paintSeg() {
    if (!seg) return;
    Array.prototype.forEach.call(seg.children, function (b) {
      b.classList.toggle("on", b.dataset.v === sel.value);
      b.disabled = sel.disabled;
    });
  }
  var sel = document.getElementById("timerSelect");
  if (sel) {
    var lab = document.querySelector('label[for="timerSelect"]');
    var tw = document.createElement("div");
    tw.className = "tt-time";
    if (lab) { lab.textContent = "Test time"; tw.appendChild(lab); }
    tw.appendChild(sel);
    // Segmented 10 / 15 min buttons drive the (hidden) select the test script reads
    seg = document.createElement("div");
    seg.className = "tt-seg";
    seg.setAttribute("role", "group");
    Array.prototype.forEach.call(sel.options, function (o) {
      var b = document.createElement("button");
      b.type = "button";
      b.dataset.v = o.value;
      b.textContent = String(Math.round(Number(o.value) / 6) / 10) + " min";
      b.addEventListener("click", function () {
        if (sel.disabled) return;
        sel.value = o.value;
        sel.dispatchEvent(new Event("change"));
        paintSeg();
        setTimeout(refresh, 0);
      });
      seg.appendChild(b);
    });
    tw.appendChild(seg);
    wrap.appendChild(tw);
  }
  timer.setAttribute("role", "timer");
  wrap.appendChild(timer);

  var bar = document.createElement("div");
  bar.className = "tt-bar";
  bar.innerHTML = "<i></i>";
  section.insertBefore(bar, section.firstChild);
  section.insertBefore(hud, section.firstChild);

  var elChars = hud.querySelector(".tt-chars");
  var elWords = hud.querySelector(".tt-words");
  var elBs = hud.querySelector(".tt-bs");

  /* ---------- action bar: backspace switch + buttons on one row ---------- */
  var area = document.getElementById("test-area");
  var tog = document.getElementById("disable-toggle");
  if (area && tog) {
    var act = document.createElement("div");
    act.className = "tt-actions";
    var right = tog.nextElementSibling;
    area.insertBefore(act, tog);
    act.appendChild(tog);
    if (right && right.tagName === "DIV") act.appendChild(right);
  }

  /* ---------- label rows (fit-to-screen) ----------
     "Reference Text" shares a row with the Current Chunk pill and "Typing Text"
     with the key hint, so the test area needs two fewer lines of height.
     The elements are MOVED, not copied, so script.js keeps updating them. */
  var chunkEl = document.getElementById("current-chunk");
  var refRow = null, typeRow = null;
  if (area) {
    var labels = area.querySelectorAll(":scope > b");
    if (labels[0]) {
      refRow = document.createElement("div");
      refRow.className = "tt-label-row";
      labels[0].parentNode.insertBefore(refRow, labels[0]);
      refRow.appendChild(labels[0]);
      if (chunkEl) refRow.appendChild(chunkEl);
    }
    if (labels[1]) {
      typeRow = document.createElement("div");
      typeRow.className = "tt-label-row";
      labels[1].parentNode.insertBefore(typeRow, labels[1]);
      typeRow.appendChild(labels[1]);
      // "The timer starts when you type the first character." sits beside the
      // Typing Text label (the top bar has no spare room for it)
      var hintEl = hud.querySelector(".tt-hint");
      if (hintEl) typeRow.appendChild(hintEl);
    }
  }

  if (chunkEl) {
    var keys = document.createElement("div");
    keys.className = "tt-keys";
    keys.innerHTML = "<kbd>Enter</kbd> or <kbd>\u2193</kbd> next chunk &nbsp;\u00B7&nbsp; <kbd>\u2191</kbd> previous chunk";
    if (typeRow) typeRow.appendChild(keys);
    else input.insertAdjacentElement("afterend", keys);
  }

  /* ---------- view mode: test (fits the window) or results (scrolls) ----------
     script.js shows the results by hiding #test-section and showing #results.
     While the test is on screen the page is locked to the window height
     (testpage.css, "fit-to-screen"); once results are shown it scrolls normally. */
  var resultsEl = document.getElementById("results");
  function syncView() {
    var resultsShown = !!resultsEl && resultsEl.style.display !== "" && resultsEl.style.display !== "none";
    var testHidden = section.style.display === "none";
    document.documentElement.classList.toggle("tt-results", resultsShown || testHidden);
  }
  var viewObserver = new MutationObserver(syncView);
  viewObserver.observe(section, { attributes: true, attributeFilter: ["style"] });
  if (resultsEl) viewObserver.observe(resultsEl, { attributes: true, attributeFilter: ["style"] });
  syncView();

  /* ---------- live counters (all chunks typed so far + the current one) ---------- */
  function refreshCounters() {
    var s = window.state || {};
    var chunks = String(s.totalTypedInput || "").split("|").filter(function (c) { return c.length > 0; });
    chunks[s.currentParagraphIndex || 0] = input.value || "";
    var chars = 0, words = 0;
    chunks.forEach(function (c) {
      chars += c.length;
      var t = c.trim();
      if (t) words += t.split(/\s+/).length;
    });
    elChars.textContent = chars;
    elWords.textContent = words;
    elBs.textContent = s.backspaceCount || 0;
  }

  /* ---------- timer colour state ---------- */
  var lastState = "";
  function refresh() {
    var s = window.state || {};
    var total = Number(s.totalTime) || 600;
    var m = /(\d+):(\d{2})/.exec(timer.textContent);
    var left = m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : total;
    var state;
    if (s.isTestRunning) state = left <= CRIT_AT ? "crit" : left <= WARN_AT ? "warn" : "run";
    else state = m && left === 0 ? "done" : "idle";

    if (state !== lastState) {
      lastState = state;
      shell.setAttribute("data-state", state);
    }
    bar.firstChild.style.width = Math.max(0, Math.min(100, (left / total) * 100)) + "%";
    if (sel) { sel.disabled = !!s.isTestRunning; paintSeg(); } // time can't be changed mid-test
    refreshCounters();
  }

  var lastText = "";
  new MutationObserver(function () {
    var t = timer.textContent;
    if (t !== lastText) { lastText = t; refresh(); }
  }).observe(timer, { childList: true, characterData: true, subtree: true });

  input.addEventListener("input", function () { setTimeout(refresh, 0); });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Backspace" || e.key === "Enter" || e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "PageDown" || e.key === "PageUp") {
      setTimeout(refresh, 0);
    }
  });
  ["refresh-btn", "refresh-btn-2"].forEach(function (id) {
    var b = document.getElementById(id);
    if (b) b.addEventListener("click", function () { setTimeout(refresh, 0); });
  });

  refresh();
})();
