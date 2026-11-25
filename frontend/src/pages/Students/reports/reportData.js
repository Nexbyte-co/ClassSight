// src/pages/Students/reports/reportData.js
// Pure calculations for the student Reports page. Everything is derived from the student model's recorded
// (or labelled demo) occurrences: nothing is invented here. Lectures, labs and tutorials make one percentage
// and a lab counts as two lectures (CLASS_WEIGHT), exactly as on the Dashboard and My Courses.
import { CLASS_WEIGHT, classWeight } from "../../../context/students/studentCourses";
import { classesCanMiss, classesNeededToReach } from "../../../context/students/studentOverview";
import { STATUS, getRequirementStatus } from "../../../context/students/studentWeek";
import { getLocalDateKey } from "../../../context/schedule/scheduleStatus";

export const kindOf = (o) => (o.type in CLASS_WEIGHT ? o.type : "Lecture");
const parseKey = (k) => new Date(...k.split("-").map((n, i) => (i === 1 ? n - 1 : +n)));
const shift = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const pctOf = (present, decided) => (decided > 0 ? Math.round((present / decided) * 100) : null);

/** Held classes (never upcoming ones) inside the selected date range and course. */
export function filterHeld(occurrences, { from, to, course }) {
  return occurrences.filter(
    (o) =>
      o.status !== STATUS.upcoming &&
      (!from || o.dateKey >= from) &&
      (!to || o.dateKey <= to) &&
      (course === "all" || o.code === course)
  );
}

/** Weighted present/absent for a set of held classes, plus plain class counts per kind. */
export function tally(list) {
  const t = { present: 0, absent: 0, unverified: 0, decided: 0, pct: null, classes: { present: 0, absent: 0, unverified: 0 }, byKind: {} };
  list.forEach((o) => {
    const kind = kindOf(o);
    const w = classWeight(kind);
    t[o.status] += w;
    t.classes[o.status] += 1;
    const b = (t.byKind[kind] ??= { present: 0, absent: 0, unverified: 0 });
    b[o.status] += 1;
  });
  t.decided = t.present + t.absent;
  t.pct = pctOf(t.present, t.decided);
  return t;
}

/** One row per course with its own requirement status and what it takes to fix (or keep) it. */
export function courseRows(courses, held, threshold) {
  return courses.map((course) => {
    const t = tally(held.filter((o) => o.code === course.code));
    const low = t.pct !== null && t.pct < threshold;
    const needed = low ? classesNeededToReach(t.present, t.decided, threshold) : 0;
    return {
      code: course.code,
      name: course.name,
      ...t,
      status: t.pct === null ? null : getRequirementStatus(t.pct, threshold),
      eligible: t.pct !== null && !low,
      needed,
      canMiss: t.pct !== null && !low ? classesCanMiss(t.present, t.decided, threshold) : 0,
      kinds: [...new Set(course.slots.map((s) => s.type))],
    };
  });
}

export function summarise(rows, held, threshold) {
  const t = tally(held);
  const below = rows.filter((r) => r.pct !== null && r.pct < threshold);
  return {
    ...t,
    courses: rows.length,
    eligibleCourses: rows.filter((r) => r.eligible).length,
    below,
    // Each course has to be fixed on its own, so these add up per course (in lecture units; a lab is 2)
    requiredUnits: below.reduce((n, r) => n + (Number.isFinite(r.needed) ? r.needed : 0), 0),
  };
}

const BUCKET = {
  daily: { key: (k) => k, label: (k) => parseKey(k).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) },
  weekly: {
    key: (k) => getLocalDateKey(shift(parseKey(k), -parseKey(k).getDay())),
    label: (k) => `Week of ${parseKey(k).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`,
  },
  monthly: { key: (k) => k.slice(0, 7), label: (k) => parseKey(`${k}-01`).toLocaleDateString("en-GB", { month: "long", year: "numeric" }) },
};

