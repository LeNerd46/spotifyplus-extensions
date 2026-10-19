globalThis.__spotifyplus_worklet_bundle__ = 2;
"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/index.tsx
var import_react = require("react");
var import_spotifyplus = require("spotifyplus");
var import_react2 = require("spotifyplus/react");

// src/model.ts
var DEFAULTS = [5, 10, 15, 30, 45, 60, 0];
var STORAGE_KEY = "sleep-timer-presets-v1";
function defaultConfiguration() {
  return {
    version: 1,
    presets: DEFAULTS.map((minutes) => ({
      key: minutes ? `default:${minutes}` : "default:end-of-content",
      defaultId: minutes ? `default:${minutes}` : "default:end-of-content",
      minutes
    }))
  };
}
function readConfiguration(value) {
  if (!value || typeof value !== "object") return defaultConfiguration();
  const config = value;
  if (config.version !== 1 || !Array.isArray(config.presets)) return defaultConfiguration();
  const keys = /* @__PURE__ */ new Set();
  for (const row of config.presets) {
    if (!row || typeof row.key !== "string" || !row.key || keys.has(row.key)) return defaultConfiguration();
    keys.add(row.key);
    if (row.defaultId) {
      const original = defaultConfiguration().presets.find((preset) => preset.key === row.defaultId);
      if (!original || row.key !== original.key || row.minutes !== original.minutes) return defaultConfiguration();
    } else if (!row.key.startsWith("custom:") || !Number.isInteger(row.minutes) || row.minutes <= 0 || row.minutes > 2147483647) return defaultConfiguration();
  }
  return {
    version: 1,
    presets: config.presets.map((row) => ({
      key: row.key,
      minutes: row.minutes,
      ...row.defaultId ? {
        defaultId: row.defaultId
      } : {}
    }))
  };
}
function durationMinutes(duration, unit) {
  const minutes = duration * (unit === "hours" ? 60 : 1);
  if (typeof duration !== "number" || !Number.isFinite(minutes) || !Number.isInteger(minutes) || minutes <= 0 || minutes > 2147483647 || !["minutes", "hours"].includes(unit)) throw new Error("Enter a positive duration in whole minutes (for example, 25 minutes or 1.5 hours).");
  return minutes;
}
function label(minutes) {
  if (!minutes) return "End of track / episode";
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  if (!hours) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  return `${hours} hour${hours === 1 ? "" : "s"}${rest ? ` ${rest} minute${rest === 1 ? "" : "s"}` : ""}`;
}
var TimerManager = class {
  constructor(api, storage, open, createId) {
    __publicField(this, "config");
    __publicField(this, "ids", /* @__PURE__ */ new Map());
    __publicField(this, "revision", 0);
    this.api = api;
    this.storage = storage;
    this.open = open;
    this.createId = createId;
    this.config = readConfiguration(storage.get(STORAGE_KEY));
    this.apply(this.config);
  }
  apply(config) {
    this.api.reset();
    this.ids.clear();
    const visibleDefaults = new Set(this.api.list().filter((row) => !row.scriptId).map((row) => row.id));
    for (const preset of defaultConfiguration().presets) {
      if (!config.presets.some((row) => row.defaultId === preset.defaultId) && visibleDefaults.has(preset.key)) this.api.remove(preset.key);
    }
    for (const preset of config.presets) {
      if (preset.defaultId) {
        if (visibleDefaults.has(preset.defaultId)) {
          this.ids.set(preset.key, preset.defaultId);
        }
      } else {
        this.ids.set(preset.key, this.api.add(preset.minutes).id);
      }
    }
    let before;
    for (const preset of [...config.presets].reverse()) {
      const id2 = this.ids.get(preset.key);
      if (id2) {
        this.api.move(id2, before);
        before = id2;
      }
    }
    const button = this.api.addButton("Manage timers", this.open);
    this.api.move(button.id, before);
  }
  snapshot() {
    return {
      revision: this.revision,
      rows: this.config.presets.map((row) => ({
        key: row.key,
        label: label(row.minutes),
        available: this.ids.has(row.key)
      }))
    };
  }
  handle(request) {
    if (!request || typeof request.requestId !== "string") throw new Error("Invalid timer request.");
    if (request.revision !== this.revision) throw new Error("The timer list changed. Please try again.");
    if (request.type === "submit") {
      const minutes = durationMinutes(request.duration, request.unit);
      if (typeof request.save !== "boolean") throw new Error("Choose whether to save this timer.");
      if (!request.save) {
        this.api.start(request.duration, request.unit);
        return {
          ...this.snapshot(),
          requestId: request.requestId,
          started: true,
          minutes
        };
      }
      if (this.config.presets.some((row) => row.minutes === minutes && minutes > 0)) throw new Error("That duration is already in your timer list.");
      this.commit({
        version: 1,
        presets: [...this.config.presets, {
          key: `custom:${this.createId()}`,
          minutes
        }]
      });
      return {
        ...this.snapshot(),
        requestId: request.requestId,
        saved: true
      };
    }
    if (request.type === "remove") {
      if (!this.config.presets.some((row) => row.key === request.key)) throw new Error("This timer is no longer in the list.");
      this.commit({
        version: 1,
        presets: this.config.presets.filter((row) => row.key !== request.key)
      });
    } else if (request.type === "move") {
      const order = request.order;
      if (!Array.isArray(order) || order.length !== this.config.presets.length || new Set(order).size !== order.length || order.some((key) => !this.config.presets.some((row) => row.key === key))) throw new Error("The timer order is invalid.");
      this.commit({
        version: 1,
        presets: order.map((key) => this.config.presets.find((row) => row.key === key))
      });
    } else throw new Error("Unknown timer action.");
    return {
      ...this.snapshot(),
      requestId: request.requestId
    };
  }
  commit(next) {
    const previous = this.config;
    try {
      this.apply(next);
      this.storage.set(STORAGE_KEY, next);
      this.config = next;
      this.revision++;
    } catch (error) {
      this.apply(previous);
      throw error;
    }
  }
};

