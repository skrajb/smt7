# Smartech Typing Tutor - Changes in this update

## Dashboard redesigned (index.html)
- New header (greets the student by name, Test Centre / Demo / English / Punjabi / Hindi / Manage buttons, rotating quote).
- **Exams strip:** every exam type is shown exactly once and the row moves left to right in a real `<marquee>` (no scroll bar, no repeated cards). Hover or keyboard focus pauses it so a card can be clicked.
- The five course cards (5-Minute Demo, Test Centre, English, Punjabi, Hindi) at the bottom were removed; the same links are buttons in the header.
- Progress and Today's Top 10 now sit side by side; the formula is a slim strip. The hidden Manage panel (type "manage") is unchanged.

## Print Exercise: before the test and more reliable
- **Print before starting:** every exercise on the exercise-selection page (`testexercises.html`) now has a small **Print** link that opens the same A4 sheet as Manage & Print (Back returns to the list). Hidden for a language that is not activated.
- **No print button on the test pages.** The Print Exercise button (and the older Print Paper button for Test Centre tests) was removed from the Chunk and Long Paragraph test pages; printing is done from the exercise-selection page (before the test) or Manage & Print.

## Free test unlocks per language activation
- A test with `code: FREE` (or `LANGUAGE`) needs no test code, but each language follows the student's normal activation: **English activated (ENG) -> English exercises open; Punjabi activated (PBI) -> Punjabi exercises open; Hindi (HIN) likewise.** A language that is not activated shows a lock notice with a link to Activation and its exercise buttons are disabled (side by side with the unlocked language). `start()` also refuses a locked language.
- `code: OPEN` = open to everyone with no activation at all (the old meaning of FREE).
- Test Centre cards show e.g. "Free - English activated" or "Activate English / Punjabi"; Manage & Print shows "Free - per-language activation".
- Files: `tests.js`, `testexercises.html`, `tests.html`, `manage.html`.

## Languages side by side + "Print Exercise" during a test
- **Exercise selection (`testexercises.html`)**: for a test with more than one language (e.g. English + Punjabi) each language is now its own column, side by side (stacks on narrow screens). Numbering still restarts at 1 in each language.
- **Print Exercise button inside the test** (Long Paragraph and Chunk pages, Test Centre tests only): prints the same A4 sheet as Manage & Print (header, test details, Name / Ref / Date, auto-fitted passage). It is prepared in a hidden frame (`testprint.js`), so the student stays on the test and typing is not interrupted. The older "Print Paper" layout is no longer used for Test Centre tests.
- **Manage & Print (`manage.html`, `printexercise.html`)**: in multi-language tests the exercise numbers now match the selection page (per language) and each sheet shows the time / pass rule of its own language. New link options `lang=` and `embed=1`.
- Files: `testexercises.html`, `testprint.js` (new), `paragraph.html`, `testpage.html`, `printexercise.html`, `manage.html`.

## Printed exercise sheets show total words and characters
- Every printed A4 sheet (Manage & Print: all / one test / one exercise) now shows **Total words** and **Total characters (with spaces)** of that exercise in the details line above the Name / Ref No / Date fields. Counted the way a student types it: line breaks and repeated spaces count as one space, the ends are trimmed. Works for English, Punjabi and Hindi, for test exercises and practice exercises. File: `print.js`.

## PHHC test type: result calculated on typed WORDS (new word engine)
- **New engine `wordengine.js`.** A test with `engine: words` (automatic for a test ID starting with `PHHC`) is no longer calculated on characters (5 keystrokes = 1 word). It counts the words really typed: **Net words = typed words - mistakes, Result speed = net words / minutes** (PHHC: `(typed words - mistakes) / 10`), and the **pass is 300 net words in 10 minutes** (30 WPM).
- **Mistakes** = wrong words + extra words + skipped words between typed words + merged / split words ("goodmorning", "to day", one mistake each). Words after the last typed word are never counted as skipped. Extra spacebar presses are shown with the blue mark but are not mistakes unless the test says `space-mistakes: yes`.
- **Definition in the GitHub file** (see `test_types_format.txt`, section 4): `engine`, `words` (or `wpm`), `basis` (`net` default / `gross`), `space-mistakes`, `case-sensitive`, optional `accuracy`, optional `<language>-words`. No accuracy rule is applied unless one is written.
- **Both test pages** (Long Paragraph and Chunk) use the engine; the Results table then shows Total Typed Words, Wrong / Extra / Skipped / Space errors, Total Mistakes, Net Words, Result Speed, Required to Pass and Result instead of the character rows. The result speed is what goes to My Progress, the certificate and the results sheet; the test history shows "N words".
- **Test Centre cards, exercise page, Manage & Print** show the rule as "min 300 net words (30 WPM)". All other tests keep the character engine exactly as before (checked side by side with the previous build on both pages).
- Files: `wordengine.js` (new), `tests.js`, `exercises.js`, `script.js`, `script2.js`, `paragraph.html`, `testpage.html`, `guide.html`, `test_types_format.txt`, `SETUP_Test_Types_and_Access.md`.

