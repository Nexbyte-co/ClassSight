/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useRef } from "react";
import { loadSettings, serializeSettings, SETTINGS_STORAGE_KEY } from "./settingsStore";

const SettingsContext = createContext();

function getStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => loadSettings(getStorage()));

  // Sync to localStorage (skip the initial value that was just read)
  const isFirstSync = useRef(true);
  useEffect(() => {
    if (isFirstSync.current) {
      isFirstSync.current = false;
      return;
    }
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, serializeSettings(settings));
    } catch {
      /* ignore */
    }
  }, [settings]);

  const updateSettings = (changes) => setSettings((prev) => ({ ...prev, ...changes }));

  return (
    <SettingsContext.Provider value={{ ...settings, settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
