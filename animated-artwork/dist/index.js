globalThis.__spotifyplus_worklet_bundle__ = 2;
"use strict";

// index.tsx
var import_react = require("react");
var import_spotifyplus = require("spotifyplus");
var import_react2 = require("spotifyplus/react");

// artwork.ts
var cache = /* @__PURE__ */ new Map();
var normalize = (value) => value.toLowerCase().replace(/\s+-\s+(single|ep)$/, "").replace(/\s*[([][^)\]]*[)\]]/g, "").replace(/[\s!-\/:-@\[-`{-~ -¿ -⁯　-〿！-／]+/g, " ").trim();
var decodeEntities = (value) => value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
async function findAlbumPage(query) {
  const params = new URLSearchParams({
    country: "us",
    media: "music",
    entity: query.title ? "song" : "album",
    limit: "10",
    term: `${query.title ?? query.album} ${query.artist}`
  });
  const response = await fetch(`https://itunes.apple.com/search?${params}`);
  if (!response.ok) throw new Error(`iTunes search HTTP ${response.status}`);
  const json = await response.json();
  const results = (json.results ?? []).filter((result) => result.collectionViewUrl);
  if (results.length === 0) return null;
  const album = normalize(query.album);
  const match = results.find((result) => normalize(result.collectionName ?? "") === album) ?? results.find((result) => {
    const name = normalize(result.collectionName ?? "");
    return name.length > 0 && (name.startsWith(album) || album.startsWith(name));
  }) ?? results[0];
  return match.collectionViewUrl ?? null;
}
async function lookup(query) {
  const page = await findAlbumPage(query);
  if (!page) return null;
  const response = await fetch(page);
  if (!response.ok) throw new Error(`Apple Music HTTP ${response.status}`);
  const html = await response.text();
  const video = /<amp-ambient-video\b[^>]*?\ssrc="([^"]+)"/.exec(html);
  return video ? decodeEntities(video[1]) : null;
}
function findAnimatedArtwork(query) {
  const key = `${normalize(query.album)}\0${normalize(query.artist)}`;
  let result = cache.get(key);
  if (!result) {
    result = lookup(query);
    cache.set(key, result);
    result.catch(() => cache.delete(key));
  }
  return result;
}

// index.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var ArtworkVideo = (0, import_react2.createNativeComponent)("ArtworkVideo");
var middleCover = {
  screen: "nowPlaying.page",
  resourceId: "com.spotify.music:id/cover_art_container",
  minVisible: 0.85
};
var albumHeader = {
  screen: "album.page",
  resourceId: "com.spotify.music:id/cwp_header_artwork"
};
async function queryFor(uri) {
  if (uri.startsWith("spotify:track:")) {
    const track = await import_spotifyplus.SpotifyPlus.Internal.getTrack(uri);
    return track && {
      title: track.title,
      artist: track.artist,
      album: track.album.title
    };
  }
  if (uri.startsWith("spotify:album:")) {
    const album = await import_spotifyplus.SpotifyPlus.Internal.getAlbum(uri);
    return album && {
      artist: album.artists[0]?.name ?? "",
      album: album.name
    };
  }
  return null;
}
function AnimatedArtwork({
  uri
}) {
  const [src, setSrc] = (0, import_react.useState)(null);
  (0, import_react.useEffect)(() => {
    let cancelled = false;
    setSrc(null);
    if (!uri) return;
    const load = async () => {
      try {
        const query = await queryFor(uri);
        if (cancelled || !query) return;
        const video = await findAnimatedArtwork(query);
        if (!cancelled) setSrc(video);
      } catch (error) {
        if (!cancelled) console.warn("Could not load animated artwork", error);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [uri]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArtworkVideo, { width: "100%", height: "100%", src });
}
import_spotifyplus.SpotifyPlus.UI.overlay(middleCover, ({
  context
}) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatedArtwork, { uri: context.uri }));
import_spotifyplus.SpotifyPlus.UI.overlay(albumHeader, ({
  context
}) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatedArtwork, { uri: context.uri }));
