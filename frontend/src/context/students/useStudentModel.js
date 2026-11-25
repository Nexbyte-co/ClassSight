// src/context/students/useStudentModel.js
// The student portal layout builds the model once and hands it to the pages through the router's
// Outlet context, so every student page reads the same records of the signed-in student.
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useAttendance } from "../attendance/AttendanceContext";
import { useSchedule } from "../schedule/ScheduleContext";
import { useSettings } from "../settings/SettingsContext";
import { findDemoAccount } from "../demo-session/demoSession";
import { buildStudentModel } from "./studentCourses";

/** Used by the layout: builds the model for the signed-in student and refreshes it every minute. */
export function useBuildStudentModel(session) {
  const { sessions } = useAttendance();
  const { scheduleList } = useSchedule();
  const { attendanceThreshold } = useSettings();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  return useMemo(() => {
    const account = findDemoAccount(session.email);
    return buildStudentModel({
      email: session.email,
      roll: account?.roll,
      now,
      sessions,
      scheduleList,
      threshold: attendanceThreshold,
    });
  }, [session.email, now, sessions, scheduleList, attendanceThreshold]);
}

/** Used by the student pages. */
export function useStudentModel() {
  return useOutletContext();
}
