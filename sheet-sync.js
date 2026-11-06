/* ============================================================
   Smartech Typing Tutor — Google Sheet Sync (SmartechSheet)
   ------------------------------------------------------------
   Sends every completed test result to a central Google Sheet
   (via a Google Apps Script Web App) so results from every
   computer/device in the centre land in one place, and lets the
   dashboard pull back "today's leaderboard" from that same sheet.

   This never blocks or breaks the app: if the computer is
   offline, or the endpoint hasn't been set up yet, it just logs
   a warning and the app keeps working normally on local storage
   (SmartechDB), exactly as before.
   ============================================================ */

(function (global) {
  "use strict";

  // 👉 Replace with your own Apps Script Web App URL if you deploy a new one.
  //    (See Code.gs / SETUP.md for how to create and deploy it.)
  const GOOGLE_SHEET_ENDPOINT =
    "https://script.google.com/macros/s/AKfycbzAEuTahADRG44rCBeBwqJZL4N85MlHJYGFV6lm9bnFHKsU-KQYe9BizYTHuB_aepBCPQ/exec";

  function isConfigured() {
    return typeof GOOGLE_SHEET_ENDPOINT === "string" && GOOGLE_SHEET_ENDPOINT.indexOf("http") === 0;
  }

  // Fire-and-forget: send one test result to the sheet.
  // `entry` is the same object shape SmartechDB.addResult stores locally.
  function sendResult(entry) {
    if (!isConfigured() || !entry) return Promise.resolve(false);

    const payload = {
      action: "save",
      timeStamp: entry.timestamp || new Date().toISOString(),
      refNo: entry.refNo || "",
      name: entry.name || "",
      language: entry.language || "",
      exerciseNo: entry.exerciseNo || "",
      testId: entry.testId || "",
      testName: entry.testName || "",
      speed: entry.actualSpeed ?? entry.grossSpeed ?? 0,
      accuracy: entry.accuracy ?? 0,
      result: entry.result || "",
      backspace: entry.backspaceCount ?? ""
    };

    return fetch(GOOGLE_SHEET_ENDPOINT, {
      method: "POST",
      mode: "no-cors", // Apps Script doesn't answer CORS preflights; we don't need to read the response anyway
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    })
      .then(() => true)
      .catch((err) => {
        console.warn("Smartech: could not sync result to Google Sheet (will stay saved locally only):", err);
        return false;
      });
  }

  // Pulls today's leaderboard: { date, totalToday, topSpeed, topAccuracy, sample: [...] }
  function getTodayLeaderboard() {
    if (!isConfigured()) return Promise.reject(new Error("Google Sheet endpoint not configured"));
    return fetch(`${GOOGLE_SHEET_ENDPOINT}?action=today`)
      .then((res) => {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      });
  }

  // Pulls the all-time top 10 by speed.
  function getTop10() {
    if (!isConfigured()) return Promise.reject(new Error("Google Sheet endpoint not configured"));
    return fetch(`${GOOGLE_SHEET_ENDPOINT}?action=top10`)
      .then((res) => {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      });
  }

  global.SmartechSheet = {
    isConfigured,
    sendResult,
    getTodayLeaderboard,
    getTop10,
    GOOGLE_SHEET_ENDPOINT
  };
})(window);