## Test types with more than one language (e.g. English + Punjabi)
- `language: English, Punjabi` in a `### TEST` block makes one exam type that covers both languages. The Test Centre card shows a badge per language, and the exercise page lists each language as its own block (numbering restarts at 1 in each).
- Optional own rule per language: `punjabi-wpm`, `punjabi-chars`, `punjabi-accuracy`, `punjabi-minutes` (anything not given uses the main value). The rule of the exercise's language is what decides Pass / Fail.
- Manage & Print lists the languages and exercise count per language. See `test_types_format.txt` and `SETUP_Test_Types_and_Access.md`.
- Files: `exercises.js`, `tests.js`, `tests.html`, `testexercises.html`, `manage.html`, `guide.html`.

## Fix: negative accuracy on repeat attempts
- A wrong or unfinished last word could pair with the passage's final word, turning every word in between into "skipped". The comparison now stops at the part of the passage actually reached, and accuracy never shows below 0%. Files: `script2.js`, `script.js`.

## One Speed Test with a language switch
- **A single "Speed Test" link in the sidebar** (right after Demo Test) replaces the three separate English / Punjabi / Hindi Speed Test links. The three pages `english_tutor.html`, `punjabi_tutor.html` and `hindi_tutor.html` are gone; everything is in the new `speedtest.html`.
- **Language switch inside the page.** The toolbar has a Language control (English | Punjabi | Hindi) next to the Timer control. Changing the language starts a fresh test in that language, with the right font, badge and word list. The last language used is remembered on that computer; `speedtest.html?lang=hindi` (or `punjabi` / `english`) opens a specific language.
- **Word lists moved to `speedtest-words.js`** (English 474, Punjabi 139, Hindi 176 words, copied unchanged from the old pages). Edit that file to change the words.
- **Key handling is unchanged per language:** English still ignores Alt / Ctrl / AltGr combinations; Punjabi and Hindi still let AltGr through so every letter can be typed.
- Scoring, timer, colours, letter highlighting and the result card are exactly as before. `sidebar.js` (menu and page heading) and the User Guide text were updated to match.

## Sidebar speed tests, English tutor page
- Each language's **Speed Test** now has its own sidebar link under that language's course (English / Punjabi / Hindi).
- The "Long Paragraph Practice Exercises" card was removed from the English Typing Course page, and the Speed Test cards were removed from the English, Punjabi and Hindi course pages (the speed tests are opened from the sidebar). The long-exercise cards were removed from the Punjabi and Hindi course pages too, so no course page links to the long-paragraph lists any more.

## Speed and accuracy on typed text only
- Words after the last word typed in a chunk are never "skipped" and never reduce accuracy, in EVERY chunk (before, only the chunk open at Submit was handled, so going back with the arrow keys brought the untyped words back as skipped). Gross characters, error characters, accuracy and the Skipped count all use the typed text only. Words missed between typed words are still skipped.

## Content protection (all pages)
- New `protect.js` on every page, plus matching blocks in `main.js`: no right-click menu, no copy / cut / paste, no text selection (mouse, double / triple click, Ctrl+A, Shift+arrows), no drag & drop, no view-source / save / DevTools shortcuts. Ctrl+P works only on the print page.
- Single-line boxes (name, ref no., activation code) still accept typing and paste so codes can be pasted; the typing area never accepts pasted text.
- The result comparison shows only the Original and Typed boxes (the "Skipped / Extra" side column was removed; the Wrong / Extra / Skipped counts remain in the result table).

