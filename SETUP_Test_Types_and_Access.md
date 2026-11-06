# Test types, pass rules and per-test access codes

You now manage **everything from two places**:

| What | Where |
|---|---|
| Test types, pass criteria, which exercise belongs to which test | **GitHub text file** (the same one the app already downloads) |
| Who may open a test (one code type per test) | **Google Sheet** → `TestAccess` tab |

No app update is needed to add a test type, change a pass rule, add an exercise or issue codes.

## 1. Define test types in the GitHub file

Add a `### TEST` block per test type (see `test_types_format.txt` for a full sample):

```
### TEST CHSL-ENG
name: SSC CHSL English
language: English
mode: paragraph
minutes: 10
wpm: 35
accuracy: 93
code: CHSL
```

| Field | Meaning |
|---|---|
| `minutes` | Fixed test time for this test |
| `wpm` **or** `chars` | Minimum speed (1 word = 5 chars) or minimum characters |
| `accuracy` | Minimum accuracy % (default 90) |
| `engine` | `chars` (default, 5 characters = 1 word) or `words` (real typed words, see PHHC below) |
| `basis` | `gross` (default) or `net` – which count must reach the speed target (`words` engine: `net` by default) |
| `mode` | `paragraph` (long passage page) or `chunk` (chunk page) |
| `code` | Access-code **type** in the sheet. `FREE` = no code. Omitted = the test ID is the type (locked) |
| `description`, `note`, `active` | Card text, extra result note, `no` to hide |

**Pass = speed target reached AND accuracy reached.** The result page, history, certificate and the results sheet all record which test it was.

## 2. Mark exercises for a test

Put `@TESTID` in the exercise header. A tagged exercise appears **only** in that test (not in the normal Chunk/Long lists):

```
### English @CHSL-ENG Passage 1
---
text...
---

### English @CHSL-ENG @CGL-ENG Passage 2     <- one exercise, two tests
```

Order in the file = order of the buttons. The language word is optional with an `@tag` (it is detected from the text).

### One exam type with English **and** Punjabi
Write both languages in the `language:` line and tag each exercise with its own language word:

```
### TEST PHC-CLERK
name: Punjab Haryana High Court Clerk
language: English, Punjabi
minutes: 10
wpm: 35
accuracy: 95
punjabi-wpm: 30          <- optional: own rule for Punjabi
punjabi-accuracy: 92
code: PHC

### English @PHC-CLERK Passage 1
---
...
---

### Punjabi @PHC-CLERK Passage 1
---
...
---
```

* The Test Centre card and the exercise page show **English and Punjabi as separate blocks**, each with its own time, pass rule and exercise numbers (English 1, 2 … / Punjabi 1, 2 …).
* `<language>-wpm`, `-chars`, `-accuracy` and `-minutes` are optional. Whatever is not overridden uses the main value. One access code (`code: PHC`) unlocks both languages.
* The student's result, history and certificate record the test name and the language that was typed.

### PHHC and other word-based tests (own result engine)
Most tests count **characters** (5 characters = 1 word). A test with `engine: words` is calculated on the **words really typed** instead. A test whose ID starts with `PHHC` uses it automatically.

```
### TEST PHHC
name: Punjab & Haryana High Court
language: English
mode: paragraph
minutes: 10
words: 300
code: PHHC
```

| | Rule |
|---|---|
| Typed words | every word typed (wrong and extra words included) |
| Mistakes | wrong words + extra words + skipped words + merged / split words (one each) |
| Net words | typed words − mistakes |
| Result speed | net words ÷ minutes, e.g. (typed − mistakes) ÷ 10 |
| Pass | net words ≥ `words` (PHHC: 300 words in 10 minutes = 30 WPM) |

Optional: `wpm: 30` instead of `words`, `basis: gross` (typed words only), `accuracy:` (extra rule, none by default), `space-mistakes: yes` (extra spacebar presses are mistakes too), `case-sensitive: yes`, `punjabi-words: 250` (own target for one language). `engine: chars` switches a PHHC-named test back to the character rule.
Works on both the Long Paragraph and the Chunk page. The result page shows typed words, each mistake type, net words, result speed and Pass / Fail; the stored speed is the result speed.

