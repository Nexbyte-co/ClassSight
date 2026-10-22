// src/context/settingsStore.js
// Pure helpers for teacher settings stored in this browser (no backend).

export const SETTINGS_STORAGE_KEY = "classsight_settings_v1";
const SETTINGS_VERSION = 1;

export const DEFAULT_ATTENDANCE_THRESHOLD = 75;
export const MIN_ATTENDANCE_THRESHOLD = 50;
export const MAX_ATTENDANCE_THRESHOLD = 100;
// Students this many points below the threshold are "at risk" rather than "critical"
export const AT_RISK_BAND = 10;

export const DEFAULT_LECTURE_MINUTES = 50;
export const MIN_LECTURE_MINUTES = 10;
export const MAX_LECTURE_MINUTES = 240;

export const DEFAULT_DEPARTMENT = "Computer Science & Eng.";
export const MAX_DEPARTMENT_LENGTH = 60;

export const DEFAULT_SETTINGS = {
  attendanceThreshold: DEFAULT_ATTENDANCE_THRESHOLD,
  defaultLectureMinutes: DEFAULT_LECTURE_MINUTES,
  defaultDepartment: DEFAULT_DEPARTMENT,
};

// Lowest percentage still counted as "at risk" (65% with the default 75% threshold)
export function getAtRiskFloor(threshold) {
  return Math.max(0, threshold - AT_RISK_BAND);
}

function validateWholeNumber(value, min, max, unit) {
  const text = String(value ?? "").trim();
  if (text === "") return `Enter a value in ${unit}.`;
  if (!/^\d+$/.test(text)) return "Use a whole number.";
  const n = Number(text);
  if (n < min || n > max) return `Choose a value between ${min} and ${max} ${unit}.`;
  return null;
}

// Each validator returns an error message, or null when the value is valid
export function validateThreshold(value) {
  return validateWholeNumber(value, MIN_ATTENDANCE_THRESHOLD, MAX_ATTENDANCE_THRESHOLD, "percent");
}

export function validateLectureMinutes(value) {
  return validateWholeNumber(value, MIN_LECTURE_MINUTES, MAX_LECTURE_MINUTES, "minutes");
}

export function validateDepartment(value) {
  const text = String(value ?? "").trim();
  if (text === "") return "Enter a department name.";
  if (text.length > MAX_DEPARTMENT_LENGTH) return `Keep it under ${MAX_DEPARTMENT_LENGTH} characters.`;
  return null;
}

// Keeps only known, valid fields; anything missing or invalid falls back to the default
export function normalizeSettings(raw) {
  const settings = { ...DEFAULT_SETTINGS };
  if (!raw || typeof raw !== "object") return settings;
  if (Number.isInteger(raw.attendanceThreshold) && validateThreshold(raw.attendanceThreshold) === null) {
    settings.attendanceThreshold = raw.attendanceThreshold;
  }
  if (Number.isInteger(raw.defaultLectureMinutes) && validateLectureMinutes(raw.defaultLectureMinutes) === null) {
    settings.defaultLectureMinutes = raw.defaultLectureMinutes;
  }
  if (typeof raw.defaultDepartment === "string" && validateDepartment(raw.defaultDepartment) === null) {
    settings.defaultDepartment = raw.defaultDepartment.trim();
  }
  return settings;
}

export function loadSettings(storage) {
  try {
    const raw = storage ? storage.getItem(SETTINGS_STORAGE_KEY) : null;
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== SETTINGS_VERSION) return { ...DEFAULT_SETTINGS };
    return normalizeSettings(parsed.settings);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function serializeSettings(settings) {
  return JSON.stringify({ version: SETTINGS_VERSION, settings: normalizeSettings(settings) });
}
