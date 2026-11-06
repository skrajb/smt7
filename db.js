/* ============================================================
   Smartech Typing Tutor — Shared Data Layer (SmartechDB)
   ------------------------------------------------------------
   A small wrapper around localStorage that gives the app a
   single, consistent place to store and read:
     - typing test results (history)
     - summary stats (best/average speed & accuracy per language)
     - issued certificates

   All data stays on the user's own device (no server involved),
   but every page in the app now reads/writes through this one
   module instead of scattering ad-hoc localStorage keys around,
   so nothing gets lost or overwritten by accident.
   ============================================================ */

(function (global) {
  "use strict";

  const RESULTS_KEY = "smartech_results";     // array of test results
  const CERTS_KEY = "smartech_certificates";  // array of issued certificates
  const MAX_RESULTS = 500;                    // generous cap, not 10
  const STATS_KEY = "typingTestStats";       // per-page history shown under each typing test

  // Test history is only kept for the last few days. Anything older is
  // removed automatically (on app start, when history is read, and when a
  // new result is saved). Certificates already earned are NOT affected.
  const RETENTION_DAYS = 3;
  const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

  // True if the entry's timestamp falls within the retention window.
  function isRecent(entry) {
    const t = entry ? Date.parse(entry.timestamp) : NaN;
    return Number.isFinite(t) && t >= Date.now() - RETENTION_MS;
  }

  // Returns a new array containing only entries from the last RETENTION_DAYS.
  function keepRecent(list) {
    return Array.isArray(list) ? list.filter(isRecent) : [];
  }

  // Reads a stored array, drops old entries and saves it back only if
  // something was actually removed.
  function pruneStoredList(key) {
    try {
      const all = safeParse(localStorage.getItem(key), []);
      if (!Array.isArray(all)) return [];
      const recent = keepRecent(all);
      if (recent.length !== all.length) {
        if (recent.length) localStorage.setItem(key, JSON.stringify(recent));
        else localStorage.removeItem(key);
      }
      return recent;
    } catch (e) {
      return [];
    }
  }

  // Clears out history older than RETENTION_DAYS from both history stores.
  function pruneOldHistory() {
    if (!isAvailable()) return;
    pruneStoredList(RESULTS_KEY);
    pruneStoredList(STATS_KEY);
  }

  function safeParse(json, fallback) {
    try {
      const val = JSON.parse(json);
      return val === null || val === undefined ? fallback : val;
    } catch (e) {
      return fallback;
    }
  }

  function isAvailable() {
    try {
      const k = "__smartech_test__";
      localStorage.setItem(k, "1");
      localStorage.removeItem(k);
      return true;
    } catch (e) {
      return false;
    }
  }

  function getResults() {
    if (!isAvailable()) return [];
    return pruneStoredList(RESULTS_KEY);
  }

  function addResult(stats) {
    if (!isAvailable()) return false;
    const results = getResults();
    const entry = Object.assign(
      {
        id: "r_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
        timestamp: new Date().toISOString(),
        language: "English",
        name: "",
        refNo: ""
      },
      stats
    );
    results.push(entry);
    if (results.length > MAX_RESULTS) results.shift();
    localStorage.setItem(RESULTS_KEY, JSON.stringify(results));

    // Demo tests (5-minute demo from demo.html) are kept in the local history
    // only: no certificate and nothing sent to the shared Google Sheet.
    if (entry.isDemo) return entry;

    // Auto-issue a certificate on a Pass, so the certificate list
    // always reflects real, recorded results.
    if (String(entry.result).toLowerCase() === "pass") {
      addCertificate(entry);
    }

    // Best-effort sync to the shared Google Sheet (if sheet-sync.js is loaded
    // and configured). This never blocks saving locally, and never throws.
    if (global.SmartechSheet && typeof global.SmartechSheet.sendResult === "function") {
      try { global.SmartechSheet.sendResult(entry); } catch (e) { /* ignore */ }
    }

    return entry;
  }

  function clearResults() {
    localStorage.removeItem(RESULTS_KEY);
  }

  function getStats() {
    const results = getResults();
    const byLang = {};
    results.forEach((r) => {
      const lang = r.language || "English";
      if (!byLang[lang]) {
        byLang[lang] = { count: 0, bestSpeed: 0, bestAccuracy: 0, totalSpeed: 0, totalAccuracy: 0, passes: 0 };
      }
      const b = byLang[lang];
      b.count++;
      b.totalSpeed += Number(r.actualSpeed || r.grossSpeed || 0);
      b.totalAccuracy += Number(r.accuracy || 0);
      b.bestSpeed = Math.max(b.bestSpeed, Number(r.actualSpeed || r.grossSpeed || 0));
      b.bestAccuracy = Math.max(b.bestAccuracy, Number(r.accuracy || 0));
      if (String(r.result).toLowerCase() === "pass") b.passes++;
    });
    Object.keys(byLang).forEach((lang) => {
      const b = byLang[lang];
      b.avgSpeed = b.count ? +(b.totalSpeed / b.count).toFixed(1) : 0;
      b.avgAccuracy = b.count ? +(b.totalAccuracy / b.count).toFixed(1) : 0;
    });
    return {
      totalTests: results.length,
      byLanguage: byLang
    };
  }

  function getCertificates() {
    if (!isAvailable()) return [];
    return safeParse(localStorage.getItem(CERTS_KEY), []);
  }

  function addCertificate(result) {
    const certs = getCertificates();
    const cert = {
      id: "c_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
      name: result.name || "Candidate",
      refNo: result.refNo || "",
      language: result.language || "English",
      exerciseNo: result.exerciseNo || null,
      testId: result.testId || "",
      testName: result.testName || "",
      speed: result.actualSpeed || result.grossSpeed || 0,
      accuracy: result.accuracy || 0,
      date: result.timestamp || new Date().toISOString()
    };
    certs.push(cert);
    localStorage.setItem(CERTS_KEY, JSON.stringify(certs));
    return cert;
  }

  function exportCSV() {
    const results = getResults();
    const header = ["Date", "Name", "Ref No", "Language", "Exercise No", "Gross Speed", "Actual Speed", "Accuracy", "Result"];
    const rows = results.map((r) => [
      new Date(r.timestamp).toLocaleString(),
      r.name || "",
      r.refNo || "",
      r.language || "",
      r.exerciseNo || "",
      r.grossSpeed || "",
      r.actualSpeed || "",
      r.accuracy || "",
      r.result || ""
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    return csv;
  }

  function downloadCSV(filename) {
    const csv = exportCSV();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "typing-test-history.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Tidy up as soon as any page loads, so old history never lingers on disk.
  pruneOldHistory();

  global.SmartechDB = {
    RETENTION_DAYS,
    keepRecent,
    pruneOldHistory,
    isAvailable,
    getResults,
    addResult,
    clearResults,
    getStats,
    getCertificates,
    addCertificate,
    exportCSV,
    downloadCSV
  };
})(window);
