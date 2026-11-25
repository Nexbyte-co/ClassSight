import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, Check, CircleAlert, X } from "lucide-react";
import TeacherShell from "../../components/navigation/TeacherShell";
import CameraCapture from "../../components/CameraCapture";
import ClassPicker from "../../components/ClassPicker";
import { useDialogA11y } from "../../hooks/useDialogA11y";
import { useClassroom } from "../../context/ClassroomContext";
import { useSchedule } from "../../context/schedule/ScheduleContext";
import { isValidDateKey, makeSessionId, parseSessionId } from "../../context/schedule/scheduleStatus";
import { verifyPhoto } from "../../api/classrooms";
import { ENROLL_MAX_SIDE, resizeImage } from "../../lib/resizeImage";
import { useAttendanceSession } from "./useAttendanceSession";
import SessionHeader from "./SessionHeader";
import SessionSummary from "./SessionSummary";
import ReviewLane from "./ReviewLane";
import ResolveCard from "./ResolveCard";
import AbsentLane from "./AbsentLane";
import ClassPhotoCard from "./ClassPhotoCard";
import UpNextCard from "./UpNextCard";
import "./attendanceSession.css";

const todayKey = () => new Date().toLocaleDateString("en-CA");

function Modal({ title, subtitle, children, onClose, dialogRef }) {
  return (
    <div className="as-modal" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="as-modal-box" role="dialog" aria-modal="true" aria-labelledby="as-modal-title" ref={dialogRef} tabIndex={-1}>
        <header className="as-modal-head">
          <span className="as-modal-icon"><AlertTriangle size={19} /></span>
          <div><h2 id="as-modal-title">{title}</h2><p>{subtitle}</p></div>
          <button className="as-modal-close" type="button" aria-label="Close" onClick={onClose}><X size={17} /></button>
        </header>
        {children}
      </section>
    </div>
  );
}

