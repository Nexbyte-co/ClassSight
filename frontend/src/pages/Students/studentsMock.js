// src/pages/Students/studentsMock.js
// MOCK data for the Students page. Built on the same deterministic roster as Reports
// (reportsMock.js), so both pages show the same students and numbers.
//
// API swap points (replace the marked exports with fetches):
//   GET /students?subject&batch          -> STUDENTS (filtered by studentsInScope)
//   GET /students/:id/sessions?from&to   -> SESSIONS[student.key]
//   GET /batches/:id/last-session        -> lastLab()
import { SLOTS } from "../../data/schedule/timetable";
import { getAtRiskFloor } from "../../context/settings/settingsStore";
import {
  BATCHES,
  SUBJECTS,
  ROSTER as BATCH_ROSTER,
  SEMESTER_START,
  SEMESTER_END,
  hash,
} from "../Reports/reportsMock";

/**
 * @typedef {Object} Student
 * @property {string} key          unique id ("batchIndex-j")
 * @property {string} name
 * @property {string} roll         college roll number
 * @property {number} batchIndex   index into BATCHES
 * @property {string} batch        batch name, e.g. "3C2C"
 * @property {boolean[]} pres      present at each of the 8 weekly labs
 * @property {number} a            labs attended
 * @property {number} h            labs held
 * @property {number} pct          attendance %
 * @property {Date|null} last      date of the last lab attended
 */

/**
 * @typedef {Object} Session      one class on a day
 * @property {"Lab"|"Lec"} t
 * @property {string} tm           start time "HH:MM"
 * @property {number} mn           minutes (lecture 50, lab 100)
 * @property {boolean} ok          present
 */

/** @typedef {"er"|"wa"|"ok"} Band  Critical / Warning / Good */

export { BATCHES, SUBJECTS, SEMESTER_START, SEMESTER_END };

const LABS_HELD = 8;
const DAY_INDEX = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

/** Date of week `w` (0-based) of a batch's weekly lab; the term starts Mon 31 Aug 2026 */
export const labDate = (batchIndex, w) => new Date(2026, 7, 31 + w * 7 + DAY_INDEX[SLOTS[batchIndex].day]);

/** @type {Student[]} */ // API: GET /students
export const STUDENTS = BATCH_ROSTER.flatMap((list, i) =>
  list.map((s, j) => {
    const a = s.pres.filter(Boolean).length;
    const lastWeek = s.pres.lastIndexOf(true);
    return {
      key: `${i}-${j}`,
      name: s.name,
      roll: s.roll,
      batchIndex: i,
      batch: s.batch,
      pres: s.pres,
      a,
      h: LABS_HELD,
      pct: Math.round((a / LABS_HELD) * 100),
      last: lastWeek < 0 ? null : labDate(i, lastWeek),
    };
  })
);

const toClock = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const toMinutes = (t) => {
  const [h, m] = t.split(":");
  return +h * 60 + +m;
};

/**
 * Classes per day for each student: the weekly lab, plus an extra lecture on weeks 3 and 6
 * so the page can show multi-class days.
 * @type {Record<string, Session[][]>}
 */ // API: GET /students/:id/sessions
export const SESSIONS = Object.fromEntries(
  STUDENTS.map((r) => {
    const slot = SLOTS[r.batchIndex];
    const j = +r.key.split("-")[1];
    const days = r.pres.map((present, w) => {
      const list = [{ t: slot.type === "Lab" ? "Lab" : "Lec", tm: slot.start, mn: slot.dur, ok: present }];
      if (w === 2 || w === 5) {
        const ok = hash(r.batchIndex, j, w + 60) < (r.pct >= 75 ? 0.85 : 0.45);
        list.push({ t: "Lec", tm: toClock(toMinutes(slot.start) + slot.dur + 70), mn: 50, ok });
      }
      return list;
    });
    return [r.key, days];
  })
);

/** Present / absent at a batch's most recent lab. API: GET /batches/:id/last-session */
export function lastLab(batchIndex) {
  const w = LABS_HELD - 1;
  const roster = STUDENTS.filter((r) => r.batchIndex === batchIndex);
  const present = roster.filter((r) => r.pres[w]).length;
  return { date: labDate(batchIndex, w), present, absent: roster.length - present };
}

/** Default batch: the one with the current or most recent lab (3C2C in the mock) */
export const DEFAULT_BATCH = Math.max(0, BATCHES.findIndex((b) => b.group === "3C2C"));

/** Students in the chosen subject ("all" or course index) and batch ("all" or batch index) */
export const studentsInScope = (subject, batch) =>
  STUDENTS.filter(
    (r) =>
      (subject === "all" || BATCHES[r.batchIndex].courseIndex === +subject) &&
      (batch === "all" || r.batchIndex === +batch)
  );

// ---- bands (driven by the Settings attendance threshold) ----
/** @returns {Band} */
export const bandOf = (pct, thr) => (pct >= thr ? "ok" : pct >= getAtRiskFloor(thr) ? "wa" : "er");
export const BAND_ORDER = ["er", "wa", "ok"];
export const BAND_LABEL = { er: "Critical", wa: "Warning", ok: "Good" };
export const bandRange = (band, thr) =>
  band === "er" ? `Below ${getAtRiskFloor(thr)}%` : band === "wa" ? `${getAtRiskFloor(thr)}–${thr - 1}%` : `${thr}% and above`;
/** Short range for the count boxes: "< 65%", "65–74%", "75%+" */
export const bandRangeShort = (band, thr) => bandRange(band, thr).replace(" and above", "+").replace("Below ", "< ");

/** Labs in a row needed to reach the threshold: ceil((T·held − attended) / (1 − T)) */
export function labsToReach(r, thr) {
  const T = thr / 100;
  return T >= 1 ? 0 : Math.max(0, Math.ceil((T * r.h - r.a) / (1 - T) - 1e-9));
}

export const average = (list) => (list.length ? Math.round(list.reduce((s, r) => s + r.pct, 0) / list.length) : 0);

// ---- formatting ----
export const shortDate = (t) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
export const dayLabel = (d) =>
  d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }).replace(",", "");
export const initials = (name) =>
  name
    .split(" ")
    .map((x) => x[0])
    .join("");

// ---- CSV export ----
export function downloadStudentsCsv(list, thr, tag) {
  const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [["Roll No", "Name", "Batch", "Subject", "Labs Held", "Labs Attended", "Attendance %", "Status", "Last Attended"]]
    .concat(
      list.map((r) => [
        r.roll,
        r.name,
        r.batch,
        BATCHES[r.batchIndex].name,
        r.h,
        r.a,
        r.pct,
        BAND_LABEL[bandOf(r.pct, thr)],
        r.last ? r.last.toISOString().slice(0, 10) : "",
      ])
    )
    .map((row) => row.map(q).join(","));
  try {
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `students${tag ? `-${tag}` : ""}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {
    /* downloads blocked: nothing to do */
  }
}
