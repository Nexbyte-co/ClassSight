// src/context/students/studentCourses.js
// One data model for the whole student portal, built from GET /student/overview: the student's batch's
// classes and weekly lectures, and the attendance their teachers saved. Nothing is stored per student.

import { DAYS, toMinutes } from "../../data/schedule/timeUtils";
import { SUBJECT_COLORS } from "../../data/students/studentPalette";
import { getLocalDateKey } from "../schedule/scheduleStatus";
import { classesNeededToReach } from "./studentOverview";
import { STATUS, getRequirementStatus, buildWeeklyChart, getWeekDateKeys, getWeekStart } from "./studentWeek";

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

const addDays = (date, n) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);

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
 * Everything the student pages show, from GET /student/overview: their batch's classes
 * (with weekly lectures) and their own saved attendance. Only classes the teacher actually saved are
 * counted: a lecture with no saved session is neither present nor absent. "Excused" is left out of the
 * percentage rather than counted against the student.
 */
export function buildStudentModelFromApi({ overview, now, threshold }) {
  const { student, classes, records } = overview;
  const courses = classes.map((c, index) => {
    const colors = SUBJECT_COLORS[index % SUBJECT_COLORS.length];
    const code = c.course_code || c.course;
    return {
      code,
      name: c.course,
      year: student.section_name,
      group: student.section_name,
      groupId: student.section_id,
      instructor: c.teacher_name || "—",
      color: colors.color,
      darkColor: colors.darkColor,
      classroomId: c.id,
      slots: c.lectures.map((l) => {
        const start = l.start_time.slice(0, 5);
        const startMinutes = toMinutes(start);
        const dayIndex = (l.weekday + 1) % 7; // the API counts Monday as 0, the portal Sunday as 0
        return {
          id: `lec-${l.id}`,
          label: code,
          type: "Lecture",
          instructor: c.teacher_name || null,
          day: DAYS[dayIndex],
          dayIndex,
          start,
          end: l.end_time.slice(0, 5),
          startMinutes,
          duration: toMinutes(l.end_time.slice(0, 5)) - startMinutes,
          room: l.room || "—",
        };
      }),
    };
  });
  const byClass = new Map(classes.map((c, i) => [c.id, courses[i]]));
  const occurrences = records
    .filter((r) => r.status !== "excused" && byClass.has(r.classroom_id))
    .map((r) => {
      const course = byClass.get(r.classroom_id);
      const [y, mo, d] = r.session_date.split("-").map(Number);
      const slot = course.slots.find((s) => s.dayIndex === new Date(y, mo - 1, d).getDay());
      return enrich(
        {
          key: `rec-${r.session_date}-${r.classroom_id}`,
          dateKey: r.session_date,
          startMinutes: slot?.startMinutes ?? 0,
          code: course.code,
          subject: course.name,
          status: r.status === "present" ? STATUS.present : STATUS.absent,
          method: null,
          source: "recorded",
        },
        courses
      );
    });
  return assembleModel({ email: student.email, courses, occurrences, now, threshold });
}

function assembleModel({ email, courses, occurrences, now, threshold }) {
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
  // Today's timetable slots that have no saved attendance yet and have not finished: shown as upcoming.
  const scheduledToday = courses.flatMap((course) =>
    course.slots
      .filter(
        (slot) =>
          slot.dayIndex === now.getDay() &&
          slot.startMinutes + slot.duration > nowMin &&
          !occurrences.some((o) => o.dateKey === todayKey && o.code === course.code && o.startMinutes === slot.startMinutes)
      )
      .map((slot) => ({
        key: `today-${course.code}-${slot.id}`,
        dateKey: todayKey,
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
      }))
  );
  const today = [...occurrences, ...scheduledToday]
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
