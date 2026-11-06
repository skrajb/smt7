const { app, BrowserWindow, Menu, shell, ipcMain, session } = require("electron");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { execFile } = require("child_process");

/* Keep using the folder v3.x used for its data (localStorage: activation,
   test history, certificates). Must run before the app is ready. Without
   this, renaming the package would silently start users with empty data. */
app.setPath("userData", path.join(app.getPath("appData"), "Smartech_Tutor_3.0"));

const isDev = !app.isPackaged;
let mainWindow = null;

/* ---------- stable per-PC id (Windows MachineGuid, hashed) ---------- */
let cachedDeviceId = null;
function getDeviceId() {
  if (cachedDeviceId) return Promise.resolve(cachedDeviceId);
  return new Promise((resolve) => {
    const finish = (raw) => {
      const h = crypto.createHash("sha256").update(raw).digest("hex").slice(0, 12).toUpperCase();
      cachedDeviceId = h.match(/.{4}/g).join("-");
      resolve(cachedDeviceId);
    };
    execFile(
      "reg",
      ["query", "HKLM\\SOFTWARE\\Microsoft\\Cryptography", "/v", "MachineGuid"],
      { windowsHide: true, timeout: 5000 },
      (err, stdout) => {
        const m = !err && /MachineGuid\s+REG_SZ\s+(\S+)/i.exec(stdout || "");
        finish(m ? m[1] : os.hostname() + (os.cpus()[0] || {}).model);
      }
    );
  });
}

ipcMain.handle("app:get-info", async () => ({
  version: app.getVersion(),
  deviceId: await getDeviceId()
}));

/* ---------- window ---------- */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1000,
    minHeight: 650,
    show: false,
    backgroundColor: "#ffffff",
    icon: path.join(__dirname, "icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      devTools: isDev // no DevTools in the installed app
    }
  });

  // Always remove Electron's default menu, in dev too — it ships its own
  // "Toggle Full Screen" role on F11 which fought our manual F11 handler
  // below (both toggled on the same keypress, so exiting fullscreen could
  // get stuck). With no menu, DevTools also loses its default Ctrl+Shift+I/
  // F12 shortcut in dev, so that's restored manually just below.
  Menu.setApplicationMenu(null);
  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.webContents.on("context-menu", (e) => e.preventDefault()); // no right-click menu
  mainWindow.on("closed", () => { mainWindow = null; });

  // F11 = fullscreen (useful for typing tests)
  // The menu bar is hidden (see below), which also removes its built-in
  // zoom accelerators, so Ctrl+=/-/0 are re-wired here by hand.
  const ZOOM_STEP = 0.1;
  const ZOOM_MIN = 0.5;
  const ZOOM_MAX = 2.0;
  mainWindow.webContents.on("before-input-event", (e, input) => {
    if (input.type !== "keyDown") return;

    if (input.key === "F11") {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      e.preventDefault();
      return;
    }

    if (isDev && (input.key === "F12" || (input.control && input.shift && input.key.toUpperCase() === "I"))) {
      mainWindow.webContents.toggleDevTools();
      e.preventDefault();
      return;
    }

    // Content protection (repeated here so it still holds if a page's own script fails):
    // no copy / cut / select-all / view-source / save, and no Print except on the print page.
    // (Paste is filtered per field by protect.js, so activation codes can still be pasted.)
    {
      const k = String(input.key || "").toLowerCase();
      const cc = input.control || input.meta;
      const onPrintPage = /printexercise\.html/i.test(mainWindow.webContents.getURL());
      if ((cc && ["c", "x", "a", "u", "s", "insert"].includes(k)) ||
          (input.shift && ["delete"].includes(k)) ||
          (cc && k === "p" && !onPrintPage) ||
          (!isDev && k === "f12")) {
        e.preventDefault();
        return;
      }
    }

    const ctrlOrCmd = input.control || input.meta;
    if (!ctrlOrCmd) return;

    if (input.key === "=" || input.key === "+") {
      const z = Math.min(ZOOM_MAX, mainWindow.webContents.getZoomFactor() + ZOOM_STEP);
      mainWindow.webContents.setZoomFactor(z);
      e.preventDefault();
    } else if (input.key === "-") {
      const z = Math.max(ZOOM_MIN, mainWindow.webContents.getZoomFactor() - ZOOM_STEP);
      mainWindow.webContents.setZoomFactor(z);
      e.preventDefault();
    } else if (input.key === "0") {
      mainWindow.webContents.setZoomFactor(1.0);
      e.preventDefault();
    }
  });

  // Ctrl + mouse wheel zoom
  mainWindow.webContents.on("zoom-changed", (e, direction) => {
    const z = mainWindow.webContents.getZoomFactor();
    const next = direction === "in"
      ? Math.min(ZOOM_MAX, z + ZOOM_STEP)
      : Math.max(ZOOM_MIN, z - ZOOM_STEP);
    mainWindow.webContents.setZoomFactor(next);
  });

  // Web links open in the user's browser; the app window never leaves file://
  const isWebLink = (u) => /^(https?:|mailto:|tel:)/i.test(u);
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isWebLink(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (e, url) => {
    if (!url.startsWith("file:")) {
      e.preventDefault();
      if (isWebLink(url)) shell.openExternal(url);
    }
  });

  mainWindow.loadFile("index.html");
}

/* ---------- lifecycle ---------- */
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    // The app needs no camera/mic/notification/etc. permissions
    session.defaultSession.setPermissionRequestHandler((_wc, _perm, cb) => cb(false));
    createWindow();
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