### Same exercise in several exam types
List every test ID in the header: `### English @CHSL-ENG @CGL-ENG @TRIAL Passage 5`. It is stored once and shows in all three tests (numbered separately inside each test).

## 3. Access codes in Google Sheets (one type per test)

1. Open your **Licenses** spreadsheet → *Extensions ▸ Apps Script*.
2. Replace the script with `GoogleAppsScript_Activation_Backend.gs` and save.
3. *Deploy ▸ Manage deployments ▸ Edit ▸ New version ▸ Deploy* (same `/exec` URL, so the app needs no change).
4. Reload the sheet. A **Smartech** menu appears → *Generate access codes…* → enter the test **type** (e.g. `CHSL`), how many, and validity days. A `TestAccess` tab is created with columns  
   `Type | Code | Status | Device | Expiry | Days | Student / Note | Last Activity`.

Day-to-day:
- **New student** → give them one unused code of that type. First use binds it to their computer and starts the validity clock (`Days`, or 90 if empty).
- **Extend / shorten** → edit the `Expiry` cell. Read live.
- **Revoke** → type `BLOCKED` in `Status`. The app re-checks with the sheet when a test page is opened (at most once a minute) and again right when a student clicks an exercise, so a blocked code stops working almost immediately while online.
- **Move to another computer** → the student presses deactivate (or set Status back to `NEW` and clear Device).
- ENG / PBI / HIN keep working on the old `Licenses` tab, unchanged. A test can reuse them with `code: ENG`.

> Note: the GitHub raw file is public, so the code gate controls access **inside the app**. Do not rely on it to keep exercise text secret.

## 4. Results sheet (optional but recommended)

Replace the script behind the **results** sheet with `GoogleAppsScript_Code.gs` and redeploy. It adds `ExerciseNo`, `TestId`, `TestName` columns at the end (old rows are untouched) and supports `?action=top10&test=CHSL-ENG` for per-test leaderboards.

## What changed in the app
`wordengine.js` (word-based result engine), `tests.html` (new Test Centre page, in the sidebar), `tests.js` (rules + access), `exercises.js` (reads `### TEST` blocks and `@tags`), `activation.js` (any code type), `script.js` / `script2.js` (use the test's time and pass rule), `paragraph.html`, `testpage.html`, `sidebar.js`, `sheet-sync.js`, `db.js`.

## Test Centre flow
1. **Test Centre** (`tests.html`): one introductory card per test type (time, pass rule, format, exercise count, lock status).
2. Click a card → **Test Exercises** page (`testexercises.html`): enter the access code if the test is locked, then choose an exercise.
3. After a test, **New Exercise** returns to that test's exercise list.

## Manage & Print (Dashboard → Manage button)
The page is not in the sidebar; it opens from the **Manage** button on the Dashboard. The **Test Centre** has its own button and card on the Dashboard.

- Lists every test type and its exercises as loaded from GitHub, warns about tests with no exercises and `@tags` with no `### TEST` block, and has **Reload from GitHub**.
- **Print all exercises**: one click, one A4 sheet per exercise. You can also print a single test or a single exercise.
- Each sheet has the Smartech Education logo and name, test details, pass rule, the **total words and total characters (with spaces)** of that exercise, Name / Ref No / Date lines, and the full exercise text auto-sized to fit one page (down to 5 pt; very long passages are marked in red on screen).
- Each sheet is sized inside an A4 page with an 8 mm margin, so one exercise is always one page. Print dialog: A4, margins "Default", scale 100%.

## Links in this build
- GitHub file: `https://raw.githubusercontent.com/skrajb/smt5/refs/heads/main/smt5.txt` (`exercises.js`)
- Apps Script web app: set in `activation.js` (`WEBAPP`). Results sync uses `sheet-sync.js`.
