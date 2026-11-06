/* ============================================================
   Smartech Typing Tutor — Test types (SmartechTests)
   ------------------------------------------------------------
   Everything about "which rules does this test follow" and
   "is this test unlocked on this computer":

     - the active test's pass rule (read by script.js / script2.js)
     - pass / fail evaluation
     - access: each test type has its own code TYPE in the Google
       Sheet ("TestAccess" tab); this file unlocks / re-checks it
     - start(): opens an exercise of a test with the right page,
       language and time

   Test definitions themselves (name, minutes, speed, accuracy,
   code type, exercises) come from the GitHub text file and are
   parsed in exercises.js (see the doc comment at the top there).
   ============================================================ */
(function (global) {
  "use strict";

  var ACTIVE_KEY = "smartechActiveTest";
  var CHECK_EVERY_MS = 60 * 1000;   // re-ask the sheet at most once a minute (set 0 = on every page open)
  var CHECK_TIMEOUT_MS = 4000;      // never keep a student waiting longer than this when the sheet is slow/offline

  /* ---------- the test currently being taken ---------- */
  function activeCriteria() {
    try {
      var c = JSON.parse(localStorage.getItem(ACTIVE_KEY));
      return c && c.id && c.minutes ? c : null;
    } catch (e) { return null; }
  }
  function clearActive() { try { localStorage.removeItem(ACTIVE_KEY); } catch (e) {} }

  /* ---------- pass rule ---------- */
  // Two scoring engines:
  //   "chars" (default) - characters, 5 chars = 1 word, speed = characters / 5 / minutes
  //   "words"           - PHHC style: real typed words; Net words = typed words - mistakes,
  //                       result speed = net words / minutes (wordengine.js does the counting)
  function isWordTest(c) {
    if (!c) return false;
    if (c.engine) return c.engine === "words";
    return /^phhc/i.test(String(c.id || ""));   // a copy saved before "engine" existed
  }

  function requiredChars(c) {
    return c.chars ? Math.round(c.chars) : Math.round((c.wpm || 0) * 5 * c.minutes);
  }
  function requiredWords(c) {
    if (c.words) return Math.round(c.words * 100) / 100;
    if (c.wpm) return Math.round(c.wpm * c.minutes * 100) / 100;
    return 300;                                    // the PHHC default: 300 words in 10 minutes
  }
  function requiredWpm(c) {
    if (isWordTest(c)) return Math.round((requiredWords(c) / c.minutes) * 100) / 100;
    return c.wpm ? c.wpm : (c.chars ? Math.round((c.chars / (5 * c.minutes)) * 10) / 10 : 0);
  }

  // gross / net are character counts; accuracy is a percentage (number or numeric string)
  function evaluate(c, gross, net, accuracy) {
    var need = requiredChars(c);
    var counted = c.basis === "net" ? Number(net) : Number(gross);
    var speedOk = counted >= need;
    var accOk = Number(accuracy) >= c.accuracy;
    return { passed: speedOk && accOk, speedOk: speedOk, accOk: accOk, requiredChars: need, requiredWpm: requiredWpm(c) };
  }

  // Word engine: r = result of SmartechWordEngine.score() { typedWords, netWords, accuracy }.
  // Pass = net words (typed words - mistakes) reach the required words in the test time.
  // basis "gross" counts the typed words without taking the mistakes off.
  function evaluateWords(c, r) {
    var need = requiredWords(c);
    var counted = c.basis === "gross" ? Number(r.typedWords) : Number(r.netWords);
    var speedOk = counted >= need;
    var accOk = Number(r.accuracy) >= (c.accuracy || 0);
    return { passed: speedOk && accOk, speedOk: speedOk, accOk: accOk, requiredWords: need, requiredWpm: requiredWpm(c) };
  }

  // The rule for one language of a test: the test's own values, with any "<language>-wpm /
  // -chars / -words / -accuracy / -minutes" override from the exercise file applied on top.
  function ruleFor(t, lang) {
    var r = {};
    for (var k in t) r[k] = t[k];
    var o = t && t.rules && lang ? t.rules[lang] : null;
    if (o) {
      if (o.minutes) r.minutes = o.minutes;
      if (o.accuracy) r.accuracy = o.accuracy;
      if (o.wpm) { r.wpm = o.wpm; r.chars = 0; r.words = 0; }
      if (o.chars) { r.chars = o.chars; r.wpm = 0; r.words = 0; }
      if (o.words) { r.words = o.words; r.wpm = 0; r.chars = 0; }
    }
    return r;
  }

  function summary(c) {
    var parts = [c.minutes + " min"];
    if (isWordTest(c)) {
      parts.push("min " + requiredWords(c) + " " + (c.basis === "gross" ? "typed" : "net") + " words (" + requiredWpm(c) + " WPM)");
      if (c.accuracy) parts.push(c.accuracy + "% accuracy");
      return parts.join(" \u00B7 ");
    }
    var need = requiredChars(c);
    if (need) parts.push("min " + requiredWpm(c) + " WPM (" + need + " " + (c.basis === "net" ? "net" : "gross") + " chars)");
    parts.push(c.accuracy + "% accuracy");
    return parts.join(" \u00B7 ");
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch];
    });
  }

  // Text shown under the result table
  function noteHTML(c) {
    if (isWordTest(c)) {
      var w = requiredWords(c);
      var rule = "you need at least " + w + " " + (c.basis === "gross" ? "typed" : "net") + " words in " + c.minutes + " minutes (" + requiredWpm(c) + " WPM)." +
        (c.basis === "gross" ? "" : " Net words = typed words \u2212 mistakes; result speed = net words \u00F7 " + c.minutes + ".") +
        (c.accuracy ? " Minimum accuracy " + c.accuracy + "%." : "");
      return '<span class="red-asterisk">*</span>' + esc(c.name) + " (" + c.minutes + " min): " + rule + (c.note ? " " + esc(c.note) : "");
    }
    var need = requiredChars(c);
    var rule2 = need
      ? "you need at least " + need + " " + (c.basis === "net" ? "net" : "gross") + " characters (" + requiredWpm(c) + " WPM) with " + c.accuracy + "% accuracy."
      : "you need at least " + c.accuracy + "% accuracy.";
    return '<span class="red-asterisk">*</span>' + esc(c.name) + " (" + c.minutes + " min): " + rule2 +
      (c.note ? " " + esc(c.note) : "");
  }

  /* ---------- access (Google Sheet codes) ---------- */
  // code: FREE (or LANGUAGE) = no test code, but each exercise follows the student's LANGUAGE activation:
  //   English activated (ENG) -> English exercises work, Punjabi activated (PBI) -> Punjabi exercises work,
  //   Hindi activated (HIN) -> Hindi exercises work.   code: OPEN = open to everyone, no activation at all.
  var LANG_TYPE = { English: "ENG", Punjabi: "PBI", Hindi: "HIN" };
  function followsLanguage(t) { return !!t && /^(FREE|LANGUAGE)$/i.test(String(t.code || "")); }
  function isOpen(t) { return !!t && /^OPEN$/i.test(String(t.code || "")); }
  function needsCode(t) { return !!t && !!t.code && !followsLanguage(t) && !isOpen(t); }

  // Can this language of the test be used on this computer?
  function langUnlocked(t, lang) {
    if (!followsLanguage(t)) return isUnlocked(t);
    var type = LANG_TYPE[lang];
    if (!type) return true;                                   // a language without an activation type
    return typeof global.isActivationValid === "function" ? global.isActivationValid(type) : false;
  }

  function isUnlocked(t) {
    if (!needsCode(t)) return true;
    return typeof global.isActivationValid === "function" ? global.isActivationValid(t.code) : false;
  }

  // Enter a code for the test's code type. Resolves { ok, reason }.
  function unlock(t, code) {
    code = String(code || "").trim();
    if (!code) return Promise.resolve({ ok: false, reason: "EMPTY" });
    return global.activateProduct(code, t.code).then(function (r) {
      if (r.ok) global.markActivated(t.code, code.toUpperCase(), r.expiresAt);
      return r;
    });
  }

  // Quietly asks the sheet whether an already-activated code is still good, so
  // BLOCKING a code (or removing its row) in the sheet takes effect on the next
  // check. Offline / server trouble never locks anyone out, and a "device
  // mismatch" is left alone (screen-size changes alter the device string).
  // Resolves true when the local state changed (re-render the page).
  // opts.force = ignore the once-a-minute limit (used right before a test starts)
  function revalidate(t, opts) {
    opts = opts || {};
    if (!needsCode(t) || typeof global.checkProduct !== "function") return Promise.resolve(false);
    var info = global.getActivationInfo(t.code);
    if (!info.code) return Promise.resolve(false);
    var key = "smartechLastCheck_" + t.code;
    var last = 0;
    try { last = Number(localStorage.getItem(key)) || 0; } catch (e) {}
    if (!opts.force && Date.now() - last < CHECK_EVERY_MS) return Promise.resolve(false);

    var timeout = new Promise(function (res) { setTimeout(function () { res({ ok: false, reason: "NETWORK" }); }, CHECK_TIMEOUT_MS); });
    return Promise.race([global.checkProduct(info.code, t.code), timeout]).then(function (r) {
      if (r.reason === "NETWORK" || r.reason === "BUSY") return false;
      try { localStorage.setItem(key, String(Date.now())); } catch (e) {}
      if (r.ok) {
        if (r.expiresAt && r.expiresAt !== info.expiresAt) {
          global.markActivated(t.code, info.code, r.expiresAt);
          return true;
        }
        return false;
      }
      if (r.reason === "BLOCKED" || r.reason === "EXPIRED" || r.reason === "INVALID") {
        global.clearActivation(t.code);
        return true;
      }
      return false;
    });
  }

  /* ---------- start a test exercise ---------- */
  function pageFor(mode) { return mode === "chunk" ? "testpage.html" : "paragraph.html"; }

  function start(t, ex, index) {
    var L = ex.lang || t.lang || "English";
    if (!langUnlocked(t, L)) {
      alert("Please activate " + L + " first to use these exercises.");
      global.location.href = "activate.html";
      return;
    }
    var r = ruleFor(t, L);          // the rule of this exercise's language
    var snapshot = {
      id: t.id, name: t.name, lang: L, mode: t.mode,
      minutes: r.minutes, wpm: r.wpm, chars: r.chars, accuracy: r.accuracy,
      basis: t.basis, note: t.note, code: t.code,
      engine: isWordTest(t) ? "words" : "chars",
      words: r.words, spaceMistakes: !!t.spaceMistakes, caseSensitive: !!t.caseSensitive
    };
    try {
      localStorage.setItem(ACTIVE_KEY, JSON.stringify(snapshot));
      localStorage.setItem("selectedExerciseText", ex.text);
      localStorage.setItem("selectedExerciseLanguage", snapshot.lang);
      localStorage.setItem("selectedExerciseNo", String(index + 1));
      localStorage.setItem("selectedExerciseTitle", ex.title || "");
      localStorage.setItem("selectedExerciseMode", t.mode);
    } catch (e) {
      alert("Could not start the test: browser storage is full or unavailable.");
      return;
    }
    global.location.href = pageFor(t.mode);
  }

  global.SmartechTests = {
    activeCriteria: activeCriteria,
    clearActive: clearActive,
    requiredChars: requiredChars,
    requiredWords: requiredWords,
    requiredWpm: requiredWpm,
    isWordTest: isWordTest,
    usesWordEngine: isWordTest,
    evaluate: evaluate,
    evaluateWords: evaluateWords,
    summary: summary,
    ruleFor: ruleFor,
    noteHTML: noteHTML,
    needsCode: needsCode,
    followsLanguage: followsLanguage,
    langUnlocked: langUnlocked,
    langType: function (L) { return LANG_TYPE[L] || ""; },
    isUnlocked: isUnlocked,
    unlock: unlock,
    revalidate: revalidate,
    start: start,
    pageFor: pageFor,
    esc: esc
  };
})(window);
