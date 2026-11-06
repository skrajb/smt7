/* ============================================================
   Smartech Typing Tutor — Print sheets (SmartechPrint)
   One A4 sheet per exercise: Smartech Education header (logo,
   institute, test details, candidate fields), the whole exercise
   text auto-shrunk to fit on that ONE page, and a footer.
   Used by printexercise.html (opened from Manage & Print).
   ============================================================ */
(function (global) {
  "use strict";

  var INSTITUTE = "Smartech Education Computer Institute";
  var PLACE = "Patiala";
  var MAX_PT = 15, MIN_PT = 5;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  // Words and characters (spaces included) of an exercise exactly as a student types it:
  // line breaks and runs of spaces count as one space, the ends are trimmed.
  function countText(text) {
    var t = String(text == null ? "" : text).replace(/\s+/g, " ").trim();
    return { words: t ? t.split(" ").length : 0, chars: t.length };
  }

  /* entry = { heading, lines:[ "Label: value", ... ], title, text, lang } */
  function sheetHTML(e, index, total) {
    var rows = (e.lines || []).map(function (l) {
      var i = l.indexOf(":");
      return '<div class="pp-kv"><b>' + esc(l.slice(0, i)) + ":</b> " + esc(l.slice(i + 1).trim()) + "</div>";
    }).join("");
    var n = countText(e.text);
    rows += '<div class="pp-kv"><b>Total words:</b> ' + n.words + "</div>" +
            '<div class="pp-kv"><b>Total characters (with spaces):</b> ' + n.chars + "</div>";
    return '' +
      '<section class="pp-sheet">' +
        '<header class="pp-head">' +
          '<img class="pp-logo" src="logo.png" alt="Smartech Education">' +
          '<div class="pp-inst">' +
            '<div class="pp-inst-name">' + INSTITUTE + '</div>' +
            '<div class="pp-inst-sub">' + PLACE + ' &middot; Find your path&hellip;</div>' +
          '</div>' +
          '<div class="pp-doc">Typing Test<br><span>' + esc(e.heading || "") + '</span></div>' +
        '</header>' +
        '<div class="pp-info">' + rows + '</div>' +
        '<div class="pp-cand">' +
          '<span>Name: <i></i></span><span>Ref / Roll No: <i></i></span><span>Date: <i></i></span>' +
        '</div>' +
        '<div class="pp-title">' + esc(e.title || "") + '</div>' +
        '<div class="pp-text" lang="' + esc(e.langCode || "en") + '">' + esc(e.text) + '</div>' +
        '<footer class="pp-foot"><span>' + INSTITUTE + ', ' + PLACE + '</span><span>Sheet ' + (index + 1) + ' of ' + total + '</span></footer>' +
      '</section>';
  }

  // Shrink each exercise text until the whole passage sits inside its page
  function fit(root) {
    var boxes = root.querySelectorAll(".pp-text");
    Array.prototype.forEach.call(boxes, function (box) {
      var pt = MAX_PT;
      box.style.fontSize = pt + "pt";
      while (pt > MIN_PT && box.scrollHeight > box.clientHeight + 1) {
        pt -= 0.25;
        box.style.fontSize = pt + "pt";
      }
      if (pt < MAX_PT) { pt = Math.max(MIN_PT, pt - 0.25); box.style.fontSize = pt + "pt"; }   // small spare room
      // a passage that still overflows at the minimum size is flagged on screen only
      box.setAttribute("data-fit", box.scrollHeight > box.clientHeight + 1 ? "over" : "ok");
      box.setAttribute("data-pt", String(Math.round(pt * 100) / 100));
    });
  }

  function render(root, entries) {
    root.innerHTML = entries.map(function (e, i) { return sheetHTML(e, i, entries.length); }).join("");
    var ready = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    // Fit now, and once more the moment the print dialog opens (the real page size may differ slightly)
    if (!root.__ppBound) {
      root.__ppBound = true;
      global.addEventListener("beforeprint", function () { fit(root); });
    }
    return ready.then(function () { fit(root); });
  }

  global.SmartechPrint = { render: render, fit: fit, esc: esc, countText: countText };
})(window);
