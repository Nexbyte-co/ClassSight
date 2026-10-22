// src/context/scheduleStatus.js
// Pure helpers for local dates, date-aware session ids and schedule status.

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const SESSION_ID_PATTERN = /^(.+)_(\d{4}-\d{2}-\d{2})$/;

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "YYYY-MM-DD" in the user's local timezone (not UTC)
export function getLocalDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dateFromKey(dateKey) {
  const match = typeof dateKey === "string" ? dateKey.match(DATE_KEY_PATTERN) : null;
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return null;
  }
  return date;
}

export function isValidDateKey(dateKey) {
  return dateFromKey(dateKey) !== null;
}

// "Sunday, 11 Oct 2026" (matches the previous hardcoded format)
export function formatSessionDate(dateKey) {
  const date = dateFromKey(dateKey);
  if (!date) return "";
  const d = String(date.getDate()).padStart(2, "0");
  return `${WEEKDAYS[date.getDay()]}, ${d} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

// "Sat, 10 Oct 2026"
export function formatShortSessionDate(dateKey) {
  const date = dateFromKey(dateKey);
  if (!date) return "";
  const d = String(date.getDate()).padStart(2, "0");
  return `${WEEKDAYS[date.getDay()].slice(0, 3)}, ${d} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

// Session ids combine the scheduled class id and the local date: "class-2_2026-10-11"
export function makeSessionId(classId, dateKey) {
  return `${classId}_${dateKey}`;
}

export function parseSessionId(sessionId) {
  if (typeof sessionId !== "string" || sessionId === "") {
    return { classId: null, dateKey: null };
  }
  const match = sessionId.match(SESSION_ID_PATTERN);
  if (match) return { classId: match[1], dateKey: match[2] };
  return { classId: sessionId, dateKey: null };
}

// Demo clock: schedule statuses are computed as if it were always this time of day
// (matches the dashboard design: two lectures done, 09:40 active, 10:30 next, the rest scheduled).
// Set to null to follow the real clock.
export const DEMO_SCHEDULE_TIME = { hours: 10, minutes: 15 };

// Today's date with the demo time of day applied (or the real time when the demo clock is off)
export function getScheduleNow(date = new Date()) {
  if (!DEMO_SCHEDULE_TIME) return date;
  const demo = new Date(date);
  demo.setHours(DEMO_SCHEDULE_TIME.hours, DEMO_SCHEDULE_TIME.minutes, 0, 0);
  return demo;
}

// Time slot parser helper (Instruction 5). A slot without an end time lasts
// `defaultMinutes` (the "default lecture length" setting, 50 by default).
export function parseTimeSlotMinutes(timeStr, defaultMinutes = 50) {
  if (!timeStr) return null;
  const parts = timeStr.split(/[–-]/).map((s) => s.trim());
  const parseSingle = (s) => {
    const match = s.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3]?.toUpperCase();
    if (period === "PM" && hours < 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const startMinutes = parseSingle(parts[0]);
  const endMinutes =
    parts.length > 1
      ? parseSingle(parts[1])
      : startMinutes !== null
      ? startMinutes + defaultMinutes
      : null;
  return { startMinutes, endMinutes };
}

// Compute status for all classes based on current time and manual actions (Instructions 4 & 5).
// Only one class is active at a time: a manually started class takes precedence, and a class
// whose time slot conflicts with it is shown as "next" (it can still be started).
export function computeScheduleStatuses(scheduleList, manualActiveClassId, endedClassIds, now, defaultMinutes = 50) {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const evaluated = scheduleList.map((item) => {
    if (endedClassIds.has(item.id)) {
      return { ...item, computedStatus: "done" };
    }
    if (manualActiveClassId === item.id) {
      return { ...item, computedStatus: "active" };
    }
    if (manualActiveClassId !== null && manualActiveClassId !== item.id) {
      const slot = parseTimeSlotMinutes(item.timeRange || item.time, defaultMinutes);
      if (slot?.endMinutes && currentMinutes > slot.endMinutes) {
        return { ...item, computedStatus: "done" };
      }
      if (
        slot?.startMinutes != null &&
        slot?.endMinutes != null &&
        currentMinutes >= slot.startMinutes &&
        currentMinutes <= slot.endMinutes
      ) {
        return { ...item, computedStatus: "next" };
      }
      return { ...item, computedStatus: "upcoming" };
    }

    // Respect scheduled time (Instruction 5)
    const slot = parseTimeSlotMinutes(item.timeRange || item.time, defaultMinutes);
    if (slot?.startMinutes !== null && slot?.endMinutes !== null) {
      if (currentMinutes >= slot.startMinutes && currentMinutes <= slot.endMinutes) {
        return { ...item, computedStatus: "active" };
      }
      if (currentMinutes > slot.endMinutes) {
        return { ...item, computedStatus: "done" };
      }
      return { ...item, computedStatus: "unstarted", startMinutes: slot.startMinutes };
    }
    return { ...item, computedStatus: item.status || "upcoming" };
  });

  const unstarted = evaluated
    .filter((c) => c.computedStatus === "unstarted")
    .sort((a, b) => (a.startMinutes || 0) - (b.startMinutes || 0));

  const nextId = unstarted.length > 0 ? unstarted[0].id : null;

  return evaluated.map((c) => {
    if (c.computedStatus === "unstarted") {
      if (c.id === nextId) {
        return { ...c, computedStatus: "next" };
      }
      return { ...c, computedStatus: "upcoming" };
    }
    return c;
  });
}

// Current active class in session (Instruction 4)
export function getActiveClass(statusList, manualActiveClassId) {
  const found = statusList.find((c) => c.computedStatus === "active");
  if (found) return found;
  if (manualActiveClassId) {
    return statusList.find((c) => c.id === manualActiveClassId) || null;
  }
  return null;
}

// Class used when a URL does not name a valid session: active, then next, then first
export function pickFallbackClassId(statusList, manualActiveClassId) {
  const active = getActiveClass(statusList, manualActiveClassId);
  if (active) return active.id;
  const next = statusList.find((c) => c.computedStatus === "next");
  if (next) return next.id;
  return statusList.length > 0 ? statusList[0].id : null;
}

const EMPTY_CLASS = { id: "", title: "", code: "", section: "", room: "", timeRange: "" };

// Route resolution for /attendance/:sessionId.
// - valid class + valid date up to today → that session
// - valid class + missing/invalid/future date → today's session for that class
// - unknown or deleted class → today's session for the fallback class
// - empty schedule → /dashboard
export function resolveSessionRoute(routeSessionId, scheduleList, todayKey, fallbackClassId, pathSuffix = "") {
  const { classId, dateKey } = parseSessionId(routeSessionId);
  const routeClass = classId ? scheduleList.find((c) => c.id === classId) : null;

  if (routeClass && isValidDateKey(dateKey) && dateKey <= todayKey) {
    return { sessionId: routeSessionId, sessionClass: routeClass, sessionDateKey: dateKey, redirectTo: null };
  }

  const targetClass = routeClass || scheduleList.find((c) => c.id === fallbackClassId) || null;
  if (!targetClass) {
    return { sessionId: "", sessionClass: EMPTY_CLASS, sessionDateKey: todayKey, redirectTo: "/dashboard" };
  }

  const targetId = makeSessionId(targetClass.id, todayKey);
  return {
    sessionId: targetId,
    sessionClass: targetClass,
    sessionDateKey: todayKey,
    redirectTo: `/attendance/${targetId}${pathSuffix}`,
  };
}

// ---------------------------------------------------------------------------
// Schedule persistence
// ---------------------------------------------------------------------------
export const SCHEDULE_STORAGE_KEY = "classsight_schedule_v2";
export const SCHEDULE_V1_KEY = "classsight_schedule_v1";

function isValidScheduleItem(item) {
  return (
    item !== null &&
    typeof item === "object" &&
    typeof item.id === "string" &&
    typeof item.title === "string"
  );
}

function parseScheduleStore(raw, version) {
  if (typeof raw !== "string") return null;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (
    !parsed ||
    parsed.version !== version ||
    !Array.isArray(parsed.scheduleList) ||
    !parsed.scheduleList.every(isValidScheduleItem)
  ) {
    return null;
  }
  const ids = new Set(parsed.scheduleList.map((item) => item.id));
  return {
    scheduleList: parsed.scheduleList,
    manualActiveClassId: ids.has(parsed.manualActiveClassId) ? parsed.manualActiveClassId : null,
    endedClassIds: Array.isArray(parsed.endedClassIds)
      ? parsed.endedClassIds.filter((id) => ids.has(id))
      : [],
    scheduleDate: isValidDateKey(parsed.scheduleDate) ? parsed.scheduleDate : null,
  };
}

function readItem(storage, key) {
  try {
    return storage ? storage.getItem(key) : null;
  } catch {
    return null;
  }
}

// Load order: v2 → Phase 1 (v1) → defaults. The lecture list is always kept.
// Started/ended state is only kept when it is known to belong to today: v2 stores
// `scheduleDate`; the undated Phase 1 store cannot be dated, so its state is reset.
export function loadScheduleState(storage, todayKey, defaultScheduleList) {
  const v2 = parseScheduleStore(readItem(storage, SCHEDULE_STORAGE_KEY), 2);
  if (v2 && v2.scheduleDate) {
    const isToday = v2.scheduleDate === todayKey;
    return {
      scheduleList: v2.scheduleList,
      manualActiveClassId: isToday ? v2.manualActiveClassId : null,
      endedClassIds: isToday ? v2.endedClassIds : [],
      source: "v2",
      needsBackup: false,
    };
  }

  const v1 = parseScheduleStore(readItem(storage, SCHEDULE_V1_KEY), 1);
  if (v1) {
    return {
      scheduleList: v1.scheduleList,
      manualActiveClassId: null,
      endedClassIds: [],
      source: "v1",
      needsBackup: true,
    };
  }

  return {
    scheduleList: defaultScheduleList,
    manualActiveClassId: null,
    endedClassIds: [],
    source: "default",
    needsBackup: true,
  };
}

export function serializeScheduleState({ scheduleList, manualActiveClassId, endedClassIds, scheduleDate }) {
  return JSON.stringify({
    version: 2,
    scheduleDate,
    scheduleList,
    manualActiveClassId,
    endedClassIds: Array.from(endedClassIds),
  });
}
