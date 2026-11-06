# Setting up the Google Sheets sync + "Today's Leaderboard"

Your app already had a Google Sheet endpoint wired in (`GOOGLE_SHEET_ENDPOINT` in
`sheet-sync.js`). What's new in this update:

1. **One shared sync point** — every test result (from any exercise/test page,
   any language, any computer) now flows through `SmartechDB.addResult()` in
   `db.js`, which automatically calls `SmartechSheet.sendResult()`. You don't
   need to add sync code to individual pages anymore.
2. **`sheet-sync.js`** — a small shared module with:
   - `sendResult(entry)` — saves one row to the sheet (fire-and-forget, never
     blocks the app if the computer is offline).
   - `getTodayLeaderboard()` — asks the sheet for today's top speed, top
     accuracy, and a sample of 3 students tested today.
3. **`progress.html`** — now shows a "Today's Leaderboard" card at the top with:
   - The highest **speed** today (name, WPM, accuracy, language)
   - The highest **accuracy** today (name, %, speed, language)
   - A small table of **3 students tested today** (their speed & accuracy)
4. **`GoogleAppsScript_Code.gs`** — the backend script that needs to live in
   your Google Sheet's Apps Script project. It handles both saving new rows
   and answering the dashboard's questions.

## Step 1 — Create (or reuse) your Google Sheet

If you already have a results Google Sheet linked to the existing endpoint,
you can reuse it — just update its script (Step 2). Otherwise:

1. Go to [sheets.google.com](https://sheets.google.com) and create a new sheet,
   e.g. **"Smartech Typing Test Results"**.
2. Rename the first tab to **Results** (or update `SHEET_NAME` in the script
   to match your tab's name).

## Step 2 — Add the backend script

1. In the Sheet, go to **Extensions ▸ Apps Script**.
2. Delete anything in `Code.gs` and paste in the full contents of
   **`GoogleAppsScript_Code.gs`** (included in this package).
3. Click **Save**.

## Step 3 — Deploy as a Web App

1. Click **Deploy ▸ New deployment** (or **Manage deployments ▸ Edit** if
   you're updating an existing one that the app already points to).
2. Type: **Web app**.
3. Execute as: **Me**.
4. Who has access: **Anyone**.
5. Click **Deploy**, authorize the permissions it asks for, and copy the
   **Web app URL** (ends in `/exec`).

## Step 4 — Point the app at your deployment

Open `sheet-sync.js` and replace the value of `GOOGLE_SHEET_ENDPOINT` with the
URL you just copied:

```js
const GOOGLE_SHEET_ENDPOINT = "https://script.google.com/macros/s/XXXXXXXX/exec";
```

> If you're reusing the exact same deployment that was already hardcoded in
> the app (i.e. you only edited the script behind it, and used **Manage
> deployments ▸ Edit ▸ New version** rather than creating a brand-new
> deployment), the URL won't change and you can skip this step.

## Step 5 — Test it

1. Launch the app, take a test on any computer.
2. Check the Google Sheet — a new row should appear in the **Results** tab.
3. Open **My Progress** (`progress.html`) — the "Today's Leaderboard" card
   should populate with today's top speed, top accuracy, and 3 sample
   students.

## Notes / things you can tweak

- **"3 students who took tests that day"** currently shows the **top 3 by
  speed** for today. If you'd rather show the **3 most recent** tests
  instead, open `GoogleAppsScript_Code.gs` and change:
  ```js
  const sample = todayRows.slice().sort((a, b) => b.speed - a.speed).slice(0, 3);
  ```
  to:
  ```js
  const sample = todayRows.slice(-3).reverse();
  ```
- **Timezone**: "today" is computed using the Apps Script project's timezone
  (Settings ▸ General ▸ Time zone in the Apps Script editor, or the Sheet's
  timezone). Set this to your local timezone so "today" lines up correctly.
- **Offline computers**: if a PC has no internet at test time, the result
  still saves locally (as before) but won't reach the sheet. There's currently
  no automatic retry/resync for missed syncs — let me know if you'd like that
  added (e.g. retry on next launch).
- **Sheet columns**: Timestamp, RefNo, Name, Language, Speed, Accuracy,
  Result, Backspace — feel free to reorder/add columns in the sheet, just
  keep `Code.gs`'s `getSheet_()`/`doPost` in sync with the columns you use.
