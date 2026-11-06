/* ============================================================
   Smartech Typing Tutor — Auto Scroll (reference text follows your typing)
   ------------------------------------------------------------
   Adds an "Auto Scroll ON/OFF" switch next to the other test switches.
   While ON, the Reference Text box scrolls by itself so the word you are
   about to type stays in view (about a third of the way down the box), so
   the student never has to reach for the mouse. The choice is remembered
   on this computer. It only moves the reference box: nothing about the
   test, the text or the result changes.
   Used by paragraph.html and testpage.html.
   ============================================================ */
(function () {
  "use strict";

  var KEY = "smartechAutoScroll";      // "on" (default) / "off"
  var input = null, para = null, box = null, lastIdx = -1;

  function isOn() {
    try { return localStorage.getItem(KEY) !== "off"; } catch (e) { return true; }
  }
  function setOn(v) {
    try { localStorage.setItem(KEY, v ? "on" : "off"); } catch (e) {}
  }

  // Range covering the first character of the idx-th word of the reference text
  function wordRange(idx) {
    var walker = document.createTreeWalker(para, NodeFilter.SHOW_TEXT);
    var count = -1, inWord = false, node, t, i, r;
    while ((node = walker.nextNode())) {
      t = node.nodeValue;
      for (i = 0; i < t.length; i++) {
        if (/\s/.test(t.charAt(i))) { inWord = false; continue; }
        if (!inWord) {
          inWord = true; count++;
          if (count === idx) {
            r = document.createRange();
            r.setStart(node, i); r.setEnd(node, i + 1);
            return r;
          }
        }
      }
    }
    return null;
  }

  // index of the word the student is on / about to type
  function currentWordIndex() {
    var v = input.value || "";
    var words = v.match(/\S+/g) || [];
    return /\s$/.test(v) || !words.length ? words.length : words.length - 1;
  }

  function follow(force) {
    if (!isOn() || !input || !para || !box) return;
    if (!box.clientHeight) return;                       // hidden (e.g. paper-based mode)
    var idx = currentWordIndex();
    if (!force && idx === lastIdx) return;               // only when the word changes
    lastIdx = idx;

    var range = wordRange(idx);
    if (!range) return;
    var rr = range.getBoundingClientRect(), br = box.getBoundingClientRect();
    if (!rr.height) return;
    var rel = rr.top - br.top;                           // where the word sits inside the visible box
    var lineH = rr.height;
    var inComfort = rel >= lineH * 0.4 && rel <= br.height * 0.6 - lineH;
    if (inComfort) return;
    var top = Math.max(0, box.scrollTop + rel - br.height * 0.3);
    if (typeof box.scrollTo === "function") box.scrollTo({ top: top, behavior: "smooth" });
    else box.scrollTop = top;
  }

  function bindToggle() {
    var anchor = document.getElementById("disable-toggle") || document.getElementById("mode-toggle");
    if (!anchor || document.getElementById("autoscroll-toggle")) return;
    var b = document.createElement("button");
    b.type = "button";
    b.id = "autoscroll-toggle";
    b.className = "toggle-btn as-toggle";
    b.title = "Reference text scrolls by itself as you type";
    b.innerHTML = '<span class="tg-track"><i></i></span><span>Auto Scroll</span><em class="tg-state"></em>';
    function paint() {
      var on = isOn();
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.querySelector(".tg-state").textContent = on ? "ON" : "OFF";
    }
    b.addEventListener("click", function () {
      setOn(!isOn()); paint();
      if (isOn()) follow(true);
      if (input) input.focus();                          // keep typing without clicking back
    });
    paint();
    anchor.parentNode.insertBefore(b, anchor.nextSibling);
  }

  function init() {
    input = document.getElementById("typing-input");
    para = document.getElementById("paragraph");
    box = document.getElementById("reference-text") || (para && para.parentElement);
    if (!input || !para || !box) return;

    // green "ON" look (the shared .toggle-btn.active style is red = "restriction on")
    var st = document.createElement("style");
    st.textContent =
      ".toggle-btn.as-toggle.active{background:#eaf6ee !important;border-color:#2e7d32 !important;color:#1b5e20 !important;}" +
      ".toggle-btn.as-toggle.active .tg-track{background:#2e7d32 !important;}" +
      ".toggle-btn.as-toggle.active .tg-state{background:#2e7d32 !important;color:#fff !important;}" +
      ".toggle-btn.as-toggle{margin-left:6px;}";
    document.head.appendChild(st);

    input.addEventListener("input", function () { follow(false); });
    input.addEventListener("keyup", function (e) {       // backspace / arrows that move the caret
      if (e.key === "Backspace" || e.key.indexOf("Arrow") === 0) follow(false);
    });
    // a new chunk / restart replaces the reference text: start from the top again
    new MutationObserver(function () { lastIdx = -1; box.scrollTop = 0; })
      .observe(para, { childList: true, characterData: true, subtree: true });

    bindToggle();
  }

  // Wait until the page scripts have built their layout (testpage-ui.js moves the toggles)
  if (document.readyState === "complete") init();
  else window.addEventListener("load", init);
})();
