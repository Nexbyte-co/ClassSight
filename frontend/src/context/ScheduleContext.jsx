/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useRef, useMemo } from "react";
import { useParams } from "react-router-dom";
import { ensureStorageBackup } from "./attendanceSessions";
import { useSettings } from "./SettingsContext";
import { SLOTS, toMinutes, endTime } from "../data/timetable";
import {
  SCHEDULE_STORAGE_KEY,
  SCHEDULE_V1_KEY,
  computeScheduleStatuses,
  getLocalDateKey,
  getScheduleNow,
  loadScheduleState,
  pickFallbackClassId,
  resolveSessionRoute,
  serializeScheduleState,
} from "./scheduleStatus";

const ScheduleContext = createContext();

// Default schedule list (Teacher can customize, add, edit, and delete).
// Built from the Monday slots of the weekly timetable so Dashboard matches the Classes pages.
const to12Hour = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${String(h % 12 || 12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

const defaultScheduleList = SLOTS.filter((slot) => slot.day === "Mon")
  .sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
  .map((slot, i) => ({
    id: `class-${i + 1}`,
    time: to12Hour(slot.start),
    timeRange: `${to12Hour(slot.start)} – ${to12Hour(endTime(slot))}`,
    title: slot.name,
    code: slot.code,
    section: slot.group,
    room: slot.venue,
    department: "Computer Science & Eng.",
    status: "upcoming",
  }));

const DESIGN_LECTURES_FLAG_KEY = "classsight_schedule_design8_v1";
const DESIGN_LECTURE_FIELDS = ["time", "timeRange", "title", "code", "section", "room", "department"];

function readFlag(storage, key) {
  try {
    return storage ? storage.getItem(key) === "1" : false;
  } catch {
    return false;
  }
}

// Default lectures take the design's details (other edits and extra lectures are kept);
// missing default lectures are added back.
// Earlier design versions seeded these ids; they are removed when the lectures are upgraded
const OBSOLETE_DESIGN_IDS = ["class-4", "class-5", "class-6", "class-7"];

function applyDesignLectures(scheduleList) {
  const kept = scheduleList.filter(
    (item) => !OBSOLETE_DESIGN_IDS.includes(item.id) || defaultScheduleList.some((d) => d.id === item.id)
  );
  const updated = kept.map((item) => {
    const design = defaultScheduleList.find((d) => d.id === item.id);
    if (!design) return item;
    const next = { ...item };
    DESIGN_LECTURE_FIELDS.forEach((field) => {
      next[field] = design[field];
    });
    return next;
  });
  const missing = defaultScheduleList.filter((d) => !updated.some((item) => item.id === d.id));
  return [...updated, ...missing];
}

function getStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function ScheduleProvider({ children }) {
  const [initialLoad] = useState(() => {
    const loaded = loadScheduleState(getStorage(), getLocalDateKey(), defaultScheduleList);
    if (loaded.source === "default" || readFlag(getStorage(), DESIGN_LECTURES_FLAG_KEY)) {
      return { ...loaded, needsDesignUpgrade: false };
    }
    return {
      ...loaded,
      scheduleList: applyDesignLectures(loaded.scheduleList),
      manualActiveClassId: null,
      endedClassIds: [],
      needsDesignUpgrade: true,
    };
  });
  const [scheduleList, setScheduleList] = useState(initialLoad.scheduleList);
  const [manualActiveClassId, setManualActiveClassId] = useState(
    initialLoad.manualActiveClassId
  );
  const [endedClassIds, setEndedClassIds] = useState(
    () => new Set(initialLoad.endedClassIds)
  );

  // Local date the started/ended state belongs to
  const [scheduleDate, setScheduleDate] = useState(() => getLocalDateKey());
  const scheduleDateRef = useRef(scheduleDate);
  const [now, setNow] = useState(() => getScheduleNow());

  // Tick every 30s; a new local day clears started/ended state (the lecture list is kept)
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

  // Sync state to localStorage (skip the initial value that was just read, unless it was
  // upgraded to the design lectures and must be written once).
  // Before the first v2 write, the previous stores are copied to the backup.
  const isFirstSync = useRef(true);
  const backupVerified = useRef(!initialLoad.needsBackup);
  const writesBlocked = useRef(false);
  useEffect(() => {
    if (isFirstSync.current) {
      isFirstSync.current = false;
      if (!initialLoad.needsDesignUpgrade) return;
    }
    if (writesBlocked.current) return;

    const storage = getStorage();
    if (!storage) return;

    if (!backupVerified.current) {
      if (
        !ensureStorageBackup(
          storage,
          [SCHEDULE_STORAGE_KEY, SCHEDULE_V1_KEY],
          "phase2-date-migration"
        )
      ) {
        writesBlocked.current = true;
        console.warn(
          "ClassSight: schedule backup could not be verified; changes are kept in memory only and existing storage was not modified."
        );
        return;
      }
      backupVerified.current = true;
    }

    try {
      storage.setItem(
        SCHEDULE_STORAGE_KEY,
        serializeScheduleState({ scheduleList, manualActiveClassId, endedClassIds, scheduleDate })
      );
      if (initialLoad.needsDesignUpgrade) storage.setItem(DESIGN_LECTURES_FLAG_KEY, "1");
    } catch {
      /* ignore */
    }
  }, [scheduleList, manualActiveClassId, endedClassIds, scheduleDate, initialLoad.needsDesignUpgrade]);

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
