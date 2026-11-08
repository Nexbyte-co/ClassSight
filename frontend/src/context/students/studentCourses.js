// src/context/students/studentCourses.js
// One data model for the whole student portal. Courses, rooms, times, instructor and batch come from
// the teacher's real timetable (data/schedule/timetable.js), so the student and teacher sides never
// disagree. Attendance statuses come from saved ClassSight sessions when the student appears in them;
// otherwise the existing labelled demo generator (studentWeek.js) is used. Nothing is stored per student.

import { DAYS, endTime, toMinutes } from "../../data/schedule/timetable";
import { STUDENT_BATCH, STUDENT_SLOTS } from "../../data/students/studentTimetable";
import { DEMO_SUBJECTS } from "../../data/students/studentDemo";
import { DEMO_ACCOUNTS, normalizeEmail } from "../demo-session/demoSession";
import { getLocalDateKey } from "../schedule/scheduleStatus";
import { classesNeededToReach } from "./studentOverview";
import {
  STATUS,
  buildDemoOccurrences,
  getRequirementStatus,
  buildWeeklyChart,
  getRecordedOccurrences,
  getWeekDateKeys,
  getWeekStart,
  mergeOccurrences,
} from "./studentWeek";

// Eight weeks of history matches the sidebar's "Academic Week 8"
export const STUDENT_HISTORY_WEEKS = 8;

// Demo only: share of classes missed per course, chosen so the demo shows healthy, warning and critical courses
const DEMO_ABSENT_RATE = { UCS615: 0.05, UCS503: 0.1, UML501: 0.15, UCS537: 0.3, UCS510: 0.33, UCS421: 0.45, UCS553: 0.4 };

// Which batch each demo student belongs to; the batch's weekly slots are the mock student timetable
const ENROLLMENT = {
  "prawat_be24@thapar.edu": [STUDENT_BATCH, "3T1"], // 3T1 is the Source Code Management section
};

// One attendance percentage covers every class type; a lab counts as two lectures (a tutorial counts as one)
export const CLASS_WEIGHT = { Lecture: 1, Tutorial: 1, Lab: 2 };
export const classWeight = (type) => CLASS_WEIGHT[type] ?? 1;
const classKind = (type) => (type in CLASS_WEIGHT ? type : "Lecture");

// Weighted present/absent/unverified for a set of held classes, plus the plain class counts per type
function tally(occs) {
  const t = { present: 0, absent: 0, unverified: 0, byType: {} };
  occs.forEach((o) => {
    if (o.status === STATUS.upcoming) return;
    const kind = classKind(o.type);
    t[o.status] += classWeight(kind);
    const b = (t.byType[kind] ??= { present: 0, absent: 0, unverified: 0 });
    b[o.status] += 1;
  });
  return t;
}

const to12h = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${String(((h + 11) % 12) + 1).padStart(2, "0")}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

const addDays = (date, n) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);

/** The student's weekly slots (mock timetable of their batch). */
export function getStudentSlots(email) {
  const groups = ENROLLMENT[normalizeEmail(email)] || [];
  return STUDENT_SLOTS.filter((s) => groups.includes(s.group));
}

/** Courses the student takes, one entry per course code, with all of its weekly slots. */
export function getStudentCourses(email) {
  const teacher = DEMO_ACCOUNTS.find((a) => a.role === "teacher");
  const courses = [];
  getStudentSlots(email).forEach((slot) => {
    // Lecture (…L) and practical (…P) slots of one course share its course code
    let course = courses.find((c) => c.code === slot.courseCode);
    if (!course) {
      const colors = DEMO_SUBJECTS[courses.length % DEMO_SUBJECTS.length];
      course = {
        code: slot.courseCode,
        name: slot.name,
        year: slot.sheet,
        group: slot.group,
        groupId: slot.gid,
        instructor: slot.instructor ?? teacher?.name ?? "—",
        color: colors.color,
        darkColor: colors.darkColor,
        slots: [],
      };
      courses.push(course);
    }
    course.slots.push({
      id: slot.id,
      label: slot.code,
      type: slot.type,
      instructor: slot.instructor ?? null,
      day: slot.day,
      dayIndex: DAYS.indexOf(slot.day),
      start: slot.start,
      end: endTime(slot),
      startMinutes: toMinutes(slot.start),
      duration: slot.dur,
      room: slot.venue,
    });
  });
  return courses;
}

