globalThis.__spotifyplus_worklet_bundle__ = 2;
"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// index.ts
var import_spotifyplus = require("spotifyplus");

// play-next.ts
var PlayNextError = class extends Error {
  constructor(message, added, options) {
    super(message, options);
    this.added = added;
    this.name = "PlayNextError";
  }
};
var PlayNextQueue = class {
  constructor(upNext) {
    __publicField(this, "pending", []);
    this.upNext = upNext;
  }
  get hasPending() {
    return this.pending.length > 0;
  }
  reset() {
    this.pending = [];
  }
  reconcile(snapshot) {
    const upcoming = new Set(snapshot.next.map((track) => track.uid));
    this.pending = this.pending.filter((uid) => uid !== snapshot.current?.uid && upcoming.has(uid));
  }
  refresh() {
    if (this.hasPending) this.reconcile(this.upNext.get());
  }
  add(uri) {
    if (!/^spotify:track:[A-Za-z0-9]+$/.test(uri)) {
      throw new PlayNextError("Play next only supports tracks", false);
    }
    let added = false;
    let stage = "read Up next";
    try {
      const before = this.upNext.get();
      this.reconcile(before);
      const owned = new Set(this.pending);
      let destination = 0;
      for (let index = 0; index < before.next.length; index++) {
        if (owned.has(before.next[index].uid)) destination = index + 1;
      }
      stage = "insert the track into Play next";
      const entries = this.upNext.add(uri, destination);
      added = true;
      if (!Array.isArray(entries) || entries.length !== 1 || !entries[0].uid || entries[0].uri !== uri) {
        throw new Error("Spotify Plus did not return the ID. Please try restarting Spotify");
      }
      const entry = entries[0];
      this.pending.push(entry.uid);
    } catch (cause) {
      const detail = cause?.message ?? String(cause);
      throw new PlayNextError(`Could not ${stage}: ${detail}`, added, {
        cause
      });
    }
  }
};

// index.ts
var queue = new PlayNextQueue(import_spotifyplus.SpotifyPlus.UpNext);
var timer;
var refreshFailed = false;
function updateTimer() {
  if (queue.hasPending && timer === void 0) timer = setInterval(refresh, 5e3);
  if (!queue.hasPending && timer !== void 0) {
    clearInterval(timer);
    timer = void 0;
  }
}
function refresh() {
  try {
    queue.refresh();
    refreshFailed = false;
  } catch (error) {
    if (!refreshFailed) import_spotifyplus.SpotifyPlus.warn("Could not refresh Play next entries", error);
    refreshFailed = true;
  }
  updateTimer();
}
function reset() {
  queue.reset();
  refreshFailed = false;
  updateTimer();
}
new import_spotifyplus.SpotifyPlus.ContextMenu("Play next", (uri) => {
  if (!import_spotifyplus.SpotifyPlus.UpNext) {
    import_spotifyplus.SpotifyPlus.toast("Update Spotify Plus and restart Spotify to use Play next.");
    return;
  }
  try {
    queue.add(uri);
    import_spotifyplus.SpotifyPlus.toast("Added to up next");
  } catch (error) {
    import_spotifyplus.SpotifyPlus.error("Could not add Play next track", error);
    if (error instanceof PlayNextError && error.cause !== void 0) {
      const cause = error.cause;
      import_spotifyplus.SpotifyPlus.error("Play next underlying error", cause?.message ?? String(error.cause), cause?.stack);
    }
    import_spotifyplus.SpotifyPlus.toast(error instanceof PlayNextError && error.added ? "Added to Up next, but couldn't track it. Update Spotify Plus." : "Could not add to Play next. Please try again.");
  }
  updateTimer();
}, (uri) => /^spotify:track:[A-Za-z0-9]+$/.test(uri), false, "track").register();
import_spotifyplus.SpotifyPlus.Events.on("songChanged", refresh);
import_spotifyplus.SpotifyPlus.Events.on("shuffleChanged", refresh);
import_spotifyplus.SpotifyPlus.Events.on("contextChanged", reset);
import_spotifyplus.SpotifyPlus.Events.on("deviceChanged", reset);
