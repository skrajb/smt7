/**
 * ============================================================
 *  Smartech Typing Tutor — Activation Backend (Licenses sheet)
 *  v2: supports ANY number of test types, each with its own codes
 * ------------------------------------------------------------
 *  Paste this WHOLE file into the Apps Script editor bound to
 *  your LICENSES spreadsheet, replacing the old doGet(), then
 *  re-deploy (Deploy ▸ Manage deployments ▸ Edit ▸ New version)
 *  so the change goes live at the SAME /exec URL.
 *
 *  TWO KINDS OF CODES
 *  ------------------
 *  1) Course codes ENG / PBI / HIN  → unchanged. They still live
 *     on the "Licenses" tab in the old column layout:
 *       D/E/F = ENG code/status/device   N = ENG expiry
 *       G/H/I = PBI code/status/device   O = PBI expiry
 *       J/K/L = HIN code/status/device   P = HIN expiry
 *       M     = last activity
 *
 *  2) Test-type codes (NEW) → one row per code on a tab named
 *     "TestAccess" (created automatically on first use):
 *
 *       A Type | B Code | C Status | D Device | E Expiry | F Days | G Student / Note | H Last Activity
 *
 *     - Type  = the code TYPE you wrote after "code:" in the
 *               "### TEST" block of the GitHub file (e.g. CHSL,
 *               PSSSB, TEST1). Any name works; no script change
 *               and no new columns are needed for a new test.
 *     - Code  = what the student types.
 *     - Status: leave empty / NEW for a fresh code. The script
 *               sets USED on first activation. Type BLOCKED to
 *               revoke a code at any time (the app notices on
 *               its next check — it re-checks within about a minute while the student is online).
 *     - Days  = OPTIONAL validity for this one code (e.g. 30).
 *               Empty = DEFAULT_DAYS below.
 *     - Expiry= filled automatically on activation. Edit it by
 *               hand to extend / shorten a code — it is read
 *               live on every check.
 *
 *     Use the menu  Smartech ▸ Generate access codes…  to create
 *     a batch of random codes for a test type in one go.
 * ============================================================
 */

var DEFAULT_DAYS = 90;            // validity of a freshly activated code
var TEST_SHEET   = "TestAccess";  // tab used for test-type codes

function out_(text) { return ContentService.createTextOutput(text); }

function doGet(e) {
  var p = (e && e.parameter) || {};
  var action = String(p.action || "ACTIVATE").toUpperCase().trim();
  var type   = String(p.type   || "").toUpperCase().trim();
  var code   = String(p.code   || "").toUpperCase().trim();
  var device = String(p.device || "").trim();

  if (!type || !code) return out_("INVALID");

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return out_("BUSY");
  try {
    if (type === "ENG" || type === "PBI" || type === "HIN") {
      return legacyCourse_(action, type, code, device);
    }
    if (!/^[A-Z0-9_\-]{1,30}$/.test(type)) return out_("INVALID");
    return testType_(action, type, code, device);
  } finally {
    lock.releaseLock();
  }
}

/* ---------- 1) ENG / PBI / HIN on the "Licenses" tab (as before) ---------- */
function legacyCourse_(action, type, code, device) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Licenses");
  if (!sheet) return out_("INVALID");
  var data = sheet.getDataRange().getValues();

  var map = {
    ENG: { code: 4,  status: 5,  device: 6,  expiry: 14 },
    PBI: { code: 7,  status: 8,  device: 9,  expiry: 15 },
    HIN: { code: 10, status: 11, device: 12, expiry: 16 }
  };
  var c = map[type];

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][c.code - 1]).toUpperCase().trim() !== code) continue;

    var status = String(data[i][c.status - 1]).toUpperCase().trim();
    var savedDevice = String(data[i][c.device - 1]).trim();
    var expiryDate = toDate_(data[i][c.expiry - 1]);

    if (status === "BLOCKED") return out_("BLOCKED");

    if (action === "ACTIVATE") {
      if (status === "" || status === "NEW") {
        var newExpiry = addDays_(new Date(), DEFAULT_DAYS);
        sheet.getRange(i + 1, c.status).setValue("USED");
        sheet.getRange(i + 1, c.device).setValue(device);
        sheet.getRange(i + 1, c.expiry).setValue(newExpiry);
        sheet.getRange(i + 1, 13).setValue(new Date());
        return out_("VALID|" + newExpiry.getTime());
      }
      if (status === "USED") {
        if (savedDevice !== device) return out_("USED");
        if (expiryDate && new Date() > expiryDate) return out_("EXPIRED");
        sheet.getRange(i + 1, 13).setValue(new Date());
        return out_("VALID|" + (expiryDate ? expiryDate.getTime() : ""));
      }
      return out_("USED");
    }

    if (action === "DEACTIVATE") {
      if (savedDevice !== device) return out_("DEVICE_MISMATCH");
      sheet.getRange(i + 1, c.status).setValue("NEW");
      sheet.getRange(i + 1, c.device).clearContent();
      sheet.getRange(i + 1, c.expiry).clearContent();
      return out_("OK");
    }
  }
  return out_("INVALID");
}

