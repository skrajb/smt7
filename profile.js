/* ============================================================
   Smartech Typing Tutor — User Profile
   ------------------------------------------------------------
   Captures the candidate's name (once, right after install /
   first launch) and remembers it on this device, so every
   typing test result and certificate is automatically saved
   under that name — no need to retype it before every test.

   Exposes window.SmartechProfile:
     getName()        -> string
     getRefNo()        -> string
     isSet()           -> boolean
     save(name, refNo) -> void
     ensureCaptured(onDone) -> shows the welcome modal if needed,
                                then calls onDone()
   ============================================================ */
(function (global) {
  "use strict";

  const NAME_KEY = "smartechUserName";
  const REF_KEY = "smartechUserRefNo";

  function getName() {
    try { return localStorage.getItem(NAME_KEY) || ""; } catch (e) { return ""; }
  }
  function getRefNo() {
    try { return localStorage.getItem(REF_KEY) || ""; } catch (e) { return ""; }
  }
  function isSet() {
    return getName().trim().length > 0;
  }
  function save(name, refNo) {
    try {
      localStorage.setItem(NAME_KEY, (name || "").trim());
      if (refNo !== undefined) localStorage.setItem(REF_KEY, (refNo || "").trim());
    } catch (e) { /* localStorage unavailable, ignore */ }
    document.dispatchEvent(new CustomEvent("smartech:profile-updated", {
      detail: { name: getName(), refNo: getRefNo() }
    }));
  }

  function buildModal() {
    const wrap = document.createElement("div");
    wrap.id = "welcomeModal";
    wrap.className = "welcome-modal-overlay";
    wrap.innerHTML = `
      <div class="welcome-modal">
        <div class="welcome-modal-badge">👋</div>
        <h2>Welcome to Smartech Typing Tutor</h2>
        <p>Tell us your name so we can save your test results and certificates for you automatically.</p>
        <label for="welcomeNameInput">Your Name</label>
        <input id="welcomeNameInput" type="text" placeholder="e.g. Simran Kaur" autocomplete="off" maxlength="60" />
        <label for="welcomeRefInput">Roll / Reference Number <span>(optional)</span></label>
        <input id="welcomeRefInput" type="text" placeholder="e.g. 2026-045" autocomplete="off" maxlength="20" />
        <button id="welcomeSaveBtn" class="welcome-save-btn">Get Started →</button>
        <div id="welcomeError" class="welcome-error"></div>
      </div>`;
    document.body.appendChild(wrap);

    const nameInput = wrap.querySelector("#welcomeNameInput");
    const refInput = wrap.querySelector("#welcomeRefInput");
    const errorBox = wrap.querySelector("#welcomeError");
    const saveBtn = wrap.querySelector("#welcomeSaveBtn");

    function commit() {
      const name = nameInput.value.trim();
      if (!name) {
        errorBox.textContent = "Please enter your name to continue.";
        nameInput.focus();
        return;
      }
      save(name, refInput.value.trim());
      wrap.classList.add("closing");
      setTimeout(() => wrap.remove(), 220);
    }

    saveBtn.addEventListener("click", commit);
    [nameInput, refInput].forEach((el) => {
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter") commit();
      });
    });

    setTimeout(() => nameInput.focus(), 150);
  }

  function ensureCaptured() {
    if (isSet()) return;
    if (document.getElementById("welcomeModal")) return;
    if (document.body) {
      buildModal();
    } else {
      document.addEventListener("DOMContentLoaded", buildModal, { once: true });
    }
  }

  global.SmartechProfile = { getName, getRefNo, isSet, save, ensureCaptured };
})(window);
