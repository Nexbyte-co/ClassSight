// src/pages/AttendanceSession/index.jsx — take attendance for one class on one day, on the real API.
// /attendance/class-<classroom id>_<YYYY-MM-DD> (from the dashboard) names the class and day;
// plain /attendance uses the selected class and today.
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, Check, CircleAlert, X } from "lucide-react";
import TeacherShell from "../../components/navigation/TeacherShell";
import ClassPicker from "../../components/ClassPicker";
import { useDialogA11y } from "../../hooks/useDialogA11y";
import { useClassroom } from "../../context/ClassroomContext";
import { useSchedule } from "../../context/schedule/ScheduleContext";
import { getLocalDateKey, isValidDateKey, parseSessionId } from "../../context/schedule/scheduleStatus";
import { useAttendanceSession } from "./useAttendanceSession";
import SessionHeader from "./SessionHeader";
import SessionSummary from "./SessionSummary";
import ClassPhotoCard from "./ClassPhotoCard";
import ReviewLane from "./ReviewLane";
import PresentLane from "./PresentLane";
import ResolveCard from "./ResolveCard";
import AbsentLane from "./AbsentLane";
import StudentPhotos from "./FaceCheckCard";
import SessionActions from "./SessionActions";
import LaneWindow from "./LaneWindow";
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

function Notice({ children, tone = "ne" }) {
  return (
    <div className={`as-card as-notice ${tone} db-rise`} role="status">
      {children}
    </div>
  );
}