/* ---------- 2) any test type on the "TestAccess" tab ---------- */
function getTestSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(TEST_SHEET);
  if (!sh) {
    sh = ss.insertSheet(TEST_SHEET);
    sh.appendRow(["Type", "Code", "Status", "Device", "Expiry", "Days", "Student / Note", "Last Activity"]);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, 8).setFontWeight("bold");
  }
  return sh;
}

function testType_(action, type, code, device) {
  var sheet = getTestSheet_();
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).toUpperCase().trim() !== type) continue;
    if (String(data[i][1]).toUpperCase().trim() !== code) continue;

    var row = i + 1;
    var status = String(data[i][2]).toUpperCase().trim();
    var savedDevice = String(data[i][3]).trim();
    var expiryDate = toDate_(data[i][4]);
    var days = Number(data[i][5]) || DEFAULT_DAYS;

    if (status === "BLOCKED") return out_("BLOCKED");

    if (action === "ACTIVATE") {
      if (status === "" || status === "NEW") {
        var newExpiry = addDays_(new Date(), days);
        sheet.getRange(row, 3).setValue("USED");
        sheet.getRange(row, 4).setValue(device);
        sheet.getRange(row, 5).setValue(newExpiry);
        sheet.getRange(row, 8).setValue(new Date());
        return out_("VALID|" + newExpiry.getTime());
      }
      if (status === "USED") {
        if (savedDevice !== device) return out_("USED");
        if (expiryDate && new Date() > expiryDate) return out_("EXPIRED");
        sheet.getRange(row, 8).setValue(new Date());
        return out_("VALID|" + (expiryDate ? expiryDate.getTime() : ""));
      }
      return out_("USED");
    }

    if (action === "DEACTIVATE") {
      if (savedDevice !== device) return out_("DEVICE_MISMATCH");
      sheet.getRange(row, 3).setValue("NEW");
      sheet.getRange(row, 4).clearContent();
      sheet.getRange(row, 5).clearContent();
      return out_("OK");
    }
  }
  return out_("INVALID");
}

/* ---------- helpers ---------- */
function toDate_(v) {
  if (v instanceof Date) return v;
  if (!v) return null;
  var d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
function addDays_(d, n) {
  var r = new Date(d.getTime());
  r.setDate(r.getDate() + n);
  return r;
}

/* ============================================================
 *  Menu: Smartech ▸ Generate access codes…
 *  Creates N random codes for one test type on the TestAccess tab.
 * ============================================================ */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Smartech")
    .addItem("Generate access codes…", "generateCodesDialog")
    .addToUi();
}

function generateCodesDialog() {
  var ui = SpreadsheetApp.getUi();
  var t = ui.prompt("Test type", "Code TYPE exactly as written after \"code:\" in the GitHub file (e.g. CHSL):", ui.ButtonSet.OK_CANCEL);
  if (t.getSelectedButton() !== ui.Button.OK) return;
  var n = ui.prompt("How many codes?", "Number of codes to create (1–500):", ui.ButtonSet.OK_CANCEL);
  if (n.getSelectedButton() !== ui.Button.OK) return;
  var d = ui.prompt("Validity in days", "Days each code stays valid after activation (leave empty for " + DEFAULT_DAYS + "):", ui.ButtonSet.OK_CANCEL);
  if (d.getSelectedButton() !== ui.Button.OK) return;

  var made = generateCodes_(t.getResponseText(), Number(n.getResponseText()), Number(d.getResponseText()) || "");
  ui.alert(made + " code(s) added to the \"" + TEST_SHEET + "\" tab.");
}

function generateCodes_(type, count, days) {
  type = String(type || "").toUpperCase().trim();
  if (!/^[A-Z0-9_\-]{1,30}$/.test(type)) throw new Error("Type may only contain A-Z, 0-9, _ and -");
  count = Math.max(1, Math.min(500, Math.floor(count) || 1));

  var sheet = getTestSheet_();
  var existing = {};
  sheet.getDataRange().getValues().slice(1).forEach(function (r) {
    existing[String(r[0]).toUpperCase().trim() + "|" + String(r[1]).toUpperCase().trim()] = true;
  });

  var alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I confusion
  function part(n) { var s = ""; for (var i = 0; i < n; i++) s += alphabet.charAt(Math.floor(Math.random() * alphabet.length)); return s; }

  var rows = [];
  while (rows.length < count) {
    var code = type + "-" + part(4) + "-" + part(4);
    if (existing[type + "|" + code]) continue;
    existing[type + "|" + code] = true;
    rows.push([type, code, "NEW", "", "", days, "", ""]);
  }
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 8).setValues(rows);
  return rows.length;
}
