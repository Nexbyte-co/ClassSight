// src/context/students/useStudentModel.js
// The student portal layout loads the signed-in student's real data (GET /student/overview), builds the
// model once and hands it to the pages through the router's Outlet context, so every student page reads
// the same records.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { getStudentOverview } from "../../api/student";
import { useSettings } from "../settings/SettingsContext";
import { buildStudentModelFromApi } from "./studentCourses";

/**
 * Used by the layout. Returns { model, loading, error, reload }; `model` is null until the first load.
 * Re-reads quietly every minute and when the tab regains focus, so a teacher's newly saved attendance appears.
 */
export function useBuildStudentModel() {
  const { attendanceThreshold } = useSettings();
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());

  const load = useCallback(async () => {
    try {
      setOverview(await getStudentOverview());
      setError("");
    } catch (err) {
      // A failed refresh keeps showing the data we already have.
      setError(err.message || "Could not load your attendance.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(() => {
      setNow(new Date());
      load();
    }, 60000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  const model = useMemo(
    () => (overview ? buildStudentModelFromApi({ overview, now, threshold: attendanceThreshold }) : null),
    [overview, now, attendanceThreshold]
  );
  return { model, loading, error, reload: load };
}

/** Used by the student pages. */
export function useStudentModel() {
  return useOutletContext();
}
