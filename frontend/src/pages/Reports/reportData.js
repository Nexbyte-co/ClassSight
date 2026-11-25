// Reports data from the API: GET /classrooms, then each class's students and saved attendance logs.
// One "batch" = one class (course + section). Every figure is computed from saved sessions only.
import { useEffect, useState } from "react";
import { listClassrooms, listStudents } from "../../api/classrooms";
import { listLogs } from "../../api/attendance";

export const LOW_ATTENDANCE_PCT = 75;
const DAY = 86400000;

export let BATCHES = [];
export let SUBJECTS = [];
export let SEMESTER_START = Date.now();
export let SEMESTER_END = Date.now();
export let KPIS = { sessionsHeld: 0, totalBatches: 0 };
// Per batch: { sessions: [{t, w, pct}], students: [{name, roll, batch, marks: Map<t, boolean>}] }
let DATA = [];
let DAYS = []; // [{t, d, w, v}] every day with a saved session, v = all-classes %

const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const dayOf = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).getTime();
};

async function load() {
  const classes = await listClassrooms();
  const loaded = await Promise.all(classes.map((c) => Promise.all([listStudents(c.id), listLogs(c.id)])));
  const subjectKey = (c) => c.course_code || c.course;
  const keys = [...new Set(classes.map(subjectKey))];
  const times = loaded.flatMap(([, logs]) => logs.map((l) => dayOf(l.session.session_date)));
  const first = times.length ? Math.min(...times) : Date.now();
  const monday = new Date(first);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const weekOf = (t) => Math.floor((t - monday.getTime() + 3 * 3600000) / (7 * DAY));

  const perDay = new Map();
  DATA = loaded.map(([students, logs], i) => {
    const sessions = logs
      .filter((l) => l.records.length)
      .map((l) => {
        const t = dayOf(l.session.session_date);
        const present = l.records.filter((r) => r.status === "present").length;
        const o = perDay.get(t) || { p: 0, n: 0 };
        o.p += present;
        o.n += l.records.length;
        perDay.set(t, o);
        return { t, w: weekOf(t), present, total: l.records.length, pct: (present / l.records.length) * 100, marks: new Map(l.records.map((r) => [r.student_id, r.status === "present"])) };
      })
      .sort((a, b) => a.t - b.t);
    const c = classes[i];
    return {
      sessions,
      students: students.map((s) => ({ id: s.id, name: s.name, roll: s.roll_number, batch: c.section })),
    };
  });
  BATCHES = classes.map((c, index) => ({
    index,
    id: c.id,
    code: c.course_code,
    name: c.course,
    group: c.section,
    type: "Lecture",
    courseIndex: keys.indexOf(subjectKey(c)),
    avg: DATA[index].sessions.length ? Math.round(mean(DATA[index].sessions.map((s) => s.pct))) : 0,
  }));
  SUBJECTS = keys.map((k) => {
    const c = classes.find((x) => subjectKey(x) === k);
    return { name: c.course, code: k };
  });
  DAYS = [...perDay]
    .sort((a, b) => a[0] - b[0])
    .map(([t, o]) => ({ t, d: new Date(t), w: weekOf(t), v: Math.round((o.p / o.n) * 100) }));
  SEMESTER_START = DAYS.length ? DAYS[0].t : Date.now();
  SEMESTER_END = DAYS.length ? DAYS[DAYS.length - 1].t : Date.now();
  KPIS = { sessionsHeld: DATA.reduce((s, d) => s + d.sessions.length, 0), totalBatches: classes.length };
}

/** Loads the data each time the page opens; render the report only when ready. */
export function useReportData() {
  const [state, setState] = useState({ ready: false, error: "" });
  useEffect(() => {
    let live = true;
    load()
      .then(() => live && setState({ ready: true, error: "" }))
      .catch((err) => live && setState({ ready: false, error: err.message || "Could not load the reports." }));
    return () => {
      live = false;
    };
  }, []);
  return state;
}

export const batchesOfSubject = (courseIndex) => BATCHES.filter((b) => b.courseIndex === courseIndex);

const inRange = (s, from, to) => s.t >= from && s.t <= to;
const sessionsIn = (batches, from, to) => batches.flatMap((i) => DATA[i].sessions.filter((s) => inRange(s, from, to)));
const allIdx = () => BATCHES.map((b) => b.index);

/** Mean % per week index for the given batches (null where nothing was held) */
function weekSeries(batches) {
  const all = batches.flatMap((i) => DATA[i].sessions);
  const weeks = DAYS.length ? DAYS[DAYS.length - 1].w + 1 : 0;
  return Array.from({ length: weeks }, (_, w) => {
    const s = all.filter((x) => x.w === w);
    return s.length ? Math.round(mean(s.map((x) => x.pct))) : null;
  });
}

