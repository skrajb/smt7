/* ============================================================
   Smartech Typing Tutor — Content protection (loaded on every page)
   ------------------------------------------------------------
   Blocks, inside the app window:
     - right-click menu
     - copy / cut / paste (and Ctrl+C/X/V/A, Ctrl/Shift+Insert, Shift+Delete)
     - any text selection (mouse drag, double / triple click, Select All)
     - drag & drop of text or images
     - view-source / save / DevTools shortcuts (F12, Ctrl+Shift+I/J/C, Ctrl+U/S)
   Exceptions (so the app stays usable):
     - single-line boxes (name, reference no., activation code) still allow
       typing and PASTE, so a code sent on WhatsApp can be pasted. Everything
       else - above all the typing area - can never receive pasted text.
     - Print (Ctrl+P) stays available on printexercise.html only.
   The Electron main process (main.js) repeats the keyboard blocks, so they
   also hold if a page's own script fails to load.
   ============================================================ */
(function () {
  "use strict";

  var page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  var allowPrint = page === "printexercise.html";

  /* ---------- no selection, no image dragging ---------- */
  var css = document.createElement("style");
  css.textContent =
    "html, body, body * { -webkit-user-select: none !important; user-select: none !important; -webkit-touch-callout: none !important; }" +
    "input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]), textarea { -webkit-user-select: text !important; user-select: text !important; }" +
    "img, a { -webkit-user-drag: none !important; user-drag: none !important; }" +
    "::selection { background: transparent !important; color: inherit !important; }" +
    "input::selection, textarea::selection { background: rgba(120,120,120,.25) !important; }" +
    "#typing-input::selection { background: transparent !important; }";
  (document.head || document.documentElement).appendChild(css);

  function isSingleLineField(el) {
    return !!el && el.tagName === "INPUT" &&
      /^(text|search|tel|number|password|email|url)?$/i.test(el.getAttribute("type") || "");
  }
  function isTypingArea(el) { return !!el && (el.tagName === "TEXTAREA" || el.isContentEditable); }
  function stop(e) { e.preventDefault(); e.stopPropagation(); return false; }

  /* ---------- mouse / clipboard events ---------- */
  document.addEventListener("contextmenu", stop, true);
  document.addEventListener("copy", stop, true);
  document.addEventListener("cut", stop, true);
  document.addEventListener("dragstart", stop, true);
  document.addEventListener("drop", stop, true);
  document.addEventListener("dragover", stop, true);
  document.addEventListener("paste", function (e) {
    if (isSingleLineField(e.target)) return;      // activation code / name boxes
    stop(e);                                      // typing area and everything else
  }, true);
  document.addEventListener("selectstart", function (e) {
    var t = e.target && e.target.nodeType === 3 ? e.target.parentNode : e.target;
    if (isSingleLineField(t)) return;             // normal caret use in small input boxes
    if (isTypingArea(t)) { return; }              // caret placement still works; selection is blocked below
    stop(e);
  }, true);

  // Anything that still manages to select text is cleared straight away
  document.addEventListener("selectionchange", function () {
    var a = document.activeElement;
    if (isSingleLineField(a)) return;
    if (isTypingArea(a)) {
      try { if (a.selectionStart !== a.selectionEnd) a.setSelectionRange(a.selectionEnd, a.selectionEnd); } catch (err) {}
      return;
    }
    var s = window.getSelection && window.getSelection();
    if (s && s.rangeCount && String(s).length) { try { s.removeAllRanges(); } catch (err) {} }
  });
  // double / triple click and shift+click would select words or lines
  document.addEventListener("mousedown", function (e) {
    if (e.detail > 1 && !isSingleLineField(e.target)) e.preventDefault();
  }, true);

  /* ---------- keyboard ---------- */
  document.addEventListener("keydown", function (e) {
    var k = (e.key || "").toLowerCase();
    var ctrl = e.ctrlKey || e.metaKey;
    var inField = isSingleLineField(e.target);

    if (k === "f12") return stop(e);
    if (ctrl && e.shiftKey && (k === "i" || k === "j" || k === "c")) return stop(e);
    if (ctrl && (k === "u" || k === "s")) return stop(e);
    if (ctrl && k === "p" && !allowPrint) return stop(e);

    if (ctrl && (k === "c" || k === "x" || k === "insert")) return stop(e);     // copy / cut
    if (ctrl && k === "a") { if (inField) return; return stop(e); }               // select all
    if (ctrl && k === "v") { if (inField) return; return stop(e); }               // paste
    if (e.shiftKey && k === "insert") { if (inField) return; return stop(e); }    // paste
    if (e.shiftKey && k === "delete") return stop(e);                              // cut
    // shift + arrow / home / end would extend a selection in the typing box
    if (e.shiftKey && !inField && /^(arrow|home|end|page)/.test(k)) return stop(e);
  }, true);
})();
