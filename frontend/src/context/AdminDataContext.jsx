// Admin-wide data, loaded once from the real API and shared by every admin page.
// Every number on the admin screens is derived from this; nothing here is mocked.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { listUsers } from "../api/users";
import { listClassrooms } from "../api/classrooms";
import { listSections, listSectionStudents } from "../api/sections";
import { getAnalytics, listLogs } from "../api/attendance";

const AdminDataContext = createContext(null);

const EMPTY = {
  users: [],
  classrooms: [],
  sections: [],
  students: [], // every student, with section_id
  analytics: {}, // classroomId -> ClassroomAnalyticsOut
  logs: {}, // classroomId -> [{ session, records }]
};

async function fetchAll() {
  const [users, classrooms, sections] = await Promise.all([
    listUsers(),
    listClassrooms(),
    listSections(),
  ]);
  // Per-section and per-class calls: one failure must not blank the whole admin area.
  const [rosters, analyticsList, logsList] = await Promise.all([
    Promise.all(sections.map((s) => listSectionStudents(s.id).catch(() => []))),
    Promise.all(classrooms.map((c) => getAnalytics(c.id).catch(() => null))),
    Promise.all(classrooms.map((c) => listLogs(c.id).catch(() => []))),
  ]);
  const analytics = {};
  const logs = {};
  classrooms.forEach((c, i) => {
    if (analyticsList[i]) analytics[c.id] = analyticsList[i];
    logs[c.id] = logsList[i];
  });
  return { users, classrooms, sections, students: rosters.flat(), analytics, logs };
}

export function AdminDataProvider({ children }) {
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadedAt, setLoadedAt] = useState(null);
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      const next = await fetchAll();
      if (id !== requestId.current) return;
      setData(next);
      setLoadedAt(new Date());
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err.message || "Could not load admin data.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    return () => {
      requestId.current += 1; // ignore a response that lands after unmount
    };
  }, [refresh]);

  const derived = useMemo(() => derive(data), [data]);

  return (
    <AdminDataContext.Provider value={{ ...data, ...derived, loading, error, loadedAt, refresh }}>
      {children}
    </AdminDataContext.Provider>
  );
}

export function useAdminData() {
  const context = useContext(AdminDataContext);
  if (!context) throw new Error("useAdminData must be used within an AdminDataProvider");
  return context;
}

// ---------- derived figures (pure) ----------

function rate(present, total) {
  return total ? present / total : null;
}

function derive({ users, classrooms, sections, students, analytics, logs }) {
  const userById = new Map(users.map((u) => [u.id, u]));
  const teachers = users.filter((u) => u.role === "teacher");
  const admins = users.filter((u) => u.role === "admin");
  const sectionById = new Map(sections.map((s) => [s.id, s]));
  const classroomById = new Map(classrooms.map((c) => [c.id, c]));

  // One row per attendance session, newest first.
  const sessions = classrooms
    .flatMap((c) =>
      (logs[c.id] || []).map(({ session, records }) => {
        const counts = { present: 0, absent: 0, excused: 0 };
        records.forEach((r) => {
          if (r.status in counts) counts[r.status] += 1;
        });
        const total = records.length;
        return {
          id: session.id,
          classroomId: c.id,
          date: session.session_date,
          createdAt: session.created_at,
          total,
          ...counts,
          rate: rate(counts.present, total),
          records,
        };
      })
    )
    .sort((a, b) => (a.date === b.date ? b.id - a.id : a.date < b.date ? 1 : -1));

  // Platform totals across all classes.
  const totals = Object.values(analytics).reduce(
    (acc, a) => {
      acc.present += a.present_count;
      acc.absent += a.absent_count;
      acc.excused += a.excused_count;
      acc.sessions += a.total_sessions;
      return acc;
    },
    { present: 0, absent: 0, excused: 0, sessions: 0 }
  );
  totals.records = totals.present + totals.absent + totals.excused;
  totals.rate = rate(totals.present, totals.records);

  // Daily attendance rate across every class (oldest -> newest), for trend charts.
  const byDate = new Map();
  sessions.forEach((s) => {
    const d = byDate.get(s.date) || { date: s.date, present: 0, total: 0, sessions: 0 };
    d.present += s.present;
    d.total += s.total;
    d.sessions += 1;
    byDate.set(s.date, d);
  });
  const dailyTrend = [...byDate.values()]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((d) => ({ ...d, rate: rate(d.present, d.total) }));

  const faceEnrolled = students.filter((s) => s.face_enrolled).length;

  return {
    userById,
    teachers,
    admins,
    sectionById,
    classroomById,
    sessions,
    totals,
    dailyTrend,
    faceEnrolled,
  };
}

