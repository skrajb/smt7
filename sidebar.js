/* ============================================================
   Smartech Typing Tutor — Sidebar Navigation
   Injects the sidebar menu into every page that includes this
   script, wires up the toggle button, highlights the current
   page, shows the signed-in user's name, and (on first launch)
   asks for the candidate's name so results save automatically
   under that name from then on.
   ============================================================ */

const SMARTECH_NAV_ICONS = {
  clipboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9z"/><path d="M8.5 12.5l2 2 4-4.5M8.5 17.5h7"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9"/></svg>',
  keyboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M6.5 10h.01M10 10h.01M13.5 10h.01M17 10h.01M6.5 13.5h.01M17 13.5h.01M9 13.5h6"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M11 20V4M18 20v-7"/><path d="M3 20h18"/></svg>',
  key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="15" r="4"/><path d="M11 12 19 4M16 6l2.5 2.5M13.2 8.8 15.5 11"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5 19 6v6c0 4.4-3 7.6-7 8.5-4-.9-7-4.1-7-8.5V6l7-2.5Z"/><path d="M9.2 12 11.3 14 14.8 10"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 0 4 20.5v-15Z"/><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v15h5.5a1.5 1.5 0 0 1 1.5 1.5v-15Z"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M10.2 8.6 15.6 12l-5.4 3.4V8.6Z"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3c0 1-.9 1.8-1.9 1.6-6.1-1.1-11-6-12.1-12.1-.2-1 .6-1.9 1.6-1.9Z"/></svg>',
  timer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13.5" r="7"/><path d="M12 13.5V9.8M9.5 3.5h5M12 3.5v3M18.2 7.3l1.3-1.3"/></svg>'
};

function smartechNavIcon(name) {
  return `<span class="nav-ico" aria-hidden="true">${SMARTECH_NAV_ICONS[name] || ""}</span>`;
}

function smartechSidebarHTML() {
  const name = (window.SmartechProfile && window.SmartechProfile.getName()) || "";
  const initial = name ? name.trim().charAt(0).toUpperCase() : "?";
  const userBlock = name
    ? `<div class="sidebar-user">
         <div class="sidebar-user-avatar">${initial}</div>
         <div style="flex:1;min-width:0;">
           <div class="sidebar-user-name">${name.replace(/</g, "&lt;")}</div>
           <button class="sidebar-user-edit" id="editProfileBtn">change name</button>
         </div>
       </div>`
    : "";

  const courseLinks = [
    ["engtutor.html", "English"],
    ["pbitutor.html", "Punjabi"],
    ["hinditutor.html", "Hindi"]
  ];
  const navItems = [
    ["index.html", "home", "Dashboard"],
    ["demo.html", "play", "Demo Test (5 min)"],
    ["speedtest.html", "timer", "Speed Test"],
    ["tests.html", "clipboard", "Test Centre"],
    ["#courses", "keyboard", "Typing Courses"],
    ["progress.html", "chart", "My Progress"],
    ["guide.html", "book", "User Guide"],
    ["activate.html", "key", "Activation"],
    ["disclaimer.html", "shield", "Disclaimer &amp; Privacy Policy"],
    ["contact.html", "phone", "Contact"]
  ];

  const page = window.location.pathname.split("/").pop() || "index.html";
  const courseActive = courseLinks.some(([href]) => href === page);
  const navHTML = navItems.map(([href, icon, label]) => {
    if (href === "#courses") {
      const sub = courseLinks.map(([h, l]) =>
        `<li><a href="${h}" class="nav-sub">${l}</a></li>`).join("");
      return `<li class="nav-group${courseActive ? " open" : ""}">
        <button type="button" class="nav-group-btn" id="coursesToggle" aria-expanded="${courseActive}" aria-controls="coursesMenu">${smartechNavIcon(icon)}<span class="nav-label">${label}</span><span class="nav-caret" aria-hidden="true"></span></button>
        <ul class="nav-submenu" id="coursesMenu">${sub}</ul>
      </li>`;
    }
    return `<li><a href="${href}">${smartechNavIcon(icon)}<span class="nav-label">${label}</span></a></li>`;
  }).join("\n    ");

  const themePickerHTML = smartechThemePickerHTML();

  return `
<div class="sidebar" id="sidebar">

  <div class="sidebar-header">
    <img src="logo.png" class="sidebar-logo">
    <div class="logo-text">Smartech Typing Tutor</div>
  </div>

  ${userBlock}

  <ul>
    ${navHTML}
  </ul>

  ${themePickerHTML}

  <div class="sidebar-footer">Smartech Education Computer Institute, Patiala<span class="sidebar-version" id="sidebarVersion"></span></div>
</div>`;
}

