// src/pages/TakeAttendance.jsx
// Real attendance for today's class: upload a class photo, review who was recognised,
// resolve the rest by hand or one-person photo, and save to the server.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Camera, CheckCircle2, HelpCircle, Radio, Save, UserX } from "lucide-react";
import PageShell from "../components/PageShell";
import Modal from "../components/Modal";
import CameraCapture from "../components/CameraCapture";
import { useClassroom } from "../context/ClassroomContext";
import { listStudents, verifyPhoto } from "../api/classrooms";
import {
  confirmSession,
  createSession,
  listLogs,
  processSession,
  uploadSessionPhoto,
} from "../api/attendance";
import { ENROLL_MAX_SIDE, GROUP_MAX_SIDE, resizeImage } from "../lib/resizeImage";

// Local calendar date as YYYY-MM-DD (what the API stores as the session date)
const todayKey = () => new Date().toLocaleDateString("en-CA");

const timeLabel = (date = new Date()) =>
  date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

const percent = (value) => `${Math.round(value * 100)}%`;

function RescanModal({ classroomId, student, onClose, onMatched }) {
  const [cameraOn, setCameraOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const check = async (file) => {
    setCameraOn(false);
    setBusy(true);
    setMessage("");
    try {
      const answer = await verifyPhoto(classroomId, await resizeImage(file, ENROLL_MAX_SIDE));
      if (answer.verified && answer.student?.id === student.id) {
        onMatched(student.id, answer.confidence);
        return;
      }
      setMessage(
        answer.verified
          ? `That photo matched ${answer.student.name}, not ${student.name}. Nothing was changed.`
          : "That photo did not match this student closely enough. Retake it, or mark the student manually."
      );
    } catch (err) {
      setMessage(err.status === 422 ? `${err.message}. Retake the photo with one person.` : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`Verify ${student.name} by photo`} onClose={busy ? () => {} : onClose}>
      <p className="mg-hint">Take or choose a photo of this student only. They are marked present only if the face matches.</p>
      {!student.face_enrolled && (
        <div className="mg-alert warn">This student has no enrolled face yet, so a photo cannot verify them. Mark them manually.</div>
      )}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
        <button type="button" className="mg-btn" disabled={busy || !student.face_enrolled} onClick={() => setCameraOn((on) => !on)}>
          {cameraOn ? "Close camera" : "Open camera"}
        </button>
        <label className="mg-btn secondary mg-file" style={{ opacity: student.face_enrolled ? 1 : 0.6 }}>
          Choose a photo
          <input
            type="file"
            accept="image/jpeg,image/png"
            disabled={busy || !student.face_enrolled}
            onChange={(e) => {
              const file = e.target.files[0];
              e.target.value = "";
              if (file) check(file);
            }}
          />
        </label>
      </div>
      <div style={{ marginTop: 10 }}>
        <button type="button" className="mg-btn secondary small" disabled title="NFC card scanning is not available yet">
          <Radio size={14} style={{ verticalAlign: "-2px" }} /> NFC card (not available yet)
        </button>
      </div>
      {cameraOn && (
        <div style={{ marginTop: 12 }}>
          <CameraCapture label="Capture and verify" facingMode="environment" onCapture={check} />
        </div>
      )}
      <div aria-live="polite">
        {busy && <p className="mg-hint">Checking...</p>}
        {message && <div className="mg-alert warn">{message}</div>}
      </div>
    </Modal>
  );
}

function TakeAttendance() {
  const { classroom } = useClassroom();
  const classroomId = classroom?.id;
  // Fixed while this class is open: a re-render after midnight must not reload and wipe unsaved marks.
  const date = useMemo(() => todayKey(), [classroomId]); // eslint-disable-line react-hooks/exhaustive-deps

  const [students, setStudents] = useState([]);
  // studentId -> { status: "present" | "absent", method: "ai" | "manual", confidence?: number }
  const [marks, setMarks] = useState({});
  const [session, setSession] = useState(null); // API session for today, once it exists
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [cameraOn, setCameraOn] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [unrecognizedFaces, setUnrecognizedFaces] = useState(null);

  const [rescanTarget, setRescanTarget] = useState(null);
  const [confirmSave, setConfirmSave] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedAt, setSavedAt] = useState(null); // null = nothing saved since the last change
  const [notice, setNotice] = useState("");

  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setStudents([]);
    setMarks({});
    setSession(null);
    setSavedAt(null);
    setUnrecognizedFaces(null);
    setScanError("");
    setSaveError("");
    setNotice("");
    setScanning(false);
    setSaving(false);
    setCameraOn(false);
    setConfirmSave(false);
    setRescanTarget(null);
    if (!classroomId) return;
    setLoading(true);
    setLoadError("");
    try {
      const [roster, logs] = await Promise.all([listStudents(classroomId), listLogs(classroomId)]);
      if (id !== requestId.current) return;
      setStudents(roster);
      const today = logs.find((entry) => entry.session.session_date === date);
      if (today) {
        setSession(today.session);
        const saved = {};
        today.records.forEach((record) => {
          if (["present", "absent", "excused"].includes(record.status)) {
            saved[record.student_id] = {
              status: record.status,
              method: record.recognition_confidence != null ? "ai" : "manual",
              confidence: record.recognition_confidence ?? undefined,
            };
          }
        });
        setMarks(saved);
        if (today.records.length > 0) setSavedAt("earlier today");
      }
    } catch (err) {
      if (id === requestId.current) setLoadError(err.message || "Could not load attendance.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [classroomId, date]);

  useEffect(() => {
    load();
  }, [load]);

  const change = (updater) => {
    setMarks(updater);
    setSavedAt(null);
    setSaveError("");
  };

  const present = students.filter((s) => marks[s.id]?.status === "present");
  const absent = students.filter((s) => marks[s.id]?.status === "absent");
  const excused = students.filter((s) => marks[s.id]?.status === "excused");
  const unresolved = students.filter((s) => !marks[s.id]);

  // Today's session is created on the first photo; a 409 means it exists already (find it).
  // `id` is the request id of the caller: a class switch in the meantime makes it stale,
  // and a stale call must not put this class's session into the new class's state.
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
    setCameraOn(false);
    setScanning(true);
    setScanError("");
    setNotice("");
    const id = requestId.current;
    try {
      const current = await ensureSession(id);
      await uploadSessionPhoto(current.id, await resizeImage(file, GROUP_MAX_SIDE));
      const result = await processSession(current.id);
      if (id !== requestId.current) return;
      const recognized = new Map(result.recognized_students.map((r) => [r.student_id, r.confidence]));
      change((previous) => {
        const next = {};
        // A new scan replaces earlier automatic marks and "absent" (including students a save
        // defaulted to absent). Hand-marked presents and excused students are kept.
        Object.entries(previous).forEach(([studentId, mark]) => {
          const keep = mark.status === "excused" || (mark.status === "present" && mark.method === "manual");
          if (keep) next[studentId] = mark;
        });
        recognized.forEach((confidence, studentId) => {
          if (!next[studentId]) next[studentId] = { status: "present", method: "ai", confidence };
        });
        return next;
      });
      setUnrecognizedFaces(result.unrecognized_face_count);
      setNotice(
        `${recognized.size} student${recognized.size === 1 ? "" : "s"} recognised from the class photo. Review the rest below.`
      );
    } catch (err) {
      if (id === requestId.current) setScanError(err.message || "Could not process the class photo.");
    } finally {
      if (id === requestId.current) setScanning(false);
    }
  };

  const markManual = (studentId, status) =>
    change((previous) => ({ ...previous, [studentId]: { status, method: "manual" } }));

  const undo = (studentId) =>
    change((previous) => {
      const next = { ...previous };
      delete next[studentId];
      return next;
    });

  const save = async () => {
    const id = requestId.current;
    setConfirmSave(false);
    setSaving(true);
    setSaveError("");
    try {
      const current = await ensureSession(id);
      // Anyone still unresolved is saved as absent: the teacher confirmed that in the dialog.
      const records = students.map((student) => {
        const mark = marks[student.id];
        const status = mark?.status === "present" || mark?.status === "excused" ? mark.status : "absent";
        return {
          student_id: student.id,
          status,
          recognition_confidence: status === "present" && mark.method === "ai" ? mark.confidence : null,
        };
      });
      await confirmSession(current.id, records);
      if (id !== requestId.current) return; // the class changed while saving; this view is gone
      setMarks((previous) => {
        const next = { ...previous };
        unresolved.forEach((s) => {
          next[s.id] = { status: "absent", method: "manual" };
        });
        return next;
      });
      setSavedAt(timeLabel());
      setNotice("Attendance saved.");
    } catch (err) {
      if (id === requestId.current) setSaveError(err.message || "Could not save attendance.");
    } finally {
      if (id === requestId.current) setSaving(false);
    }
  };

  const prettyDate = useMemo(
    () =>
      new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    [date]
  );
  // No edits while a save or scan is running: they would be marked saved without being sent.
  const locked = saving || scanning;

  const row = (student, actions, detail) => (
    <tr key={student.id}>
      <td>{student.name}</td>
      <td>
        <span className="student-roll-tag">{student.roll_number}</span>
      </td>
      <td>{detail}</td>
      <td>
        <div className="mg-actions">{actions}</div>
      </td>
    </tr>
  );

  return (
    <PageShell crumb="Attendance" activePage="attendance">
      <div className="students-page-header">
        <div>
          <h1 className="students-page-title">Take attendance</h1>
          <p className="students-page-subtitle">
            {classroom ? `${classroom.course} - Section ${classroom.section} · ${prettyDate}` : "No class is available yet."}
          </p>
        </div>
        {classroom && (
          <button
            type="button"
            className="mg-btn"
            disabled={locked || students.length === 0 || savedAt !== null}
            title={savedAt !== null ? "Nothing to save: change a mark or scan again first" : undefined}
            onClick={() => (unresolved.length > 0 ? setConfirmSave(true) : save())}
          >
            <Save size={16} style={{ verticalAlign: "-3px" }} /> {saving ? "Saving..." : savedAt ? "Saved" : "Save attendance"}
          </button>
        )}
      </div>

      {loading && <p className="mg-hint" role="status">Loading attendance...</p>}
      {loadError && (
        <div className="mg-alert error" role="alert">
          {loadError}{" "}
          <button type="button" className="mg-btn secondary small" onClick={load}>
            Try again
          </button>
        </div>
      )}
      {saveError && <div className="mg-alert error" role="alert">{saveError}</div>}

      {!classroom && (
        <div className="mg-card mg-empty">
          <h2>No class yet</h2>
          <p>An admin creates a class and assigns it to a teacher under Admin.</p>
        </div>
      )}

      {classroom && !loading && students.length === 0 && !loadError && (
        <div className="mg-card mg-empty">
          <h2>No students in this class</h2>
          <p>
            Add and enroll students on the <Link to="/students">Students</Link> page first.
          </p>
        </div>
      )}

      {classroom && students.length > 0 && (
        <>
          <div className="cohort-summary-grid">
            <div className="cohort-card">
              <div className="cohort-icon-box safe"><CheckCircle2 size={22} strokeWidth={2} /></div>
              <div className="cohort-info">
                <span className="cohort-label">Present</span>
                <strong className="cohort-value text-safe">{present.length}</strong>
              </div>
            </div>
            <div className="cohort-card">
              <div className="cohort-icon-box warning"><HelpCircle size={22} strokeWidth={2} /></div>
              <div className="cohort-info">
                <span className="cohort-label">Needs review</span>
                <strong className="cohort-value text-warning">{unresolved.length}</strong>
              </div>
            </div>
            <div className="cohort-card">
              <div className="cohort-icon-box critical"><UserX size={22} strokeWidth={2} /></div>
              <div className="cohort-info">
                <span className="cohort-label">Absent</span>
                <strong className="cohort-value text-critical">{absent.length}</strong>
              </div>
            </div>
          </div>

          <div className="mg-card">
            <h2>Class photo</h2>
            <p className="mg-hint">
              Take or choose one photo that shows the students' faces. Everyone recognised is marked present; you resolve the rest below.
              {savedAt && " Scanning again after saving lets you change and re-save today's attendance."}
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="button" className="mg-btn" disabled={locked} onClick={() => setCameraOn((on) => !on)}>
                <Camera size={16} style={{ verticalAlign: "-3px" }} /> {cameraOn ? "Close camera" : "Open camera"}
              </button>
              <label className="mg-btn secondary mg-file">
                Choose a photo
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  disabled={locked}
                  onChange={(e) => {
                    const file = e.target.files[0];
                    e.target.value = "";
                    if (file) scanClassPhoto(file);
                  }}
                />
              </label>
            </div>
            <p className="mg-hint" style={{ margin: "10px 0 0" }}>
              <button
                type="button"
                className="mg-btn secondary small"
                disabled
                title="NFC card scanning is not available yet"
              >
                <Radio size={14} style={{ verticalAlign: "-2px" }} /> NFC card (not available yet)
              </button>
            </p>
            {cameraOn && (
              <div style={{ marginTop: 12 }}>
                <CameraCapture label="Capture and scan" facingMode="environment" onCapture={scanClassPhoto} />
              </div>
            )}
            <div aria-live="polite">
              {scanning && <p className="mg-hint" style={{ marginTop: 12 }}>Scanning the class photo...</p>}
              {scanError && <div className="mg-alert error">{scanError}</div>}
              {notice && !scanError && <div className="mg-alert ok">{notice}</div>}
              {unrecognizedFaces > 0 && (
                <div className="mg-alert warn">
                  {unrecognizedFaces} face{unrecognizedFaces === 1 ? " was" : "s were"} not matched to any enrolled student.
                </div>
              )}
            </div>
          </div>

          {unresolved.length > 0 && (
            <div className="mg-card">
              <h2>Needs review ({unresolved.length})</h2>
              <p className="mg-hint">Not recognised in the photo. Verify each by photo, or mark them yourself.</p>
              <table className="mg-table">
                <thead>
                  <tr><th>Student</th><th>Roll number</th><th>Face</th><th style={{ textAlign: "right" }}>Actions</th></tr>
                </thead>
                <tbody>
                  {unresolved.map((student) =>
                    row(
                      student,
                      <>
                        <button type="button" className="mg-btn secondary small" disabled={locked} aria-label={`Verify ${student.name} by photo`} onClick={() => setRescanTarget(student)}>Verify by photo</button>
                        <button type="button" className="mg-btn small" disabled={locked} aria-label={`Mark ${student.name} present`} onClick={() => markManual(student.id, "present")}>Mark present</button>
                        <button type="button" className="mg-btn danger small" disabled={locked} aria-label={`Mark ${student.name} absent`} onClick={() => markManual(student.id, "absent")}>Mark absent</button>
                      </>,
                      <span className={`mg-badge ${student.face_enrolled ? "yes" : "no"}`}>
                        {student.face_enrolled ? "Enrolled" : "Not enrolled"}
                      </span>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}

          {present.length > 0 && (
            <div className="mg-card">
              <h2>Present ({present.length})</h2>
              <table className="mg-table">
                <thead>
                  <tr><th>Student</th><th>Roll number</th><th>How</th><th style={{ textAlign: "right" }}>Actions</th></tr>
                </thead>
                <tbody>
                  {present.map((student) => {
                    const mark = marks[student.id];
                    return row(
                      student,
                      <button type="button" className="mg-btn secondary small" disabled={locked} aria-label={`Undo mark for ${student.name}`} onClick={() => undo(student.id)}>Undo</button>,
                      mark.method === "ai" ? `Face match ${percent(mark.confidence)}` : "Marked by teacher"
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {absent.length > 0 && (
            <div className="mg-card">
              <h2>Absent ({absent.length})</h2>
              <table className="mg-table">
                <thead>
                  <tr><th>Student</th><th>Roll number</th><th>How</th><th style={{ textAlign: "right" }}>Actions</th></tr>
                </thead>
                <tbody>
                  {absent.map((student) =>
                    row(
                      student,
                      <button type="button" className="mg-btn secondary small" disabled={locked} aria-label={`Undo mark for ${student.name}`} onClick={() => undo(student.id)}>Undo</button>,
                      "Marked by teacher"
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
          {excused.length > 0 && (
            <div className="mg-card">
              <h2>Excused ({excused.length})</h2>
              <p className="mg-hint">Recorded earlier as excused. These are kept as they are when you save.</p>
              <table className="mg-table">
                <thead>
                  <tr><th>Student</th><th>Roll number</th></tr>
                </thead>
                <tbody>
                  {excused.map((student) => (
                    <tr key={student.id}>
                      <td>{student.name}</td>
                      <td><span className="student-roll-tag">{student.roll_number}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {rescanTarget && (
        <RescanModal
          classroomId={classroomId}
          student={rescanTarget}
          onClose={() => setRescanTarget(null)}
          onMatched={(studentId, confidence) => {
            change((previous) => ({ ...previous, [studentId]: { status: "present", method: "ai", confidence } }));
            setRescanTarget(null);
          }}
        />
      )}

      {confirmSave && (
        <Modal title="Save attendance?" onClose={() => setConfirmSave(false)}>
          <p className="mg-hint">
            {unresolved.length} student{unresolved.length === 1 ? " is" : "s are"} still not resolved and will be saved as{" "}
            <strong>absent</strong>:
          </p>
          <ul style={{ margin: "6px 0 0", paddingLeft: 20, color: "var(--cs-text-primary)" }}>
            {unresolved.map((s) => (
              <li key={s.id}>{s.name} ({s.roll_number})</li>
            ))}
          </ul>
          <div className="mg-modal-foot">
            <button type="button" className="mg-btn secondary" onClick={() => setConfirmSave(false)}>Go back</button>
            <button type="button" className="mg-btn" onClick={save}>Save with these absent</button>
          </div>
        </Modal>
      )}
    </PageShell>
  );
}

export default TakeAttendance;
