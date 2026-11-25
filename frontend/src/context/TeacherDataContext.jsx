/* eslint-disable react-refresh/only-export-components */
// Everything the teacher's Classes, Class Schedule and Reports pages show comes from here: for each of
// the teacher's classes, its weekly lectures, its saved attendance sessions (with records) and its students.
// Nothing is mocked; Reload re-reads it from the server.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { listClassLectures } from "../api/lectures";
import { listLogs } from "../api/attendance";
import { listStudents } from "../api/classrooms";
import { useClassroom } from "./ClassroomContext";

const TeacherDataContext = createContext(null);

export function TeacherDataProvider({ children }) {
  const { classrooms, loading: classesLoading, error: classesError } = useClassroom();
  const [byClass, setByClass] = useState({}); // classroom id -> { lectures, logs, students }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const request = useRef(0);
  const ids = classrooms.map((c) => c.id).join(",");

  const load = useCallback(async () => {
    const mine = ids ? ids.split(",").map(Number) : [];
    const id = ++request.current; // a newer load makes this one stale
    setLoading(true);
    setError("");
    try {
      const rows = await Promise.all(
        mine.map(async (classId) => {
          const [lectures, logs, students] = await Promise.all([listClassLectures(classId), listLogs(classId), listStudents(classId)]);
          return [classId, { lectures, logs, students }];
        })
      );
      if (id === request.current) setByClass(Object.fromEntries(rows));
    } catch (err) {
      if (id === request.current) setError(err.message || "Could not load your classes.");
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, [ids]);

  useEffect(() => {
    if (classesLoading) return;
    load();
  }, [load, classesLoading]);

  const value = useMemo(
    () => ({ classrooms, byClass, loading: loading || classesLoading, error: error || classesError, reload: load }),
    [classrooms, byClass, loading, classesLoading, error, classesError, load]
  );
  return <TeacherDataContext.Provider value={value}>{children}</TeacherDataContext.Provider>;
}

export function useTeacherData() {
  const context = useContext(TeacherDataContext);
  if (!context) throw new Error("useTeacherData must be used within a TeacherDataProvider");
  return context;
}
