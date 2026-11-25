// src/pages/AttendanceSession/useAttendanceSession.js — attendance of one class on one day, from the API.
// Rows: { j, id, name, roll, st: "p"|"u"|"a", m: "ai"|"man"|null, why, conf, x }
//   st  present / needs review / absent;  m  how a present student was verified;
//   conf  face-match confidence (0-1) for "ai";  x  excused (kept as is when saving).
// Flow: load roster + saved records -> scan the class photo (create session, upload, process) -> review -> save (confirm).
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { listStudents } from "../../api/classrooms";
import { confirmSession, createSession, listLogs, processSession, uploadSessionPhoto } from "../../api/attendance";
import { GROUP_MAX_SIDE, resizeImage } from "../../lib/resizeImage";

const EMPTY = { list: [], focus: null, saved: false, savedAt: null, u0: 1, labOffset: null, overall: [], labDates: [] };

const WHY_NOT_SCANNED = "No class photo scanned yet";
const WHY_NOT_FOUND = "Not found in the photo";
const WHY_NO_FACE = "No enrolled face. Mark manually";

const timeLabel = () => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

// The selected student is always someone in Needs review (the first one when the focus is gone)
function normalize(s) {
  const u = s.list.filter((r) => r.st === "u");
  if (u.some((r) => r.j === s.focus)) return s;
  return { ...s, focus: u.length ? u[0].j : null, labOffset: null };
}

const patch = (s, j, change) => ({ ...s, list: s.list.map((r) => (r.j === j ? { ...r, ...change } : r)) });

function reducer(s, a) {
  switch (a.type) {
    case "load": {
      const u0 = a.list.filter((r) => r.st === "u").length || 1;
      return normalize({ ...EMPTY, ...a.data, list: a.list, u0 });
    }
    case "select":
      return s.focus === a.j ? s : { ...s, focus: a.j, labOffset: null };
    case "resolve": // method: "ai" (face recheck, with conf) | "man"
      return normalize({ ...patch(s, a.j, { st: "p", m: a.method, conf: a.conf, x: false }), saved: false });
    case "keepAbsent":
      return normalize(patch(s, a.j, { st: "a", m: null, conf: undefined }));
    case "undo":
      return { ...patch(s, a.j, { st: "u", m: null, conf: undefined }), saved: false, focus: a.j, labOffset: null };
    case "scanned": {
      // A new scan replaces earlier automatic marks. Hand-marked presents and excused students are kept.
      const list = s.list.map((r) => {
        if (r.x || (r.st === "p" && r.m === "man")) return r;
        const conf = a.recognized.get(r.id);
        if (conf !== undefined) return { ...r, st: "p", m: "ai", conf, why: "" };
        return { ...r, st: "u", m: null, conf: undefined, why: r.noFace ? WHY_NO_FACE : WHY_NOT_FOUND };
      });
      return normalize({ ...s, list, saved: false, u0: list.filter((r) => r.st === "u").length || 1 });
    }
    case "saved":
      return normalize({
        ...s,
        saved: true,
        savedAt: a.at,
        list: s.list.map((r) => (r.st === "u" ? { ...r, st: "a", m: null } : r)),
      });
    case "edit":
      return { ...s, saved: false };
    case "labs":
      return { ...s, labOffset: a.offset };
    default:
      return s;
  }
}

// Per-student history from the saved sessions before `date` (+ today as the last cell)
function history(roster, logs, date) {
  const past = logs.filter((e) => e.session.session_date < date).sort((a, b) => a.session.session_date.localeCompare(b.session.session_date));
  const overall = roster.map((student) => {
    const pres = past.map((e) => e.records.some((r) => r.student_id === student.id && r.status === "present"));
    const lastIdx = pres.lastIndexOf(true);
    const held = pres.length;
    const attended = pres.filter(Boolean).length;
    return {
      pres,
      held,
      pct: held ? Math.round((attended / held) * 100) : 0,
      last: lastIdx >= 0 ? past[lastIdx].session.session_date : null,
    };
  });
  return { overall, labDates: [...past.map((e) => e.session.session_date), date] };
}

