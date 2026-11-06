/* ============================================================
   Smartech Typing Tutor — Shared exercise loader (exercises.js)

   ONE source of exercises for every page:
     - Chunk lists     (engtutor / pbitutor / hinditutor  -> testpage.html)
     - Long/Paragraph  (engexercises / pbiexercises / hindiexercises -> paragraph.html)
     - Demo            (demo.html -> paragraph.html, 5-minute timer)

   Everything is downloaded from the GitHub exercises.txt file
   (DEFAULT_URL below). The last good download is cached on the
   device, so the lists still work when the computer is offline.

   ------------------------------------------------------------
   HOW TO WRITE exercises.txt  (edit it on GitHub)
   ------------------------------------------------------------
   Every exercise is a header line starting with ###, followed by
   the text between two "---" lines:

       ### English
       ---
       Text of an exercise that appears in BOTH lists...
       ---

   The words in the header decide where the exercise appears:

       ### English                  -> Chunk list AND Long list
       ### English Chunk            -> Chunk list only
       ### English Paragraph        -> Long list only   ("Long" also works)

   Same for Punjabi and Hindi:

       ### Punjabi Chunk
       ### Hindi Paragraph
       ### Hindi

   Any other words in the header become the button label:

       ### English Chunk Special 1     -> button "3. English Special 1"
       ### Punjabi August              -> button "5. Punjabi August"

   DEMO exercises (5-minute demo test, shown before English everywhere):

       ### Demo English
       ---
       Text of the English demo exercise...
       ---

       ### Demo Punjabi        ### Demo Hindi

   The word "Demo" in the header is what matters. The language word
   (English / Punjabi / Hindi) is optional: if it is left out, the
   language is detected from the text itself. Extra words become the
   button label ("### Demo English Banking" -> "Demo Banking").
   Demo exercises appear ONLY on the Demo page, never in the Chunk or
   Long Paragraph lists.

   TEST TYPES (several exam types, each with its own pass rule and its own
   Google-Sheet access code) are defined in the SAME file with a "### TEST"
   block of "key: value" lines (no --- needed):

       ### TEST CHSL-ENG
       name: SSC CHSL English
       language: English
       mode: paragraph          (paragraph = long passage, chunk = 10 chunks)
       minutes: 10
       wpm: 35                  (or  chars: 1750  - minimum gross characters)
       accuracy: 93
       basis: gross             (gross or net speed counts toward the pass)
       code: CHSL               (access-code TYPE in the sheet, FREE = no code)
       description: Shown on the Test Centre card
       note: Extra text shown under the result (optional)

   WORD ENGINE (PHHC - Punjab & Haryana High Court): the pass is calculated on the
   WORDS really typed, not on 5 characters = 1 word. Net words = typed words - mistakes,
   result speed = net words / minutes. A test whose ID starts with PHHC uses it by default.

       ### TEST PHHC
       name: Punjab & Haryana High Court
       language: English
       engine: words            (default for IDs starting with PHHC; "chars" = old engine)
       minutes: 10
       words: 300               (minimum NET words in the test time = 30 WPM; or  wpm: 30)
       basis: net               (net = typed - mistakes (default), gross = typed words only)
       space-mistakes: no       (yes = every extra spacebar press is also a mistake)
       case-sensitive: no       (yes = a wrong capital letter is a wrong word)
       code: PHHC

   An exercise belongs to a test when its header has an @ID tag; the
   exercise then appears ONLY in that test (not in the normal lists):

       ### English @CHSL-ENG Passage 1
       ---
       Text ...
       ---

   One exercise can serve several tests:  ### English @CHSL-ENG @CGL-ENG Set A
   Language word is optional when an @tag is present (detected from the text).

   Exercises are shown in the same order as they appear in the file.
   Anything above the first ### line is ignored (use it for notes).
   ============================================================ */