## Results: untyped words, separate Skipped / Extra, Auto Scroll
- **Untyped words are no longer "skipped".** For the exercise the student was still on at Submit / time-over, everything after the last word they typed is ignored. This stays correct when the student typed extra words (before, those extra words pushed untyped words into the Skipped list). Words missed in the middle are still counted as skipped.
- **Separate Wrong / Extra / Skipped.** The result table now has three rows (Wrong Words, Extra Words, Skipped Words) and each comparison table has a third column, "Skipped / Extra", listing the actual words. Error characters and accuracy are calculated exactly as before.
- **Auto Scroll** (`autoscroll.js`, long-paragraph and chunk pages): a switch next to Disable Backspace / Paper-Based Test. While ON, the Reference Text scrolls by itself so the word being typed stays in view. ON by default, remembered per computer, only moves the reference box.

## Test Centre: multiple test types, pass criteria and per-test access codes
- **New Test Centre page (`tests.html`)** in the sidebar. Every test type defined in the GitHub exercise file appears as a card with its time, pass rule and lock status.
- **Test types live in the GitHub file** as `### TEST ID` blocks (`name`, `minutes`, `wpm` or `chars`, `accuracy`, `basis`, `mode`, `code`, ...). Exercises are marked for a test with `@ID` in their header and then appear only in that test. See `test_types_format.txt` and `SETUP_Test_Types_and_Access.md`.
- **Own pass rule per test.** The chosen test fixes the time and decides Pass / Fail (speed target AND accuracy), on both the Chunk and Long Paragraph pages. Normal practice tests keep the old rules.
- **Own access code per test.** `code:` names a code TYPE; codes are rows on a new `TestAccess` tab (Type, Code, Status, Device, Expiry, Days, Note). New backend `GoogleAppsScript_Activation_Backend.gs` v2 also adds BLOCKED status, per-code validity, and a Smartech menu to generate codes. ENG / PBI / HIN are unchanged.
- Results (history, certificate, results sheet) now record the test type. `GoogleAppsScript_Code.gs` adds ExerciseNo / TestId / TestName columns and a per-test leaderboard filter.
- **Intro cards + exercise page**: Test Centre cards introduce each test; clicking opens `testexercises.html` (code entry + exercise list).
- **Manage & Print** (`manage.html`, `printexercise.html`, `print.js`): print all / per-test / per-exercise A4 sheets with the Smartech Education header, each exercise auto-fitted to one page.
- Files: `manage.html`, `printexercise.html`, `print.js`, `testexercises.html`, `tests.html`, `tests.js` (new); `exercises.js`, `activation.js`, `script.js`, `script2.js`, `paragraph.html`, `testpage.html`, `testpage-ui.js`, `sidebar.js`, `sheet-sync.js`, `db.js`, both `.gs` files.

## Test page fits the screen (Typing Practice and Long Paragraph, all languages)
- **The whole test area is now one window tall.** On `testpage.html` (Chunk) and `paragraph.html` (Long Paragraph / Demo) the page no longer scrolls during a test: the top bar (language, timer, Characters / Words / Backspaces), the Reference box, the Typing box, the Backspace switch and the Restart / New Exercise / **Submit Test** buttons are all visible at once. Before, Submit and the lower half of the Typing box were 150-300 px below the fold on a 1366x768 laptop.
- **The two text boxes share the free height.** Reference and Typing each take half of what is left, so they grow on big screens and shrink on small ones (never below two lines of text). A long passage scrolls inside the Reference box as before. Works from the 1000x650 minimum window up to full HD, in English, Punjabi and Hindi, with the sidebar open or closed.
- **Less height used by the furniture.** The page heading is slimmer (its description line is hidden on screens under 800 px tall); "Current Chunk" now sits on the Reference Text label row; the key hint (Enter / arrows) and the "timer starts when you type the first character" note sit on the Typing Text label row; the top bar is a single row. Nothing moves when you start typing (the note is hidden, not removed).
- **Results still scroll normally.** When the results appear the page switches back to normal scrolling, and the empty yellow card that used to stay under the results is hidden. Restart / New Exercise from the results bring the fitted test view back.
- **Safety net.** If a window is very small or zoomed in (Ctrl +), the test card scrolls inside itself so Submit can always be reached.
- **Markup fix:** `testpage.html` had one extra `</div>` after the results section, which closed the page wrapper early and left the test card outside it. Removed; both test pages now have the same structure.
- Files: `testpage.css` (new "v3: fit-to-screen" section at the end; `--tt-min` sets the smallest text-box height), `testpage-ui.js` (label rows and the `tt-results` view switch), `testpage.html`. Scoring, timing and highlighting are unchanged.

