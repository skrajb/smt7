const { contextBridge, ipcRenderer } = require("electron");

/* Small, safe API for the pages (no Node access in the renderer).
   Activation flags are written to localStorage by activate.html
   ("engActivated" / "pbiActivated"). */
contextBridge.exposeInMainWorld("electronAPI", {
  isActivated: () => {
    try {
      return Promise.resolve({
        english: localStorage.getItem("engActivated") === "true",
        punjabi: localStorage.getItem("pbiActivated") === "true"
      });
    } catch (e) {
      return Promise.resolve({ english: false, punjabi: false, error: String(e) });
    }
  },
  // { version: "4.0.0", deviceId: "XXXX-XXXX-XXXX" }
  getAppInfo: () => ipcRenderer.invoke("app:get-info")
});
