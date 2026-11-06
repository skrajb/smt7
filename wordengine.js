/* ============================================================
   Smartech Typing Tutor — Word-based scoring engine (wordengine.js)
   ------------------------------------------------------------
   Used by test types that say  "engine: words"  (PHHC - Punjab &
   Haryana High Court, or any exam that is judged on real WORDS).

   The normal engine (script.js / script2.js) counts keystrokes:
   5 characters = 1 word, speed = characters / 5 / minutes.
   THIS engine never converts characters to words. It counts the
   words the candidate actually typed:

     Typed words   = every word typed (wrong and extra words included)
     Mistakes      = wrong words + extra words + skipped words
                     + merged / split words (one mistake each)
                     (+ extra spacebar presses, only when the test says
                        "space-mistakes: yes")
     Net words     = Typed words - Mistakes
     Result speed  = Net words / test minutes        PHHC: (typed - mistakes) / 10
     Pass          = Net words >= required words     PHHC: 300 words in 10 minutes

   Only the text the candidate reached is judged: passage words after the
   last typed word are never "skipped" (same rule as the character engine).

   The file has two parts:
     1) score()      - pure counting, no DOM (also runs under Node for tests)
     2) submitTest() - fills the Results table of testpage.html / paragraph.html,
                       saves the result (history, certificate, results sheet)
   Pass / fail itself lives in tests.js (SmartechTests.evaluateWords).
   ============================================================ */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SmartechWordEngine = api;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function (root) {
  "use strict";

  var SPACE_SYMBOL = "␣";   // the visible "space" mark used in the comparison

  /* ---------- small helpers ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch];
    });
  }
  function splitWords(text) {
    var t = String(text == null ? "" : text).trim();
    return t ? t.split(/\s+/) : [];
  }
  function same(a, b, caseSensitive) {
    return caseSensitive ? a === b : a.toLowerCase() === b.toLowerCase();
  }
  function round(n, places) {
    var f = Math.pow(10, places == null ? 2 : places);
    return Math.round(n * f) / f;
  }

  /* ---------- 1) word-by-word comparison of ONE chunk ---------- */
  // Wagner-Fischer edit-distance alignment on whole words: finds the cheapest set of
  // matches / wrong words / extra words / skipped words, so one early slip can never
  // throw off the words that follow it.
  function compareChunk(refText, typedText, opts) {
    opts = opts || {};
    var cs = !!opts.caseSensitive;
    var ref = splitWords(refText);
    var typed = splitWords(typedText);
    var n = ref.length, m = typed.length;

    // The real whitespace between typed words (to see extra spacebar presses)
    var trimmed = String(typedText || "").trim().replace(/\r\n/g, "\n");
    var raw = trimmed ? trimmed.split(/(\s+)/) : [];
    var seps = [];
    for (var q = 0; q < m - 1; q++) seps.push(raw[2 * q + 1] || " ");

    var dp = [], i, j;
    for (i = 0; i <= n; i++) { dp.push(new Array(m + 1)); dp[i][0] = i; }
    for (j = 0; j <= m; j++) dp[0][j] = j;
    for (i = 1; i <= n; i++) {
      for (j = 1; j <= m; j++) {
        var hit = same(ref[i - 1], typed[j - 1], cs);
        dp[i][j] = Math.min(dp[i - 1][j - 1] + (hit ? 0 : 1), dp[i - 1][j] + 1, dp[i][j - 1] + 1);
      }
    }

    // Judge only the part of the passage that was reached: start the back-track at the
    // passage prefix that fits the typed words best (ties = the longest prefix), so a wrong
    // or unfinished LAST word is a wrong word and not a pairing with the passage's last word.
    i = n; j = m;
    if (m > 0) {
      var best = 0;
      for (var k = 0; k <= n; k++) if (dp[k][m] <= dp[best][m]) best = k;
      i = best;
    }
    var ops = [];
    while (i > 0 || j > 0) {
      var isHit = i > 0 && j > 0 && same(ref[i - 1], typed[j - 1], cs);
      if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + (isHit ? 0 : 1)) {
        ops.push({ t: isHit ? "match" : "sub", ref: ref[i - 1], typed: typed[j - 1], ti: j - 1 });
        i--; j--;
      } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
        ops.push({ t: "delete", ref: ref[i - 1] });
        i--;
      } else {
        ops.push({ t: "insert", typed: typed[j - 1], ti: j - 1 });
        j--;
      }
    }
    ops.reverse();
    // Passage words after the last typed word were never reached: not skipped.
    while (ops.length && ops[ops.length - 1].t === "delete") ops.pop();

    // One space error = ONE mistake: "good morning" typed "goodmorning" (merged) or
    // "today" typed "to day" (split). The alignment emits these as two operations, in either order.
    var folded = [];
    for (var x = 0; x < ops.length; x++) {
      var cur = ops[x], nxt = ops[x + 1];
      if (nxt) {
        if (cur.t === "sub" && nxt.t === "delete" && same(cur.typed, cur.ref + nxt.ref, cs)) {
          folded.push({ t: "merged", typed: cur.typed, ref: cur.ref + " " + nxt.ref, split: cur.ref.length, ti: cur.ti }); x++; continue;
        }
        if (cur.t === "delete" && nxt.t === "sub" && same(nxt.typed, cur.ref + nxt.ref, cs)) {
          folded.push({ t: "merged", typed: nxt.typed, ref: cur.ref + " " + nxt.ref, split: cur.ref.length, ti: nxt.ti }); x++; continue;
        }
        if (cur.t === "sub" && nxt.t === "insert" && same(cur.ref, cur.typed + nxt.typed, cs)) {
          folded.push({ t: "split", typed: cur.typed, typed2: nxt.typed, ref: cur.ref, ti: cur.ti }); x++; continue;
        }
        if (cur.t === "insert" && nxt.t === "sub" && same(nxt.ref, cur.typed + nxt.typed, cs)) {
          folded.push({ t: "split", typed: cur.typed, typed2: nxt.typed, ref: nxt.ref, ti: cur.ti }); x++; continue;
        }
      }
      folded.push(cur);
    }

    // Count and draw (classes match the rest of the app: correct / wrong / given)
    var c = { typed: m, wrong: 0, extra: 0, skipped: 0, merged: 0, split: 0, spacing: 0 };
    var out = [];
    function gapBefore(ti) {
      if (ti > 0 && seps[ti - 1] && seps[ti - 1].length > 1) {
        var presses = seps[ti - 1].length - 1;
        for (var p = 0; p < presses; p++) {
          c.spacing++;
          out.push('<span class="space-symbol" data-spacing="1" title="Extra space">' + SPACE_SYMBOL + "</span> ");
        }
      }
    }
    folded.forEach(function (o) {
      if (o.t === "match") {
        gapBefore(o.ti);
        out.push('<span class="correct">' + esc(o.typed) + "</span> ");
      } else if (o.t === "sub") {
        c.wrong++;
        gapBefore(o.ti);
        out.push('<span class="wrong" data-error-type="word">' + esc(o.typed) + '</span> <span class="given">' + esc(o.ref) + "</span> ");
      } else if (o.t === "delete") {
        c.skipped++;
        out.push('<span class="given" data-error-type="skip" title="Skipped" style="text-decoration:line-through;text-decoration-color:#b80000;text-decoration-thickness:2px;">' + esc(o.ref) + "</span> ");
      } else if (o.t === "insert") {
        c.extra++;
        gapBefore(o.ti);
        out.push('<span class="wrong" data-error-type="word" data-extra-word="true" title="Extra word" style="background:transparent;color:inherit;text-decoration:underline;text-decoration-color:#b80000;text-decoration-thickness:2px;">' + esc(o.typed) + "</span> ");
      } else if (o.t === "merged") {
        c.merged++;
        gapBefore(o.ti);
        out.push('<span class="wrong" data-error-type="space">' + esc(o.typed.substring(0, o.split)) + '<span class="space-symbol">' + SPACE_SYMBOL + "</span>" +
          esc(o.typed.substring(o.split)) + '</span> <span class="given">' + esc(o.ref) + "</span> ");
      } else if (o.t === "split") {
        c.split++;
        gapBefore(o.ti);
        out.push('<span class="wrong" data-error-type="space">' + esc(o.typed) + '<span class="space-symbol">' + SPACE_SYMBOL + "</span>" +
          esc(o.typed2) + '</span> <span class="given">' + esc(o.ref) + "</span> ");
      }
    });

    c.html = out.join("").trim();
    return c;
  }

  /* ---------- 1b) whole test: every chunk typed ---------- */
  // pairs : [{ ref: "passage chunk", typed: "what was typed for it" }, ...]
  // opts  : { minutes, spaceMistakes, caseSensitive }
  function score(pairs, opts) {
    opts = opts || {};
    var minutes = Number(opts.minutes) > 0 ? Number(opts.minutes) : 10;
    var t = { typed: 0, wrong: 0, extra: 0, skipped: 0, merged: 0, split: 0, spacing: 0, chars: 0 };
    var chunks = [];
    (pairs || []).forEach(function (p) {
      var c = compareChunk(p.ref, p.typed, opts);
      ["typed", "wrong", "extra", "skipped", "merged", "split", "spacing"].forEach(function (k) { t[k] += c[k]; });
      t.chars += String(p.typed || "").trim().length;
      chunks.push(c);
    });

    var spaceErrors = t.merged + t.split;
    var mistakes = t.wrong + t.extra + t.skipped + spaceErrors + (opts.spaceMistakes ? t.spacing : 0);
    var net = Math.max(0, t.typed - mistakes);
    var accuracy = t.typed > 0 ? Math.min(100, round(net * 100 / t.typed, 1)) : 0;

    return {
      minutes: minutes,
      typedWords: t.typed,
      wrongWords: t.wrong,
      extraWords: t.extra,
      skippedWords: t.skipped,
      spaceErrors: spaceErrors,        // merged + split words
      spacingPresses: t.spacing,       // extra spacebar presses (a mistake only with spaceMistakes)
      spaceMistakes: !!opts.spaceMistakes,
      mistakes: mistakes,
      netWords: net,
      speed: round(net / minutes, 2),  // result speed in words per minute
      accuracy: accuracy,
      typedChars: t.chars,
      chunks: chunks
    };
  }

  /* ---------- 2) results page glue (browser only) ---------- */
  function pad2(n) { return n < 10 ? "0" + n : String(n); }

  // ctx: { test, pairs, totalSeconds, startTime, backspaces, exerciseLabel, saveStats }
  //   test          the active test snapshot (SmartechTests.activeCriteria())
  //   pairs         [{ ref, typed }] one per chunk the candidate typed
  //   totalSeconds  the test time (window.state.totalTime)
  //   startTime     performance.now() of the first key
  function submitTest(ctx) {
    var doc = root.document;
    if (!doc) return null;
    var $ = function (id) { return doc.getElementById(id); };
    function set(id, v) { var e = $(id); if (e) e.textContent = v; }
    function show(id, d) { var e = $(id); if (e) e.style.display = d || "block"; }

    var test = ctx.test;
    var T = root.SmartechTests;
    var minutes = (Number(ctx.totalSeconds) || (test.minutes * 60)) / 60;
    var res = score(ctx.pairs, { minutes: minutes, spaceMistakes: !!test.spaceMistakes, caseSensitive: !!test.caseSensitive });
    var ev = T.evaluateWords(test, res);
    var result = ev.passed ? "Pass" : "Fail";

    // --- the comparison tables (Original | Typed) ---
    var several = (root.paragraphs && root.paragraphs.length > 1);
    var tables = ctx.pairs.map(function (p, i) {
      var c = res.chunks[i];
      var chunkMistakes = c.wrong + c.extra + c.skipped + c.merged + c.split + (res.spaceMistakes ? c.spacing : 0);
      return '<table class="error-table" width="100%" border="2px" style="border-collapse:collapse;"><thead><tr>' +
        '<th width="50%">' + (several ? "Original Chunk #" + (i + 1) : "Original Text") + '</th>' +
        '<th width="50%">' + (several ? "Typed Chunk #" + (i + 1) : "Typed Text") + '</th></tr></thead><tbody><tr>' +
        '<td width="50%"><span class="given">' + esc(p.ref) + '</span></td>' +
        '<td width="50%" valign="top">' + (c.html || "No errors") +
        '<div class="chunk-word-summary" style="margin-top:8px;padding-top:6px;border-top:1px dashed #ccc;font-size:0.9em;color:#00295f;">' +
        '<b>Mistakes: ' + chunkMistakes + '</b> &nbsp; (Wrong ' + c.wrong + ', Extra ' + c.extra + ', Skipped ' + c.skipped +
        ', Space errors ' + (c.merged + c.split) + ')</div></td></tr></tbody></table>';
    }).join("");

    // --- show the results, hide the typing area ---
    var mt = doc.querySelector(".main-title"); if (mt) mt.style.display = "none";
    var ts = doc.querySelector(".test-section"); if (ts) ts.style.display = "none";
    show("results");
    show("results-table", "table");
    show("results-title-row", "table-row");
    show("results-notes");
    show("button-row", "table-row");
    show("error-section");
    show("refresh-btn-2", "inline-block");
    show("practice-another-btn-2", "inline-block");
    var eh = $("error-highlight");
    if (eh) { eh.style.display = "block"; eh.innerHTML = tables; }

    // Word rows on, character rows off
    var rows = doc.querySelectorAll("#results-table tr[data-engine]");
    for (var r = 0; r < rows.length; r++) {
      rows[r].style.display = rows[r].getAttribute("data-engine") === "words" ? "table-row" : "none";
    }

    // --- time taken ---
    var elapsed = ctx.startTime ? (root.performance.now() - ctx.startTime) / 1000 : 0;
    var mm = Math.floor(elapsed / 60), ss = Math.floor(elapsed % 60);

    // --- numbers ---
    var need = T.requiredWords(test);
    var wpmNeed = T.requiredWpm(test);
    var mins = String(round(minutes, 2));
    var spaceBits = res.spacingPresses
      ? " + " + res.spacingPresses + " extra spacebar press" + (res.spacingPresses === 1 ? "" : "es") + (res.spaceMistakes ? " (counted)" : " (not counted)")
      : "";

    set("exercise-no-value", ctx.exerciseLabel || "-");
    set("w-typed-value", res.typedWords + " words");
    set("w-wrong-value", String(res.wrongWords));
    set("w-extra-value", String(res.extraWords));
    set("w-skipped-value", String(res.skippedWords));
    set("w-space-value", res.spaceErrors + " (merged or split words)" + spaceBits);
    set("w-mistakes-value", String(res.mistakes));
    set("w-net-value", res.netWords + " words  (" + res.typedWords + " − " + res.mistakes + ")");
    set("w-speed-value", res.speed + " WPM  (" + res.netWords + " ÷ " + mins + " min)");
    set("w-required-value", need + " " + (test.basis === "gross" ? "typed" : "net") + " words in " + mins + " min  (" + wpmNeed + " WPM)");
    set("time-spent-value", mm + " min " + pad2(ss) + " sec");
    set("accuracy-percentage-value", res.accuracy + "%");
    set("backspace-count-value", String(ctx.backspaces || 0));
    var rv = $("w-result-value");
    if (rv) { rv.textContent = result; rv.className = result === "Pass" ? "pass-result" : "fail-result"; }

    var en = $("exam-note");
    if (en) { en.style.display = "block"; en.innerHTML = '<span class="red-asterisk">*</span>Once time is over the test cannot be resumed and the text typed cannot be edited afterwards.'; }
    var pn = $("pass-note");
    if (pn) { pn.style.display = "block"; pn.innerHTML = T.noteHTML(test); }

    // --- save: history, certificate (on Pass) and the results sheet ---
    var store = root.localStorage;
    function ls(k) { try { return store.getItem(k); } catch (e) { return null; } }
    var nameEl = $("userName"), refEl = $("userRefNo");
    var stats = {
      engine: "words",
      typedWords: res.typedWords,
      wrongWords: res.wrongWords,
      extraWords: res.extraWords,
      skippedWords: res.skippedWords,
      spaceErrors: res.spaceErrors,
      mistakes: res.mistakes,
      netWords: res.netWords,
      requiredWords: need,
      grossCharacters: res.typedChars,
      accuracy: res.accuracy,
      // the one speed of this engine, stored where the sheet / progress / certificate read it
      grossSpeed: res.speed,
      actualSpeed: res.speed,
      timeSpent: mm + "m " + ss + "s",
      result: result,
      testId: test.id,
      testName: test.name,
      timestamp: new Date().toISOString(),
      language: ls("selectedExerciseLanguage") || "English",
      exerciseNo: Number(ls("selectedExerciseNo")) || null,
      exerciseTitle: ls("selectedExerciseTitle") || "",
      backspaceCount: ctx.backspaces || 0,
      name: (nameEl && nameEl.value && nameEl.value.trim()) || (root.SmartechProfile && root.SmartechProfile.getName()) || "",
      refNo: (refEl && refEl.value && refEl.value.trim()) || (root.SmartechProfile && root.SmartechProfile.getRefNo()) || ""
    };
    if (typeof ctx.saveStats === "function") ctx.saveStats(stats);
    if (root.SmartechDB) root.SmartechDB.addResult(stats);

    return { res: res, ev: ev, stats: stats };
  }

  return {
    score: score,
    compareChunk: compareChunk,
    submitTest: submitTest,
    splitWords: splitWords
  };
});