/** The next `limit` classes after `now`, built from the weekly slots (looks up to 14 days ahead). */
export function getUpcomingClasses(courses, now, limit = 6) {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const out = [];
  courses.forEach((course) =>
    course.slots.forEach((slot) => {
      for (let ahead = 0; ahead < 14; ahead += 1) {
        const date = addDays(now, ahead);
        if (date.getDay() !== slot.dayIndex) continue;
        if (ahead === 0 && nowMin >= slot.startMinutes) continue;
        out.push({
          key: `up-${course.code}-${slot.id}-${ahead}`,
          code: course.code,
          course,
          slot,
          date,
          dateKey: getLocalDateKey(date),
          ahead,
          startMinutes: slot.startMinutes,
        });
      }
    })
  );
  return out.sort((a, b) => a.date - b.date || a.startMinutes - b.startMinutes).slice(0, limit);
}

/** Human label for a date relative to today: Today, Tomorrow or "Thu 5 Nov". */
export function relativeDayLabel(date, now) {
  const a = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((a - b) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function enrich(occ, courses) {
  const course = courses.find((c) => c.code === occ.code);
  const [y, m, d] = occ.dateKey.split("-").map(Number);
  const weekday = new Date(y, m - 1, d).getDay();
  const slot = course?.slots.find((s) => s.dayIndex === weekday && s.startMinutes === occ.startMinutes) ?? course?.slots[0];
  return {
    ...occ,
    course,
    room: slot?.room ?? null,
    type: slot?.type ?? null,
    slotCode: slot?.label ?? occ.code,
    endMinutes: slot ? slot.startMinutes + slot.duration : occ.startMinutes,
    instructor: slot?.instructor ?? course?.instructor ?? null,
    group: course?.group ?? null,
    method: occ.method ?? null,
    review: occ.status === STATUS.unverified ? "Awaiting teacher review" : null,
  };
}

/**
 * Everything the student pages show, derived in one place.
 * `roll` links the student to saved sessions (none is configured for the demo accounts, so demo statuses apply).
 */
export function buildStudentModel({ email, roll, now, sessions, scheduleList, threshold }) {
  const courses = getStudentCourses(email);
  const subjects = courses.map((c) => ({ code: c.code, name: c.name, absentRate: DEMO_ABSENT_RATE[c.code] }));
  const recorded = getRecordedOccurrences(roll, sessions, scheduleList);
  const usingDemo = recorded.length === 0;
  const timetable = getStudentSlots(email).map((s) => ({ day: DAYS.indexOf(s.day), code: s.courseCode, start: to12h(s.start) }));
  const base = usingDemo
    ? buildDemoOccurrences(timetable, subjects, now, STUDENT_HISTORY_WEEKS)
    : mergeOccurrences(recorded, []);
  const occurrences = base.map((o) => enrich(o, courses));

  const rows = courses.map((course) => {
    const s = tally(occurrences.filter((o) => o.code === course.code));
    const decided = s.present + s.absent;
    const pct = decided > 0 ? Math.round((s.present / decided) * 100) : null;
    const next = getUpcomingClasses([course], now, 1)[0] ?? null;
    return {
      ...course,
      present: s.present,
      absent: s.absent,
      unverified: s.unverified,
      decided,
      pct,
      status: pct === null ? null : getRequirementStatus(pct, threshold),
      byType: s.byType,
      next,
      needed: pct !== null && pct < threshold ? classesNeededToReach(s.present, decided, threshold) : 0,
    };
  });

  const present = rows.reduce((n, r) => n + r.present, 0);
  const absent = rows.reduce((n, r) => n + r.absent, 0);
  const unverified = rows.reduce((n, r) => n + r.unverified, 0);
  const decided = present + absent;
  const pct = decided > 0 ? Math.round((present / decided) * 100) : null;
  const byType = {};
  rows.forEach((r) =>
    Object.entries(r.byType).forEach(([kind, b]) => {
      const sum = (byType[kind] ??= { present: 0, absent: 0, unverified: 0 });
      sum.present += b.present;
      sum.absent += b.absent;
      sum.unverified += b.unverified;
    })
  );

  const todayKey = getLocalDateKey(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const today = occurrences
    .filter((o) => o.dateKey === todayKey)
    .sort((a, b) => a.startMinutes - b.startMinutes)
    .map((o) => ({ ...o, live: o.status === STATUS.upcoming ? false : nowMin >= o.startMinutes && nowMin < o.endMinutes }));

  const atRisk = rows.filter((r) => r.pct !== null && r.pct < threshold);
  const alerts = [
    ...atRisk.map((r) => ({
      id: `risk-${r.code}`,
      tone: r.status?.level === "critical" ? "bad" : "warn",
      title: `${r.name}: ${r.pct}%`,
      text: Number.isFinite(r.needed)
        ? `Below the ${threshold}% requirement. Attend the next ${r.needed} class${r.needed === 1 ? "" : "es"} in a row to reach it.`
        : `Below the ${threshold}% requirement.`,
      to: "/student/reports",
    })),
    ...(unverified > 0
      ? [{
          id: "unverified",
          tone: "info",
          title: `${unverified} class${unverified === 1 ? "" : "es"} awaiting review`,
          text: "Face verification was unclear, so your teacher will confirm these. They are not counted as absences.",
          to: "/student/reports",
        }]
      : []),
  ];

  return {
    now,
    email,
    courses,
    rows,
    occurrences,
    usingDemo,
    threshold,
    overall: { present, absent, unverified, decided, held: decided, pct, byType },
    atRisk,
    alerts,
    today,
    upcoming: getUpcomingClasses(courses, now, 8),
    week: buildWeeklyChart(occurrences, getWeekDateKeys(now)),
    todayKey,
  };
}

/**
 * The seven days of the week starting at `weekStart` (a Sunday) with every class on them.
 * Past and current weeks use the model's records; future weeks are built from the weekly slots as upcoming.
 * Past days older than the available history have no entries.
 */
export function getWeekEntries(model, weekStart) {
  const todayKey = model.todayKey;
  const nowMin = model.now.getHours() * 60 + model.now.getMinutes();
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const dateKey = getLocalDateKey(date);
    const entries = [];
    model.courses.forEach((course) =>
      course.slots
        .filter((slot) => slot.dayIndex === date.getDay())
        .forEach((slot) => {
          const found = model.occurrences.find(
            (o) => o.dateKey === dateKey && o.code === course.code && o.startMinutes === slot.startMinutes
          );
          const future = dateKey > todayKey || (dateKey === todayKey && slot.startMinutes > nowMin);
          if (!found && !future) return;
          entries.push(
            found ?? {
              key: `future-${dateKey}-${course.code}-${slot.id}`,
              dateKey,
              startMinutes: slot.startMinutes,
              endMinutes: slot.startMinutes + slot.duration,
              code: course.code,
              subject: course.name,
              course,
              room: slot.room,
              instructor: slot.instructor ?? course.instructor,
              type: slot.type,
              slotCode: slot.label,
              group: course.group,
              status: STATUS.upcoming,
              method: null,
              review: null,
              source: "schedule",
            }
          );
        })
    );
    entries.sort((a, b) => a.startMinutes - b.startMinutes);
    return {
      date,
      dateKey,
      label: date.toLocaleDateString("en-GB", { weekday: "short" }),
      isToday: dateKey === todayKey,
      entries: entries.map((o) => ({
        ...o,
        live: o.status !== STATUS.upcoming && dateKey === todayKey && nowMin >= o.startMinutes && nowMin < o.endMinutes,
      })),
    };
  });
}

export { getWeekStart };
