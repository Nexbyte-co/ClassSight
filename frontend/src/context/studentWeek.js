// src/context/studentWeek.js
// Pure helpers for the student portal Dashboard: greeting, Sunday–Saturday week,
// class occurrences (recorded ClassSight sessions or labelled demo data), weekly
// chart data, subject-wise summary and recent history. All dates are local.

import {
  getLocalDateKey,
  isValidDateKey,
  parseSessionId,
  parseTimeSlotMinutes,
} from "./scheduleStatus";
import { getAtRiskFloor } from "./settingsStore";

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

function minutesOfDay(date) {
  return date.getHours() * 60 + date.getMinutes();
}

// Small deterministic hash so demo statuses are stable across reloads
function hashString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// DEMO occurrences from the demo timetable, from `weeks` weeks ago to the end of this week.
// Classes after `now` are "upcoming" (never absent). Recent demo classes may be unverified.
export function buildDemoOccurrences(timetable, subjects, now = new Date(), weeks = 4) {
  const byCode = new Map(subjects.map((s) => [s.code, s]));
  const todayKey = getLocalDateKey(now);
  const yesterdayKey = getLocalDateKey(addDays(now, -1));
  const nowMinutes = minutesOfDay(now);
  const firstSunday = addDays(getWeekStart(now), -7 * (weeks - 1));
  const occurrences = [];

  for (let i = 0; i < weeks * 7; i++) {
    const date = addDays(firstSunday, i);
    const dateKey = getLocalDateKey(date);
    timetable
      .filter((t) => t.day === date.getDay() && byCode.has(t.code))
      .forEach((t) => {
        const subject = byCode.get(t.code);
        const startMinutes = parseTimeSlotMinutes(t.start)?.startMinutes ?? 0;
        const isFuture = dateKey > todayKey || (dateKey === todayKey && startMinutes > nowMinutes);
        let status = STATUS.upcoming;
        if (!isFuture) {
          const h = hashString(`${dateKey}|${t.code}`);
          if (dateKey >= yesterdayKey && h % 4 === 0) status = STATUS.unverified;
          else status = h % 10 < 8 ? STATUS.present : STATUS.absent;
        }
        occurrences.push({
          key: `demo-${dateKey}-${t.code}`,
          dateKey,
          startMinutes,
          code: subject.code,
          subject: subject.name,
          status,
          source: "demo",
        });
      });
  }
  return occurrences;
}

// Occurrences from sessions recorded in ClassSight where the student's roll number appears.
// One occurrence per session id; the session's own date is used.
export function getRecordedOccurrences(roll, sessions, scheduleList) {
  if (!roll || !sessions || typeof sessions !== "object") return [];
  const scheduleById = new Map((scheduleList || []).map((c) => [c.id, c]));
  const occurrences = [];
  Object.entries(sessions).forEach(([sessionId, session]) => {
    const { classId, dateKey } = parseSessionId(sessionId);
    if (!classId || !isValidDateKey(dateKey) || !session) return;
    const inList = (list) => Array.isArray(list) && list.some((s) => s.roll === roll);
    const status = inList(session.verified)
      ? STATUS.present
      : inList(session.absent)
      ? STATUS.absent
      : inList(session.unverified)
      ? STATUS.unverified
      : null;
    if (!status) return;
    const info = session.classInfo || scheduleById.get(classId) || null;
    occurrences.push({
      key: `session-${sessionId}`,
      dateKey,
      startMinutes: parseTimeSlotMinutes(info?.timeRange || info?.time)?.startMinutes ?? 0,
      code: info?.code || classId,
      subject: info?.title || "Removed lecture",
      status,
      source: "recorded",
    });
  });
  return occurrences;
}

// Recorded occurrences win over demo ones for the same subject and date; no key is counted twice
export function mergeOccurrences(recorded, demo) {
  const seen = new Set();
  const recordedSlots = new Set(recorded.map((o) => `${o.dateKey}|${o.code}`));
  const merged = [];
  [...recorded, ...demo.filter((o) => !recordedSlots.has(`${o.dateKey}|${o.code}`))].forEach((o) => {
    if (seen.has(o.key)) return;
    seen.add(o.key);
    merged.push(o);
  });
  return merged;
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
