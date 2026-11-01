// Saved attendance of today's lectures, read from the API (roster size + saved records per class).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listStudents } from "../api/classrooms";
import { listLogs } from "../api/attendance";

const EMPTY = { loaded: false, total: 0, present: 0, absent: 0, unresolved: 0, recognized: 0, isSaved: false };

// `classIds` are the frontend ids ("class-<classroom_id>") of today's lectures.
export function useTodayAttendance(classIds, dateKey) {
  const [byClass, setByClass] = useState({});
  const [error, setError] = useState("");
  const requestId = useRef(0);
  const key = classIds.join(",");

  const reload = useCallback(async () => {
    const id = ++requestId.current; // a newer request (or a changed lecture list) makes this one stale
    const ids = key ? key.split(",").map((c) => Number(c.replace("class-", ""))) : [];
    if (ids.length === 0) {
      setByClass({});
      setError("");
      return;
    }
    try {
      const entries = await Promise.all(
        ids.map(async (classroomId) => {
          const [roster, logs] = await Promise.all([listStudents(classroomId), listLogs(classroomId)]);
          const today = logs.find((entry) => entry.session.session_date === dateKey);
          const records = today ? today.records : [];
          const rosterIds = new Set(roster.map((s) => s.id));
          const covered = new Set(records.filter((r) => rosterIds.has(r.student_id)).map((r) => r.student_id));
          const present = records.filter((r) => r.status === "present");
          return [
            `class-${classroomId}`,
            {
              loaded: true,
              total: roster.length,
              present: present.length,
              absent: records.filter((r) => r.status !== "present").length,
              unresolved: roster.length - covered.size,
              recognized: present.filter((r) => r.recognition_confidence != null).length,
              isSaved: records.length > 0,
            },
          ];
        })
      );
      if (id !== requestId.current) return;
      setByClass(Object.fromEntries(entries));
      setError("");
    } catch (err) {
      if (id === requestId.current) setError(err.message || "Could not load attendance.");
    }
  }, [key, dateKey]);

  useEffect(() => {
    reload();
    return () => {
      requestId.current++;
    };
  }, [reload]);

  // Counts for one class; before the data arrives (or on an error) nothing is claimed as saved.
  const getSummary = useMemo(() => (classId) => byClass[classId] || EMPTY, [byClass]);
  return { getSummary, error, reload };
}
