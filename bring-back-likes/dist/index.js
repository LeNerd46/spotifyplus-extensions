globalThis.__spotifyplus_worklet_bundle__ = 2;
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// index.ts
var import_react = __toESM(require("react"), 1);
var import_spotifyplus = require("spotifyplus");
var import_react2 = require("spotifyplus/react");
var HeartOverlay = (0, import_react2.createNativeComponent)("HeartOverlay");
function LikeButton() {
  const [state, setState] = (0, import_react.useState)({
    uri: null,
    liked: false
  });
  const current = (0, import_react.useRef)(state);
  const pendingUntil = (0, import_react.useRef)(0);
  (0, import_react.useEffect)(() => {
    function refresh() {
      try {
        const playing = import_spotifyplus.SpotifyPlus.Player.getState().trackUri;
        const uri = playing?.startsWith("spotify:track:") ? playing : null;
        if (uri === current.current.uri && Date.now() < pendingUntil.current) return;
        const next = {
          uri,
          liked: uri ? import_spotifyplus.SpotifyPlus.Library.isLiked(uri) : false
        };
        if (next.uri !== current.current.uri || next.liked !== current.current.liked) {
          current.current = next;
          setState(next);
        }
      } catch (error) {
        console.warn("Could not check the current song's like status", error);
      }
    }
    refresh();
    import_spotifyplus.SpotifyPlus.Events.on("songChanged", refresh);
    const timer = setInterval(refresh, 1500);
    return () => {
      clearInterval(timer);
      import_spotifyplus.SpotifyPlus.Events.off("songChanged", refresh);
    };
  }, []);
  function toggle() {
    if (Date.now() < pendingUntil.current) return;
    const uri = current.current.uri;
    if (!uri || import_spotifyplus.SpotifyPlus.Player.getState().trackUri !== uri) return;
    try {
      const liked = import_spotifyplus.SpotifyPlus.Library.isLiked(uri);
      if (liked) import_spotifyplus.SpotifyPlus.Library.unlike(uri);
      else import_spotifyplus.SpotifyPlus.Library.like(uri);
      pendingUntil.current = Date.now() + 1200;
      current.current = {
        uri,
        liked: !liked
      };
      setState(current.current);
    } catch (error) {
      console.error("Could not change the song's like status", error);
      import_spotifyplus.SpotifyPlus.toast("Could not update Liked Songs. Please try again");
    }
  }
  return import_react.default.createElement(HeartOverlay, {
    width: "100%",
    height: "100%",
    liked: state.liked,
    available: state.uri !== null,
    onPress: toggle
  });
}
import_spotifyplus.SpotifyPlus.UI.overlay("nowPlaying.page", LikeButton);