## Two new lighter themes
- **Mint Fresh** (soft green-teal) and **Lavender Mist** (soft violet) are added to the theme picker in the sidebar, after Pearl Ivory (5 themes in total).
- Unlike Pearl Ivory, which only lightens the sidebar, these also lighten the **Dashboard hero** (pale gradient with dark text) and soften the sidebar shadow, so the whole app reads light. The logo sits on a theme-coloured tile so the white graphic stays visible.
- Buttons, table headers and the menu button keep a deeper colour on purpose: white text on them stays easy to read (contrast checked: 5.9 to 8.2 on ink, 4.5 or better on the gold button).
- Typing boxes and error highlighting are untouched, as in every theme.
- Files: `themes.css` (sections 7 and 8, plus "Light theme extras"), `themes.js` and the fallback list in `sidebar.js`. The colours are CSS variables at the top of each block, so they are easy to tune.

## 5-minute Demo test (English, Punjabi, Hindi) and smaller result text
- **New Demo page (`demo.html`)** with one card per language. It is the first entry in the sidebar ("Demo Test (5 min)", above English Typing Course), the first card and first button on the Dashboard, and has its own page heading. Demo needs no activation, like the Long Paragraph pages.
- **Demo exercises come from the same GitHub exercise file.** Write them as a `###` header that contains the word **Demo**, then the text between two `---` lines:
  ```
  ### Demo English
  ---
  Text of the English demo...
  ---
  ### Demo Punjabi        ### Demo Hindi
  ```
  The language word is optional (`### Demo` alone works: the language is detected from the text). Extra words become the button label (`### Demo English Banking` -> "Demo Banking"). Demo blocks appear only on the Demo page, never in the Chunk or Long Paragraph lists. Sample: `demo_exercises_format.txt`.
- **Fixed 5-minute test.** A demo opens the Long Paragraph test (`paragraph.html`) with the time locked to 5 minutes (normal Long Paragraph tests keep 10 / 15). Timer colours, auto results at time-over, Backspace switch and letter highlighting are the same as everywhere else. "New Exercise" returns to the Demo page.
- **Results.** Shown as "Demo (5 min)" with no Pass / Fail. A demo is kept in the 3-day history (My Progress, Test History) labelled **Demo**, but it never issues a certificate and is never sent to the Google Sheet leaderboard (`isDemo` flag in `db.js`).
- **Smaller Original / Typed text in test results** (Chunk and Long Paragraph). The two result columns were using the large typing-box size. They now use their own size: English 0.95rem, Punjabi 1.05rem, Hindi 1.08rem, with tighter lines and padding. Change `--tt-res-size` / `--tt-res-lh` at the top of `testpage.css` to adjust. The Reference / Typing boxes during the test are unchanged.

## Windows installer build fixed (electron-builder 26)
- `npm run build` failed immediately with "configuration.win should be one of these: null". Cause: `build.win.publisherName` was removed in electron-builder 26 (it now lives under `win.signtoolOptions`), so the whole `win` block was rejected. The line is removed from `package.json`; the app is unsigned, so nothing else changes. `npm run build` now packages both x64 and ia32 and creates `dist/Smartech-Typing-Tutor-Setup-4.0.0.exe` (Windows 10 and above).
- If Windows shows "Cannot create symbolic link" during the build, open the terminal as Administrator (or turn on Developer Mode) once and run `npm run build` again.

## Letter-by-letter highlight on the Speed Test pages
- English, Punjabi and Hindi Speed Tests now highlight the word being typed letter by letter: typed-correct letters turn green, a wrong letter is red and underlined, and the next letter to press is gold. Vowel signs and conjuncts stay joined with their base letter. Turned on/off with the Highlight words switch. Scoring is unchanged.

## User Guide screenshots refreshed
- All guide screenshots (`guide_img/`) were retaken from the current app with sample data, including the new Speed Test page (`05-practice.jpg`, now shown in step 6). My Progress shows stats, today's leaderboard and history together.

