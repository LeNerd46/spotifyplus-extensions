globalThis.__spotifyplus_worklet_bundle__ = 2;
"use strict";

// index.tsx
var import_react = require("react");
var import_spotifyplus = require("spotifyplus");
var import_react2 = require("spotifyplus/react");
var import_jsx_runtime = require("react/jsx-runtime");
var logo = import_spotifyplus.SpotifyPlus.Assets.image("assets/lastfm");
var username = import_spotifyplus.SpotifyPlus.Platform.Storage.get("username") ?? "";
var apiKey = "3713c2e0b7493e945555b7f52dc4232e";
var getMediaType = (uri) => {
  if (uri.startsWith("spotify:track:")) return "track";
  if (uri.startsWith("spotify:album:")) return "album";
  if (uri.startsWith("spotify:artist:")) return "artist";
  return null;
};
var getScrobbles = async (media) => {
  const params = new URLSearchParams({
    method: `${media.type}.getInfo`,
    api_key: apiKey,
    format: "json",
    user: username
  });
  if (media.type === "track") {
    params.set("track", media.title);
    params.set("artist", media.artist ?? "");
  } else if (media.type === "album") {
    params.set("album", media.title);
    params.set("artist", media.artist ?? "");
  } else {
    params.set("artist", media.title);
  }
  const response = await fetch(`https://ws.audioscrobbler.com/2.0/?${params}`);
  if (!response.ok) throw new Error(`Last.fm HTTP ${response.status}`);
  const json = await response.json();
  if (json.error) throw new Error(json.message ?? "Last.fm API error");
  const count = media.type === "artist" ? json.artist?.stats?.userplaycount : json[media.type]?.userplaycount;
  return Number(count ?? 0);
};
var getMedia = async (uri, type) => {
  switch (type) {
    case "track": {
      const track = await import_spotifyplus.SpotifyPlus.Internal.getTrack(uri);
      if (!track) return null;
      return {
        type,
        title: track.title,
        artist: track.artist,
        image: track.album.image
      };
    }
    case "album": {
      const album = await import_spotifyplus.SpotifyPlus.Internal.getAlbum(uri);
      if (!album) return null;
      return {
        type,
        title: album.name,
        artist: album.artists[0].name,
        image: album.image
      };
    }
    case "artist": {
      const artist = await import_spotifyplus.SpotifyPlus.Internal.getArtist(uri);
      if (!artist) return null;
      return {
        type,
        title: artist.name,
        image: artist.image
      };
    }
  }
};
import_spotifyplus.SpotifyPlus.UI.replace("contextMenu.header", (thing) => {
  const [media, setMedia] = (0, import_react.useState)(null);
  const [scrobbles, setScrobbles] = (0, import_react.useState)(null);
  (0, import_react.useEffect)(() => {
    const uri = thing.context.uri;
    const type2 = uri ? getMediaType(uri) : null;
    let cancelled = false;
    setMedia(null);
    setScrobbles(null);
    if (!uri || !type2) return;
    const loadMedia = async () => {
      try {
        const result = await getMedia(uri, type2);
        if (cancelled || !result) return;
        setMedia(result);
        const count = await getScrobbles(result);
        if (cancelled) return;
        setScrobbles(count);
      } catch (error) {
        if (!cancelled) console.error("Failed to load media information:", error);
      }
    };
    loadMedia();
    return () => {
      cancelled = true;
    };
  }, [thing.context.uri]);
  const subtitle = media ? [media.artist, scrobbles !== null ? `${scrobbles.toLocaleString()} scrobbles` : null].filter(Boolean).join(" \xB7 ") : "";
  const type = thing.context.uri ? getMediaType(thing.context.uri) : null;
  if (!type) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(thing.Original, {});
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react2.View, { style: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    width: "100%"
  }, children: media ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react2.Image, { source: {
      uri: media.image
    }, style: {
      width: 48,
      height: 48,
      borderRadius: media.type === "artist" ? 24 : 4
    } }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_react2.View, { style: {
      flex: 1,
      justifyContent: "center",
      gap: 4
    }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react2.Text, { numberOfLines: 1, style: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "500"
      }, children: media.title }),
      subtitle ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react2.Text, { numberOfLines: 1, style: {
        color: "#B3B3B3",
        fontSize: 14
      }, children: subtitle }) : null
    ] })
  ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react2.Text, { style: {
    color: "#B3B3B3",
    fontSize: 14
  }, children: "Loading..." }) });
});
var usernameSetting = {
  id: "lastfm_username",
  type: "text",
  label: "Last.fm Username",
  value: username,
  description: "Enter your last.fm username so it can show you the scrobbles for your account",
  placeholder: "Username"
};
import_spotifyplus.SpotifyPlus.Settings.registerSettings([{
  title: "Last.fm Settings",
  items: [usernameSetting]
}]);
import_spotifyplus.SpotifyPlus.Events.on("settings.changed", (e) => {
  const setting = e;
  if (setting?.id === "lastfm_username" && setting?.type === "text") {
    import_spotifyplus.SpotifyPlus.Platform.Storage.set("username", setting.value);
    usernameSetting.value = setting.value;
    username = setting.value;
  }
});
new import_spotifyplus.SpotifyPlus.ContextMenu("Open in Last.fm", (uri) => {
  import_spotifyplus.SpotifyPlus.Navigation.open(``);
}, void 0, void 0, void 0, logo).register();
