// src/context/attendanceSessions.js
// Pure helpers for per-session attendance state, persistence, migration and backup.

import {
  initialVerifiedStudents,
  initialUnverifiedStudents,
  sortStudentsByRoll,
} from "../data/mockAttendance";
import {
  makeSessionId,
  parseSessionId,
  isValidDateKey,
  parseTimeSlotMinutes,
} from "./scheduleStatus";

// The legacy single-roster demo data always described this scheduled class
// (Data Structures • 3C2 • LP402 • 08:00 AM).
export const DEFAULT_SESSION_ID = "class-1";

export const ATTENDANCE_STORAGE_KEY = "classsight_attendance_v2";
export const ATTENDANCE_V1_KEY = "classsight_attendance_v1";
export const LEGACY_VERIFIED_KEY = "classsight_verified_students";
export const LEGACY_UNVERIFIED_KEY = "classsight_unverified_students";
export const BACKUP_STORAGE_KEY = "classsight_backup_pre_v2";
const STORAGE_VERSION = 2;
const V1_STORAGE_VERSION = 1;

export const CONFIRMED_ABSENT_STATUS = "Absent (Confirmed)";
export const UNVERIFIED_STATUS = "Not Matched / Unverified";
const RETURNED_REASON = "Returned for review by teacher";

const METHOD_LABELS = {
  nfc: "NFC",
  manual: "Manual",
  photo: "AI Match",
};

// Each session starts with its own copy of the demo roster
export function createDefaultSession() {
  return {
    verified: sortStudentsByRoll(initialVerifiedStudents),
    unverified: sortStudentsByRoll(initialUnverifiedStudents),
    absent: [],
    savedAt: null,
    isDirty: false,
  };
}

function isValidStudent(student) {
  return (
    student !== null &&
    typeof student === "object" &&
    typeof student.id === "string" &&
    typeof student.name === "string" &&
    typeof student.roll === "string"
  );
}

function isValidStudentList(list) {
  return Array.isArray(list) && list.every(isValidStudent);
}

const CLASS_SNAPSHOT_FIELDS = ["title", "code", "section", "room", "timeRange"];

// Class details as they were when the session was first changed
export function buildClassSnapshot(classDetails) {
  if (!classDetails || typeof classDetails !== "object" || typeof classDetails.title !== "string" || !classDetails.title) {
    return null;
  }
  const snapshot = {};
  CLASS_SNAPSHOT_FIELDS.forEach((field) => {
    snapshot[field] = typeof classDetails[field] === "string" ? classDetails[field] : "";
  });
  return snapshot;
}

// Adds a snapshot only if the session does not already have one
export function withClassSnapshot(session, classDetails) {
  if (session.classInfo) return session;
  const snapshot = buildClassSnapshot(classDetails);
  return snapshot ? { ...session, classInfo: snapshot } : session;
}

function normalizeSession(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (
    !isValidStudentList(raw.verified) ||
    !isValidStudentList(raw.unverified) ||
    !isValidStudentList(raw.absent)
  ) {
    return null;
  }
  const session = {
    verified: raw.verified,
    unverified: raw.unverified,
    absent: raw.absent,
    savedAt: typeof raw.savedAt === "string" ? raw.savedAt : null,
    isDirty: raw.isDirty === true,
  };
  const classInfo = buildClassSnapshot(raw.classInfo);
  if (classInfo) session.classInfo = classInfo;
  return session;
}