## Premium Speed Test pages (English, Punjabi, Hindi)
- **New shared look** for `english_tutor.html`, `punjabi_tutor.html`, `hindi_tutor.html` (`speedtest.css`, `speedtest-ui.js`): language badge toolbar, segmented Language / Timer controls, toggle switches, pill Restart button, one card with a timer pill, six live tiles (WPM, Accuracy, Words right/wrong, Chars right/wrong), a time-left bar and a status line. Follows the selected theme (Ink & Gold, Silver Steel, Pearl Ivory).
- **Timer colours:** neutral before start, calm while running, amber when low, red with a gentle pulse in the last seconds, grey when finished.
- **Reference text:** larger, language-specific fonts (Nirmala UI for Punjabi / Hindi), soft green / red chips for typed words, clear dark chip for the current word. Click the text to focus the typing box.
- **Results:** speed ring, six result tiles, accuracy bar and a Try again button. Scoring and timing are unchanged. Live WPM shows after 5 seconds so early numbers are not misleading.
- **Fixed:** the current-word highlight on the Hindi page was invisible (`styles.css` hides `.letter`). Hindi letters now stay joined with their vowel signs.
- **Fixed:** the Punjabi page listed an English option that crashed (no English word list on that page); the option was removed.

## Speed test: auto results, Hindi/Punjabi fix, button polish
- **Results open automatically when time is over** (a 1.5 s "Time is up!" notice, with a *View results now* button to skip the wait). Typing is locked at that moment.
- **Hindi / Punjabi display fixed.** The previous redesign put Mangal / Raavi first; they are thin and jagged on screen. Nirmala UI is now first (Mangal / Raavi only as Windows 7 fallbacks), with a slightly larger size, taller lines and taller boxes. The language setting now also reaches the results, error tables and history, which were outside the test card before.
- **Buttons:** 10 / 15 min segmented control (replaces the drop-down), proper Backspace on/off switch, pill action buttons, key hint for chunk mode (Enter / Up / Down).
- **Error highlight:** results now have a colour legend and softer chips (wrong, correct word, skipped), with no bold on Indic text. History table and its Clear button restyled.

## Premium speed-test page (Chunk and Long Paragraph)
- **New look** for `testpage.html` and `paragraph.html` (`testpage.css`, `testpage-ui.js`): top bar with language badge, timer, live Characters / Words / Backspaces counters and a time-left progress bar; cleaner Reference / Typing boxes; one action row with a Backspace switch, Restart, New Exercise and Submit; restyled results table and time-over pop-up. Follows the selected theme.
- **Timer colour fixed.** It is no longer always red. Neutral before you start, calm while running, **amber in the last 2 minutes, red (gentle pulse) in the last minute**, grey when time is over.
- **All three languages.** English, Punjabi and Hindi get their own font stack, size and line height (taller lines for Gurmukhi / Devanagari), the right `lang` attribute and a Punjabi / Hindi placeholder.
- Test time (Long Paragraph) is locked while a test is running. Scoring, timing and results are unchanged.

## Test history limited to the last 3 days
- **History is kept for 3 days only.** Test results older than 3 days (72 hours) are removed automatically, both from My Progress / the dashboard snapshot (`smartech_results`) and from the history table under each typing test (`typingTestStats`). Pruning runs when any page loads, when history is shown and when a new result is saved. The window is one constant: `RETENTION_DAYS` in `db.js`.
- My Progress totals, best speed, average accuracy and the CSV export now reflect the last 3 days only.
- **Certificates are not removed** - earned certificates stay in My Progress. Results already sent to the Google Sheet are not touched.
- Notes on My Progress, the test pages and the User Guide now say history covers the last 3 days.

