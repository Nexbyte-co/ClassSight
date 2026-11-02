import { useState } from "react";
import { AlertTriangle, Check, CircleAlert, X } from "lucide-react";
import TeacherShell from "../../components/navigation/TeacherShell";
import { useDialogA11y } from "../../hooks/useDialogA11y";
import { useAttendanceSession } from "./useAttendanceSession";
import { SESSION } from "./attendanceMock";
import SessionHeader from "./SessionHeader";
import SessionSummary from "./SessionSummary";
import ReviewLane from "./ReviewLane";
import ResolveCard from "./ResolveCard";
import AbsentLane from "./AbsentLane";
import FaceCheckCard from "./FaceCheckCard";
import UpNextCard from "./UpNextCard";
import "./attendanceSession.css";

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

function AttendanceSessionPage() {
  const [state, dispatch] = useAttendanceSession();
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState("");
  const [undoStudent, setUndoStudent] = useState(null);
  const visible = state.list;
  const review = visible.filter((r) => r.st === "u");
  const absent = visible.filter((r) => r.st === "a");
  const focus = visible.find((r) => r.j === state.focus && r.st === "u") || null;
  const ready = review.length === 0;
  const modalRef = useDialogA11y(Boolean(modal), () => setModal(null));
  const announce = (message) => {
    setToast(message);
    window.clearTimeout(announce.timer);
    announce.timer = window.setTimeout(() => setToast(""), 2800);
  };
  const resolve = (row, method) => {
    dispatch({ type: "resolve", j: row.j, method });
    announce(`${row.name} marked present`);
  };
  const keepAbsent = (row) => {
    dispatch({ type: "keepAbsent", j: row.j });
    announce(`${row.name} marked absent`);
  };
  const save = () => {
    dispatch({ type: "save", at: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) });
    setModal(null);
    announce("Attendance saved for 3C2C");
  };
  const openUndo = (j) => { setUndoStudent(visible.find((r) => r.j === j)); setModal("undo"); };
  const confirmUndo = () => {
    if (!undoStudent) return;
    dispatch({ type: "undo", j: undoStudent.j });
    setModal(null);
    announce(`${undoStudent.name} moved back to Needs review`);
  };
  const saveDialog = () => setModal("save");
  const counts = { p: visible.filter((r) => r.st === "p").length, u: review.length, a: absent.length };

  return (
    <TeacherShell active="attendance" liveBadge rootClassName="attendance-session-shell">
      <main className="attendance-session-content" id="va">
        <div className="atopg">
          <SessionHeader state={state.saved ? "saved" : ready ? "ready" : "review"} />
          <div className="acols">
            <div className="acol c1">
              <SessionSummary list={visible} saved={state.saved} savedAt={state.savedAt} onSave={saveDialog} onEdit={() => { dispatch({ type: "edit" }); announce("Record unlocked for editing"); }} onReset={() => { dispatch({ type: "reset" }); setModal(null); announce("Demo session reset"); }} />
              <ReviewLane rows={review} focus={state.focus} resolved={state.u0 - review.length} total={state.u0} onSelect={(j) => dispatch({ type: "select", j })} />
            </div>
            <div className="acol c2">
              <ResolveCard row={focus} left={review.length} reviewRows={review} onSelectStudent={(j) => dispatch({ type: "select", j })} saved={state.saved} labOffset={state.labOffset} onLabs={(offset) => dispatch({ type: "labs", offset })} onResolve={resolve} onKeepAbsent={keepAbsent} />
              <AbsentLane rows={absent} saved={state.saved} onUndo={openUndo} />
            </div>
            <div className="acol c3">
              <FaceCheckCard row={focus} saved={state.saved} onConfirm={(row) => { dispatch({ type: "faceConfirm", j: row.j }); announce(`${row.name} confirmed by face check`); }} onReject={(row) => { dispatch({ type: "faceReject", j: row.j }); announce("Face check rejected"); }} />
              <UpNextCard onStartEarly={() => announce("Next lab (2Q3B) can be started after you save this one")} />
            </div>
          </div>
        </div>
      </main>
      {modal === "save" && <Modal title="Save attendance for 3C2C?" subtitle={`${SESSION.name} · ${SESSION.start}`} onClose={() => setModal(null)} dialogRef={modalRef}>
        <div className="as-modal-stats"><div><b>{counts.p}</b><span>Present</span></div><div><b>{counts.a + counts.u}</b><span>Absent</span></div><div><b>{visible.length}</b><span>Enrolled</span></div></div>
        {counts.u > 0 && <p className="as-modal-note">{counts.u} {counts.u === 1 ? "student is" : "students are"} still unreviewed and will be saved as absent.</p>}
        <footer className="as-modal-actions"><button type="button" className="as-b1" onClick={() => setModal(null)}>Keep reviewing</button><button type="button" className="as-pbtn" onClick={save}><Check size={15} />Save record</button></footer>
      </Modal>}
      {modal === "undo" && undoStudent && <Modal title={`Undo absent for ${undoStudent.name}?`} subtitle={`${undoStudent.roll} moves back to Needs review so you can confirm them again.`} onClose={() => setModal(null)} dialogRef={modalRef}>
        <footer className="as-modal-actions"><button type="button" className="as-b1" onClick={() => setModal(null)}>Cancel</button><button type="button" className="as-pbtn" onClick={confirmUndo}>Yes, undo</button></footer>
      </Modal>}
      <div className={`as-toast ${toast ? "on" : ""}`} role="status" aria-live="polite"><CircleAlert size={16} />{toast}</div>
    </TeacherShell>
  );
}

export default AttendanceSessionPage;