function AttendanceSessionPage() {
  const { sessionId: routeSessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { classrooms, classroom: selectedClassroom, selectClassroom, loading: classesLoading, error: classesError } = useClassroom();
  const { scheduleList, todayKey } = useSchedule();

  const route = parseSessionId(routeSessionId);
  const routeClassroomId = /^class-(\d+)$/.test(route.classId || "") ? Number(route.classId.slice(6)) : null;
  const routeClassroom = routeClassroomId ? classrooms.find((c) => c.id === routeClassroomId) || null : null;
  const classNotFound = Boolean(routeSessionId) && !routeClassroom && !classesLoading && classrooms.length > 0;
  const classroom = routeSessionId ? routeClassroom : selectedClassroom;
  const classroomId = classroom?.id;
  // Keep the other pages (Students) on the class that was opened from the dashboard
  useEffect(() => {
    if (routeClassroom) selectClassroom(routeClassroom.id);
  }, [routeClassroom, selectClassroom]);
  const routeDate = isValidDateKey(route.dateKey) && route.dateKey <= getLocalDateKey() ? route.dateKey : null;
  // Fixed while this class is open: a re-render after midnight must not reload and wipe unsaved marks.
  const date = useMemo(() => routeDate || getLocalDateKey(), [classroomId, routeDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const s = useAttendanceSession(classroomId, date);

  // Today's lecture slot for this class, and what follows it
  const lecture = classroom ? scheduleList.find((item) => item.id === `class-${classroom.id}`) || null : null;

  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState("");
  const [undoStudent, setUndoStudent] = useState(null);
  const [expanded, setExpanded] = useState(null); // "p" | "a" | "u": which lane is open in a large window
  const modalRef = useDialogA11y(Boolean(modal), () => setModal(null));

  const announce = (message) => {
    setToast(message);
    window.clearTimeout(announce.timer);
    announce.timer = window.setTimeout(() => setToast(""), 2800);
  };

  const rows = s.rows;
  const review = s.review;
  const present = rows.filter((r) => r.st === "p");
  const absent = rows.filter((r) => r.st === "a");
  const excused = rows.filter((r) => r.st === "e");
  const ready = review.length === 0;
  const counts = { p: present.length, u: review.length, a: absent.length };

  const resolve = (row, method, confidence) => {
    s.markPresent(row.j, method, confidence);
    announce(`${row.name} marked present`);
  };
  const keepAbsent = (row) => {
    s.keepAbsent(row.j);
    announce(`${row.name} marked absent`);
  };
  const openUndo = (j) => {
    setUndoStudent(rows.find((r) => r.j === j));
    setModal("undo");
  };
  const confirmUndo = () => {
    if (!undoStudent) return;
    s.undo(undoStudent.j);
    setModal(null);
    announce(`${undoStudent.name} moved back to Needs review`);
  };
  const save = async () => {
    setModal(null);
    if (await s.save()) announce(`Attendance saved for ${classroom.section}`);
  };
  const scan = async (file) => {
    const matched = await s.scanClassPhoto(file);
    if (matched != null) announce(`${matched} student${matched === 1 ? "" : "s"} recognised from the class photo`);
  };

  // Cards tapped on the dashboard arrive as student ids: mark them present once the roster has loaded
  const handedOver = location.state?.nfcStudentIds;
  useEffect(() => {
    if (!handedOver?.length || s.loading || s.rows.length === 0) return;
    const fresh = handedOver.filter((id) => s.rows.some((r) => r.j === id && r.st !== "p"));
    fresh.forEach((id) => s.markPresent(id, "nfc"));
    navigate(location.pathname, { replace: true, state: null });
    announce(fresh.length ? `${fresh.length} card tap${fresh.length === 1 ? "" : "s"} added. Review and save.` : "Those students are already present.");
  }, [handedOver, s.loading, s.rows.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const showPicker = !routeSessionId && classrooms.length > 1;

  return (
    <TeacherShell active="attendance" liveBadge={date === todayKey && Boolean(classroom)} rootClassName="attendance-session-shell">
      <main className="attendance-session-content" id="va">
        <div className="atopg">
          <SessionHeader
            classroom={classroom}
            lecture={lecture}
            dateKey={date}
            state={s.saved ? "saved" : ready && rows.length ? "ready" : "review"}
            picker={showPicker && <ClassPicker />}
          />

          {classesError && <Notice tone="er">{classesError}</Notice>}
          {s.loadError && (
            <Notice tone="er">
              {s.loadError}{" "}
              <button type="button" className="as-b1" onClick={s.reload}>Try again</button>
            </Notice>
          )}
          {s.saveError && <Notice tone="er">{s.saveError}</Notice>}

          {classNotFound && (
            <Notice>
              <b>Class not found.</b> This class is not one of yours. Go back to the <Link to="/dashboard">dashboard</Link>.
            </Notice>
          )}
          {!classroom && !classNotFound && !classesLoading && !classesError && (
            <Notice>
              <b>No class yet.</b> An admin creates a class and assigns it to a teacher. It will show up here.
            </Notice>
          )}
          {classroom && s.loading && <Notice>Loading the roster and today&apos;s attendance…</Notice>}
          {classroom && !s.loading && !s.loadError && rows.length === 0 && (
            <Notice>
              <b>No students in this class.</b> The roster is managed by an administrator. Ask an admin to add the students to section {classroom.section}.
            </Notice>
          )}

          {classroom && rows.length > 0 && (
            <div className="acols">
              <div className="acol c1">
                <div className="as-combo">
                <SessionSummary
                  list={rows}
                  excused={excused.length}
                  dateKey={date}
                  lecture={lecture}
                />
                <ClassPhotoCard
                  scanning={s.scanning}
                  scanError={s.scanError}
                  scannedAt={s.scannedAt}
                  unrecognizedFaces={s.unrecognizedFaces}
                  locked={s.locked}
                  onPhoto={scan}
                  nfc={{ classroomId: classroom.id, rows, saved: s.saved, onPresent: (row) => resolve(row, "nfc") }}
                />
                </div>
                <PresentLane rows={present} saved={s.saved} locked={s.locked} onUndo={openUndo} onExpand={() => setExpanded("p")} />
              </div>
              <div className="acol c2">
                <ReviewLane rows={review} focus={s.focus?.j ?? null} resolved={rows.length - excused.length - review.length} total={rows.length - excused.length} onSelect={s.setFocus} onExpand={() => setExpanded("u")} />
                <AbsentLane rows={absent} saved={s.saved} locked={s.locked} onUndo={openUndo} onExpand={() => setExpanded("a")} />
              </div>
              <div className="acol c3">
                <ResolveCard
                  row={s.focus}
                  left={review.length}
                  reviewRows={review}
                  history={s.focus ? s.history[s.focus.j] || [] : []}
                  section={classroom.section}
                  onSelectStudent={s.setFocus}
                  saved={s.saved}
                  locked={s.locked}
                  onResolve={resolve}
                  onKeepAbsent={keepAbsent}
                  photos={
                    s.focus && (
                      <StudentPhotos
                        key={s.focus.j}
                        row={s.focus}
                        classroomId={classroom.id}
                        saved={s.saved}
                        locked={s.locked}
                        onYes={(row, confidence) => resolve(row, "ai", confidence)}
                      />
                    )
                  }
                />
                <SessionActions
                  saved={s.saved}
                  savedAt={s.savedAt}
                  saving={s.saving}
                  locked={s.locked}
                  hint={counts.u ? `Resolve the ${counts.u} student${counts.u > 1 ? "s" : ""} the photo couldn’t match. Anyone left unreviewed is saved as absent.` : "Everyone is accounted for. Save the record to finish."}
                  onCancel={() => navigate("/dashboard")}
                  onEdit={() => {
                    s.edit();
                    announce("Record unlocked for editing");
                  }}
                  onSave={() => (review.length > 0 ? setModal("save") : save())}
                />
              </div>
            </div>
          )}
        </div>
      </main>

      {modal === "save" && classroom && (
        <Modal title={`Save attendance for ${classroom.section}?`} subtitle={`${classroom.course} · ${date}`} onClose={() => setModal(null)} dialogRef={modalRef}>
          <div className="as-modal-stats">
            <div><b>{counts.p}</b><span>Present</span></div>
            <div><b>{counts.a + counts.u}</b><span>Absent</span></div>
            <div><b>{rows.length}</b><span>Enrolled</span></div>
          </div>
          {counts.u > 0 && (
            <p className="as-modal-note">
              {counts.u} {counts.u === 1 ? "student is" : "students are"} still unreviewed and will be saved as absent.
            </p>
          )}
          <footer className="as-modal-actions">
            <button type="button" className="as-b1" onClick={() => setModal(null)}>Keep reviewing</button>
            <button type="button" className="as-pbtn" onClick={save}><Check size={15} />Save record</button>
          </footer>
        </Modal>
      )}
      {expanded && (
        <LaneWindow
          kind={expanded}
          rows={expanded === "p" ? present : expanded === "a" ? absent : review}
          saved={s.saved}
          locked={s.locked}
          onUndo={(j) => {
            const r = rows.find((x) => x.j === j);
            if (s.saved) s.edit(); // reopen a saved record, then change it
            s.undo(j);
            announce(`${r?.name ?? "Student"} moved back to Needs review`);
          }}
          onUndoAll={(ids) => {
            if (s.saved) s.edit();
            ids.forEach((j) => s.undo(j));
            announce(`${ids.length} student${ids.length === 1 ? "" : "s"} moved back to Needs review`);
          }}
          onSelect={(j) => {
            s.setFocus(j);
            setExpanded(null);
          }}
          onClose={() => setExpanded(null)}
        />
      )}
      {modal === "undo" && undoStudent && (
        <Modal title={`Undo mark for ${undoStudent.name}?`} subtitle={`${undoStudent.roll} moves back to Needs review so you can confirm them again.`} onClose={() => setModal(null)} dialogRef={modalRef}>
          <footer className="as-modal-actions">
            <button type="button" className="as-b1" onClick={() => setModal(null)}>Cancel</button>
            <button type="button" className="as-pbtn" onClick={confirmUndo}>Yes, undo</button>
          </footer>
        </Modal>
      )}
      <div className={`as-toast ${toast ? "on" : ""}`} role="status" aria-live="polite"><CircleAlert size={16} />{toast}</div>
    </TeacherShell>
  );
}

export default AttendanceSessionPage;