const shortDate = (t) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
export const formatRange = (from, to) => `${shortDate(from)} – ${shortDate(to)}`;

export function weeklyBreakdown(batchIndex, allMode, from, to) {
  const batches = allMode ? allIdx() : [batchIndex];
  const series = weekSeries(batches);
  const weeks = [...new Set(sessionsIn(batches, from, to).map((s) => s.w))].sort((a, b) => a - b);
  const values = weeks.map((w) => series[w]);
  const hi = Math.max(...values);
  const lo = Math.min(...values);
  return weeks.map((w) => ({
    week: w + 1,
    v: series[w],
    change: w > 0 && series[w - 1] !== null ? series[w] - series[w - 1] : null,
    lecs: batches.reduce((n, i) => n + DATA[i].sessions.filter((s) => s.w === w).length, 0),
    labs: 0,
    best: weeks.length > 1 && series[w] === hi,
    lowest: weeks.length > 1 && series[w] === lo,
  }));
}

export function trendPoints(batchIndex, allMode, from, to) {
  const days = DAYS.filter((d) => d.t >= from && d.t <= to)
    .map((d) => {
      if (allMode) return d;
      const s = DATA[batchIndex].sessions.filter((x) => x.t === d.t);
      return s.length ? { ...d, v: Math.round(mean(s.map((x) => x.pct))) } : null;
    })
    .filter(Boolean);
  if (days.length > 20) {
    const byWeek = new Map();
    days.forEach((d) => {
      const o = byWeek.get(d.w) || { s: 0, n: 0 };
      o.s += d.v;
      o.n += 1;
      byWeek.set(d.w, o);
    });
    return [...byWeek].map(([w, o]) => ({ label: `W${w + 1}`, tip: `Week ${w + 1} · ${Math.round(o.s / o.n)}%`, v: o.s / o.n }));
  }
  return days.map((d) => ({
    label: d.d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    tip: `${d.d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} · ${d.v}%`,
    v: d.v,
  }));
}

/** Stats for the Batch selected card, or null when the range has no saved classes */
export function batchStats(batchIndex, from, to) {
  const s = sessionsIn([batchIndex], from, to);
  if (!s.length) return null;
  const avg = Math.round(mean(s.map((x) => x.pct)));
  const siblings = batchesOfSubject(BATCHES[batchIndex].courseIndex);
  const subjectAvg = Math.round(mean(siblings.map((b) => b.avg)));
  const series = weekSeries([batchIndex]);
  const weeks = [...new Set(s.map((x) => x.w))].sort((a, b) => a - b);
  const values = weeks.map((w) => series[w]);
  const best = Math.max(...values);
  const lowest = Math.min(...values);
  return {
    avg,
    delta: avg - subjectAvg,
    lecsHeld: s.length,
    labsHeld: 0,
    best: { week: weeks[values.indexOf(best)] + 1, v: best },
    lowest: { week: weeks[values.indexOf(lowest)] + 1, v: lowest },
  };
}

export const findBatch = (name, group) => BATCHES.findIndex((b) => b.name === name && b.group === group);

/** Every saved session of a batch, newest first */
export const batchSessions = (i) =>
  [...DATA[i].sessions].reverse().map((s) => ({ date: new Date(s.t), code: BATCHES[i].code, type: "Lecture", present: s.present, total: s.total }));

/** Every student of the batch (or of all batches) with attendance in the range */
export function studentRows(batchIndex, allMode, from, to) {
  return (allMode ? allIdx() : [batchIndex]).flatMap((i) => {
    const held = DATA[i].sessions.filter((s) => inRange(s, from, to));
    return DATA[i].students.map((st) => {
      const rec = held.filter((s) => s.marks.has(st.id));
      const a = rec.filter((s) => s.marks.get(st.id)).length;
      return { ...st, a, h: rec.length, pct: rec.length ? Math.round((a / rec.length) * 100) : 0 };
    });
  });
}

/** Students under 75% who had classes in the range, lowest first */
export const lowAttendance = (rows) =>
  rows.filter((r) => r.h > 0 && r.pct < LOW_ATTENDANCE_PCT).sort((a, b) => a.pct - b.pct || a.name.localeCompare(b.name));

export function downloadStudentCsv(rows, filename) {
  const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [["Roll No", "Name", "Batch", "Classes Held", "Classes Attended", "Attendance %"]]
    .concat(rows.map((r) => [r.roll, r.name, r.batch, r.h, r.a, r.pct]))
    .map((row) => row.map(q).join(","));
  const url = URL.createObjectURL(new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }));
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
