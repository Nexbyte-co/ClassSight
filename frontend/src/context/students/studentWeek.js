// src/context/students/studentWeek.js
// Pure helpers for the student portal Dashboard: greeting, Sunday–Saturday week,
// class occurrences (saved ClassSight sessions), weekly
// chart data, subject-wise summary and recent history. All dates are local.

import { getLocalDateKey } from "../schedule/scheduleStatus";
import { getAtRiskFloor } from "../settings/settingsStore";

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const STATUS = { present: "present", absent: "absent", unverified: "unverified", upcoming: "upcoming" };

// 05:00–11:59 morning, 12:00–16:59 afternoon, otherwise evening
export function getGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good evening";
}

export function firstName(name) {
  return String(name || "").trim().split(/\s+/)[0] || "";
}

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

// Local Sunday at the start of the week containing `date`
export function getWeekStart(date = new Date()) {
  return addDays(date, -date.getDay());
}

// The seven local date keys of the current week, Sunday first
export function getWeekDateKeys(date = new Date()) {
  const start = getWeekStart(date);
  return WEEKDAY_LABELS.map((_, i) => getLocalDateKey(addDays(start, i)));
}


// One entry per day Sun–Sat. `total` counts every class occurrence that day (including
// upcoming ones); `held` excludes upcoming classes and is used for the attended/held label.
export function buildWeeklyChart(occurrences, weekDateKeys) {
  return weekDateKeys.map((dateKey, i) => {
    const segments = occurrences
      .filter((o) => o.dateKey === dateKey)
      .sort((a, b) => a.startMinutes - b.startMinutes || a.code.localeCompare(b.code));
    const count = (s) => segments.filter((o) => o.status === s).length;
    const attended = count(STATUS.present);
    const absent = count(STATUS.absent);
    const unverified = count(STATUS.unverified);
    const upcoming = count(STATUS.upcoming);
    return {
      dateKey,
      label: WEEKDAY_LABELS[i],
      segments,
      total: segments.length,
      held: attended + absent + unverified,
      attended,
      absent,
      unverified,
      upcoming,
    };
  });
}

export function getRequirementStatus(pct, threshold) {
  if (pct >= threshold) return { level: "safe", label: "Meeting requirement" };
  if (pct >= getAtRiskFloor(threshold)) return { level: "warning", label: "At risk" };
  return { level: "critical", label: "Below requirement" };
}

// Subject-wise summary over held classes. Unverified classes are listed separately and are
// not counted as absences; subjects without decided classes report pct = null.
export function buildSubjectSummary(occurrences, subjects, threshold) {
  const order = subjects.map((s) => s.code);
  const byCode = new Map();
  subjects.forEach((s) => byCode.set(s.code, { code: s.code, subject: s.name, present: 0, absent: 0, unverified: 0 }));
  occurrences.forEach((o) => {
    if (o.status === STATUS.upcoming) return;
    if (!byCode.has(o.code)) {
      byCode.set(o.code, { code: o.code, subject: o.subject, present: 0, absent: 0, unverified: 0 });
      order.push(o.code);
    }
    byCode.get(o.code)[o.status] += 1;
  });
  return order.map((code) => {
    const row = byCode.get(code);
    const decided = row.present + row.absent;
    const pct = decided > 0 ? Math.round((row.present / decided) * 100) : null;
    return { ...row, decided, pct, status: pct === null ? null : getRequirementStatus(pct, threshold) };
  });
}

// Held classes, newest first
export function buildRecentAttendance(occurrences, limit = 10) {
  return occurrences
    .filter((o) => o.status !== STATUS.upcoming)
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey) || b.startMinutes - a.startMinutes)
    .slice(0, limit);
}
