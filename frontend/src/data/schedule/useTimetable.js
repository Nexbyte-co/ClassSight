// The teacher's weekly timetable from the API, in the shape the Classes and Class Schedule pages use.
// One slot per lecture (GET /lectures?weekday=N for every weekday; teachers get their own classes, admins all).
// Attendance % per class comes from GET /attendance/analytics (null while nothing is saved for the class).
import { useCallback, useEffect, useRef, useState } from "react";
import { listSchedule } from "../../api/lectures";
import { getAnalytics } from "../../api/attendance";
import { useAuth } from "../../context/AuthContext";
import { DAYS, DAY_START_MIN, DAY_END_MIN, toMinutes } from "./timetable";

const hhmm = (t) => t.slice(0, 5);
// The API counts weekdays from Monday (0); DAYS starts at Sunday.
const dayName = (apiWeekday) => DAYS[(apiWeekday + 1) % 7];

function build(lectures, analytics) {
  // Classes run 08:00-20:00 only; anything stored outside that window is not shown.
  const inWindow = (l) =>
    toMinutes(hhmm(l.start_time)) >= DAY_START_MIN && toMinutes(hhmm(l.end_time)) <= DAY_END_MIN;
  const slots = lectures.filter(inWindow).map((l) => {
    const start = hhmm(l.start_time);
    const dur = toMinutes(hhmm(l.end_time)) - toMinutes(start);
    const a = analytics[l.classroom_id];
    const hasData = a && a.total_sessions > 0 && a.present_count + a.absent_count + a.excused_count > 0;
    return {
      id: `lecture-${l.id}`,
      classroomId: l.classroom_id,
      code: l.course_code || "",
      name: l.course,
      sheet: l.department || "No department",
      group: l.section,
      gid: "",
      venue: l.room,
      day: dayName(l.weekday),
      start,
      dur,
      type: dur >= 100 ? "Lab" : "Lecture",
      att: hasData ? Math.round(a.average_attendance_rate * 100) : null,
      sessions: a ? a.total_sessions : 0,
    };
  });

  const courses = [];
  slots.forEach((slot) => {
    const key = `${slot.code}|${slot.name}`;
    let course = courses.find((c) => c.key === key);
    if (!course) {
      course = { key, code: slot.code, name: slot.name, slots: 0 };
      courses.push(course);
    }
    course.slots += 1;
    slot.courseIndex = courses.indexOf(course);
  });
  return { slots, courses };
}

export function useTimetable() {
  const { session } = useAuth();
  const userId = session?.id ?? null;
  const [data, setData] = useState({ slots: [], courses: [] });
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    const id = ++requestId.current;
    if (!userId) return;
    setLoading(true);
    setError("");
    try {
      const perDay = await Promise.all([0, 1, 2, 3, 4, 5, 6].map((d) => listSchedule(d)));
      const lectures = perDay.flat();
      const classIds = [...new Set(lectures.map((l) => l.classroom_id))];
      const results = await Promise.all(classIds.map((c) => getAnalytics(c).catch(() => null)));
      const analytics = {};
      classIds.forEach((c, i) => {
        if (results[i]) analytics[c] = results[i];
      });
      if (id === requestId.current) setData(build(lectures, analytics));
    } catch (err) {
      if (id === requestId.current) setError(err.message || "Could not load the timetable.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    reload();
    return () => {
      requestId.current += 1;
    };
  }, [reload]);

  const years = [...new Set(data.slots.map((s) => s.sheet))];
  return { ...data, years, loading, error, reload };
}