// Small swatch row for picking one of the 3 app themes. Uses window.SmartechTheme
// (from themes.js) when available, but falls back to this embedded copy of the
// same themes so the picker still renders — just visually, until themes.js
// loads — even if that script is ever missing or slow to load on a page.
const SMARTECH_THEME_FALLBACK = {
  keys: ["classic", "silver", "pearl", "mint", "lavender"],
  meta: {
    classic:  { label: "Ink & Gold",      swatch: "linear-gradient(135deg, #0B1E36, #B8862E)" },
    silver:   { label: "Silver Steel",    swatch: "linear-gradient(135deg, #9AA5AF, #E9EDF1)" },
    pearl:    { label: "Pearl Ivory",     swatch: "linear-gradient(135deg, #FAF7F2, #C9A227)" },
    mint:     { label: "Mint Fresh",      swatch: "linear-gradient(135deg, #F2FAF7, #1FA38A)" },
    lavender: { label: "Lavender Mist",   swatch: "linear-gradient(135deg, #F6F4FD, #7B68E0)" }
  }
};

function smartechThemePickerHTML() {
  const api = window.SmartechTheme || SMARTECH_THEME_FALLBACK;
  const current = window.SmartechTheme ? window.SmartechTheme.get() : "classic";
  const swatches = api.keys.map((key) => {
    const meta = api.meta[key];
    const active = key === current ? " active-theme" : "";
    return `<button type="button" class="theme-swatch${active}" data-theme-key="${key}"
              title="${meta.label}" aria-label="${meta.label} theme" aria-pressed="${key === current}"
              style="background:${meta.swatch};"></button>`;
  }).join("\n      ");

  return `
  <div class="theme-picker">
    <div class="theme-picker-label">Theme</div>
    <div class="theme-swatches">
      ${swatches}
    </div>
  </div>`;
}


/* ------------------------------------------------------------
   Page headings
   One consistent heading (eyebrow + title + one-line purpose) is
   built here for every inner page, so no page needs its own
   hand-made header. Pages with their own hero (Dashboard,
   Activation, Contact) are left alone.
   ------------------------------------------------------------ */
const SMARTECH_PAGES = {
  "demo.html":           { eyebrow: "Demo",    title: "5-Minute Demo Test",    sub: "Try a real typing test in English, Punjabi or Hindi. Pick your language and type for 5 minutes." },
  "testexercises.html":  { eyebrow: "Tests",   title: "Test Exercises",        sub: "Choose the exercise you want to practise for this test.", back: ["tests.html", "Test Centre"] },
  "manage.html":         { eyebrow: "Admin",   title: "Manage & Print",        sub: "See every test type and exercise from your GitHub file, and print them on A4 with the Smartech Education header." },
  "tests.html":          { eyebrow: "Tests",   title: "Test Centre",           sub: "Choose an exam-style test. Each test has its own time, pass rule and access code." },
  "engtutor.html":       { eyebrow: "English", title: "English Typing Course", sub: "Learn the keyboard letter by letter, then build speed with tests and exam-style exercises." },
  "pbitutor.html":       { eyebrow: "Punjabi", title: "Punjabi Typing Course", sub: "Learn the Punjabi keyboard letter by letter, then build speed with tests and exam-style exercises." },
  "hinditutor.html":     { eyebrow: "Hindi",   title: "Hindi Typing Course",   sub: "Learn the Hindi keyboard letter by letter, then build speed with tests and exam-style exercises." },
  "speedtest.html":      { eyebrow: "Practice", title: "Speed Test",           sub: "Choose your language and a timer, then type the passage. Your speed and accuracy are shown when time is up." },
  "engexercises.html":   { eyebrow: "English", title: "English Long Paragraph Practice", sub: "Full-length exam-style passages for English typing tests.", back: ["engtutor.html", "English Course"] },
  "pbiexercises.html":   { eyebrow: "Punjabi", title: "Punjabi Long Paragraph Practice", sub: "Full-length exam-style passages for Punjabi typing tests.", back: ["pbitutor.html", "Punjabi Course"] },
  "hindiexercises.html": { eyebrow: "Hindi",   title: "Hindi Long Paragraph Practice",   sub: "Full-length exam-style passages for Hindi typing tests.", back: ["hinditutor.html", "Hindi Course"] },
  "testpage.html":       { eyebrow: "Practice", title: "Typing Practice",       sub: "Type each chunk exactly as shown. Your result is saved automatically when you finish.", dynamicLang: true },
  "paragraph.html":      { eyebrow: "Practice", title: "Long Paragraph Practice", sub: "Type the full passage exactly as shown. Your result is saved automatically when you finish.", dynamicLang: true },
  "progress.html":       { eyebrow: "Results", title: "My Progress",            sub: "Every typing test taken on this device: speeds, accuracy and earned certificates." },
  "guide.html":          { eyebrow: "Help",    title: "User Guide",             sub: "Everything you need to install, activate and get the most out of Smartech Typing Tutor." },
  "disclaimer.html":     { eyebrow: "Legal",   title: "Disclaimer, Privacy &amp; Licence", sub: "How this software may be used, what it stores, and the terms of your licence." }
};

