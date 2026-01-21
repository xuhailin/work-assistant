const { contextBridge, ipcRenderer, clipboard } = require("electron");

console.log("🔧 Preload script loaded");

const api = {
  openFile: () => ipcRenderer.invoke("dialog:openFile"),
  openFolder: () => ipcRenderer.invoke("dialog:openFolder"),
  getGitLogs: (path, page, pageSize) => ipcRenderer.invoke("git:getLogs", path, page, pageSize),
  getMultipleLogs: (paths, pageSize) => ipcRenderer.invoke("git:getMultipleLogs", paths, pageSize),
  copyText: (text) => clipboard.writeText(text),
  getFavorites: () => ipcRenderer.invoke("favorites:get"),
  saveFavorites: (favorites) => ipcRenderer.invoke("favorites:save", favorites),
  getCalendarMarks: () => ipcRenderer.invoke("calendar:getMarks"),
  saveCalendarMarks: (marks) => ipcRenderer.invoke("calendar:saveMarks", marks),
  getRunningData: () => ipcRenderer.invoke("running:getData"),
  saveRunningData: (records) => ipcRenderer.invoke("running:saveData", records),
  analyzeRunningImage: (payload) => ipcRenderer.invoke("running:analyzeImage", payload),
};

console.log("🔧 Exposing API methods:", Object.keys(api));
console.log("🔧 analyzeRunningImage exists:", typeof api.analyzeRunningImage === "function");

contextBridge.exposeInMainWorld("api", api);
