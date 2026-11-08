/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

const THEME_KEY = "classsight_theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

// "light" | "dark" | "system" (follow the device). Nothing saved = system.
const readPreference = () => {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
};

const systemIsDark = () => {
  try {
    return Boolean(window.matchMedia && window.matchMedia(DARK_QUERY).matches);
  } catch {
    return false;
  }
};

export function ThemeProvider({ children }) {
  const [themePreference, setThemePreference] = useState(readPreference);
  const [systemDark, setSystemDark] = useState(systemIsDark);

  // Track the device theme so "system" switches live
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const media = window.matchMedia(DARK_QUERY);
    const onChange = (e) => setSystemDark(e.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const isDarkMode = themePreference === "system" ? systemDark : themePreference === "dark";

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, themePreference);
    } catch {
      // Handle storage write error silently
    }
  }, [themePreference]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark-mode", isDarkMode);
    document.body.classList.toggle("dark-mode", isDarkMode);
  }, [isDarkMode]);

  // Picking light/dark directly (header toggle, student settings) sets an explicit preference
  const setIsDarkMode = (dark) => setThemePreference(dark ? "dark" : "light");
  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  return (
    <ThemeContext.Provider value={{ isDarkMode, setIsDarkMode, toggleDarkMode, themePreference, setThemePreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
