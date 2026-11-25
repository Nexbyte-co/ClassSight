// src/pages/AttendanceSession/useAttendanceSession.js — real attendance state for one class on one day.
// Roster and saved records come from the API; a class photo creates the session, uploads the photo
// and runs face recognition; Save sends every student's status to POST /attendance/confirm.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listStudents } from "../../api/classrooms";
import {
  confirmSession,
  createSession,
  listLogs,
  processSession,
  uploadSessionPhoto,
} from "../../api/attendance";
import { GROUP_MAX_SIDE, cropFace, resizeImage } from "../../lib/resizeImage";

/**
 * @typedef {Object} Row
 * @property {number} j              student id (the API id)
 * @property {string} name
 * @property {string} roll
 * @property {boolean} faceEnrolled
 * @property {"p"|"u"|"a"|"e"} st    present, needs review, absent, excused
 * @property {"ai"|"nfc"|"man"|null} m  how a present student was verified
 * @property {number} [confidence]   face match confidence (0-1) for m === "ai"
 * @property {string} why            why the student still needs review
 */

const NOT_SCANNED = "No class photo scanned yet";
const NOT_FOUND = "Not found in the photo";

const timeLabel = () => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

function rowFromStudent(student) {
  return {
    j: student.id,
    name: student.name,
    roll: student.roll_number,
    faceEnrolled: Boolean(student.face_enrolled),
    st: "u",
    m: null,
    why: NOT_SCANNED,
  };
}

// A saved record for today -> the row's state
function applyRecord(row, record) {
  if (!record) return row;
  if (record.status === "present") {
    const ai = record.recognition_confidence != null;
    return { ...row, st: "p", m: ai ? "ai" : "man", confidence: ai ? record.recognition_confidence : undefined, why: "" };
  }
  if (record.status === "absent") return { ...row, st: "a", m: null, why: "" };
  if (record.status === "excused") return { ...row, st: "e", m: null, why: "" };
  return row;
}

