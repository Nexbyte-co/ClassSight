/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useRef } from "react";
import { defaultSessionData } from "../data/mockAttendance";
import {
  ATTENDANCE_STORAGE_KEY,
  ATTENDANCE_V1_KEY,
  LEGACY_VERIFIED_KEY,
  LEGACY_UNVERIFIED_KEY,
  createDefaultSession,
  ensureStorageBackup,
  loadSessions,
  markSessionSaved,
  resolveStudentInSession,
  returnStudentToUnverified,
  serializeSessions,
  withClassSnapshot,
} from "./attendanceSessions";
import { getLocalDateKey } from "./scheduleStatus";

const AttendanceContext = createContext();

// Shared read-only default for sessions that have not been modified yet
const UNTOUCHED_SESSION = createDefaultSession();

// Raw keys copied to the backup before the first v2 write
const BACKUP_SOURCE_KEYS = [
  ATTENDANCE_STORAGE_KEY,
  ATTENDANCE_V1_KEY,
  LEGACY_VERIFIED_KEY,
  LEGACY_UNVERIFIED_KEY,
];

function getStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const formatTime = () =>
  new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

export function AttendanceProvider({ children }) {
  // Attendance keyed by date-aware session id ("class-2_2026-10-11")
  const [initialLoad] = useState(() => loadSessions(getStorage(), getLocalDateKey()));
  const [sessions, setSessions] = useState(initialLoad.sessions);

  const wasMigrated = initialLoad.source === "v1" || initialLoad.source === "legacy";
  const storeMeta = useRef(
    wasMigrated
      ? { migratedFrom: initialLoad.source, migratedAt: new Date().toISOString() }
      : initialLoad.meta
  );
  const backupVerified = useRef(!initialLoad.needsBackup);
  const writesBlocked = useRef(false);
  const isFirstSync = useRef(true);

  // Sync state to localStorage. Migrated data is written immediately (after a verified
  // backup) so its date is pinned; otherwise the initial value that was just read is skipped.
  useEffect(() => {
    if (isFirstSync.current) {
      isFirstSync.current = false;
      if (!wasMigrated) return;
    }
    if (writesBlocked.current) return;

    const storage = getStorage();
    if (!storage) return;

    if (!backupVerified.current) {
      if (!ensureStorageBackup(storage, BACKUP_SOURCE_KEYS, "phase2-date-migration")) {
        writesBlocked.current = true;
        console.warn(
          "ClassSight: attendance backup could not be verified; changes are kept in memory only and existing storage was not modified."
        );
        return;
      }
      backupVerified.current = true;
    }

    try {
      storage.setItem(ATTENDANCE_STORAGE_KEY, serializeSessions(sessions, storeMeta.current));
    } catch {
      /* ignore */
    }
  }, [sessions, wasMigrated]);

  const getSession = (sessionId) => sessions[sessionId] || UNTOUCHED_SESSION;

  // Saved state for the Dashboard (sessions never opened count as not saved)
  const getSessionSummary = (sessionId) => {
    const session = sessions[sessionId];
    return {
      isSaved: Boolean(session && session.savedAt !== null && !session.isDirty),
      savedAt: session ? session.savedAt : null,
      isDirty: Boolean(session && session.isDirty),
    };
  };

  // Applies a change to one session. The first real change also stores a snapshot of
  // the class details (kept as-is afterwards, even if the lecture is edited later).
  const updateSession = (sessionId, updater, classDetails) => {
    setSessions((prev) => {
      const current = prev[sessionId] || UNTOUCHED_SESSION;
      const next = updater(current);
      if (next === current) return prev;
      return { ...prev, [sessionId]: withClassSnapshot(next, classDetails) };
    });
  };

  // Resolve handler: methodType is "nfc" | "manual" | "photo" | "absent"
  const resolveStudent = (sessionId, studentId, methodType, classDetails) => {
    const timestamp = formatTime();
    updateSession(
      sessionId,
      (session) => resolveStudentInSession(session, studentId, methodType, timestamp),
      classDetails
    );
  };

  // Undo handler: fromList is "absent" | "verified"
  const returnStudentToQueue = (sessionId, studentId, fromList, classDetails) => {
    updateSession(
      sessionId,
      (session) => returnStudentToUnverified(session, studentId, fromList),
      classDetails
    );
  };

  // Save Record handler
  const saveAttendanceRecord = (sessionId, classDetails) => {
    const now = formatTime();
    const session = getSession(sessionId);
    updateSession(sessionId, (current) => markSessionSaved(current, now), classDetails);
    return {
      presentCount: session.verified.length,
      unverifiedCount: session.unverified.length,
      absentCount: session.absent.length,
      timestamp: now,
    };
  };

  // Reset one session to the initial mock dataset
  const resetAttendanceData = (sessionId) => {
    setSessions((prev) => {
      if (!(sessionId in prev)) return prev;
      const next = { ...prev };
      delete next[sessionId];
      return next;
    });
  };

  return (
    <AttendanceContext.Provider
      value={{
        sessionData: defaultSessionData,
        sessions,
        getSession,
        getSessionSummary,
        resolveStudent,
        returnStudentToQueue,
        saveAttendanceRecord,
        resetAttendanceData,
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
}

export function useAttendance() {
  const context = useContext(AttendanceContext);
  if (!context) {
    throw new Error("useAttendance must be used within an AttendanceProvider");
  }
  return context;
}

// Attendance state and actions for a single session. `classDetails` (the scheduled class)
// is stored as the session's snapshot on its first change.
export function useAttendanceSession(sessionId, classDetails) {
  const {
    sessionData,
    getSession,
    resolveStudent,
    returnStudentToQueue,
    saveAttendanceRecord,
    resetAttendanceData,
  } = useAttendance();
  const session = getSession(sessionId);

  return {
    sessionData,
    verifiedStudents: session.verified,
    unverifiedStudents: session.unverified,
    absentStudents: session.absent,
    totalStudentsCount:
      session.verified.length + session.unverified.length + session.absent.length,
    isSaved: session.savedAt !== null && !session.isDirty,
    lastSavedTimestamp: session.savedAt,
    classSnapshot: session.classInfo || null,
    resolveStudent: (studentId, methodType) =>
      resolveStudent(sessionId, studentId, methodType, classDetails),
    returnAbsentStudent: (studentId) =>
      returnStudentToQueue(sessionId, studentId, "absent", classDetails),
    returnVerifiedStudent: (studentId) =>
      returnStudentToQueue(sessionId, studentId, "verified", classDetails),
    saveAttendanceRecord: () => saveAttendanceRecord(sessionId, classDetails),
    resetAttendanceData: () => resetAttendanceData(sessionId),
  };
}