## Sale-ready release
- **Consistent page headings.** Every inner page now gets the same heading (section label, title, one-line purpose, and Back / Dashboard buttons), built once in `sidebar.js` (`SMARTECH_PAGES`). Hand-made headers, `&nbsp;` spacing hacks, duplicate `<h1>`s and the unused `header.html` were removed. Window titles now read "<Page> | Smartech Typing Tutor".
- **New in-app User Guide** (`guide.html`, linked in the sidebar) with 11 illustrated steps: install, first launch, activation, dashboard, lessons, practice, long paragraphs, progress, themes, shortcuts, troubleshooting. Screenshots live in `guide_img/`; click one to enlarge; the page prints cleanly.
- **Licence agreement** (`license.txt`) shown in the installer and inside the app (Disclaimer, Privacy & Licence page). Privacy text updated to match what the app really sends.
- **Google AdSense removed** from every page (a paid app should not load ads or a third-party script).
- **Exercise number everywhere.** The number of the exercise opened (as on its button) now shows in the practice page heading, the results table, the local test history, My Progress, certificates and the CSV export, and is sent to the results sheet as `exerciseNo`.
- **Themes reduced to three:** Ink & Gold, Silver Steel, Pearl Ivory (others removed from the picker; anyone who had a removed theme saved falls back to Ink & Gold).
- **Arial in the Reference and Typing boxes** on all test pages (Punjabi/Hindi fall back to Nirmala UI/Raavi/Mangal, since Arial has no glyphs for those scripts).
- **Tighter, more professional page heading** (one compact row; exercise number is a small badge next to the title). Compact sidebar that fits a 650px window; smaller name badge and name pop-up; test-page content no longer slides under the open sidebar.
- App version now shown at the bottom of the sidebar.
- Installer: publisher name, copyright, Start Menu shortcut, licence page.
- Removed `.bak` backup files; fixed `/icon.ico` favicon path (broke under file://).


## Unreleased — Chunk and Long Paragraph exercises now share one list
- **One source, one list.** `engtutor / pbitutor / hinditutor` (Chunk) and
  `engexercises / pbiexercises / hindiexercises` (Long Paragraph) now build
  their buttons from the same GitHub `exercises.txt`, through the new
  shared module **`exercises.js`**. The Long Paragraph pages no longer have
  exercises typed into the HTML.
- **Special exercises per mode**, written in the same GitHub file. The words
  in the `###` header decide where an exercise appears:
  ```
  ### English               -> Chunk list AND Long Paragraph list (as before)
  ### English Chunk         -> Chunk list only
  ### English Paragraph     -> Long Paragraph list only   ("Long" also works)
  ```
  Same for `Punjabi` and `Hindi`. Extra words become the button label
  (`### English Chunk Special 1` -> "English Special 1"). Order in the file =
  order on screen.
- **Hindi** is now loaded like English and Punjabi. The Hindi chunk section
  (previously commented out) switches on by itself once the file has a
  `### Hindi` or `### Hindi Chunk` exercise, and stays hidden until then.
- **Offline-safe:** the last download is cached on the device, and pages only
  re-download every 5 minutes.
- Dashboard "Manage Exercises" panel (still hidden): can now add an exercise
  to Chunk only / Long only / both, for English, Punjabi or Hindi. Those
  local additions are stored separately and are no longer wiped when the
  GitHub file is re-downloaded.
- `exercises_to_add.txt` (delivered alongside): the old hard-coded Long
  Paragraph exercises (9 English, 10 Punjabi, 20 Hindi) converted to
  `### ... Paragraph Special N` blocks, ready to paste into the GitHub file.

## Latest update (v3.1.0)
- **New: Windows 7 (32-bit) build option.** Your main `electron` (v41) does
  **not** run on Windows 7/8/8.1 at all — Electron dropped that OS starting
  at v23, regardless of 32-bit vs 64-bit. Electron 22.3.27 is the last
  version that still supports Windows 7/8/8.1, so a separate script builds
  against that version instead:
  ```
  npm run build:win7
  ```
  This produces `Smartech-Typing-Tutor-Win7-32bit-Setup-<version>.exe`,
  targeting `ia32` on Electron 22.3.27. It won't receive Electron's newer
  security patches (Electron 22 is no longer maintained), so only use it for
  machines that are stuck on Windows 7/8/8.1 and can't be upgraded — use the
  regular `npm run build` (Electron 41) for everyone else.
- **Activation page: device ID + self-service messaging + loading states**
  - Shows a short, shareable **Device ID** (with a Copy button) so a user/admin
    can reference or compare devices without reading a raw user-agent string.
  - Added a clear note: to move a code to a new computer, click **Deactivate**
    on the *old* device — no need to contact support unless that device is no
    longer accessible.
  - Activate/Deactivate buttons now show a spinner and "Activating…" /
    "Deactivating…" state instead of appearing to do nothing while the
    request is in flight.
- **Windows build now confirmed dual-arch**: `npm run build` (electron-builder
  --win --x64 --ia32) produces a single NSIS installer that auto-detects and
  installs the correct 32-bit or 64-bit version — no separate installer
  needed for older 32-bit Windows machines.
- **Redesigned `activate.html`** to match the shared app design system
  (navy/blue theme, card layout, status pills, hero banner) instead of its
  old standalone Bookman-Old-Style styling.
- **Fixed Punjabi/Hindi conjunct mis-scoring**: typing a subjoined half-form
  like ੍ਰ, ੍ਹ, or ੍ਵ was being counted as one wrong keystroke *and* one
  correct keystroke, because the engine judged the virama the instant it
  arrived instead of waiting for the consonant that completes the conjunct.
  Fixed in both `pbitutor.html` and `hinditutor.html` — these now wait for
  the full two-codepoint unit before scoring it.


## 1. Real data management added
- **`db.js`** — new shared module (`SmartechDB`) that stores every completed
  typing test permanently on the user's device (no 10-result cap like before),
  computes stats (best speed, average accuracy per language), auto-issues a
  certificate record on a Pass, and can export the full history to CSV.
- **`progress.html`** — new "My Progress" page (linked in the sidebar) showing
  total tests taken, best speed/accuracy per language, full test history table,
  earned certificates, a CSV export button, and a clear-history option.
- `testpage.html` now loads `db.js` and every submitted test is recorded there
  in addition to the existing local history table.

## 2. Bugs fixed
- **Punjabi exercises were being tagged as "English"** (`pbiexercises.html`)
  — every Punjabi test result was mislabeled in the leaderboard/history.
- **Leaderboard was broken**: `loadTop10Results()` referenced an undefined
  variable (`GOOGLE_SHEET_URL` instead of `GOOGLE_SHEET_ENDPOINT`), so it threw
  an error and never loaded.
- **Result-saving used a malformed element id** (`"actual-(gross-speed-value"`)
  so the speed sent to the Google Sheet leaderboard was always `0`. Also fixed
  the "language" field, which was grabbing a nonexistent DOM element instead of
  the actual selected language.
- **Broken link**: the header nav pointed at `about.html`, which doesn't exist
  anywhere in the project. Removed/replaced with working links.
- **`main.js` pointed at a missing `icon.png`** (only `icon.ico` exists) —
  fixed to use the file that's actually there.
- **`preload.js` was referenced by `main.js` but never existed**, so
  `window.electronAPI` was always `undefined` and the "Check Activation
  Status" button on the home page threw an error. Added a working `preload.js`.
- **History cap bug**: local test history silently dropped everything after
  the 10th result. Raised the cap and moved the authoritative record to `db.js`.

## 3. Cleanup — dead/duplicate files archived
Nothing was deleted — everything below was moved into `_archive/` because it
wasn't reachable from any real navigation path in the app (verified by tracing
every link/script from `index.html` and `sidebar.js`):
- `engtutor2.html` — near-duplicate of `engtutor.html`
- `hinditutor.html`, `hinditutor(1).html`, `pbi2.htm` — the "(1)" file was
  actually a mislabeled duplicate of the Punjabi tutor page, and Hindi was
  never wired into the live navigation