(function (global) {
  "use strict";

  var DEFAULT_URL =
    "https://raw.githubusercontent.com/skrajb/smt5/refs/heads/main/smt5.txt";

  // Re-download at most this often while students move between pages.
  var TTL_MS = 5 * 60 * 1000;

  var KEY = {
    remote: "smartechExercisesRemote",      // parsed copy of the GitHub file
    fetchedAt: "smartechExercisesFetchedAt", // when it was last downloaded
    custom: "smartechExercisesCustom",       // exercises added on this computer
    url: "smartechExercisesUrl",             // optional source override
    tests: "smartechTestsRemote",            // parsed TEST definitions from the GitHub file
    active: "smartechActiveTest"             // criteria of the test being taken (see tests.js)
  };

  var mem = { remote: null, tests: null };  // in-memory copy (used if localStorage is full)
  var inflight = null;         // one download at a time

  /* ---------- small storage helpers ---------- */
  function readArray(key) {
    try {
      var v = JSON.parse(localStorage.getItem(key));
      return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
  }
  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  }

  /* ---------- source URL ---------- */
  function getSourceUrl() {
    try { return localStorage.getItem(KEY.url) || DEFAULT_URL; }
    catch (e) { return DEFAULT_URL; }
  }
  function setSourceUrl(url) {
    try {
      if (!url || url === DEFAULT_URL) localStorage.removeItem(KEY.url);
      else localStorage.setItem(KEY.url, url);
    } catch (e) { /* ignore */ }
  }

  /* ---------- parsing ---------- */
  // Guess the language from the script of the exercise text itself.
  function detectLang(text) {
    var t = String(text || "");
    var gur = (t.match(/[\u0A00-\u0A7F]/g) || []).length;
    var dev = (t.match(/[\u0900-\u097F]/g) || []).length;
    if (gur > dev && gur > 0) return "Punjabi";
    if (dev > 0) return "Hindi";
    return "English";
  }

  function parseHeader(header) {
    // "@CHSL" tokens mark the exercise as belonging to that test type
    var tags = [];
    header = header.replace(/@([A-Za-z0-9_\-]+)/g, function (_, t) { tags.push(t); return " "; });
    var isDemo = /\bdemo\b/i.test(header);
    var lm = header.match(/\b(english|punjabi|hindi)\b/i);
    // A Demo / test-tagged header may leave the language out (detected from the text later)
    if (!lm && !isDemo && !tags.length) return null;
    var lang = lm ? lm[1].charAt(0).toUpperCase() + lm[1].slice(1).toLowerCase() : "";

    var hasChunk = /\bchunk\b/i.test(header);
    var hasPara = /\b(paragraph|long)\b/i.test(header);
    var mode = isDemo ? "demo"
             : tags.length ? "test"
             : hasChunk && !hasPara ? "chunk"
             : hasPara && !hasChunk ? "paragraph"
             : "both";

    var cleaned = header
      .replace(/\b(chunk|paragraph|long)\b/ig, " ")
      .replace(/[\[(]\s*[\])]/g, " ")
      .replace(/\s+/g, " ")
      .replace(/^[\s|:\-\u2013]+|[\s|:\-\u2013]+$/g, "");

    var title;
    if (isDemo) {
      // "Demo English" -> "Demo";  "Demo English Banking" -> "Demo Banking"
      var extra = cleaned
        .replace(/\b(demo|english|punjabi|hindi)\b/ig, " ")
        .replace(/\s+/g, " ")
        .replace(/^[\s|:\-\u2013]+|[\s|:\-\u2013]+$/g, "");
      title = extra ? "Demo " + extra : "Demo";
    } else {
      title = cleaned || lang;
    }
    return { lang: lang, mode: mode, title: title, tests: isDemo ? [] : tags };
  }

  /* ---------- TEST definitions ("### TEST ID" blocks) ---------- */
  function truthy(v) { return !/^(no|off|false|0|hide|hidden|disabled)$/i.test(String(v || "").trim()); }
  function numberOf(v) {
    var n = parseFloat(String(v || "").replace(/[^0-9.]/g, ""));
    return isFinite(n) && n > 0 ? n : 0;
  }

  // Turns the "key: value" lines under a "### TEST ID" header into one clean test object.
  function parseTestBlock(id, body) {
    var f = {};
    String(body || "").split("\n").forEach(function (line) {
      var m = /^[ \t]*([A-Za-z][A-Za-z \-_]*?)[ \t]*[:=][ \t]*(.*?)[ \t]*$/.exec(line);
      if (m && !/^(#|\/\/)/.test(line.trim())) f[m[1].toLowerCase().replace(/[ _]+/g, "-")] = m[2];
    });
    function pick() {
      for (var i = 0; i < arguments.length; i++) if (f[arguments[i]] !== undefined && f[arguments[i]] !== "") return f[arguments[i]];
      return "";
    }
    // "language: English, Punjabi" = a test that has exercises in both languages.
    var langs = [];
    String(pick("language", "languages", "lang")).replace(/english|punjabi|hindi/ig, function (w) {
      var L = w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      if (langs.indexOf(L) === -1) langs.push(L);
      return w;
    });
    // Optional own rule per language, e.g.  punjabi-wpm: 30  punjabi-accuracy: 90  punjabi-minutes: 15
    var rules = {};
    langs.forEach(function (L) {
      var k = L.toLowerCase(), o = {};
      var w = numberOf(pick(k + "-wpm", k + "-speed")); if (w) o.wpm = w;
      var c = numberOf(pick(k + "-chars", k + "-characters")); if (c) o.chars = c;
      var wd = numberOf(pick(k + "-words", k + "-min-words")); if (wd) o.words = wd;
      var a = numberOf(pick(k + "-accuracy", k + "-acc")); if (a) o.accuracy = Math.min(100, a);
      var mi = numberOf(pick(k + "-minutes", k + "-time")); if (mi) o.minutes = Math.min(180, mi);
      if (Object.keys(o).length) rules[L] = o;
    });
    var modeRaw = String(pick("mode", "type", "format")).toLowerCase();
    var minutes = numberOf(pick("minutes", "time", "duration")) || 10;
    var accuracy = numberOf(pick("accuracy", "acc", "min-accuracy"));
    var codeRaw = String(pick("code", "access", "licence", "license")).toUpperCase().replace(/[^A-Z0-9_\-]/g, "");

    // Scoring engine. "chars" (default) counts characters, 5 characters = 1 word.
    // "words" (PHHC) counts the words really typed: net words = typed words - mistakes,
    // result speed = net words / minutes. A test whose ID starts with PHHC uses it unless
    // "engine: chars" says otherwise.
    var engineRaw = String(pick("engine", "scoring", "calculation")).toLowerCase();
    var isWords = engineRaw ? /word|phhc/.test(engineRaw) : /^phhc/i.test(id);
    var wpm = numberOf(pick("wpm", "speed", "min-speed", "min-wpm"));
    var words = numberOf(pick("words", "min-words", "required-words"));
    if (isWords && !words && !wpm) words = 300;           // PHHC: 300 words in 10 minutes
    var basisRaw = String(pick("basis", "speed-basis"));
    var basis = /gross|typed/i.test(basisRaw) ? "gross" : /net/i.test(basisRaw) ? "net" : (isWords ? "net" : "gross");
    var yes = function (v) { return /^(yes|on|true|1|count|counted)$/i.test(String(v || "").trim()); };
    return {
      id: id,
      name: pick("name", "title") || id,
      lang: langs.length === 1 ? langs[0] : "",   // "" when the test covers several languages
      langs: langs,
      rules: rules,
      mode: /chunk/.test(modeRaw) ? "chunk" : "paragraph",
      minutes: Math.min(180, minutes),
      engine: isWords ? "words" : "chars",
      wpm: wpm,
      chars: numberOf(pick("chars", "characters", "min-chars")),
      words: words,
      // The word engine has no accuracy rule unless one is written (pass = the words target only).
      accuracy: accuracy ? Math.min(100, accuracy) : (isWords ? 0 : 90),
      basis: basis,
      // word engine only: count each extra spacebar press as a mistake / compare capital letters
      spaceMistakes: yes(pick("space-mistakes", "space-errors", "extra-space")),
      caseSensitive: yes(pick("case-sensitive", "match-case", "case")),
      // Access code TYPE (the "Type" column in the TestAccess sheet). FREE = no code needed.
      code: codeRaw || String(id).toUpperCase().replace(/[^A-Z0-9_\-]/g, ""),
      desc: pick("description", "desc"),
      note: pick("note", "pass-note"),
      active: truthy(pick("active", "enabled", "show") || "yes")
    };
  }

  function parseAll(raw) {
    var text = String(raw || "").replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
    var heads = [];
    var re = /^###[ \t]*(.*)$/gm;
    var m;
    while ((m = re.exec(text))) {
      heads.push({ header: m[1].trim(), start: m.index, bodyStart: re.lastIndex });
    }

    var out = [];
    var tests = [];
    heads.forEach(function (h, i) {
      var end = i + 1 < heads.length ? heads[i + 1].start : text.length;

      // "### TEST CHSL-ENG" followed by key: value lines = a test type definition
      var tm = /^test\b[ \t]*[:\-]?[ \t]*([A-Za-z0-9_\-]+)[ \t]*$/i.exec(h.header);
      if (tm) { tests.push(parseTestBlock(tm[1], text.slice(h.bodyStart, end))); return; }

      var info = parseHeader(h.header);
      if (!info) return;                       // unknown language -> skip
      var segs = text.slice(h.bodyStart, end)
        .split(/^[ \t]*---+[ \t]*$/m)
        .map(function (s) { return s.trim(); })
        .filter(Boolean);
      if (!segs.length) return;

      out.push({ lang: info.lang || detectLang(segs[0]), mode: info.mode, title: info.title, text: segs[0], tests: info.tests });
      // Older files could pack extra "title --- text" pairs into one block.
      for (var j = 1; j + 1 < segs.length; j += 2) {
        out.push({ lang: info.lang || detectLang(segs[j + 1]), mode: info.mode, title: segs[j], text: segs[j + 1], tests: info.tests });
      }
    });
    return { items: out, tests: tests };
  }

  // Exercises only (kept for callers that don't care about tests)
  function parse(raw) { return parseAll(raw).items; }

  /* ---------- reading the lists ---------- */
  function remoteItems() { return mem.remote || readArray(KEY.remote); }

  function remoteTests() { return mem.tests || readArray(KEY.tests); }

  // Every active test type defined in the GitHub file, in file order
  function tests() {
    return remoteTests().filter(function (t) { return t && t.id && t.active !== false; });
  }
  // Every exercise (all lists + test exercises) in file order - used by Manage & Print
  function all() {
    return remoteItems().concat(readArray(KEY.custom)).filter(function (ex) { return ex && ex.text; });
  }
  function testById(id) {
    var want = String(id || "").toLowerCase();
    return tests().filter(function (t) { return String(t.id).toLowerCase() === want; })[0] || null;
  }
  // Exercises marked "@ID" for one test, in file order
  function testExercises(id) {
    var want = String(id || "").toLowerCase();
    return remoteItems().concat(readArray(KEY.custom)).filter(function (ex) {
      return ex && ex.text && ex.mode === "test" && (ex.tests || []).some(function (t) {
        return String(t).toLowerCase() === want;
      });
    });
  }

  function list(lang, mode) {
    return remoteItems().concat(readArray(KEY.custom)).filter(function (ex) {
      return ex && ex.lang === lang && ex.text &&
             (ex.mode === "both" || ex.mode === mode);
    });
  }

  /* ---------- downloading ---------- */
  // Older builds saved a copy in exercisesEnglish / exercisesPunjabi.
  // Use it once so the first launch after updating works offline too.
  function seedFromLegacy() {
    try {
      if (localStorage.getItem(KEY.remote) !== null) return;
      var seeded = [];
      [["English", "exercisesEnglish"], ["Punjabi", "exercisesPunjabi"]].forEach(function (p) {
        readArray(p[1]).forEach(function (ex) {
          if (ex && ex.text) {
            seeded.push({ lang: p[0], mode: "both", title: ex.title || p[0], text: String(ex.text) });
          }
        });
      });
      if (seeded.length) { mem.remote = seeded; writeJSON(KEY.remote, seeded); }
    } catch (e) { /* ignore */ }
  }

  // Resolves true when fresh exercises were downloaded, false otherwise
  // (already fresh, offline, bad file). Never rejects.
  function refresh(opts) {
    opts = opts || {};
    var url = opts.url || getSourceUrl();
    var fetchedAt = 0;
    try { fetchedAt = Number(localStorage.getItem(KEY.fetchedAt)) || 0; } catch (e) {}
    var fresh = remoteItems().length > 0 && Date.now() - fetchedAt < TTL_MS;

    if (!opts.force && fresh) return Promise.resolve(false);
    if (inflight) return inflight;

    // A forced refresh skips GitHub's own 5-minute cache by adding a throw-away query value.
    var fetchUrl = opts.force ? url + (url.indexOf("?") < 0 ? "?" : "&") + "_=" + Date.now() : url;
    inflight = fetch(fetchUrl, { cache: "no-cache" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      })
      .then(function (text) {
        var parsed = parseAll(text);
        var items = parsed.items;
        if (!items.length && !parsed.tests.length) throw new Error("no exercises found in file");
        mem.remote = items;
        mem.tests = parsed.tests;
        writeJSON(KEY.remote, items);
        writeJSON(KEY.tests, parsed.tests);
        try { localStorage.setItem(KEY.fetchedAt, String(Date.now())); } catch (e) {}
        if (opts.url) setSourceUrl(opts.url);
        return true;
      })
      .catch(function (err) {
        console.warn("[exercises] could not refresh from " + url + ":", err && err.message);
        return false;
      })
      .then(function (ok) { inflight = null; return ok; });

    return inflight;
  }

  /* ---------- exercises added on this computer (admin panel) ---------- */
  var custom = {
    list: function () { return readArray(KEY.custom); },
    add: function (ex) {
      var all = readArray(KEY.custom);
      all.push({
        lang: ex.lang,
        mode: ex.mode === "chunk" || ex.mode === "paragraph" || ex.mode === "demo" ? ex.mode : "both",
        title: ex.title || ex.lang,
        text: ex.text
      });
      return writeJSON(KEY.custom, all);
    },
    remove: function (index) {
      var all = readArray(KEY.custom);
      all.splice(index, 1);
      return writeJSON(KEY.custom, all);
    },
    clear: function () {
      try { localStorage.removeItem(KEY.custom); } catch (e) {}
    },
    // Add every exercise found in a text file (same ### format as exercises.txt)
    importText: function (text) {
      var items = parse(text);
      var all = readArray(KEY.custom).concat(items);
      writeJSON(KEY.custom, all);
      return items.length;
    }
  };

  /* ---------- render a list of exercise buttons into the page ---------- */
  // opts: container (id or element), lang, mode ("chunk"|"paragraph"),
  //       target (page to open), emptyText, hideWhenEmpty (id or element)
  function mount(opts) {
    var el = typeof opts.container === "string"
      ? document.getElementById(opts.container) : opts.container;
    if (!el) return;
    var hideEl = opts.hideWhenEmpty
      ? (typeof opts.hideWhenEmpty === "string"
          ? document.getElementById(opts.hideWhenEmpty) : opts.hideWhenEmpty)
      : null;
    var loading = true;

    function render() {
      var items = list(opts.lang, opts.mode);
      el.innerHTML = "";

      if (!items.length) {
        var p = document.createElement("p");
        p.textContent = loading
          ? "Loading exercises\u2026"
          : (opts.emptyText ||
             (global.navigator && global.navigator.onLine === false
               ? "You are offline. Connect to the internet once so the exercises can download."
               : "No exercises available yet."));
        el.appendChild(p);
        if (hideEl) hideEl.style.display = loading ? "" : "none";
        return;
      }
      if (hideEl) hideEl.style.display = "";

      items.forEach(function (ex, i) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "exercise-btn";
        b.textContent = (i + 1) + ". " + ex.title;
        b.addEventListener("click", function () {
          localStorage.removeItem(KEY.active);   // a normal practice test: no test-type rules
          localStorage.setItem("selectedExerciseText", ex.text);
          localStorage.setItem("selectedExerciseLanguage", opts.lang);
          localStorage.setItem("selectedExerciseNo", String(i + 1));
          localStorage.setItem("selectedExerciseTitle", ex.title || "");
          localStorage.setItem("selectedExerciseMode", opts.mode || "");
          window.location.href = opts.target;
        });
        el.appendChild(b);
      });
    }

    render();                                   // show the cached list instantly
    refresh().then(function () { loading = false; render(); });
  }

  /* ---------- Demo exercises (5-minute demo test) ---------- */
  var DEMO_LANGS = ["English", "Punjabi", "Hindi"];

  // All demo exercises for one language (or every language when lang is omitted)
  function demos(lang) {
    return remoteItems().concat(readArray(KEY.custom)).filter(function (ex) {
      return ex && ex.text && ex.mode === "demo" && (!lang || ex.lang === lang);
    });
  }

  // Render the demo buttons of ONE language into a container (opens paragraph.html,
  // which runs the 5-minute timer when selectedExerciseMode is "demo").
  // opts: container (id or element), lang, target (default paragraph.html)
  function mountDemo(opts) {
    var el = typeof opts.container === "string"
      ? document.getElementById(opts.container) : opts.container;
    if (!el) return;
    var loading = true;

    function render() {
      var items = demos(opts.lang);
      el.innerHTML = "";
      if (!items.length) {
        var p = document.createElement("p");
        p.className = "demo-empty";
        p.textContent = loading
          ? "Loading demo\u2026"
          : (global.navigator && global.navigator.onLine === false
              ? "You are offline. Connect to the internet once so the demo can download."
              : "No demo available yet.");
        el.appendChild(p);
        return;
      }
      items.forEach(function (ex, i) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "exercise-btn demo-btn";
        b.textContent = items.length > 1 && ex.title === "Demo" ? "Demo " + (i + 1) : ex.title;
        b.addEventListener("click", function () {
          localStorage.removeItem(KEY.active);
          localStorage.setItem("selectedExerciseText", ex.text);
          localStorage.setItem("selectedExerciseLanguage", opts.lang);
          localStorage.removeItem("selectedExerciseNo");
          localStorage.setItem("selectedExerciseTitle", ex.title || "Demo");
          localStorage.setItem("selectedExerciseMode", "demo");
          window.location.href = opts.target || "paragraph.html";
        });
        el.appendChild(b);
      });
    }

    render();
    refresh().then(function () { loading = false; render(); });
  }

  seedFromLegacy();

  global.SmartechExercises = {
    demos: demos,
    mountDemo: mountDemo,
    DEMO_LANGS: DEMO_LANGS,
    DEFAULT_URL: DEFAULT_URL,
    parse: parse,
    parseAll: parseAll,
    tests: tests,
    testById: testById,
    all: all,
    testExercises: testExercises,
    list: list,
    refresh: refresh,
    mount: mount,
    custom: custom,
    getSourceUrl: getSourceUrl,
    remoteCount: function () { return remoteItems().length; }
  };
})(window);