export function useAttendanceSession(classroomId, date) {
  const [rows, setRows] = useState([]);
  const [session, setSession] = useState(null); // today's API session, once it exists
  const [history, setHistory] = useState({}); // studentId -> [{ date, present }] for earlier sessions
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [unrecognizedFaces, setUnrecognizedFaces] = useState(null);
  const [scannedAt, setScannedAt] = useState(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [focus, setFocusState] = useState(null);

  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setRows([]);
    setSession(null);
    setHistory({});
    setSaved(false);
    setSavedAt(null);
    setUnrecognizedFaces(null);
    setScannedAt(null);
    setScanError("");
    setSaveError("");
    setScanning(false);
    setSaving(false);
    setFocusState(null);
    if (!classroomId) return;
    setLoading(true);
    setLoadError("");
    try {
      const [roster, logs] = await Promise.all([listStudents(classroomId), listLogs(classroomId)]);
      if (id !== requestId.current) return;
      const today = logs.find((entry) => entry.session.session_date === date);
      const byStudent = new Map((today?.records || []).map((r) => [r.student_id, r]));
      setRows(roster.map((s) => applyRecord(rowFromStudent(s), byStudent.get(s.id))));
      if (today) {
        setSession(today.session);
        if (today.records.length > 0) {
          setSaved(true);
          setSavedAt("earlier");
        }
      }
      const past = {};
      logs
        .filter((entry) => entry.session.session_date < date)
        .sort((a, b) => (a.session.session_date < b.session.session_date ? -1 : 1))
        .forEach((entry) => {
          entry.records.forEach((r) => {
            (past[r.student_id] ||= []).push({ date: entry.session.session_date, present: r.status === "present" });
          });
        });
      setHistory(past);
    } catch (err) {
      if (id === requestId.current) setLoadError(err.message || "Could not load attendance.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [classroomId, date]);

  useEffect(() => {
    load();
  }, [load]);

  // The focused student is always someone in Needs review (the first one when the focus is gone)
  const review = useMemo(() => rows.filter((r) => r.st === "u"), [rows]);
  const focusRow = review.find((r) => r.j === focus) || review[0] || null;
  const setFocus = useCallback((j) => setFocusState(j), []);

  const change = (updater) => {
    setRows(updater);
    setSaved(false);
    setSaveError("");
  };

  const patch = (j, fields) => change((list) => list.map((r) => (r.j === j ? { ...r, ...fields } : r)));

  // Today's session is created on the first photo; a 409 means it exists already (find it).
  const ensureSession = async (id) => {
    if (session) return session;
    let found;
    try {
      found = await createSession(classroomId, date);
    } catch (err) {
      if (err.status !== 409) throw err;
      const logs = await listLogs(classroomId);
      found = logs.find((entry) => entry.session.session_date === date)?.session;
      if (!found) throw err;
    }
    if (id === requestId.current) setSession(found);
    return found;
  };

  const scanClassPhoto = async (file) => {
    const id = requestId.current;
    setScanning(true);
    setScanError("");
    try {
      const current = await ensureSession(id);
      const photo = await resizeImage(file, GROUP_MAX_SIDE);
      await uploadSessionPhoto(current.id, photo);
      const result = await processSession(current.id);
      if (id !== requestId.current) return;
      // Faces the model could not accept but thinks are a particular student: cut each one out of the photo.
      const suggested = new Map();
      await Promise.all(
        (result.suggestions ?? []).map(async (sg) => {
          const crop = await cropFace(photo, sg.box);
          if (crop) suggested.set(sg.student_id, { confidence: sg.confidence, crop });
        })
      );
      if (id !== requestId.current) return;
      const recognized = new Map(result.recognized_students.map((r) => [r.student_id, r.confidence]));
      change((list) =>
        list.map((r) => {
          // A new scan replaces earlier automatic marks and absences. Hand-marked presents,
          // NFC marks and excused students are kept.
          const keep = r.st === "e" || (r.st === "p" && r.m !== "ai");
          if (keep) return r;
          if (recognized.has(r.j)) return { ...r, st: "p", m: "ai", confidence: recognized.get(r.j), why: "" };
          const guess = suggested.get(r.j);
          return {
            ...r,
            st: "u",
            m: null,
            confidence: undefined,
            suggest: guess,
            why: guess ? `Possible match, ${Math.round(guess.confidence * 100)}% similar` : NOT_FOUND,
          };
        })
      );
      setUnrecognizedFaces(result.unrecognized_face_count);
      setScannedAt(timeLabel());
      return recognized.size;
    } catch (err) {
      if (id === requestId.current) setScanError(err.message || "Could not process the class photo.");
      return null;
    } finally {
      if (id === requestId.current) setScanning(false);
    }
  };

  const markPresent = (j, method, confidence) =>
    patch(j, { st: "p", m: method, confidence: method === "ai" ? confidence : undefined, why: "" });
  const keepAbsent = (j) => patch(j, { st: "a", m: null, confidence: undefined, why: "" });
  const undo = (j) => {
    patch(j, { st: "u", m: null, confidence: undefined, why: NOT_FOUND });
    setFocusState(j);
  };

  // Everyone still unresolved is saved as absent (the page confirms that first).
  const save = async () => {
    const id = requestId.current;
    setSaving(true);
    setSaveError("");
    try {
      const current = await ensureSession(id);
      const records = rows.map((r) => {
        const status = r.st === "p" ? "present" : r.st === "e" ? "excused" : "absent";
        return {
          student_id: r.j,
          status,
          recognition_confidence: status === "present" && r.m === "ai" ? r.confidence : null,
        };
      });
      await confirmSession(current.id, records);
      if (id !== requestId.current) return false;
      setRows((list) => list.map((r) => (r.st === "u" ? { ...r, st: "a", m: null, why: "" } : r)));
      setSaved(true);
      setSavedAt(timeLabel());
      return true;
    } catch (err) {
      if (id === requestId.current) setSaveError(err.message || "Could not save attendance.");
      return false;
    } finally {
      if (id === requestId.current) setSaving(false);
    }
  };

  const edit = () => setSaved(false);

  return {
    rows,
    review,
    focus: focusRow,
    setFocus,
    history,
    session,
    loading,
    loadError,
    reload: load,
    scanning,
    scanError,
    scannedAt,
    unrecognizedFaces,
    scanClassPhoto,
    markPresent,
    keepAbsent,
    undo,
    saving,
    saveError,
    saved,
    savedAt,
    save,
    edit,
    // No edits while a save or scan is running: they would be marked saved without being sent.
    locked: saving || scanning,
  };
}
