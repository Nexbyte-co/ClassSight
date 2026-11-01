/* eslint-disable react-refresh/only-export-components */
// Today's lectures come from the API (GET /lectures?weekday=today). Only the "started early" /
// "dismissed" flags stay in this browser, per user and per day.
import { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { listSchedule } from "../api/lectures";
import { useAuth } from "./AuthContext";
import { useSettings } from "./SettingsContext";
import {
  computeScheduleStatuses,
  getLocalDateKey,
  getScheduleNow,
  pickFallbackClassId,
  resolveSessionRoute,
} from "./scheduleStatus";

const ScheduleContext = createContext();

const FLAGS_KEY_PREFIX = "classsight_schedule_flags_v1_";

const to12Hour = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${String(h % 12 || 12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

// API lecture -> the item shape the dashboard renders. Class id = "class-<classroom_id>".
export function lectureToItem(lecture) {
  const start = to12Hour(lecture.start_time.slice(0, 5));
  const end = to12Hour(lecture.end_time.slice(0, 5));
  return {
    id: `class-${lecture.classroom_id}`,
    lectureId: lecture.id,
    classroomId: lecture.classroom_id,
    time: start,
    timeRange: `${start} – ${end}`,
    title: lecture.course,
    code: lecture.course_code,
    section: lecture.section,
    room: lecture.room,
    department: lecture.department,
    status: "upcoming",
  };
}

// JS getDay() is 0 = Sunday; the API uses 0 = Monday
const apiWeekday = (dateKey) => (new Date(`${dateKey}T12:00:00`).getDay() + 6) % 7;

function readFlags(userId, dateKey) {
  try {
    const parsed = JSON.parse(localStorage.getItem(FLAGS_KEY_PREFIX + userId) || "null");
    if (parsed && parsed.date === dateKey) {
      return {
        manual: typeof parsed.manualActiveClassId === "string" ? parsed.manualActiveClassId : null,
        ended: Array.isArray(parsed.endedClassIds) ? parsed.endedClassIds.filter((id) => typeof id === "string") : [],
      };
    }
  } catch {
    /* ignore */
  }
  return { manual: null, ended: [] };
}

export function ScheduleProvider({ children }) {
  const { session } = useAuth();
  const userId = session?.id ?? null;

  const [scheduleList, setScheduleList] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  const [manualActiveClassId, setManualActiveClassId] = useState(null);
  const [endedClassIds, setEndedClassIds] = useState(() => new Set());
  // Which user's flags are loaded (they must not be written under another user's key)
  const [flagsUserId, setFlagsUserId] = useState(null);

  // Local date the lectures and flags belong to
  const [scheduleDate, setScheduleDate] = useState(() => getLocalDateKey());
  const scheduleDateRef = useRef(scheduleDate);
  const [now, setNow] = useState(() => getScheduleNow());

  // Tick every 30s; a new local day clears the started/dismissed flags (and reloads the lectures)
  useEffect(() => {
    const timer = setInterval(() => {
      const current = new Date();
      setNow(getScheduleNow(current));
      const todayKey = getLocalDateKey(current);
      if (todayKey !== scheduleDateRef.current) {
        scheduleDateRef.current = todayKey;
        setScheduleDate(todayKey);
        setManualActiveClassId(null);
        setEndedClassIds(new Set());
      }
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const requestId = useRef(0);
  const reloadSchedule = useCallback(async () => {
    const id = ++requestId.current; // a newer request, user change or new day makes this one stale
    setScheduleError("");
    if (!userId) {
      setScheduleList([]);
      setScheduleLoading(false);
      return;
    }
    setScheduleLoading(true);
    try {
      const lectures = await listSchedule(apiWeekday(scheduleDate));
      if (id === requestId.current) setScheduleList(lectures.map(lectureToItem));
    } catch (err) {
      if (id === requestId.current) {
        setScheduleList([]);
        setScheduleError(err.message || "Could not load today's lectures.");
      }
    } finally {
      if (id === requestId.current) setScheduleLoading(false);
    }
  }, [userId, scheduleDate]);

  useEffect(() => {
    reloadSchedule();
    return () => {
      requestId.current++;
    };
  }, [reloadSchedule]);

  // Load this user's flags for today when the user changes
  useEffect(() => {
    if (!userId) {
      setManualActiveClassId(null);
      setEndedClassIds(new Set());
      setFlagsUserId(null);
      return;
    }
    const flags = readFlags(userId, scheduleDateRef.current);
    setManualActiveClassId(flags.manual);
    setEndedClassIds(new Set(flags.ended));
    setFlagsUserId(userId);
  }, [userId]);

  useEffect(() => {
    if (!userId || flagsUserId !== userId) return;
    try {
      localStorage.setItem(
        FLAGS_KEY_PREFIX + userId,
        JSON.stringify({
          date: scheduleDate,
          manualActiveClassId,
          endedClassIds: Array.from(endedClassIds),
        })
      );
    } catch {
      /* ignore */
    }
  }, [userId, flagsUserId, scheduleDate, manualActiveClassId, endedClassIds]);

  // Shared status resolution (scheduled time + manual start) used for route fallbacks
  const { defaultLectureMinutes } = useSettings();
  const scheduleStatuses = useMemo(
    () =>
      computeScheduleStatuses(scheduleList, manualActiveClassId, endedClassIds, now, defaultLectureMinutes),
    [scheduleList, manualActiveClassId, endedClassIds, now, defaultLectureMinutes]
  );
  const fallbackClassId = pickFallbackClassId(scheduleStatuses, manualActiveClassId);

  return (
    <ScheduleContext.Provider
      value={{
        scheduleList,
        setScheduleList,
        scheduleLoading,
        scheduleError,
        reloadSchedule,
        manualActiveClassId,
        setManualActiveClassId,
        endedClassIds,
        setEndedClassIds,
        todayKey: scheduleDate,
        fallbackClassId,
      }}
    >
      {children}
    </ScheduleContext.Provider>
  );
}

export function useSchedule() {
  const context = useContext(ScheduleContext);
  if (!context) {
    throw new Error("useSchedule must be used within a ScheduleProvider");
  }
  return context;
}

// Resolves the :sessionId route param. When it is missing or not a valid session,
// `redirectTo` holds the canonical URL to navigate to.
export function useSessionRoute(pathSuffix = "") {
  const { sessionId: routeSessionId } = useParams();
  const { scheduleList, todayKey, fallbackClassId } = useSchedule();
  return resolveSessionRoute(routeSessionId, scheduleList, todayKey, fallbackClassId, pathSuffix);
}
