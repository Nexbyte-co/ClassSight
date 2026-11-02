// Mock data for the Reports page. Everything here is deterministic so the page always
// renders the same numbers (matches the design handoff). Replace with the API:
//   GET /reports/batches                              -> BATCHES / SUBJECTS
//   GET /reports/trend?batch&from&to                  -> trendPoints()
//   GET /reports/students?batch&from&to&maxPct=75     -> lowAttendanceStudents()

import { SLOTS, COURSES } from "../../data/schedule/timetable";

/**
 * @typedef {Object} Batch
 * @property {number} index       position in BATCHES
 * @property {string} code        course code, e.g. "UCS303P"
 * @property {string} name        subject name
 * @property {string} group       batch label, e.g. "2Q3B"
 * @property {"Lab"|"Lecture"} type
 * @property {number} courseIndex index into SUBJECTS
 * @property {number} avg         semester average attendance (%)
 *
 * @typedef {Object} TeachingDay
 * @property {number} t  timestamp (local midnight)
 * @property {Date} d
 * @property {number} w  week index 0..7
 * @property {number} v  all-classes attendance (%) for that day
 *
 * @typedef {Object} StudentRow
 * @property {string} name
 * @property {string} roll
 * @property {string} batch
 * @property {boolean[]} pres  present per week (8)
 * @property {number} a        labs attended in range
 * @property {number} h        labs held in range
 * @property {number} pct      attendance % in range
 */

// Per-batch semester average (%), same order as SLOTS
const BATCH_AVG = [88, 86, 90, 82, 87, 84, 81, 85];

/** @type {Batch[]} */
export const BATCHES = SLOTS.map((slot, index) => ({
  index,
  code: slot.code,
  name: slot.name,
  group: slot.group,
  type: slot.type,
  courseIndex: slot.courseIndex,
  avg: BATCH_AVG[index],
}));

export const SUBJECTS = COURSES.map((c) => ({ name: c.name, code: c.code }));

export const batchesOfSubject = (courseIndex) => BATCHES.filter((b) => b.courseIndex === courseIndex);

// Weekly all-classes average (%) for the semester so far (8 weeks)
export const WEEKS = [91, 89, 88, 87, 86, 84, 85, 86];
const WEEK_MEAN = WEEKS.reduce((a, b) => a + b, 0) / WEEKS.length;

// Teaching days: semester starts Mon 31 Aug 2026, data runs to Thu 22 Oct (week 8)
/** @type {TeachingDay[]} */
export const TEACHING_DAYS = (() => {
  const dayOffset = [1, -1, 0, 1, -1]; // Mon..Fri wiggle around the weekly average
  const start = new Date(2026, 7, 31);
  const last = new Date(2026, 9, 22).getTime();
  const days = [];
  for (let i = 0; i < 56; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dow = (d.getDay() + 6) % 7;
    if (dow > 4 || d.getTime() > last) continue;
    const w = Math.floor(i / 7);
    days.push({ d, t: d.getTime(), w, v: WEEKS[w] + dayOffset[dow] });
  }
  return days;
})();

export const SEMESTER_START = TEACHING_DAYS[0].t;
export const SEMESTER_END = TEACHING_DAYS[TEACHING_DAYS.length - 1].t;

/** Weekly attendance (%) for one batch: its average + the semester trend + small jitter */
export function batchSeries(batchIndex) {
  return WEEKS.map((w, k) =>
    Math.max(60, Math.min(99, Math.round(BATCH_AVG[batchIndex] + (w - WEEK_MEAN) + (((batchIndex * 7 + k * 3) % 5) - 2))))
  );
}

/** Week indexes that have teaching days inside [from, to] */
export function weeksInRange(from, to) {
  return [...new Set(TEACHING_DAYS.filter((d) => d.t >= from && d.t <= to).map((d) => d.w))];
}

/**
 * Week-by-week rows for the Weekly breakdown card (weeks inside [from, to]).
 * Change is against the previous week of the semester, even when that week is outside the range.
 * @returns {{week: number, v: number, change: number|null, lecs: number, labs: number, best: boolean, lowest: boolean}[]}
 */
export function weeklyBreakdown(batchIndex, allMode, from, to) {
  const series = allMode ? WEEKS : batchSeries(batchIndex);
  const batches = allMode ? BATCHES : [BATCHES[batchIndex]];
  const lecs = batches.filter((b) => b.type === "Lecture").length;
  const labs = batches.filter((b) => b.type === "Lab").length;
  const weeks = weeksInRange(from, to);
  const values = weeks.map((w) => series[w]);
  const hi = Math.max(...values);
  const lo = Math.min(...values);
  return weeks.map((w) => ({
    week: w + 1,
    v: series[w],
    change: w > 0 ? series[w] - series[w - 1] : null,
    lecs,
    labs,
    best: weeks.length > 1 && series[w] === hi,
    lowest: weeks.length > 1 && series[w] === lo,
  }));
}

const shortDate = (t) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
export const formatRange = (from, to) => `${shortDate(from)} – ${shortDate(to)}`;

/**
 * Trend points for the chart: one per week, or one per day when the range has ≤20 teaching days.
 * @returns {{label: string, tip: string, v: number}[]}
 */
export function trendPoints(batchIndex, allMode, from, to) {
  const series = batchSeries(batchIndex);
  const days = TEACHING_DAYS.filter((d) => d.t >= from && d.t <= to).map((d) =>
    allMode ? d : { ...d, v: d.v + series[d.w] - WEEKS[d.w] }
  );
  if (days.length > 20) {
    const byWeek = new Map();
    days.forEach((d) => {
      const o = byWeek.get(d.w) || { s: 0, n: 0 };
      o.s += d.v;
      o.n += 1;
      byWeek.set(d.w, o);
    });
    return [...byWeek].map(([w, o]) => ({
      label: `W${w + 1}`,
      tip: `Week ${w + 1} · ${Math.round(o.s / o.n)}%`,
      v: o.s / o.n,
    }));
  }
  return days.map((d) => ({
    label: d.d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    tip: `${d.d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} · ${d.v}%`,
    v: d.v,
  }));
}

