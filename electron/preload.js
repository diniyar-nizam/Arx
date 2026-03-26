const { contextBridge, ipcRenderer } = require("electron");

const on = (channel, cb) => {
  const handler = (_, data) => cb(data);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};

contextBridge.exposeInMainWorld("api", {
  startBrowser: () => ipcRenderer.invoke("start-browser"),
  stopBrowser: () => ipcRenderer.invoke("stop-browser"),
  isBrowserRunning: () => ipcRenderer.invoke("is-browser-running"),

  getDeviceId: () => ipcRenderer.invoke("get-device-id"),

  onBrowserStarted: (cb) => {
  const handler = () => cb();
  ipcRenderer.on("browser-started", handler);
  return () => ipcRenderer.removeListener("browser-started", handler);
},

onBrowserStopped: (cb) => {
  const handler = () => cb();
  ipcRenderer.on("browser-stopped", handler);
  return () => ipcRenderer.removeListener("browser-stopped", handler);
},
  onChromiumClosed: (cb) => {
  const handler = () => cb();
  ipcRenderer.on("chromium-closed", handler);
  return () => ipcRenderer.removeListener("chromium-closed", handler);
},

  openProfileManager: () =>
    ipcRenderer.invoke("openProfileManager"),
  getChromiumProfiles: (userId) =>
    ipcRenderer.invoke("getChromiumProfiles", userId),
  openProfile: (dir) =>
    ipcRenderer.invoke("openProfile", dir),
  deleteProfile: (dir) =>
    ipcRenderer.invoke("deleteProfile", dir),

  onLog: (cb) => on("log", cb),

  startMailing: (payload) =>
    ipcRenderer.invoke("start-mailing", payload),

  startFollowUp: (payload) =>
    ipcRenderer.invoke("start-followup", payload),

  onMailingState: (cb) => {
  const handler = (_, state) => cb(state);
  ipcRenderer.on("mailing-state", handler);
  return () => ipcRenderer.removeListener("mailing-state", handler);
},

  onUsernamesUpdated: (cb) => {
  const handler = () => cb();
  ipcRenderer.on("usernames-updated", handler);
  return () => ipcRenderer.removeListener("usernames-updated", handler);
},
});