export function useAttendanceSession(classroomId, date) {
  const [state, dispatch] = useReducer(reducer, EMPTY);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [notice, setNotice] = useState("");
  const [unrecognized, setUnrecognized] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const apiSession = useRef(null); // today's API session, once it exists
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current; // a class switch or reload makes older responses stale
    apiSession.current = null;
    dispatch({ type: "load", list: [], data: {} });
    setScanning(false);
    setSaving(false);
    setScanError("");
    setSaveError("");
    setNotice("");
    setUnrecognized(null);
    if (!classroomId) return;
    setLoading(true);
    setLoadError("");
    try {
      const [roster, logs] = await Promise.all([listStudents(classroomId), listLogs(classroomId)]);
      if (id !== requestId.current) return;
      const today = logs.find((e) => e.session.session_date === date);
      apiSession.current = today ? today.session : null;
      const byStudent = new Map((today?.records || []).map((r) => [r.student_id, r]));
      const hasRecords = byStudent.size > 0;
      const list = roster.map((student, j) => {
        const rec = byStudent.get(student.id);
        const base = { j, id: student.id, name: student.name, roll: student.roll_number, noFace: !student.face_enrolled };
        if (!rec) return { ...base, st: "u", m: null, why: student.face_enrolled ? WHY_NOT_SCANNED : WHY_NO_FACE };
        if (rec.status === "present") {
          const ai = rec.recognition_confidence != null;
          return { ...base, st: "p", m: ai ? "ai" : "man", conf: rec.recognition_confidence ?? undefined, why: "" };
        }
        return { ...base, st: "a", m: null, why: "", x: rec.status === "excused" };
      });
      dispatch({
        type: "load",
        list,
        data: { saved: hasRecords, savedAt: hasRecords ? "earlier" : null, ...history(roster, logs, date) },
      });
    } catch (err) {
      if (id === requestId.current) setLoadError(err.message || "Could not load attendance.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [classroomId, date]);

  useEffect(() => {
    load();
    return () => {
      requestId.current += 1;
    };
  }, [load]);

  // Today's session is created on the first photo; a 409 means it exists already (find it).
  const ensureSession = async () => {
    if (apiSession.current) return apiSession.current;
    let found;
    try {
      found = await createSession(classroomId, date);
    } catch (err) {
      if (err.status !== 409) throw err;
      found = (await listLogs(classroomId)).find((e) => e.session.session_date === date)?.session;
      if (!found) throw err;
    }
    apiSession.current = found;
    return found;
  };

  const scan = async (file) => {
    const id = requestId.current;
    setScanning(true);
    setScanError("");
    setNotice("");
    try {
      const current = await ensureSession();
      await uploadSessionPhoto(current.id, await resizeImage(file, GROUP_MAX_SIDE));
      const result = await processSession(current.id);
      if (id !== requestId.current) return;
      const recognized = new Map(result.recognized_students.map((r) => [r.student_id, r.confidence]));
      dispatch({ type: "scanned", recognized });
      setUnrecognized(result.unrecognized_face_count);
      setNotice(`${recognized.size} recognised from the class photo. Review the rest.`);
    } catch (err) {
      if (id === requestId.current) setScanError(err.message || "Could not process the class photo.");
    } finally {
      if (id === requestId.current) setScanning(false);
    }
  };

  const save = async () => {
    const id = requestId.current;
    setSaving(true);
    setSaveError("");
    try {
      const current = await ensureSession();
      // Anyone still in Needs review is saved as absent: the teacher confirmed that in the dialog.
      const records = state.list.map((r) => ({
        student_id: r.id,
        status: r.st === "p" ? "present" : r.x ? "excused" : "absent",
        recognition_confidence: r.st === "p" && r.m === "ai" ? r.conf ?? null : null,
      }));
      await confirmSession(current.id, records);
      if (id !== requestId.current) return;
      dispatch({ type: "saved", at: timeLabel() });
      setNotice("Attendance saved.");
      return true;
    } catch (err) {
      if (id === requestId.current) setSaveError(err.message || "Could not save attendance.");
      return false;
    } finally {
      if (id === requestId.current) setSaving(false);
    }
  };

  return { state, dispatch, loading, loadError, scanning, scanError, notice, setNotice, unrecognized, saving, saveError, scan, save, reload: load };
}
