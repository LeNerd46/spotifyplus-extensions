globalThis.__spotifyplus_worklet_bundle__ = 2;
"use strict";

// index.ts
var import_spotifyplus = require("spotifyplus");
var SETTING_ID = "persistentPrivateSession";
var PRIVATE_SESSION_ID = "privateSession";
var storage = import_spotifyplus.SpotifyPlus.Platform.Storage;
var saved = storage.get(SETTING_ID);
var toggle = {
  id: SETTING_ID,
  type: "toggle",
  label: "Persistent private session",
  description: "Enable private session and turn it back on whenever Spotify disables it.",
  value: typeof saved === "boolean" ? saved : true
};
var retry;
function cancelRetry() {
  if (retry !== void 0) clearTimeout(retry);
  retry = void 0;
}
function ensurePrivateSession() {
  if (!toggle.value) return;
  try {
    if (import_spotifyplus.SpotifyPlus.Settings.get(PRIVATE_SESSION_ID) !== true) {
      import_spotifyplus.SpotifyPlus.Settings.set(PRIVATE_SESSION_ID, true);
    }
    cancelRetry();
  } catch (error) {
    if (retry === void 0) {
      import_spotifyplus.SpotifyPlus.warn("Could not enable private session; retrying in 5 seconds.", error);
      retry = setTimeout(() => {
        retry = void 0;
        ensurePrivateSession();
      }, 5e3);
    }
  }
}
import_spotifyplus.SpotifyPlus.Settings.registerSetting({
  title: "Persistent Private Session",
  items: [toggle]
});
import_spotifyplus.SpotifyPlus.Events.on("settings.changed", (setting) => {
  if (setting.id !== SETTING_ID || setting.type !== "toggle") return;
  storage.set(SETTING_ID, setting.value);
  toggle.value = setting.value;
  cancelRetry();
  if (toggle.value) ensurePrivateSession();
});
import_spotifyplus.SpotifyPlus.Events.on("settingChanged", ({
  id,
  value
}) => {
  if (id === PRIVATE_SESSION_ID && value === false) ensurePrivateSession();
});
ensurePrivateSession();
