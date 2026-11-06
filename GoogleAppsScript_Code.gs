/**
 * ============================================================
 *  Smartech Typing Tutor — Google Sheets Backend
 * ------------------------------------------------------------
 *  Paste this WHOLE file into the Apps Script editor that's
 *  bound to your results Google Sheet (Extensions ▸ Apps
 *  Script), replacing whatever is there now, then deploy it
 *  as a Web App. See SETUP.md for step-by-step instructions.
 *
 *  What it does:
 *   - doPost(e)  → saves one test result as a new row
 *   - doGet(e)   → ?action=today  → today's leaderboard
 *                  ?action=top10  → all-time top 10 by speed
 * ============================================================
 */

const SHEET_NAME = "Results"; // change this if your tab is named differently

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(["Timestamp", "RefNo", "Name", "Language", "Speed", "Accuracy", "Result", "Backspace", "ExerciseNo", "TestId", "TestName"]);
  }
  // Older sheets only have 8 columns: add the new headers once, without touching old rows.
  if (sheet.getRange(1, 9).getValue() === "") {
    sheet.getRange(1, 9, 1, 3).setValues([["ExerciseNo", "TestId", "TestName"]]);
  }
  return sheet;
}

// ---- Save a result (called by the app after every test) ----
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = getSheet_();
    sheet.appendRow([
      data.timeStamp || new Date().toISOString(),
      data.refNo || "",
      data.name || "",
      data.language || "",
      Number(data.speed) || 0,
      Number(data.accuracy) || 0,
      data.result || "",
      data.backspace || "",
      data.exerciseNo || "",
      data.testId || "",
      data.testName || ""
    ]);
    return ContentService
      .createTextOutput(JSON.stringify({ status: "ok" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ---- Read results (called by the dashboard) ----
function doGet(e) {
  const action = ((e.parameter && e.parameter.action) || "top10").toLowerCase();
  const sheet = getSheet_();
  const values = sheet.getDataRange().getValues();
  values.shift(); // drop the header row

  let rows = values
    .map((r) => ({
      timestamp: r[0],
      refNo: r[1],
      name: r[2],
      language: r[3],
      speed: Number(r[4]) || 0,
      accuracy: Number(r[5]) || 0,
      result: r[6],
      backspace: r[7],
      exerciseNo: r[8] || "",
      testId: r[9] || "",
      testName: r[10] || ""
    }))
    .filter((r) => r.name); // ignore blank rows

  // Optional: ?test=CHSL-ENG limits the leaderboard to one test type.
  const testFilter = String((e.parameter && e.parameter.test) || "").toLowerCase();
  if (testFilter) {
    rows = rows.filter((r) => String(r.testId).toLowerCase() === testFilter);
  }

  let result;

  if (action === "today") {
    const tz = Session.getScriptTimeZone();
    const todayStr = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd");

    const todayRows = rows.filter((r) => {
      const d = new Date(r.timestamp);
      if (isNaN(d.getTime())) return false;
      return Utilities.formatDate(d, tz, "yyyy-MM-dd") === todayStr;
    });

    const topSpeed = todayRows.reduce((best, r) => (!best || r.speed > best.speed ? r : best), null);
    const topAccuracy = todayRows.reduce((best, r) => (!best || r.accuracy > best.accuracy ? r : best), null);

    // "3 students who took tests that day" — shown as the top 3 by speed today.
    // (Change to todayRows.slice(-3) if you'd rather show the 3 MOST RECENT instead.)
    const sample = todayRows.slice().sort((a, b) => b.speed - a.speed).slice(0, 3);

    result = {
      date: todayStr,
      totalToday: todayRows.length,
      topSpeed: topSpeed,
      topAccuracy: topAccuracy,
      sample: sample
    };
  } else {
    // action === "top10" (all-time, by speed)
    result = rows.slice().sort((a, b) => b.speed - a.speed).slice(0, 10);
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