/** Cumulative attendance % at the end of each day, week or month that had classes. */
export function buildTrend(held, view) {
  const b = BUCKET[view];
  const sorted = held.filter((o) => o.status !== STATUS.unverified).sort((a, c) => a.dateKey.localeCompare(c.dateKey) || a.startMinutes - c.startMinutes);
  const points = [];
  let present = 0;
  let decided = 0;
  sorted.forEach((o) => {
    const key = b.key(o.dateKey);
    let p = points[points.length - 1];
    if (!p || p.key !== key) {
      p = { key, label: b.label(key), bucketPresent: 0, bucketDecided: 0 };
      points.push(p);
    }
    const w = classWeight(kindOf(o));
    decided += w;
    p.bucketDecided += w;
    if (o.status === STATUS.present) {
      present += w;
      p.bucketPresent += w;
    }
    p.present = present;
    p.decided = decided;
    p.pct = Math.round((present / decided) * 1000) / 10;
    p.bucketPct = p.bucketDecided ? Math.round((p.bucketPresent / p.bucketDecided) * 100) : null;
  });
  return points;
}

/** Warnings, recovery advice and recent changes, all computed from the filtered records. */
export function buildInsights(rows, held, threshold, now) {
  const out = [];
  const lecs = (u) => (Number.isFinite(u) ? `${u} lecture${u === 1 ? "" : "s"}` : "every lecture");
  const labs = (u) => (Number.isFinite(u) ? `${Math.ceil(u / 2)} lab${Math.ceil(u / 2) === 1 ? "" : "s"}` : "every lab");
  [...rows]
    .filter((r) => r.pct !== null && r.pct < threshold)
    .sort((a, b) => a.pct - b.pct)
    .forEach((r) => {
      const options = [r.kinds.some((k) => k !== "Lab") && lecs(r.needed), r.kinds.includes("Lab") && labs(r.needed)].filter(Boolean).join(" or ");
      out.push({
        id: `low-${r.code}`,
        tone: r.status?.level === "critical" ? "bad" : "warn",
        title: `${r.name} is below ${threshold}% (${r.pct}%)`,
        text: `Attend ${options} in a row to become eligible.`,
        code: r.code,
      });
    });

  // Recent two weeks against everything before them, only when both sides have enough classes to compare
  const cut = getLocalDateKey(shift(now, -14));
  rows.forEach((r) => {
    const mine = held.filter((o) => o.code === r.code && o.status !== STATUS.unverified);
    const before = mine.filter((o) => o.dateKey < cut);
    const recent = mine.filter((o) => o.dateKey >= cut);
    if (before.length < 4 || recent.length < 3) return;
    const a = tally(before).pct;
    const b = tally(recent).pct;
    const delta = b - a;
    if (Math.abs(delta) < 15) return;
    out.push({
      id: `trend-${r.code}`,
      tone: delta > 0 ? "ok" : "warn",
      title: `${r.name}: ${delta > 0 ? "improving" : "slipping"}`,
      text: `${b}% in the last 2 weeks against ${a}% before that (${delta > 0 ? "+" : ""}${delta} points).`,
      code: r.code,
    });
  });

  const pending = held.filter((o) => o.status === STATUS.unverified).length;
  if (pending > 0) {
    out.push({ id: "pending", tone: "info", title: `${pending} class${pending === 1 ? "" : "es"} awaiting review`, text: "These are not counted as absences until your teacher confirms them." });
  }
  if (out.length === 0) out.push({ id: "ok", tone: "ok", title: "All courses meet the requirement", text: "Nothing needs attention in the selected range." });
  return out;
}

/** Plain class counts (not weighted) per day, week or month for the history chart, oldest first. */
export function buildHistory(held, view) {
  const b = BUCKET[view];
  const map = new Map();
  [...held]
    .sort((a, c) => a.dateKey.localeCompare(c.dateKey))
    .forEach((o) => {
      const key = b.key(o.dateKey);
      const row = map.get(key) ?? { key, label: b.label(key), present: 0, absent: 0, unverified: 0 };
      row[o.status] += 1;
      map.set(key, row);
    });
  return [...map.values()].map((r) => ({ ...r, total: r.present + r.absent + r.unverified }));
}