/** Stats for the Batch selected card, or null when the range has no classes */
export function batchStats(batchIndex, from, to) {
  const weeks = weeksInRange(from, to);
  const series = batchSeries(batchIndex);
  const values = weeks.map((w) => series[w]);
  if (!values.length) return null;
  const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  const siblings = batchesOfSubject(BATCHES[batchIndex].courseIndex);
  const subjectAvg = Math.round(siblings.reduce((a, b) => a + b.avg, 0) / siblings.length);
  const best = Math.max(...values);
  const lowest = Math.min(...values);
  // One session per week, counted as a lecture or a lab by the batch's slot type (all labs in the mock)
  const isLab = BATCHES[batchIndex].type === "Lab";
  return {
    avg,
    delta: avg - subjectAvg,
    lecsHeld: isLab ? 0 : values.length,
    labsHeld: isLab ? values.length : 0,
    best: { week: weeks[values.indexOf(best)] + 1, v: best },
    lowest: { week: weeks[values.indexOf(lowest)] + 1, v: lowest },
  };
}

// ---- student roster (30 per batch, deterministic) ----
const FIRST = ["Aarav", "Vihaan", "Ishita", "Ananya", "Rohan", "Kabir", "Meera", "Saanvi", "Arjun", "Diya", "Kunal", "Riya", "Aditya", "Navya", "Yash", "Tanvi", "Harsh", "Pooja", "Dev", "Sneha", "Manav", "Aisha", "Karan", "Nisha", "Pranav", "Simran", "Rahul", "Kavya", "Veer", "Mansi"];
const LAST = ["Sharma", "Verma", "Gupta", "Singh", "Kapoor", "Mehta", "Bansal", "Arora", "Khanna", "Malhotra", "Chopra", "Jain", "Bhatia", "Sethi", "Goyal"];

// Small integer hash -> [0, 1) (also used by the Students mock)
export function hash(a, b, c) {
  let x = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  x = ((x ^ (x >>> 13)) * 1274126177) | 0;
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

// ROSTER[batchIndex][j]: also the source of the Students page mock
export const ROSTER = BATCHES.map((batch, i) =>
  Array.from({ length: 30 }, (_, j) => {
    const base = batch.avg / 100;
    const r = hash(i, j, 99);
    const p = Math.min(0.99, r < 0.15 ? base - 0.25 - 0.15 * hash(i, j, 98) : base + 0.12 - 0.2 * hash(i, j, 97));
    return {
      name: `${FIRST[(j * 7 + i * 3) % 30]} ${LAST[(j * 4 + i) % 15]}`,
      roll: String(102203000 + i * 100 + j + 1),
      batch: batch.group,
      pres: Array.from({ length: 8 }, (_, w) => hash(i, j, w) < p),
    };
  })
);

// ---- sessions of one batch (Report details) ----
const DAY_INDEX = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

/** Batch index for a course name + group (as used in /reports/details links), or -1 */
export const findBatch = (name, group) => BATCHES.findIndex((b) => b.name === name && b.group === group);

/**
 * Every recorded session of a batch, newest first. API: GET /batches/:id/sessions
 * @returns {{date: Date, code: string, type: string, time: string, venue: string, present: number, total: number}[]}
 */
export function batchSessions(batchIndex) {
  const slot = SLOTS[batchIndex];
  const roster = ROSTER[batchIndex];
  return WEEKS.map((_, w) => ({
    date: new Date(2026, 7, 31 + w * 7 + DAY_INDEX[slot.day]),
    code: slot.code,
    type: slot.type,
    time: slot.start,
    venue: slot.venue,
    present: roster.filter((s) => s.pres[w]).length,
    total: roster.length,
  })).reverse();
}

/** All students of the batch (or of every batch in all-mode) with attendance for the range */
export function studentRows(batchIndex, allMode, from, to) {
  const weeks = weeksInRange(from, to);
  const batches = allMode ? BATCHES.map((b) => b.index) : [batchIndex];
  return batches.flatMap((i) =>
    ROSTER[i].map((s) => {
      const a = weeks.filter((w) => s.pres[w]).length;
      return { ...s, a, h: weeks.length, pct: weeks.length ? Math.round((a / weeks.length) * 100) : 0 };
    })
  );
}

export const LOW_ATTENDANCE_PCT = 75;

/** Students under 75%, lowest first */
export const lowAttendance = (rows) =>
  rows.filter((r) => r.pct < LOW_ATTENDANCE_PCT).sort((a, b) => a.pct - b.pct || a.name.localeCompare(b.name));

// ---- KPIs ----
export const KPIS = {
  lecturesHeld: BATCHES.filter((b) => b.type === "Lecture").length * 8,
  labsHeld: BATCHES.filter((b) => b.type === "Lab").length * 8,
  totalBatches: BATCHES.length,
};

// ---- CSV export ----
export function downloadStudentCsv(rows, filename) {
  const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [["Roll No", "Name", "Batch", "Labs Held", "Labs Attended", "Attendance %"]]
    .concat(rows.map((r) => [r.roll, r.name, r.batch, r.h, r.a, r.pct]))
    .map((row) => row.map(q).join(","));
  const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const isoDate = (t) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const rangeFileTag = (from, to) => `${isoDate(from)}-to-${isoDate(to)}`;