// src/index.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var id = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
var TimerList = (0, import_react2.createNativeComponent)("TimerList", {
  scriptId: "com.spotifyplus.sleeptimer"
});
var manager = new TimerManager(import_spotifyplus.SpotifyPlus.Platform.SleepTimer, import_spotifyplus.SpotifyPlus.Platform.Storage, openManager, id);
var root;
var opening = false;
async function openManager() {
  if (opening || root) return;
  opening = true;
  try {
    root = await import_spotifyplus.SpotifyPlus.UI.mount(/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Manager, { onClose: () => {
      root?.dispose();
      root = void 0;
    } }));
  } catch (error) {
    console.error("Could not open timer manager", error);
    import_spotifyplus.SpotifyPlus.toast("Could not open the timer manager.");
  } finally {
    opening = false;
  }
}
function Manager({
  onClose
}) {
  const [snapshot, setSnapshot] = (0, import_react.useState)(() => manager.snapshot());
  const [editor, setEditor] = (0, import_react.useState)(false);
  const [error, setError] = (0, import_react.useState)("");
  const [refresh, setRefresh] = (0, import_react.useState)(0);
  const [instance] = (0, import_react.useState)(id);
  const act = (request) => {
    try {
      const reply = manager.handle({
        ...request,
        revision: manager.snapshot().revision,
        requestId: id()
      });
      setSnapshot(manager.snapshot());
      setError("");
      if ("started" in reply && reply.started) {
        import_spotifyplus.SpotifyPlus.toast(`Sleep timer set for ${label(reply.minutes)}.`);
        onClose();
      }
      return true;
    } catch (error2) {
      setSnapshot(manager.snapshot());
      setError(error2 instanceof Error ? error2.message : "Unable to update timers.");
      return false;
    } finally {
      setRefresh((value) => value + 1);
    }
  };
  (0, import_react.useEffect)(() => {
    const handler = (payload) => {
      if (payload.instance === instance) act(payload);
    };
    import_spotifyplus.SpotifyPlus.Events.on("sleepTimers.listAction", handler);
    return () => import_spotifyplus.SpotifyPlus.Events.off("sleepTimers.listAction", handler);
  }, [instance]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react2.BottomSheet, { visible: true, draggable: true, style: {
      backgroundColor: "#181818",
      borderRadius: 24
    }, onDismiss: onClose, onError: ({
      message
    }) => {
      import_spotifyplus.SpotifyPlus.toast(message);
      onClose();
    }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SheetContent, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SheetHeader, { title: "Manage timers", subtitle: "Touch and hold to change the order." }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TimerList, { rows: snapshot.rows, instance, refresh, style: {
        width: "100%",
        height: 320,
        marginTop: 20
      } }),
      error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorMessage, { message: error }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActionButton, { title: "Add sleep timer", onPress: () => {
        setError("");
        setEditor(true);
      } })
    ] }) }),
    editor && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TimerEditor, { error, onDismiss: () => {
      setEditor(false);
      setError("");
    }, onSubmit: (duration, unit, save) => {
      if (act({
        type: "submit",
        duration,
        unit,
        save
      })) {
        setEditor(false);
      }
    } })
  ] });
}
function TimerEditor({
  error,
  onDismiss,
  onSubmit
}) {
  const [duration, setDuration] = (0, import_react.useState)("");
  const [unit, setUnit] = (0, import_react.useState)("minutes");
  const [save, setSave] = (0, import_react.useState)(false);
  const valid = duration.trim().length > 0 && Number.isFinite(Number(duration)) && Number(duration) > 0;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react2.BottomSheet, { visible: true, draggable: true, style: {
    backgroundColor: "#181818",
    borderRadius: 24
  }, onDismiss, onError: ({
    message
  }) => {
    import_spotifyplus.SpotifyPlus.toast(message);
    onDismiss();
  }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SheetContent, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SheetHeader, { title: "Add sleep timer", subtitle: "Choose how long to keep listening." }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react2.Text, { style: {
      color: "#b3b3b3",
      fontSize: 13,
      marginTop: 24,
      marginBottom: 8
    }, children: "DURATION" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react2.TextInput, { value: duration, onChangeText: setDuration, placeholder: "30", placeholderTextColor: "#777777", keyboardType: "decimal-pad", singleLine: true, style: {
      color: "#ffffff",
      fontSize: 24,
      height: 64,
      paddingHorizontal: 16,
      backgroundColor: "#282828",
      borderRadius: 14
    } }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react2.View, { style: {
      flexDirection: "row",
      backgroundColor: "#282828",
      borderRadius: 24,
      padding: 4,
      marginTop: 12
    }, children: ["minutes", "hours"].map((value) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react2.Pressable, { onPress: () => setUnit(value), style: {
      flex: 1,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 20,
      backgroundColor: unit === value ? "#1ed760" : "#282828"
    }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react2.Text, { style: {
      fontSize: 14,
      fontWeight: "bold",
      color: unit === value ? "#121212" : "#b3b3b3"
    }, children: value === "minutes" ? "Minutes" : "Hours" }) }, value)) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_react2.Pressable, { onPress: () => setSave((value) => !value), accessibilityLabel: `Save to my timers: ${save ? "on" : "off"}`, style: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#282828",
      borderRadius: 14,
      padding: 16,
      marginTop: 20
    }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_react2.View, { style: {
        flex: 1,
        marginRight: 12
      }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react2.Text, { style: {
          color: "#ffffff",
          fontSize: 15,
          fontWeight: "bold"
        }, children: "Save to my timers" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react2.Text, { style: {
          color: "#b3b3b3",
          fontSize: 12,
          marginTop: 4
        }, children: "Keep this duration for next time" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react2.View, { style: {
        alignItems: "center"
      }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react2.View, { style: {
        width: 44,
        height: 26,
        borderRadius: 13,
        padding: 2,
        alignItems: save ? "flex-end" : "flex-start",
        backgroundColor: save ? "#1ed760" : "#666666"
      }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react2.View, { style: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: "#ffffff"
      } }) }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react2.Text, { style: {
      color: "#b3b3b3",
      fontSize: 13,
      marginTop: 16
    }, children: save ? "Your preset will appear in the sleep timer menu." : "This timer starts now and will not be saved." }),
    error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorMessage, { message: error }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActionButton, { title: save ? "Save timer" : "Start sleep timer", disabled: !valid, onPress: () => onSubmit(Number(duration), unit, save) })
  ] }) });
}
function SheetContent({
  children
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_react2.View, { style: {
    width: "100%",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24
  }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react2.View, { style: {
      width: 36,
      height: 4,
      backgroundColor: "#777777",
      borderRadius: 2,
      alignSelf: "center",
      marginBottom: 20
    } }),
    children
  ] });
}
function SheetHeader({
  title,
  subtitle
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react2.View, { style: {
    flexDirection: "row",
    alignItems: "center"
  }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_react2.View, { style: {
    flex: 1
  }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react2.Text, { style: {
      fontSize: 22,
      fontWeight: "bold",
      color: "#ffffff"
    }, children: title }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react2.Text, { style: {
      color: "#b3b3b3",
      fontSize: 13,
      marginTop: 6
    }, children: subtitle })
  ] }) });
}
function ActionButton({
  title,
  disabled = false,
  onPress
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react2.Pressable, { disabled, onPress, style: {
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1ed760",
    opacity: disabled ? 0.45 : 1,
    marginTop: 24,
    alignItems: "center",
    justifyContent: "center"
  }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react2.Text, { style: {
    color: "#121212",
    fontSize: 15,
    fontWeight: "bold"
  }, children: title }) });
}
function ErrorMessage({
  message
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react2.Text, { style: {
    color: "#ff9999",
    fontSize: 13,
    marginTop: 12
  }, children: message });
}
