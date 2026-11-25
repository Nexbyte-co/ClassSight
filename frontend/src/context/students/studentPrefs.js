// src/context/students/studentPrefs.js
// Student notification preferences, kept in this browser only. They decide which attendance alerts reach the bell.
import { useCallback, useState } from "react";

const KEY = "classsight_student_prefs_v1";
export const DEFAULT_PREFS = { lowAttendance: true, pendingReview: true };

function read() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    return raw && typeof raw === "object" ? { ...DEFAULT_PREFS, ...raw } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export function useStudentPrefs() {
  const [prefs, setPrefs] = useState(read);
  const setPref = useCallback((name, value) => {
    setPrefs((cur) => {
      const next = { ...cur, [name]: value };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // storage blocked: the setting still applies until the page is reloaded
      }
      return next;
    });
  }, []);
  return [prefs, setPref];
}
