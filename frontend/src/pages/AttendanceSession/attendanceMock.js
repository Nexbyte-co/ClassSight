// src/pages/AttendanceSession/attendanceMock.js
// MOCK data for the Attendance session page (design handoff: ClassSight-Attendance-Handoff).
// Built on the same deterministic roster as Students and Reports, so names, rolls and
// overall attendance match across pages.
//
// API swap points:
//   GET  /sessions/:id                  -> SESSION (class details) + initialRows()
//   GET  /students/:id/attendance       -> OVERALL[j] (overall %, recent labs, last attended)
//   GET  /batches/:id/next-class        -> UP_NEXT
//   POST /sessions/:id/records          -> the "save" action in useAttendanceSession
import { SLOTS, endTime } from "../../data/schedule/timetable";
import { hash } from "../Reports/reportsMock";
import { STUDENTS } from "../Students/studentsMock";

/** @typedef {"ai"|"nfc"|"man"} Method  face photo, NFC card, manual */

/**
 * @typedef {Object} Row
 * @property {number} j          position in the batch
 * @property {string} name
 * @property {string} roll
 * @property {"p"|"u"|"a"} st    present, needs review, absent
 * @property {Method|null} m     how a present student was verified
 * @property {string} why        why the group photo didn't match them
 */

/** Batch of this session (3C2C, Software Engineering lab) */
export const BATCH_INDEX = Math.max(0, SLOTS.findIndex((o) => o.group === "3C2C"));
const slot = SLOTS[BATCH_INDEX];

export const SESSION = {
  name: slot.name,
  code: slot.code,
  group: slot.group,
  type: slot.type,
  start: slot.start,
  end: endTime(slot),
  venue: slot.venue,
};

export const REASONS = [
  "Face partly hidden by a cap",
  "Low light in the back row",
  "Turned away from the camera",
  "Blurred — moved during the photo",
  "Face overlaps another student",
  "Face behind a monitor",
  "Not found in the photo",
];

const ROSTER = STUDENTS.filter((s) => s.batchIndex === BATCH_INDEX);

/** Students as the group photo left them: about 7 need review, the rest matched by face */
export function initialRows() {
  return ROSTER.map((s, j) => {
    const u = hash(BATCH_INDEX, j, 77) < 0.24;
    return {
      j,
      name: s.name,
      roll: s.roll,
      st: u ? "u" : "p",
      m: u ? null : "ai",
      why: u ? REASONS[Math.floor(hash(BATCH_INDEX, j, 78) * REASONS.length)] : "",
    };
  });
}

/** Overall attendance for each student (j): pct, weekly labs attended, last attended */
export const OVERALL = ROSTER.map((s) => ({ pct: s.pct, pres: s.pres, last: s.last }));

/** Face match score shown in Face check (the auto-mark threshold is 80%) */
export const faceScore = (j) => Math.round(42 + hash(BATCH_INDEX, j, 93) * 35);
export const FACE_THRESHOLD = 80;

export const UP_NEXT = {
  name: "Database Management System II",
  group: "2Q3B",
  code: "UCS303P",
  type: "Lab",
  time: "11:20 – 13:00",
  venue: "L207",
  students: 30,
  startsIn: "1h 40m",
  later: [{ time: "13:50", name: "Software Engineering", meta: "3C81B · L105" }],
  dayEnd: { time: "15:40", meta: "Day ends after 3C81B" },
};