function smartechIsDemoMode() {
  try { return localStorage.getItem("selectedExerciseMode") === "demo"; } catch (e) { return false; }
}

/* The test type (from tests.html) being taken on testpage.html / paragraph.html, if any */
function smartechActiveTestInfo() {
  try {
    const c = JSON.parse(localStorage.getItem("smartechActiveTest"));
    return c && c.id && c.minutes ? c : null;
  } catch (e) { return null; }
}

function smartechRenderPageHeader() {
  const page = window.location.pathname.split("/").pop() || "index.html";
  const meta = SMARTECH_PAGES[page];
  if (!meta || document.querySelector(".app-page-head")) return;
  const main = document.querySelector(".main");
  if (!main) return;

  let title = meta.title;
  let sub = meta.sub;
  let back = meta.back;
  const demoMode = page === "paragraph.html" && smartechIsDemoMode();
  const testInfo = meta.dynamicLang && !demoMode ? smartechActiveTestInfo() : null;
  if (meta.dynamicLang) {
    let lang = "";
    try { lang = localStorage.getItem("selectedExerciseLanguage") || ""; } catch (e) {}
    if (/^(English|Punjabi|Hindi)$/.test(lang)) title = lang + " " + title;
    if (demoMode) {
      title = (/^(English|Punjabi|Hindi)$/.test(lang) ? lang + " " : "") + "Demo Test";
      sub = "5-minute demo test. Type the passage exactly as shown. Your speed and accuracy appear when time is up.";
      back = ["demo.html", "Demo"];
    } else if (testInfo) {
      title = String(testInfo.name).replace(/&/g, "&amp;").replace(/</g, "&lt;");
      sub = "Type the passage exactly as shown. Your result follows this test's pass rule and is saved automatically when you finish.";
      back = ["testexercises.html?id=" + encodeURIComponent(testInfo.id), "Test exercises"];
    }
  }

  const links = [`<a class="aph-link" href="index.html">Dashboard</a>`];
  if (back) links.unshift(`<a class="aph-link" href="${back[0]}">&larr; ${back[1]}</a>`);

  let eyebrowExtra = "";
  if (demoMode) {
    eyebrowExtra = '<span class="aph-pill">Demo &middot; 5 min</span>';
  } else if (testInfo) {
    eyebrowExtra = '<span class="aph-pill">' + testInfo.minutes + ' min</span>';
  } else if (meta.dynamicLang) {
    try {
      const no = localStorage.getItem("selectedExerciseNo");
      const t = localStorage.getItem("selectedExerciseTitle");
      if (no) eyebrowExtra = '<span class="aph-pill" title="' + (t || "").replace(/"/g, "&quot;").replace(/</g, "&lt;") + '">Exercise ' + no + '</span>';
    } catch (e) {}
  }

  const head = document.createElement("header");
  head.className = "app-page-head";
  head.innerHTML = `
    <div class="aph-text">
      <div class="aph-eyebrow">Smartech Typing Tutor &middot; ${meta.eyebrow}</div>
      <h1 class="aph-title">${title}${eyebrowExtra}</h1>
      <p class="aph-sub">${sub}</p>
    </div>
    <div class="aph-actions" role="navigation" aria-label="Page navigation">${links.join("")}</div>`;

  const toggle = document.getElementById("menuToggle");
  if (toggle && toggle.parentNode === main) toggle.insertAdjacentElement("afterend", head);
  else main.insertAdjacentElement("afterbegin", head);

  // Keep the window/tab title in step with the heading
  document.title = title.replace(/&amp;/g, "&") + " | Smartech Typing Tutor";
}

function smartechShowVersion() {
  const el = document.getElementById("sidebarVersion");
  if (!el || !window.electronAPI || !window.electronAPI.getAppInfo) return;
  window.electronAPI.getAppInfo().then(function (info) {
    if (info && info.version) el.textContent = "Version " + info.version;
  }).catch(function () {});
}

function smartechRenderSidebar() {
  const existing = document.getElementById("sidebar");
  if (existing) existing.remove();
  document.body.insertAdjacentHTML("afterbegin", smartechSidebarHTML());

  const sidebar = document.getElementById("sidebar");
  const menuToggle = document.getElementById("menuToggle");

  // Highlight the current page in the nav
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  const inTest = (currentPage === "paragraph.html" || currentPage === "testpage.html") && !smartechIsDemoMode() && smartechActiveTestInfo();
  const activeHref = (currentPage === "paragraph.html" && smartechIsDemoMode()) ? "demo.html" : (inTest ? "tests.html" : (currentPage === "testexercises.html" ? "tests.html" : currentPage));
  sidebar.querySelectorAll("ul li a").forEach((link) => {
    if (link.getAttribute("href") === activeHref) {
      link.classList.add("active-link");
    }
  });

  if (localStorage.getItem("sidebarState") === "open") {
    sidebar.classList.add("active");
  }

  if (menuToggle) {
    menuToggle.addEventListener("click", function () {
      sidebar.classList.toggle("active");
      localStorage.setItem("sidebarState", sidebar.classList.contains("active") ? "open" : "closed");
    });
  }

  const coursesBtn = document.getElementById("coursesToggle");
  if (coursesBtn) {
    coursesBtn.addEventListener("click", () => {
      const group = coursesBtn.closest(".nav-group");
      const open = group.classList.toggle("open");
      coursesBtn.setAttribute("aria-expanded", String(open));
    });
  }
  // keep the group open when one of its pages is the active one
  const activeSub = sidebar.querySelector(".nav-submenu a.active-link");
  if (activeSub) activeSub.closest(".nav-group").classList.add("open");

  sidebar.querySelectorAll(".theme-swatch").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (window.SmartechTheme) window.SmartechTheme.set(btn.dataset.themeKey);
      sidebar.querySelectorAll(".theme-swatch").forEach((b) => {
        const isActive = b === btn;
        b.classList.toggle("active-theme", isActive);
        b.setAttribute("aria-pressed", String(isActive));
      });
    });
  });

  const editBtn = document.getElementById("editProfileBtn");
  if (editBtn) {
    editBtn.addEventListener("click", () => {
      try { localStorage.removeItem("smartechUserName"); } catch (e) {}
      if (window.SmartechProfile) window.SmartechProfile.ensureCaptured();
    });
  }

  // On pages other than the main "hub" pages, auto-collapse the
  // sidebar after a few seconds so it doesn't block the content.
  const hubPages = ["index.html", "activate.html", "contact.html", "disclaimer.html", "progress.html", "guide.html"];
  if (!hubPages.includes(currentPage)) {
    setTimeout(function () {
      sidebar.classList.remove("active");
      localStorage.setItem("sidebarState", "closed");
    }, 5000);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  smartechRenderSidebar();
  smartechRenderPageHeader();
  smartechShowVersion();

  // First launch (or whenever the name has been cleared): ask who's typing.
  if (window.SmartechProfile) {
    window.SmartechProfile.ensureCaptured();
  }
});

// Re-render the sidebar's user badge the moment a name is saved,
// without requiring a page reload.
document.addEventListener("smartech:profile-updated", function () {
  smartechRenderSidebar();
});
