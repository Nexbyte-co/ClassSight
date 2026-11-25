// src/pages/Students/studentData.js — the Students page's data shape, built from the API
// (GET /classrooms, GET /classrooms/{id}/students, GET /attendance/logs) plus the band helpers.
import { getAtRiskFloor } from "../../context/settings/settingsStore";

/**
 * @typedef {Object} Student
 * @property {string} key          unique id ("classroomId-studentId")
 * @property {number} id           API student id
 * @property {string} name
 * @property {string} roll         college roll number
 * @property {boolean} faceEnrolled
 * @property {number} batchIndex   index into the batches list
 * @property {string} batch        section name, e.g. "3C2C"
 * @property {string} course       course name
 * @property {boolean[]} pres      present at each session of the class (oldest first)
 * @property {{date: Date, classes: {t: string, tm: string, mn: number, ok: boolean}[]}[]} days
 * @property {number} a            sessions attended
 * @property {number} h            sessions held
 * @property {number} pct          attendance %
 * @property {Date|null} last      date of the last session attended
 */

/** @typedef {"er"|"wa"|"ok"} Band  Critical / Warning / Good */

const toDate = (key) => new Date(`${key}T12:00:00`);

/** One batch per class the teacher can see; a subject groups the classes of one course. */
export function buildBatches(classrooms) {
  return classrooms.map((c, index) => ({
    index,
    classroomId: c.id,
    group: c.section,
    name: c.course,
    code: c.course_code || "",
    courseKey: (c.course_code || c.course).toLowerCase(),
  }));
}

export function buildSubjects(batches) {
  const seen = new Map();
  batches.forEach((b) => {
    if (!seen.has(b.courseKey)) seen.set(b.courseKey, { key: b.courseKey, name: b.name, code: b.code });
  });
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Students of every class with their attendance so far.
 * rosters / logs: classroomId -> API answer.
 */
export function buildStudents(batches, rosters, logs) {
  return batches.flatMap((b) => {
    const roster = rosters[b.classroomId] || [];
    const sessions = (logs[b.classroomId] || [])
      .filter((entry) => entry.records.length > 0)
      .sort((x, y) => (x.session.session_date < y.session.session_date ? -1 : 1));
    return roster.map((s) => {
      const days = [];
      const pres = [];
      sessions.forEach((entry) => {
        const record = entry.records.find((r) => r.student_id === s.id);
        if (!record) return; // the student was not in the class on that day
        const ok = record.status === "present";
        pres.push(ok);
        days.push({
          date: toDate(entry.session.session_date),
          classes: [{ t: b.code || b.name, tm: "", mn: 1, ok, excused: record.status === "excused" }],
        });
      });
      const a = pres.filter(Boolean).length;
      const h = pres.length;
      const lastIndex = pres.lastIndexOf(true);
      return {
        key: `${b.classroomId}-${s.id}`,
        id: s.id,
        name: s.name,
        roll: s.roll_number,
        faceEnrolled: Boolean(s.face_enrolled),
        batchIndex: b.index,
        batch: b.group,
        course: b.name,
        pres,
        days,
        a,
        h,
        pct: h ? Math.round((a / h) * 100) : 0,
        last: lastIndex < 0 ? null : days[lastIndex].date,
      };
    });
  });
}

/** Present / absent at a class's most recent session, or null when none was saved yet. */
export function lastSession(batch, logs) {
  const entries = (logs[batch.classroomId] || []).filter((entry) => entry.records.length > 0);
  if (!entries.length) return null;
  const latest = entries.reduce((best, entry) => (entry.session.session_date > best.session.session_date ? entry : best));
  const present = latest.records.filter((r) => r.status === "present").length;
  return { date: toDate(latest.session.session_date), present, absent: latest.records.length - present };
}

/** Students in the chosen subject ("all" or course key) and batch ("all" or batch index) */
export const studentsInScope = (students, batches, subject, batch) =>
  students.filter(
    (r) =>
      (subject === "all" || batches[r.batchIndex].courseKey === subject) &&
      (batch === "all" || r.batchIndex === +batch)
  );

// ---- bands (driven by the Settings attendance threshold) ----
/** @returns {Band} */
export const bandOf = (pct, thr) => (pct >= thr ? "ok" : pct >= getAtRiskFloor(thr) ? "wa" : "er");
export const BAND_ORDER = ["er", "wa", "ok"];
export const BAND_LABEL = { er: "Critical", wa: "Warning", ok: "Good" };
export const bandRange = (band, thr) =>
  band === "er" ? `Below ${getAtRiskFloor(thr)}%` : band === "wa" ? `${getAtRiskFloor(thr)}–${thr - 1}%` : `${thr}% and above`;
/** Short range for the count boxes: "< 65%", "65–74%", "75%+" */
export const bandRangeShort = (band, thr) => bandRange(band, thr).replace(" and above", "+").replace("Below ", "< ");

/** Sessions in a row needed to reach the threshold: ceil((T·held − attended) / (1 − T)) */
export function labsToReach(r, thr) {
  const T = thr / 100;
  return T >= 1 ? 0 : Math.max(0, Math.ceil((T * r.h - r.a) / (1 - T) - 1e-9));
}

export const average = (list) => (list.length ? Math.round(list.reduce((s, r) => s + r.pct, 0) / list.length) : 0);

// ---- formatting ----
export const shortDate = (t) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
export const dayLabel = (d) =>
  d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }).replace(",", "");

// ---- CSV export ----
export function downloadStudentsCsv(list, thr, tag) {
  const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [["Roll No", "Name", "Section", "Course", "Sessions Held", "Sessions Attended", "Attendance %", "Status", "Last Attended", "Face Enrolled"]]
    .concat(
      list.map((r) => [
        r.roll,
        r.name,
        r.batch,
        r.course,
        r.h,
        r.a,
        r.pct,
        BAND_LABEL[bandOf(r.pct, thr)],
        r.last ? r.last.toISOString().slice(0, 10) : "",
        r.faceEnrolled ? "Yes" : "No",
      ])
    )
    .map((row) => row.map(q).join(","));
  try {
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `students${tag ? `-${tag}` : ""}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {
    /* downloads blocked: nothing to do */
  }
}
