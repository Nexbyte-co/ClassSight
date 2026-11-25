// Pure helpers that turn the teacher's real classes into the shapes the Classes and Schedule pages show.
import { DAYS, toMinutes } from "../data/schedule/timeUtils";

const ORDINAL = { 1: "1st", 2: "2nd", 3: "3rd" };

// "3C23" -> "3rd Year", "1MCA2" -> "1st Year"; batch names that don't start with a digit -> "Other"
export function yearLabel(batchName) {
  const m = /^\s*(\d)/.exec(batchName || "");
  return m ? `${ORDINAL[m[1]] ?? `${m[1]}th`} Year` : "Other";
}

const hhmm = (t) => String(t).slice(0, 5);

/** The kind of a weekly slot, from what the subject has per week and how long the slot is. */
const SESSION_LABEL = { lecture: "Lecture", lab: "Lab", tutorial: "Tutorial" };

export function slotType(classroom, minutes) {
  const { lecture_count: lec = 0, lab_count: lab = 0, tutorial_count: tut = 0 } = classroom;
  if (lab > 0 && lec === 0 && tut === 0) return "Lab";
  if (tut > 0 && lec === 0 && lab === 0) return "Tutorial";
  if (lab > 0 && minutes >= 100) return "Lab";
  return "Lecture";
}

const pct = (present, total) => (total > 0 ? Math.round((present / total) * 100) : null);

/** Attendance % over all saved records of the given classes; null when nothing was recorded yet. */
export function attendanceOf(classIds, byClass) {
  let present = 0;
  let total = 0;
  classIds.forEach((id) =>
    (byClass[id]?.logs ?? []).forEach((log) =>
      log.records.forEach((r) => {
        total += 1;
        if (r.status === "present") present += 1;
      })
    )
  );
  return pct(present, total);
}

/**
 * One weekly slot per lecture of each of the teacher's classes, and one course per subject (a subject taught
 * to several batches is one course with several groups).
 */
export function buildTimetable(classrooms, byClass) {
  const courses = [];
  const slots = [];
  classrooms.forEach((c) => {
    const code = c.course_code || c.course;
    const key = `${code}|${c.course}`;
    let course = courses.find((x) => x.key === key);
    if (!course) {
      course = { key, code, name: c.course, att: null, slots: 0, classIds: [] };
      courses.push(course);
    }
    course.classIds.push(c.id);
    (byClass[c.id]?.lectures ?? []).forEach((l) => {
      const start = hhmm(l.start_time);
      const dur = toMinutes(hhmm(l.end_time)) - toMinutes(start);
      course.slots += 1;
      slots.push({
        id: `lec-${l.id}`,
        lectureId: l.id,
        classroomId: c.id,
        code,
        name: c.course,
        sheet: yearLabel(c.section),
        group: c.section,
        gid: "",
        venue: l.room || "—",
        day: DAYS[(l.weekday + 1) % 7], // the API counts Monday as 0, the pages Sunday as 0
        start,
        dur,
        type: SESSION_LABEL[l.session_type] ?? slotType(c, dur),
        courseIndex: courses.indexOf(course),
        att: null,
      });
    });
  });
  courses.forEach((course) => {
    course.att = attendanceOf(course.classIds, byClass);
  });
  slots.forEach((s) => {
    s.att = courses[s.courseIndex].att;
  });
  return { slots, courses };
}