// One-student photo check (POST /classrooms/{id}/verify): present only if the face is this student's
function RetakeBody({ classroomId, row, onMatched }) {
  const [cameraOn, setCameraOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const check = async (file) => {
    setCameraOn(false);
    setBusy(true);
    setMessage("");
    try {
      const answer = await verifyPhoto(classroomId, await resizeImage(file, ENROLL_MAX_SIDE));
      if (answer.verified && answer.student?.id === row.id) return onMatched(row, answer.confidence);
      setMessage(
        answer.verified
          ? `That photo matched ${answer.student.name}, not ${row.name}. Nothing was changed.`
          : "That photo did not match this student closely enough. Retake it, or mark them present manually."
      );
    } catch (err) {
      setMessage(err.status === 422 ? `${err.message}. Retake the photo with one person.` : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <p className="as-modal-note">Take or choose a photo of this student only. They are marked present only if the face matches.</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", padding: "0 20px 8px" }}>
        <button type="button" className="as-b1" disabled={busy} onClick={() => setCameraOn((on) => !on)}>
          {cameraOn ? "Close camera" : "Open camera"}
        </button>
        <label className="as-b1" style={{ cursor: busy ? "not-allowed" : "pointer" }}>
          Choose a photo
          <input
            type="file"
            accept="image/jpeg,image/png"
            hidden
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files[0];
              e.target.value = "";
              if (file) check(file);
            }}
          />
        </label>
      </div>
      {cameraOn && <div style={{ padding: "0 20px" }}><CameraCapture label="Capture and check" facingMode="user" onCapture={check} /></div>}
      <div aria-live="polite" style={{ padding: "0 20px 12px" }}>
        {busy && <p className="as-modal-note">Checking…</p>}
        {message && <p className="as-modal-note">{message}</p>}
      </div>
    </>
  );
}

function AttendanceSessionPage() {
  // /attendance/class-<classroom id>_<YYYY-MM-DD> (from the dashboard) names the class and day;
  // plain /attendance uses the selected class and today.
  const { sessionId: routeSessionId } = useParams();
  const { classrooms, classroom: selectedClassroom, selectClassroom, loading: classesLoading } = useClassroom();
  const { scheduleList } = useSchedule();
  const route = parseSessionId(routeSessionId);
  const routeClassroomId = /^class-(\d+)$/.test(route.classId || "") ? Number(route.classId.slice(6)) : null;
  const routeClassroom = routeClassroomId ? classrooms.find((c) => c.id === routeClassroomId) || null : null;
  const classNotFound = Boolean(routeSessionId) && !routeClassroom && !classesLoading && classrooms.length > 0;
  const classroom = routeSessionId ? routeClassroom : selectedClassroom;
  const classroomId = classroom?.id;
  useEffect(() => {
    if (routeClassroom) selectClassroom(routeClassroom.id);
  }, [routeClassroom, selectClassroom]);
  const routeDate = isValidDateKey(route.dateKey) && route.dateKey <= todayKey() ? route.dateKey : null;
  // Fixed while this class is open: a re-render after midnight must not reload and wipe unsaved marks.
  const date = useMemo(() => routeDate || todayKey(), [classroomId, routeDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const data = useAttendanceSession(classroomId, date);
  const { state, dispatch } = data;

  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState("");
  const [undoStudent, setUndoStudent] = useState(null);
  const [retakeRow, setRetakeRow] = useState(null);
  const visible = state.list;
  const review = visible.filter((r) => r.st === "u");
  const absent = visible.filter((r) => r.st === "a");
  const focus = visible.find((r) => r.j === state.focus && r.st === "u") || null;
  const ready = review.length === 0;
  const modalRef = useDialogA11y(Boolean(modal || retakeRow), () => { setModal(null); setRetakeRow(null); });
  const announce = (message) => {
    setToast(message);
    window.clearTimeout(announce.timer);
    announce.timer = window.setTimeout(() => setToast(""), 2800);
  };

  const lecture = scheduleList.find((c) => c.id === `class-${classroomId}`);
  const lectureIdx = scheduleList.findIndex((c) => c.id === `class-${classroomId}`);
  const next = lectureIdx >= 0 ? scheduleList[lectureIdx + 1] || null : null;
  const meta = {
    name: classroom?.course || "Attendance",
    code: classroom?.course_code || "",
    group: classroom?.section || "",
    type: "Class",
    timeRange: lecture?.timeRange || "",
    venue: lecture?.room || "",
  };
  const dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

  const resolve = (row, method, conf) => {
    dispatch({ type: "resolve", j: row.j, method, conf });
    announce(`${row.name} marked present`);
  };
  const keepAbsent = (row) => {
    dispatch({ type: "keepAbsent", j: row.j });
    announce(`${row.name} marked absent`);
  };
  const save = async () => {
    const ok = await data.save();
    setModal(null);
    if (ok) announce(`Attendance saved for ${meta.group}`);
  };
  const openUndo = (j) => { setUndoStudent(visible.find((r) => r.j === j)); setModal("undo"); };
  const confirmUndo = () => {
    if (!undoStudent) return;
    dispatch({ type: "undo", j: undoStudent.j });
    setModal(null);
    announce(`${undoStudent.name} moved back to Needs review`);
  };
  const counts = { p: visible.filter((r) => r.st === "p").length, u: review.length, a: absent.length };

  let body;
  if (!routeSessionId && classesLoading) body = <p className="as-modal-note">Loading classes…</p>;
  else if (classNotFound) body = <p className="as-modal-note" role="alert">That class was not found among your classes.</p>;
  else if (!classroom) body = <p className="as-modal-note">No class to take attendance for. An admin creates classes and lecture times under Admin.</p>;
  else if (data.loadError) {
    body = (
      <div role="alert">
        <p className="as-modal-note">{data.loadError}</p>
        <button type="button" className="as-b1" onClick={data.reload}>Try again</button>
      </div>
    );
  } else if (data.loading) body = <p className="as-modal-note">Loading the class roster…</p>;
  else if (visible.length === 0) body = <p className="as-modal-note">This class has no students yet. An admin adds them under Admin.</p>;

  return (
    <TeacherShell active="attendance" liveBadge rootClassName="attendance-session-shell">
      <main className="attendance-session-content" id="va">
        <div className="atopg">
          <SessionHeader state={state.saved ? "saved" : ready ? "ready" : "review"} session={meta} />
          <div style={{ margin: "0 0 12px", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {!routeSessionId && <ClassPicker />}
            <Link to="/verify" className="as-b1">Check one student</Link>
          </div>
          {body ? <div style={{ padding: "12px 0" }}>{body}</div> : (
            <div className="acols">
              <div className="acol c1">
                <SessionSummary list={visible} saved={state.saved} savedAt={state.savedAt} dateLabel={dateLabel} saving={data.saving} onSave={() => setModal("save")} onEdit={() => { dispatch({ type: "edit" }); announce("Record unlocked for editing"); }} onReset={data.reload} />
                <ReviewLane rows={review} focus={state.focus} resolved={state.u0 - review.length} total={state.u0} onSelect={(j) => dispatch({ type: "select", j })} />
              </div>
              <div className="acol c2">
                <ResolveCard row={focus} left={review.length} reviewRows={review} onSelectStudent={(j) => dispatch({ type: "select", j })} saved={state.saved} labOffset={state.labOffset} onLabs={(offset) => dispatch({ type: "labs", offset })} onResolve={resolve} onKeepAbsent={keepAbsent} onRetake={setRetakeRow} overall={state.overall} labDates={state.labDates} group={meta.group} />
                <AbsentLane rows={absent} saved={state.saved} onUndo={openUndo} />
              </div>
              <div className="acol c3">
                <ClassPhotoCard scanning={data.scanning} error={data.scanError} notice={data.notice} unrecognized={data.unrecognized} onScan={data.scan} />
                <UpNextCard next={next} to={next ? `/attendance/${makeSessionId(next.id, date)}` : "/dashboard"} />
              </div>
            </div>
          )}
          {data.saveError && <p className="as-modal-note" role="alert">{data.saveError}</p>}
        </div>
      </main>
      {modal === "save" && <Modal title={`Save attendance for ${meta.group}?`} subtitle={`${meta.name} · ${dateLabel}`} onClose={() => setModal(null)} dialogRef={modalRef}>
        <div className="as-modal-stats"><div><b>{counts.p}</b><span>Present</span></div><div><b>{counts.a + counts.u}</b><span>Absent</span></div><div><b>{visible.length}</b><span>Enrolled</span></div></div>
        {counts.u > 0 && <p className="as-modal-note">{counts.u} {counts.u === 1 ? "student is" : "students are"} still unreviewed and will be saved as absent.</p>}
        <footer className="as-modal-actions"><button type="button" className="as-b1" onClick={() => setModal(null)}>Keep reviewing</button><button type="button" className="as-pbtn" disabled={data.saving} onClick={save}><Check size={15} />{data.saving ? "Saving…" : "Save record"}</button></footer>
      </Modal>}
      {modal === "undo" && undoStudent && <Modal title={`Undo absent for ${undoStudent.name}?`} subtitle={`${undoStudent.roll} moves back to Needs review so you can confirm them again.`} onClose={() => setModal(null)} dialogRef={modalRef}>
        <footer className="as-modal-actions"><button type="button" className="as-b1" onClick={() => setModal(null)}>Cancel</button><button type="button" className="as-pbtn" onClick={confirmUndo}>Yes, undo</button></footer>
      </Modal>}
      {retakeRow && <Modal title={`Check ${retakeRow.name} by photo`} subtitle={retakeRow.roll} onClose={() => setRetakeRow(null)} dialogRef={modalRef}>
        <RetakeBody classroomId={classroomId} row={retakeRow} onMatched={(row, conf) => { setRetakeRow(null); resolve(row, "ai", conf); }} />
      </Modal>}
      <div className={`as-toast ${toast ? "on" : ""}`} role="status" aria-live="polite"><CircleAlert size={16} />{toast}</div>
    </TeacherShell>
  );
}

export default AttendanceSessionPage;