function parseJson(raw) {
  if (typeof raw !== "string") return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

// Reads a versioned { version, sessions } store. Returns null when the value is
// missing or unusable; individually malformed sessions are reported in `droppedIds`.
function parseSessionStore(raw, version) {
  const parsed = parseJson(raw);
  if (
    !parsed ||
    typeof parsed !== "object" ||
    parsed.version !== version ||
    !parsed.sessions ||
    typeof parsed.sessions !== "object" ||
    Array.isArray(parsed.sessions)
  ) {
    return null;
  }

  const sessions = {};
  const droppedIds = [];
  Object.entries(parsed.sessions).forEach(([sessionId, rawSession]) => {
    const session = normalizeSession(rawSession);
    if (session) sessions[sessionId] = session;
    else droppedIds.push(sessionId);
  });
  return { sessions, droppedIds, meta: parsed.meta || null };
}

export function parseStoredSessions(raw) {
  const store = parseSessionStore(raw, STORAGE_VERSION);
  return store ? store.sessions : null;
}

// Phase 1 store: undated session ids ("class-2") become today's session ("class-2_<today>")
export function migrateV1Sessions(raw, todayKey) {
  const store = parseSessionStore(raw, V1_STORAGE_VERSION);
  if (!store) return null;

  const sessions = {};
  Object.entries(store.sessions).forEach(([sessionId, session]) => {
    const { classId, dateKey } = parseSessionId(sessionId);
    const datedId = isValidDateKey(dateKey) ? sessionId : makeSessionId(classId, todayKey);
    if (!(datedId in sessions)) sessions[datedId] = session;
  });
  return { sessions, droppedIds: store.droppedIds };
}

// Converts the original global verified/unverified keys into today's default session.
// Students the old "Keep Absent" action left in the unverified list move to `absent`.
export function migrateLegacySessions(rawVerified, rawUnverified, todayKey) {
  const verified = parseJson(rawVerified);
  const unverified = parseJson(rawUnverified);
  const hasVerified = isValidStudentList(verified);
  const hasUnverified = isValidStudentList(unverified);
  if (!hasVerified && !hasUnverified) return null;

  const defaults = createDefaultSession();
  const unverifiedList = hasUnverified ? unverified : defaults.unverified;

  return {
    [makeSessionId(DEFAULT_SESSION_ID, todayKey)]: {
      verified: sortStudentsByRoll(hasVerified ? verified : defaults.verified),
      unverified: sortStudentsByRoll(
        unverifiedList.filter((s) => s.status !== CONFIRMED_ABSENT_STATUS)
      ),
      absent: sortStudentsByRoll(
        unverifiedList.filter((s) => s.status === CONFIRMED_ABSENT_STATUS)
      ),
      savedAt: null,
      isDirty: false,
    },
  };
}

export function readStorageItem(storage, key) {
  try {
    return storage ? storage.getItem(key) : null;
  } catch {
    return null;
  }
}

// Load order: valid v2 store → Phase 1 store → original keys → empty.
// `source` tells the provider whether the result needs a first write to pin migrated dates;
// `needsBackup` is true whenever writing v2 could replace data that is not yet backed up.
export function loadSessions(storage, todayKey) {
  const v2 = parseSessionStore(readStorageItem(storage, ATTENDANCE_STORAGE_KEY), STORAGE_VERSION);
  if (v2) {
    if (v2.droppedIds.length > 0) {
      console.warn("ClassSight: skipped malformed attendance sessions", v2.droppedIds);
    }
    return {
      sessions: v2.sessions,
      source: "v2",
      meta: v2.meta,
      needsBackup: v2.droppedIds.length > 0,
    };
  }

  const v1 = migrateV1Sessions(readStorageItem(storage, ATTENDANCE_V1_KEY), todayKey);
  if (v1) {
    if (v1.droppedIds.length > 0) {
      console.warn(
        `ClassSight: these Phase 1 sessions could not be migrated and remain in ${ATTENDANCE_V1_KEY}`,
        v1.droppedIds
      );
    }
    return { sessions: v1.sessions, source: "v1", meta: null, needsBackup: true };
  }

  const legacy = migrateLegacySessions(
    readStorageItem(storage, LEGACY_VERIFIED_KEY),
    readStorageItem(storage, LEGACY_UNVERIFIED_KEY),
    todayKey
  );
  if (legacy) return { sessions: legacy, source: "legacy", meta: null, needsBackup: true };

  // A malformed v2 value (if any) is still backed up before the first write
  return { sessions: {}, source: "empty", meta: null, needsBackup: true };
}

export function serializeSessions(sessions, meta = null) {
  return JSON.stringify({ version: STORAGE_VERSION, sessions, ...(meta ? { meta } : {}) });
}

// Append-only backup of raw storage values taken before any v2 write.
// Existing entries are never changed or removed; a value already backed up verbatim
// is not added again. Returns true only if the backup was verified by reading it back.
export function ensureStorageBackup(storage, keys, reason) {
  if (!storage) return false;
  try {
    const existingRaw = storage.getItem(BACKUP_STORAGE_KEY);
    let backup;
    if (existingRaw === null) {
      backup = { createdAt: new Date().toISOString(), reason, entries: {} };
    } else {
      backup = parseJson(existingRaw);
      if (!backup || typeof backup !== "object" || !backup.entries || typeof backup.entries !== "object") {
        return false; // never overwrite an unreadable backup
      }
    }

    let changed = false;
    keys.forEach((key) => {
      const raw = storage.getItem(key);
      if (raw === null) return;
      const alreadySaved = Object.entries(backup.entries).some(
        ([entryKey, value]) => (entryKey === key || entryKey.startsWith(`${key}#`)) && value === raw
      );
      if (alreadySaved) return;
      let entryKey = key;
      let n = 2;
      while (entryKey in backup.entries) entryKey = `${key}#${n++}`;
      backup.entries[entryKey] = raw;
      changed = true;
    });

    if (!changed) return true;
    const serialized = JSON.stringify(backup);
    storage.setItem(BACKUP_STORAGE_KEY, serialized);
    return storage.getItem(BACKUP_STORAGE_KEY) === serialized;
  } catch {
    return false;
  }
}

// Moves one currently-unverified student to verified or confirmed-absent.
// Returns the same session object when nothing changes.
export function resolveStudentInSession(session, studentId, methodType, timestamp) {
  const target = session.unverified.find((s) => s.id === studentId);
  if (!target) return session;

  const remainingUnverified = session.unverified.filter((s) => s.id !== studentId);

  if (methodType === "absent") {
    return {
      ...session,
      unverified: remainingUnverified,
      absent: sortStudentsByRoll([
        ...session.absent,
        { ...target, status: CONFIRMED_ABSENT_STATUS },
      ]),
      isDirty: true,
    };
  }

  const methodLabel = METHOD_LABELS[methodType];
  if (!methodLabel) return session;

  return {
    ...session,
    unverified: remainingUnverified,
    verified: sortStudentsByRoll([
      ...session.verified,
      { ...target, status: "Present", method: methodLabel, timestamp },
    ]),
    isDirty: true,
  };
}

// Undo: moves a student from `fromList` ("absent" | "verified") back to the unverified queue.
// Returns the same session object when the student is not in that list.
export function returnStudentToUnverified(session, studentId, fromList) {
  if (fromList !== "absent" && fromList !== "verified") return session;
  const target = session[fromList].find((s) => s.id === studentId);
  if (!target) return session;

  const restored = {
    ...target,
    status: UNVERIFIED_STATUS,
    reason: target.reason || RETURNED_REASON,
  };
  delete restored.method;
  delete restored.timestamp;

  return {
    ...session,
    [fromList]: session[fromList].filter((s) => s.id !== studentId),
    unverified: sortStudentsByRoll([
      ...session.unverified.filter((s) => s.id !== studentId),
      restored,
    ]),
    isDirty: true,
  };
}

export function markSessionSaved(session, savedAt) {
  return { ...session, savedAt, isDirty: false };
}

// Message for an empty unverified queue, based on the session's actual counts
export function getCompletionMessage(presentCount, absentCount) {
  const total = presentCount + absentCount;
  if (total === 0) {
    return {
      title: "No Students in This Session",
      body: "There are no student records for this session yet.",
    };
  }
  if (absentCount === 0) {
    return {
      title: "All Students Verified!",
      body: `All ${presentCount} students are verified present.`,
    };
  }
  return {
    title: "Review Complete",
    body: `${presentCount} verified present • ${absentCount} confirmed absent. No students are awaiting verification.`,
  };
}

// ---------------------------------------------------------------------------
// Session history (Reports)
// ---------------------------------------------------------------------------
export const SESSION_STATUS = {
  saved: "saved", // saved and unchanged since
  unsaved: "unsaved", // saved, then changed
  inProgress: "in-progress", // changed but never saved
};

// One row per recorded session, newest first (date, then start time).
// Class details come from the session snapshot, else the current schedule;
// sessions whose lecture is no longer scheduled are marked `isRemoved`.
export function buildSessionHistory(sessions, scheduleList) {
  if (!sessions || typeof sessions !== "object") return [];
  const scheduleById = new Map((scheduleList || []).map((c) => [c.id, c]));

  const rows = [];
  Object.entries(sessions).forEach(([sessionId, session]) => {
    const { classId, dateKey } = parseSessionId(sessionId);
    if (!classId || !isValidDateKey(dateKey) || !session) return;

    const scheduled = scheduleById.get(classId) || null;
    const classInfo = session.classInfo || buildClassSnapshot(scheduled);
    const present = session.verified.length;
    const absent = session.absent.length;
    const unverified = session.unverified.length;
    const total = present + absent + unverified;

    rows.push({
      sessionId,
      classId,
      dateKey,
      classInfo,
      isRemoved: !scheduled,
      present,
      absent,
      unverified,
      total,
      pct: total > 0 ? Math.round((present / total) * 100) : 0,
      status:
        session.savedAt === null
          ? SESSION_STATUS.inProgress
          : session.isDirty
          ? SESSION_STATUS.unsaved
          : SESSION_STATUS.saved,
      savedAt: session.savedAt,
      startMinutes: parseTimeSlotMinutes(classInfo?.timeRange)?.startMinutes ?? -1,
    });
  });

  return rows.sort(
    (a, b) =>
      b.dateKey.localeCompare(a.dateKey) ||
      b.startMinutes - a.startMinutes ||
      a.sessionId.localeCompare(b.sessionId)
  );
}

// Case-insensitive search over course, code, section and room
export function filterSessionHistory(rows, query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) =>
    ["title", "code", "section", "room"].some((field) =>
      (row.classInfo?.[field] || "").toLowerCase().includes(q)
    )
  );
}

