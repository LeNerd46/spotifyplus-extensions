globalThis.__spotifyplus_worklet_bundle__ = 2;
"use strict";

// index.tsx
var import_react = require("react");
var import_spotifyplus = require("spotifyplus");
var import_react2 = require("spotifyplus/react");

// artwork.ts
var cache = /* @__PURE__ */ new Map();
var normalize = (value) => value.toLowerCase().replace(/\s+-\s+(single|ep)$/, "").replace(/\s*[([][^)\]]*[)\]]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
var decodeEntities = (value) => value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
async function findAlbumPage(query) {
  const params = new URLSearchParams({
    country: "us",
    media: "music",
    entity: "song",
    limit: "10",
    term: `${query.title} ${query.artist}`
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
function AnimatedArtwork({
  uri
}) {
  const [src, setSrc] = (0, import_react.useState)(null);
  (0, import_react.useEffect)(() => {
    let cancelled = false;
    setSrc(null);
    if (!uri?.startsWith("spotify:track:")) return;
    const load = async () => {
      try {
        const track = await import_spotifyplus.SpotifyPlus.Internal.getTrack(uri);
        if (cancelled || !track) return;
        const video = await findAnimatedArtwork({
          title: track.title,
          artist: track.artist,
          album: track.album.title
        });
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