- `hindi_tutor.html`, `hindiexercises.html` — unused Hindi track
- `englishdemo.html`, `punjabidemo.html` — orphaned demo pages
- `exercises.html`, `exercises2.html`, `exercisestc.html`, `addexercises.html`
  — orphaned exercise-manager variants
- `game.html`, `paragraph.html`, `parascript.js`, `Tutorvideo.html`,
  `test certificate.html`, `testcheckrule.html`, `script2.js` — unlinked extras

If any of these turn out to be needed, they're all still in `_archive/`.

## 4. Code readability
The following files contained heavily minified/obfuscated JavaScript
(hex variable names, string-array lookups) that made them impossible to
maintain safely. They were rewritten as clean, equivalent, working code with
comments, with no functional changes beyond the bug fixes noted above:
- `sidebar.js`
- `activate.html` (inline script)
- `index.html` (inline script) — also removed a broken login/session-check
  block that referenced a login modal and a `GOOGLE_APP_URL` variable that no
  longer exist anywhere in the page, so it was dead code throwing silent
  errors on every page load.

## 5. Sidebar navigation
Added a **"My Progress"** link to the sidebar (`sidebar.js`) and the top nav
(`header.html`) so the new dashboard is reachable everywhere.

## Note on copy-protection
The app disables right-click and common devtools shortcuts (F12, Ctrl+Shift+I,
etc.) as a deterrent against casual copying — this is preserved. Worth knowing:
this is a UX speed bump, not real protection (anyone can still view source via
the browser address bar or dev tools opened before the page loads), so it
shouldn't be relied on to protect anything sensitive like credentials.
