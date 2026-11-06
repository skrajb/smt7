/* ============================================================
   Smartech Typing Tutor — Activation & Licensing
   Handles: server activation/deactivation calls, local license
   storage, and the 3-month activation expiry window.

   IMPORTANT: the source of truth for "when does this code expire"
   is the Expiry Date cell on the Licenses Google Sheet, not this
   file. This file just mirrors whatever the server last told it,
   so the UI can show a countdown without hitting the network on
   every single click. Actual enforcement (can this code still be
   used) always happens server-side in GoogleAppsScript_Activation_Backend.gs.
   ============================================================ */

const WEBAPP="https://script.google.com/macros/s/AKfycbxk6TUAyNUSQ9IAYh3Klkp0FFlM08oZomTPNyaYTy4sRCZlkuZaL9C1Is7M7-eRWJV0Sw/exec";

/* localStorage key names for each product. */
const ACTIVATION_META = {
  ENG: { flag: "engActivated", code: "ENG_CODE", expiry: "ENG_EXPIRES_AT" },
  PBI: { flag: "pbiActivated", code: "PBI_CODE", expiry: "PBI_EXPIRES_AT" },
  HIN: { flag: "hinActivated", code: "HIN_CODE", expiry: "HIN_EXPIRES_AT" }
};

/* Test-type access codes (from the "TestAccess" tab of the Licenses sheet) use any
   code TYPE the admin invents, e.g. CHSL or PSSSB. Their local mirror keys are
   generated from the type name; ENG / PBI / HIN keep their original keys. */
function getActivationMeta(type){
  type = String(type || "").toUpperCase().trim();
  if (ACTIVATION_META[type]) return ACTIVATION_META[type];
  if (!/^[A-Z0-9_-]{1,30}$/.test(type)) return null;
  return { flag: "lic_" + type + "_active", code: "lic_" + type + "_code", expiry: "lic_" + type + "_expires" };
}

function rawDeviceString(){
  return navigator.userAgent + screen.width + screen.height;
}

/* ---------- server calls ---------- */

/* Returns { ok:true, expiresAt } on success (expiresAt is an epoch-ms
   number pulled straight from the sheet's Expiry Date cell), or
   { ok:false, reason:'EXPIRED'|'USED'|'INVALID' } otherwise. Shows a
   user-facing alert for the failure cases, same as before. */
async function activateProduct(code,type,opts){

    opts = opts || {};
    const quiet = !!opts.silent;
    const say = (m) => { if(!quiet) alert(m); };
    const device = rawDeviceString();

    const url=
        WEBAPP+
        "?action=activate"+
        "&type="+encodeURIComponent(type)+
        "&code="+encodeURIComponent(code)+
        "&device="+encodeURIComponent(device);

    let txt;
    try{
        const res=await fetch(url);
        txt=(await res.text()).trim();
    }catch(err){
        say("Could not reach the activation server. Please check your internet connection and try again.");
        return { ok:false, reason:"NETWORK" };
    }

    if(txt.indexOf("VALID")===0){
        const parts = txt.split("|");
        const expiresAt = parts[1] ? Number(parts[1]) : null;
        return { ok:true, expiresAt: expiresAt };
    }

    if(txt=="EXPIRED"){
        say("This activation code has expired. Please get a new activation code from your institute — the same code can't be reused after it expires.");
        return { ok:false, reason:"EXPIRED" };
    }

    if(txt=="USED"){
        say("Already activated on another computer.");
        return { ok:false, reason:"USED" };
    }

    if(txt=="BLOCKED"){
        say("This activation code has been blocked. Please contact your institute.");
        return { ok:false, reason:"BLOCKED" };
    }

    if(txt=="BUSY"){
        say("The activation server is busy. Please try again in a moment.");
        return { ok:false, reason:"BUSY" };
    }

    say("Invalid activation code.");
    return { ok:false, reason:"INVALID" };
}

/* Same as activateProduct but never shows an alert — used for background re-checks. */
function checkProduct(code,type){
    return activateProduct(code,type,{ silent:true });
}

/* ---------- local license mirror ---------- */

/* Marks a product activated *now*, storing the code and the expiry
   moment the SERVER returned (not a locally-guessed one). */
function markActivated(type, code, expiresAt){
  const m = getActivationMeta(type);
  if(!m) return;
  localStorage.setItem(m.flag, "true");
  if(code) localStorage.setItem(m.code, code);
  if(expiresAt) localStorage.setItem(m.expiry, String(expiresAt));
  else localStorage.removeItem(m.expiry);
}

function clearActivation(type){
  const m = getActivationMeta(type);
  if(!m) return;
  localStorage.removeItem(m.flag);
  localStorage.removeItem(m.code);
  localStorage.removeItem(m.expiry);
}

/* Status for a product based on the local mirror: whether it's
   currently active, expired, the stored code, and the expiry date. */
function getActivationInfo(type){
  const m = getActivationMeta(type);
  const flagged = m ? localStorage.getItem(m.flag) === "true" : false;
  const code = m ? (localStorage.getItem(m.code) || "") : "";
  const expRaw = m ? localStorage.getItem(m.expiry) : null;
  const expiresAt = expRaw ? Number(expRaw) : null;
  const now = Date.now();
  const timedOut = !!(flagged && expiresAt && now >= expiresAt);
  const daysLeft = expiresAt ? Math.max(0, Math.ceil((expiresAt - now) / (24*60*60*1000))) : null;

  return {
    active: flagged && !timedOut,
    expired: timedOut,
    code: code,
    expiresAt: expiresAt,
    daysLeft: daysLeft
  };
}

/* Use this for any access-gating check. If the locally-mirrored
   expiry has passed, this stops granting access on this device —
   but it does NOT call deactivate, because that would reset the
   code back to "NEW" and let it be reused, which defeats the
   point: an expired code should stay dead until you (the admin)
   either push its Expiry Date forward in the sheet, or hand the
   student a different code. */
function isActivationValid(type){
  const info = getActivationInfo(type);
  if(info.expired){
    clearActivation(type);
    return false;
  }
  return info.active;
}

function formatActivationDate(ms){
  if(!ms) return "—";
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' });
}
