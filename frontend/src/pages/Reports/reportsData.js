// The Reports pages' numbers, computed from the teacher's real saved attendance sessions (no sample data).
// One "batch" here is one of the teacher's classes: a subject taught to a batch of students.
import { DAYS, toMinutes } from "../../data/schedule/timeUtils";
import { slotType } from "../../context/teacherModel";
import { LOW_ATTENDANCE_PCT } from "./reportsUtil";

const DAY_MS = 86400000;
const localMidnight = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const pctOf = (present, held) => (held > 0 ? Math.round((present / held) * 100) : null);
const mean = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : null);

/** present / held over saved records; "excused" is neither, so it never counts against a student. */
function tally(sessions) {
  let present = 0;
  let held = 0;
  sessions.forEach((s) =>
    s.records.forEach((r) => {
      if (r.status === "present") {
        present += 1;
        held += 1;
      } else if (r.status === "absent") held += 1;
    })
  );
  return { present, held };
}
const sessionPct = (sessions) => {
  const { present, held } = tally(sessions);
  return pctOf(present, held);
};

export function buildReports(classrooms, byClass, today = new Date()) {
  const ordered = [...classrooms].sort(
    (a, b) => a.course.localeCompare(b.course) || a.section.localeCompare(b.section, undefined, { numeric: true })
  );

  const SUBJECTS = [];
  const BATCHES = ordered.map((c, index) => {
    const code = c.course_code || c.course;
    const key = `${code}|${c.course}`;
    let courseIndex = SUBJECTS.findIndex((s) => s.key === key);
    if (courseIndex < 0) {
      SUBJECTS.push({ key, name: c.course, code });
      courseIndex = SUBJECTS.length - 1;
    }
    const data = byClass[c.id] ?? { lectures: [], logs: [], students: [] };
    const first = data.lectures[0];
    const minutes = first ? toMinutes(String(first.end_time).slice(0, 5)) - toMinutes(String(first.start_time).slice(0, 5)) : 50;
    const sessions = data.logs
      .map((l) => {
        const date = localMidnight(l.session.session_date);
        return { id: l.session.id, date, t: date.getTime(), records: l.records };
      })
      .sort((a, b) => a.t - b.t);
    return {
      index,
      id: c.id,
      code,
      name: c.course,
      group: c.section,
      type: slotType(c, minutes),
      courseIndex,
      students: data.students,
      lectures: data.lectures,
      sessions,
      avg: sessionPct(sessions),
    };
  });

  // ---- the time axis: from the first saved session to the last ----
  const allDays = [...new Set(BATCHES.flatMap((b) => b.sessions.map((s) => s.t)))].sort((a, b) => a - b);
  const todayT = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const SEMESTER_START = allDays.length ? allDays[0] : todayT;
  const SEMESTER_END = allDays.length ? allDays[allDays.length - 1] : todayT;
  const first = new Date(SEMESTER_START);
  const week0 = new Date(first.getFullYear(), first.getMonth(), first.getDate() - ((first.getDay() + 6) % 7)).getTime();
  const weekOf = (t) => Math.floor((t - week0 + DAY_MS / 2) / (7 * DAY_MS));

  const scope = (batchIndex, allMode) => (allMode ? BATCHES : [BATCHES[batchIndex]].filter(Boolean));
  const sessionsIn = (batches, from, to) => batches.flatMap((b) => b.sessions.filter((s) => s.t >= from && s.t <= to));
  const weeksOf = (sessions) => [...new Set(sessions.map((s) => weekOf(s.t)))].sort((a, b) => a - b);

  const batchesOfSubject = (courseIndex) => BATCHES.filter((b) => b.courseIndex === courseIndex);

  /** Week-by-week rows for the Weekly breakdown card (weeks with sessions inside [from, to]). */
  function weeklyBreakdown(batchIndex, allMode, from, to) {
    const batches = scope(batchIndex, allMode);
    const everything = sessionsIn(batches, -Infinity, Infinity);
    const value = (w) => sessionPct(everything.filter((s) => weekOf(s.t) === w));
    const weeks = weeksOf(sessionsIn(batches, from, to));
    const values = weeks.map(value);
    const hi = Math.max(...values);
    const lo = Math.min(...values);
    return weeks.map((w, i) => {
      const before = value(w - 1);
      const heldThisWeek = batches.flatMap((b) => b.sessions.filter((s) => weekOf(s.t) === w).map(() => b.type));
      return {
        week: w + 1,
        v: values[i],
        change: before === null || values[i] === null ? null : values[i] - before,
        lecs: heldThisWeek.filter((t) => t !== "Lab").length,
        labs: heldThisWeek.filter((t) => t === "Lab").length,
        best: weeks.length > 1 && values[i] === hi,
        lowest: weeks.length > 1 && values[i] === lo,
      };
    });
  }

  /** Trend points for the chart: one per day, or one per week when the range has more than 20 teaching days. */
  function trendPoints(batchIndex, allMode, from, to) {
    const batches = scope(batchIndex, allMode);
    const days = [...new Set(sessionsIn(batches, from, to).map((s) => s.t))]
      .sort((a, b) => a - b)
      .map((t) => ({ t, w: weekOf(t), v: sessionPct(sessionsIn(batches, t, t)) }))
      .filter((d) => d.v !== null);
    if (days.length > 20) {
      const byWeek = new Map();
      days.forEach((d) => byWeek.set(d.w, [...(byWeek.get(d.w) ?? []), d.v]));
      return [...byWeek].map(([w, vs]) => ({ label: `W${w + 1}`, tip: `Week ${w + 1} · ${Math.round(mean(vs))}%`, v: mean(vs) }));
    }
    return days.map((d) => {
      const date = new Date(d.t);
      return {
        label: date.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
        tip: `${date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} · ${d.v}%`,
        v: d.v,
      };
    });
  }

  /** Stats for the Batch selected card, or null when the range has no saved sessions */
  function batchStats(batchIndex, from, to) {
    const batch = BATCHES[batchIndex];
    if (!batch) return null;
    const inRange = batch.sessions.filter((s) => s.t >= from && s.t <= to);
    const avg = sessionPct(inRange);
    if (avg === null) return null;
    const siblings = batchesOfSubject(batch.courseIndex);
    const subjectAvg = sessionPct(siblings.flatMap((b) => b.sessions));
    const weeks = weeksOf(inRange).map((w) => ({ week: w + 1, v: sessionPct(inRange.filter((s) => weekOf(s.t) === w)) }));
    const best = weeks.reduce((a, b) => (b.v > a.v ? b : a), weeks[0]);
    const lowest = weeks.reduce((a, b) => (b.v < a.v ? b : a), weeks[0]);
    const lab = batch.type === "Lab";
    return {
      avg,
      delta: avg - (subjectAvg ?? avg),
      lecsHeld: lab ? 0 : inRange.length,
      labsHeld: lab ? inRange.length : 0,
      best,
      lowest,
    };
  }

  /** All students of the batch (or of every batch in all-mode) with attendance for the range */
  function studentRows(batchIndex, allMode, from, to) {
    return scope(batchIndex, allMode).flatMap((b) => {
      const inRange = b.sessions.filter((s) => s.t >= from && s.t <= to);
      return b.students.map((st) => {
        let a = 0;
        let h = 0;
        inRange.forEach((s) => {
          const r = s.records.find((x) => x.student_id === st.id);
          if (!r) return;
          if (r.status === "present") {
            a += 1;
            h += 1;
          } else if (r.status === "absent") h += 1;
        });
        return { id: st.id, name: st.name, roll: st.roll_number, batch: b.group, a, h, pct: h ? Math.round((a / h) * 100) : 0 };
      });
    });
  }

  /** Students under the threshold who have had at least one class counted, lowest first */
  const lowAttendance = (rows) =>
    rows.filter((r) => r.h > 0 && r.pct < LOW_ATTENDANCE_PCT).sort((a, b) => a.pct - b.pct || a.name.localeCompare(b.name));

  const KPIS = {
    lecturesHeld: BATCHES.filter((b) => b.type !== "Lab").reduce((n, b) => n + b.sessions.length, 0),
    labsHeld: BATCHES.filter((b) => b.type === "Lab").reduce((n, b) => n + b.sessions.length, 0),
    totalBatches: BATCHES.length,
  };

  const findBatch = (name, group) => BATCHES.findIndex((b) => b.name === name && b.group === group);

  /** Every saved session of a batch, newest first. */
  function batchSessions(batchIndex) {
    const b = BATCHES[batchIndex];
    if (!b) return [];
    return [...b.sessions]
      .reverse()
      .map((s) => {
        const weekday = (s.date.getDay() + 6) % 7; // the API counts Monday as 0
        const slot = b.lectures.find((l) => l.weekday === weekday) ?? b.lectures[0];
        const { present, held } = tally([s]);
        return {
          date: s.date,
          code: b.code,
          type: b.type,
          time: slot ? String(slot.start_time).slice(0, 5) : "",
          venue: slot?.room || "—",
          present,
          total: held,
        };
      });
  }

  return {
    BATCHES,
    SUBJECTS,
    SEMESTER_START,
    SEMESTER_END,
    KPIS,
    batchesOfSubject,
    weeklyBreakdown,
    trendPoints,
    batchStats,
    studentRows,
    lowAttendance,
    findBatch,
    batchSessions,
    DAYS,
  };
}
