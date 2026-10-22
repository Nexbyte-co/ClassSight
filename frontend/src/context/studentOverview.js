// src/context/studentOverview.js
// Pure helpers for the student-facing overview (frontend demo, no student login).
// Everything is derived for ONE student; other students' records are never returned.

import { parseSessionId, isValidDateKey, formatShortSessionDate } from "./scheduleStatus";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function findStudent(students, studentId) {
  if (!Array.isArray(students) || typeof studentId !== "string") return null;
  return students.find((s) => s.id === studentId) || null;
}

// "10 Sep 2026" (demo record format) -> "2026-09-10"
export function historyDateToKey(dateText) {
  const match = typeof dateText === "string" ? dateText.match(/^(\d{1,2}) ([A-Za-z]{3}) (\d{4})$/) : null;
  if (!match) return null;
  const month = MONTHS.indexOf(match[2]);
  if (month < 0) return null;
  const key = `${match[3]}-${String(month + 1).padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  return isValidDateKey(key) ? key : null;
}

// Classes the student must attend in a row to reach the threshold (0 if already there)
export function classesNeededToReach(attended, total, threshold) {
  const t = threshold / 100;
  if (total <= 0 || attended / total >= t) return 0;
  if (t >= 1) return Infinity;
  return Math.ceil((t * total - attended) / (1 - t));
}

// Classes the student can still miss while staying at or above the threshold
export function classesCanMiss(attended, total, threshold) {
  const t = threshold / 100;
  if (total <= 0 || t <= 0 || attended / total < t) return 0;
  return Math.max(0, Math.floor(attended / t - total + 1e-9));
}

// This student's entries in sessions recorded in ClassSight (matched by roll number)
export function getRecordedEntriesForStudent(student, sessions, scheduleList) {
  if (!student || !sessions || typeof sessions !== "object") return [];
  const scheduleById = new Map((scheduleList || []).map((c) => [c.id, c]));
  const entries = [];

  Object.entries(sessions).forEach(([sessionId, session]) => {
    const { classId, dateKey } = parseSessionId(sessionId);
    if (!classId || !isValidDateKey(dateKey) || !session) return;

    const verified = session.verified.find((s) => s.roll === student.roll);
    const absent = session.absent.find((s) => s.roll === student.roll);
    const pending = session.unverified.find((s) => s.roll === student.roll);
    if (!verified && !absent && !pending) return;

    const classInfo = session.classInfo || scheduleById.get(classId) || null;
    const subject = classInfo
      ? `${classInfo.title}${classInfo.code ? ` (${classInfo.code})` : ""}`
      : "Removed lecture";

    entries.push({
      key: `session-${sessionId}`,
      dateKey,
      date: formatShortSessionDate(dateKey),
      time: classInfo?.timeRange?.split(/[–-]/)[0]?.trim() || "",
      subject,
      status: verified ? "Present" : absent ? "Absent" : "Pending",
      method: verified ? verified.method || "Verified" : absent ? "Confirmed absent" : "Awaiting verification",
      source: "ClassSight session",
    });
  });
  return entries;
}

export function getAttendanceLevel(pct, threshold) {
  if (pct >= threshold) return "safe";
  if (pct >= threshold - 10) return "warning";
  return "critical";
}

// Overview for one student: profile, semester summary, threshold guidance,
// recent history (demo record + ClassSight sessions) and subject-wise breakdown.
export function buildStudentOverview(student, sessions, scheduleList, threshold) {
  if (!student) return null;

  const total = Number.isFinite(student.totalClasses) ? student.totalClasses : 0;
  const attended = Number.isFinite(student.classesAttended) ? student.classesAttended : 0;
  const pct = total > 0 ? Math.round((attended / total) * 100) : null;

  const demoHistory = (Array.isArray(student.history) ? student.history : []).map((h, i) => {
    const dateKey = historyDateToKey(h.date);
    return {
      key: `demo-${i}`,
      dateKey,
      date: dateKey ? formatShortSessionDate(dateKey) : h.date,
      time: h.time || "",
      subject: h.subject,
      status: h.status === "Present" ? "Present" : "Absent",
      method: h.method,
      source: "Demo record",
    };
  });

  const history = [...getRecordedEntriesForStudent(student, sessions, scheduleList), ...demoHistory].sort(
    (a, b) => (b.dateKey || "").localeCompare(a.dateKey || "")
  );

  // Subject-wise breakdown over the decided (present/absent) lectures in `history`
  const bySubject = new Map();
  history.forEach((h) => {
    if (h.status === "Pending") return;
    const row = bySubject.get(h.subject) || { subject: h.subject, present: 0, absent: 0 };
    if (h.status === "Present") row.present += 1;
    else row.absent += 1;
    bySubject.set(h.subject, row);
  });
  const subjects = [...bySubject.values()]
    .map((row) => {
      const count = row.present + row.absent;
      const subjectPct = Math.round((row.present / count) * 100);
      return { ...row, total: count, pct: subjectPct, belowThreshold: subjectPct < threshold };
    })
    .sort((a, b) => a.pct - b.pct || a.subject.localeCompare(b.subject));

  return {
    profile: {
      name: student.name,
      roll: student.roll,
      section: student.class,
      department: student.department,
      email: student.email,
      phone: student.phone,
    },
    summary: {
      pct,
      total,
      attended,
      missed: Math.max(0, total - attended),
      level: pct === null ? null : getAttendanceLevel(pct, threshold),
      belowThreshold: pct !== null && pct < threshold,
      classesNeeded: classesNeededToReach(attended, total, threshold),
      classesCanMiss: classesCanMiss(attended, total, threshold),
    },
    history,
    subjects,
  };
}