// Date presets for the Reports session history (local date keys, Sunday-start weeks)
export const SESSION_DATE_PRESETS = ["all", "today", "week", "last7", "custom"];

function shiftDateKey(dateKey, days) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// Inclusive [from, to] date-key range for a preset; null bounds mean "open"
export function getPresetRange(preset, todayKey, custom = {}) {
  if (preset === "today") return { from: todayKey, to: todayKey };
  if (preset === "week") {
    const [y, m, d] = todayKey.split("-").map(Number);
    const weekday = new Date(y, m - 1, d).getDay();
    return { from: shiftDateKey(todayKey, -weekday), to: shiftDateKey(todayKey, 6 - weekday) };
  }
  if (preset === "last7") return { from: shiftDateKey(todayKey, -6), to: todayKey };
  if (preset === "custom") {
    let from = isValidDateKey(custom.from) ? custom.from : null;
    let to = isValidDateKey(custom.to) ? custom.to : null;
    if (from && to && from > to) [from, to] = [to, from];
    return { from, to };
  }
  return { from: null, to: null };
}

export function filterSessionHistoryByDate(rows, range) {
  return rows.filter((row) => (!range.from || row.dateKey >= range.from) && (!range.to || row.dateKey <= range.to));
}

// Summary of the (filtered) session rows — derived only from recorded sessions
export function summarizeSessionHistory(rows) {
  const totals = rows.reduce(
    (acc, row) => ({
      present: acc.present + row.present,
      students: acc.students + row.total,
      unverified: acc.unverified + row.unverified,
      saved: acc.saved + (row.status === SESSION_STATUS.saved ? 1 : 0),
    }),
    { present: 0, students: 0, unverified: 0, saved: 0 }
  );
  return {
    sessions: rows.length,
    avgPct: totals.students > 0 ? Math.round((totals.present / totals.students) * 100) : null,
    saved: totals.saved,
    unverified: totals.unverified,
  };
}
