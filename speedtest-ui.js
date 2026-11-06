/* ============================================================
   Smartech Typing Tutor - Speed Test UI layer
   Presentation only. It reads the page's existing controls
   (#language, #timer, #time_remaining, #typed_text, #resultBox)
   and never touches scoring or timing logic.
     - turns <select data-seg> into segmented controls
     - drives timer state colour / progress bar / status text
     - keeps the language badge and Indic font stack in step
     - focuses the typing box after Restart / timer / language change
   ============================================================ */
/* ---- letter-by-letter highlight (used by the Speed Test page, all three languages) ----
   Splits the current word into clusters (a base letter plus its vowel signs /
   conjuncts) so Devanagari and Gurmukhi keep their correct shapes, then marks
   each cluster: typed right (green), typed wrong (red), next to type (gold). */
window.StLetters = {
  build: function (word, typedSoFar) {
    var joiner = function (ch) { return ch === "\u094D" || ch === "\u0A4D" || ch === "\u200D" || ch === "\u200C"; };
    var clusters = [];
    for (var i = 0; i < word.length;) {
      var j = i + 1;
      while (j < word.length && (/\p{M}/u.test(word[j]) || joiner(word[j - 1]) || joiner(word[j]))) j++;
      clusters.push([i, j]);
      i = j;
    }
    var n = typedSoFar.length, html = "";
    clusters.forEach(function (c) {
      var a = c[0], b = c[1], cls = "";
      if (n > a) {
        var upto = Math.min(n, b);
        var ok = typedSoFar.slice(a, upto) === word.slice(a, upto);
        cls = !ok ? "letter-wrong" : (n >= b ? "letter-correct" : "letter-current");
      } else if (n === a) {
        cls = "letter-current";
      }
      html += '<span class="letter ' + cls + '">' + word.slice(a, b) + "</span>";
    });
    if (n > word.length) html += '<span class="letter letter-wrong">' + typedSoFar.slice(word.length) + "</span>";
    return html;
  }
};

(function () {
  function ready(fn) { if (document.readyState !== "loading") fn(); else document.addEventListener("DOMContentLoaded", fn); }

  ready(function () {
    var shell = document.getElementById("stShell");
    var langSel = document.getElementById("language");
    var timerSel = document.getElementById("timer");
    var input = document.getElementById("typed_text");
    var clock = document.getElementById("time_remaining");
    var bar = document.getElementById("stBar");
    var status = document.getElementById("stStatus");
    var mark = document.getElementById("stMark");
    var langName = document.getElementById("stLangName");
    var box = document.getElementById("test_text");
    if (!shell || !input || !clock) return;

    /* ---- segmented controls ---- */
    function buildSeg(sel) {
      if (!sel || sel.options.length < 2) {
        var f = sel && sel.closest(".st-field");
        if (f) f.style.display = "none";
        return;
      }
      var seg = document.createElement("div");
      seg.className = "st-seg";
      seg.setAttribute("role", "group");
      seg.setAttribute("aria-label", sel.getAttribute("aria-label") || sel.id);
      Array.prototype.forEach.call(sel.options, function (o) {
        var b = document.createElement("button");
        b.type = "button";
        b.textContent = o.textContent;
        b.dataset.value = o.value;
        b.addEventListener("click", function () {
          if (sel.value === o.value) return;
          sel.value = o.value;
          sel.dispatchEvent(new Event("change", { bubbles: true }));
          sync();
        });
        seg.appendChild(b);
      });
      sel.classList.add("st-sr");
      sel.insertAdjacentElement("afterend", seg);
      sel._seg = seg;
    }
    function syncSeg(sel) {
      if (!sel || !sel._seg) return;
      Array.prototype.forEach.call(sel._seg.children, function (b) {
        b.setAttribute("aria-pressed", String(b.dataset.value === sel.value));
      });
    }

    /* ---- language badge + font stack ---- */
    function langKey() {
      var t = (langSel && langSel.options[langSel.selectedIndex] ? langSel.options[langSel.selectedIndex].textContent : "").toLowerCase();
      if (t.indexOf("punjabi") > -1) return "pa";
      if (t.indexOf("hindi") > -1) return "hi";
      return "en";
    }
    function syncLang() {
      var k = langKey();
      document.documentElement.setAttribute("data-tt-lang", k);
      var opt = langSel && langSel.options[langSel.selectedIndex];
      if (langName && opt) langName.textContent = opt.textContent;
      if (mark) mark.textContent = k === "pa" ? "ਪ" : k === "hi" ? "अ" : "A";
      if (box) box.setAttribute("lang", k === "pa" ? "pa" : k === "hi" ? "hi" : "en");
      if (input) input.setAttribute("lang", k === "pa" ? "pa" : k === "hi" ? "hi" : "en");
    }

    /* ---- timer state ---- */
    function secs() {
      var m = /(\d+):(\d+)/.exec(clock.textContent || "");
      return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : 0;
    }
    function total() { return parseInt(timerSel && timerSel.value, 10) || 60; }

    function syncState() {
      var left = secs(), tot = total();
      var state;
      if (input.disabled) state = "done";
      else if (left >= tot) state = "idle";
      else if (left <= tot * 0.15) state = "crit";
      else if (left <= tot * 0.30) state = "warn";
      else state = "run";
      shell.setAttribute("data-state", state);
      if (bar) bar.style.width = Math.max(0, Math.min(100, (left / tot) * 100)) + "%";
      if (status) {
        status.innerHTML = state === "idle" ? "Ready &mdash; the timer starts with your <b>first key</b>."
          : state === "done" ? "<b>Time is up!</b> Your result is shown below."
          : state === "crit" ? "<b>Final seconds</b> &mdash; keep going!"
          : state === "warn" ? "Time is running low &mdash; stay accurate."
          : "<b>Typing&hellip;</b> press Space after each word.";
      }
    }

    function sync() {
      syncSeg(langSel); syncSeg(timerSel); syncLang(); syncState();
    }

    buildSeg(langSel);
    buildSeg(timerSel);

    new MutationObserver(syncState).observe(clock, { childList: true, characterData: true, subtree: true });
    new MutationObserver(syncState).observe(input, { attributes: true, attributeFilter: ["disabled"] });

    function focusSoon() { setTimeout(function () { if (!input.disabled) input.focus(); }, 60); }
    ["language", "timer"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("change", function () { sync(); focusSoon(); });
    });
    var restart = document.getElementById("restart_button");
    if (restart) restart.addEventListener("click", function () { sync(); focusSoon(); });
    if (box) box.addEventListener("mousedown", function (e) { e.preventDefault(); if (!input.disabled) input.focus(); });

    sync();
  });
})();
