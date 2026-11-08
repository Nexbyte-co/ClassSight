// src/pages/AttendanceSession/useAttendanceSession.js — session state for the Attendance page.
// Actions: select, resolve(method), keepAbsent, undo, faceConfirm, faceReject, save, edit, reset
// (+ labs, which pages the Recent labs strip).
import { useReducer } from "react";
import { initialRows } from "./attendanceMock";

/**
 * @typedef {Object} Session
 * @property {import("./attendanceMock").Row[]} list
 * @property {number|null} focus      selected student (j) in Needs review
 * @property {boolean} saved
 * @property {string} [savedAt]       "HH:MM"
 * @property {number} u0              needs-review count at the start (progress bar)
 * @property {number|null} labOffset  Recent labs window start (null = latest labs)
 */

function init() {
  const list = initialRows();
  const u0 = list.filter((r) => r.st === "u").length || 1;
  return normalize({ list, focus: null, saved: false, u0, labOffset: null });
}

// The selected student is always someone in Needs review (the first one when the focus is gone)
function normalize(s) {
  const u = s.list.filter((r) => r.st === "u");
  if (u.some((r) => r.j === s.focus)) return s;
  return { ...s, focus: u.length ? u[0].j : null, labOffset: null };
}

const patch = (s, j, change) => ({ ...s, list: s.list.map((r) => (r.j === j ? { ...r, ...change } : r)) });

function reducer(s, a) {
  switch (a.type) {
    case "select":
      return s.focus === a.j ? s : { ...s, focus: a.j, labOffset: null };
    case "resolve": // method: "nfc" | "ai" (retake photo) | "man"
      return normalize(patch(s, a.j, { st: "p", m: a.method }));
    case "keepAbsent":
      return normalize(patch(s, a.j, { st: "a", m: null }));
    case "undo":
      return { ...patch(s, a.j, { st: "u", m: null }), saved: false, focus: a.j, labOffset: null };
    case "faceConfirm":
      return normalize(patch(s, a.j, { st: "p", m: "ai" }));
    case "faceReject":
      return patch(s, a.j, { why: "Face check: not this student" });
    case "save":
      return normalize({
        ...s,
        saved: true,
        savedAt: a.at,
        list: s.list.map((r) => (r.st === "u" ? { ...r, st: "a", m: null } : r)),
      });
    case "edit":
      return { ...s, saved: false };
    case "labs":
      return { ...s, labOffset: a.offset };
    case "reset":
      return init();
    default:
      return s;
  }
}

export function useAttendanceSession() {
  return useReducer(reducer, undefined, init);
}
