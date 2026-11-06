/* ============================================================
   Smartech Typing Tutor — Theme Switching
   Loaded first in <head>, before styles.css / themes.css, so the
   saved theme is applied to <html> before either stylesheet has
   a chance to paint anything — no flash of the wrong theme.
   ============================================================ */

(function () {
  const STORAGE_KEY = "smartechTheme";

  const THEME_META = {
    classic:  { label: "Ink & Gold",      swatch: "linear-gradient(135deg, #0B1E36, #B8862E)" },
    silver:   { label: "Silver Steel",    swatch: "linear-gradient(135deg, #9AA5AF, #E9EDF1)" },
    pearl:    { label: "Pearl Ivory",     swatch: "linear-gradient(135deg, #FAF7F2, #C9A227)" },
    mint:     { label: "Mint Fresh",      swatch: "linear-gradient(135deg, #F2FAF7, #1FA38A)" },
    lavender: { label: "Lavender Mist",   swatch: "linear-gradient(135deg, #F6F4FD, #7B68E0)" }
  };
  const THEME_KEYS = Object.keys(THEME_META);

  function readSaved() {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return THEME_KEYS.includes(v) ? v : "classic";
    } catch (e) {
      return "classic";
    }
  }

  function applyTheme(name) {
    const theme = THEME_KEYS.includes(name) ? name : "classic";
    // "classic" is the no-attribute default already defined in styles.css,
    // so it's represented by removing the attribute rather than setting it —
    // keeps the base :root block as the single source of truth for it.
    if (theme === "classic") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }
    return theme;
  }

  // Apply immediately — this runs before styles.css/themes.css are even
  // requested, since this <script> tag is placed just above them.
  applyTheme(readSaved());

  window.SmartechTheme = {
    keys: THEME_KEYS,
    meta: THEME_META,
    get: function () {
      return document.documentElement.getAttribute("data-theme") || "classic";
    },
    set: function (name) {
      const theme = applyTheme(name);
      try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) {}
      document.dispatchEvent(new CustomEvent("smartech:theme-changed", { detail: { theme } }));
      return theme;
    }
  };
})();
