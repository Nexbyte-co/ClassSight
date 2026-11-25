import { useState, useRef, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Camera,
  X,
  Download,
  Smartphone,
  Nfc,
  Check,
} from "lucide-react";
import "../../styles/Dashboard.css";
import { useAuth } from "../../context/AuthContext";
import { useTodayAttendance } from "../../hooks/useTodayAttendance";
import { useSettings } from "../../context/settings/SettingsContext";
import { useSchedule } from "../../context/schedule/ScheduleContext";
import {
  computeScheduleStatuses,
  getActiveClass,
  getScheduleNow,
  makeSessionId,
  parseTimeSlotMinutes,
} from "../../context/schedule/scheduleStatus";
import TeacherShell from "../../components/navigation/TeacherShell";
import CountUp from "../../components/motion/CountUp";
import { useDialogA11y } from "../../hooks/useDialogA11y";
import { updateLecture } from "../../api/lectures";
import { nfcTap } from "../../api/attendance";
import { formatUid, nfcSupported, startNfcScan } from "../../lib/webNfc";

// Status tag text in Today's Class Schedule
const STATUS_LABELS = {
  done: "✓ Done",
  active: "Active Now",
  next: "Next Up",
  upcoming: "Scheduled",
  unstarted: "Scheduled",
};



function Dashboard() {
  const navigate = useNavigate();


  // Mark Attendance card tab: "photo" | "nfc"
  const [attendanceTab, setAttendanceTab] = useState("photo");

  // NFC card reader (Web NFC: Chrome on an Android phone). Cards tapped here are collected; "Review & save" hands
  // them to the attendance page, which marks those students present and saves with the rest of the record.
  const [nfcOn, setNfcOn] = useState(false);
  const [nfcError, setNfcError] = useState("");
  const [nfcFlash, setNfcFlash] = useState(false); // "Attendance recorded" for a moment after each card
  const [nfcLast, setNfcLast] = useState(null); // { ok, text } of the latest tap
  const [nfcTaps, setNfcTaps] = useState([]); // students tapped this session: { id, name, roll }
  const nfcStopRef = useRef(null);
  const nfcClassRef = useRef(null); // numeric id of the class the taps belong to
  const nfcFlashTimer = useRef(0);
  useEffect(
    () => () => {
      nfcStopRef.current?.();
      clearTimeout(nfcFlashTimer.current);
    },
    []
  );

  // Schedule list & session tracking live in ScheduleContext so they survive navigation
  const {
    scheduleList,
    setScheduleList,
    scheduleLoading,
    scheduleError,
    reloadSchedule,
    manualActiveClassId,
    setManualActiveClassId,
    endedClassIds,
    setEndedClassIds,
    todayKey,
    fallbackClassId,
  } = useSchedule();
  const { session: authSession } = useAuth();
  // Saved attendance of today's lectures, read from the API
  const { getSummary, error: attendanceError } = useTodayAttendance(
    scheduleList.map((c) => c.id),
    todayKey
  );
  const { defaultLectureMinutes } = useSettings();

  // Dynamic status tracking (Instructions 4 & 5)
  const [currentTimeTick, setCurrentTimeTick] = useState(() => getScheduleNow());

  // Tick timer every 30s to dynamically update time-based status
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeTick(getScheduleNow());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Compute status for all classes based on current time and manual actions (Instructions 4 & 5)
  const finalScheduleList = useMemo(
    () =>
      computeScheduleStatuses(
        scheduleList,
        manualActiveClassId,
        endedClassIds,
        currentTimeTick,
        defaultLectureMinutes
      ),
    [scheduleList, manualActiveClassId, endedClassIds, currentTimeTick, defaultLectureMinutes]
  );

  // Current active class in session (Instruction 4)
  const currentActiveClass = useMemo(
    () => getActiveClass(finalScheduleList, manualActiveClassId),
    [finalScheduleList, manualActiveClassId]
  );

  // Day totals for the schedule card stats
  const daySummary = useMemo(
    () => ({
      total: finalScheduleList.length,
      done: finalScheduleList.filter((c) => c.computedStatus === "done").length,
      active: finalScheduleList.filter((c) => c.computedStatus === "active").length,
      next:
        finalScheduleList.find((c) => c.computedStatus === "next") ||
        finalScheduleList.find((c) => c.computedStatus === "upcoming") ||
        null,
    }),
    [finalScheduleList]
  );

  // Minutes since the active lecture's scheduled start (null before it or if unparseable)
  const activeStartedAgo = useMemo(() => {
    if (!currentActiveClass) return null;
    const slot = parseTimeSlotMinutes(currentActiveClass.timeRange || currentActiveClass.time);
    if (slot?.startMinutes == null) return null;
    const diff = currentTimeTick.getHours() * 60 + currentTimeTick.getMinutes() - slot.startMinutes;
    return diff >= 0 ? diff : null;
  }, [currentActiveClass, currentTimeTick]);

  // The schedule list fills the card's height and scrolls; the caption shows while rows are hidden
  const scheduleListRef = useRef(null);
  const [listOverflows, setListOverflows] = useState(false);
  useEffect(() => {
    const list = scheduleListRef.current;
    if (!list) {
      setListOverflows(false);
      return undefined;
    }
    const measure = () => setListOverflows(list.scrollHeight > list.clientHeight + 2);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [finalScheduleList]);

  // Attendance context (Task 2): Photo Scan & NFC act on today's session of the active
  // class, or of the fallback class when no class is active
  const scanClass =
    currentActiveClass || scheduleList.find((c) => c.id === fallbackClassId) || null;
  const scanSessionId = scanClass ? makeSessionId(scanClass.id, todayKey) : "";
  const scanSummary = getSummary(scanClass?.id);
  const scanMatchRate =
    scanSummary.total > 0 ? `${((scanSummary.recognized / scanSummary.total) * 100).toFixed(1)}%` : "0.0%";
  const scanClassId = scanClass ? Number(String(scanClass.id).replace("class-", "")) || null : null;
  useEffect(() => {
    nfcClassRef.current = scanClassId;
  });
  // Taps belong to one class: when the class in focus changes, stop reading and start a fresh list.
  useEffect(
    () => () => {
      nfcStopRef.current?.();
      nfcStopRef.current = null;
      setNfcOn(false);
      setNfcTaps([]);
      setNfcLast(null);
    },
    [scanClassId]
  );

  // Modal: active session venue (saved to the lecture via the API)
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [sessionFormData, setSessionFormData] = useState({ room: "" });
  const [sessionSaving, setSessionSaving] = useState(false);
  const [sessionError, setSessionError] = useState("");

  // Dynamic greeting based on current hour
  const getGreeting = () => {
    const hour = new Date().getHours();
    const who = authSession?.name ? `, ${authSession.name}` : "";
    if (hour < 12) return `Good morning${who}`;
    if (hour < 17) return `Good afternoon${who}`;
    return `Good evening${who}`;
  };

  const currentDateString = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Downloads today's schedule with per-session attendance counts as CSV
  const handleExportLedger = () => {
    const header = ["Time", "Course", "Code", "Batch", "Venue", "Status", "Present", "Pending", "Absent", "Saved"];
    const rows = finalScheduleList.map((item) => {
      const summary = getSummary(item.id);
      return [
        item.timeRange || item.time,
        item.title,
        item.code,
        item.section,
        item.room,
        item.computedStatus,
        summary.present,
        summary.unresolved,
        summary.absent,
        summary.isSaved ? "Yes" : "No",
      ];
    });
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `classsight-ledger-${todayKey}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // A card was tapped: find the student it belongs to in this class and keep them in the list.
  const handleNfcCard = async (uid) => {
    const classId = nfcClassRef.current;
    if (!classId) return;
    try {
      const hit = await nfcTap(classId, uid);
      setNfcTaps((list) => (list.some((t) => t.id === hit.student_id) ? list : [...list, { id: hit.student_id, name: hit.name, roll: hit.roll_number }]));
      setNfcLast({ ok: true, text: `${hit.name} · ${hit.roll_number}` });
      setNfcFlash(true);
      clearTimeout(nfcFlashTimer.current);
      nfcFlashTimer.current = setTimeout(() => setNfcFlash(false), 2200);
      navigator.vibrate?.(60);
    } catch (err) {
      setNfcLast({ ok: false, text: err.status === 404 ? `Card ${formatUid(uid)} isn't linked to a student` : err.message || "Couldn't check that card" });
      navigator.vibrate?.([40, 60, 40]);
    }
  };

  const toggleNfc = async () => {
    if (nfcOn) {
      nfcStopRef.current?.();
      nfcStopRef.current = null;
      setNfcOn(false);
      return;
    }
    setNfcError("");
    try {
      nfcStopRef.current = await startNfcScan({
        onCard: handleNfcCard,
        onError: (text) => setNfcLast({ ok: false, text }),
      });
      setNfcOn(true);
    } catch (err) {
      setNfcError(err.message);
    }
  };

  const reviewNfcTaps = () => {
    nfcStopRef.current?.();
    nfcStopRef.current = null;
    setNfcOn(false);
    navigate(`/attendance/${scanSessionId}`, { state: { nfcStudentIds: nfcTaps.map((t) => t.id) } });
  };

  // Active session: set the venue of the running lecture
  const handleOpenSessionEdit = () => {
    if (!currentActiveClass) return;
    setSessionFormData({ room: currentActiveClass.room || "" });
    setSessionError("");
    setIsSessionModalOpen(true);
  };

  const handleSaveSession = async (e) => {
    e.preventDefault();
    if (!currentActiveClass?.lectureId) return;
    setSessionSaving(true);
    setSessionError("");
    try {
      const room = sessionFormData.room.trim();
      await updateLecture(currentActiveClass.classroomId, currentActiveClass.lectureId, { room });
      setScheduleList((prev) => prev.map((c) => (c.lectureId === currentActiveClass.lectureId ? { ...c, room } : c)));
      setIsSessionModalOpen(false);
    } catch (err) {
      setSessionError(err.message || "Could not save the venue.");
    } finally {
      setSessionSaving(false);
    }
  };

  // Start & End Class Handlers (Instruction 4)
  const handleStartClass = (id) => {
    setManualActiveClassId(id);
    setEndedClassIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleEndClass = (id) => {
    setEndedClassIds((prev) => new Set(prev).add(id));
    if (manualActiveClassId === id) {
      setManualActiveClassId(null);
    }
  };

  // Accessible modal behaviour (focus in, Tab trapped, Escape closes, focus returned)
  const sessionDialogRef = useDialogA11y(isSessionModalOpen, () => setIsSessionModalOpen(false));

  return (
    <TeacherShell
      active="dashboard"
      dateLabel={currentDateString}
      liveBadge={Boolean(currentActiveClass)}
      overlays={(
        <>
      {/* ================= MODAL: EDIT ACTIVE SESSION ================= */}
      {isSessionModalOpen && (
        <div className="cs-modal-backdrop" onClick={() => setIsSessionModalOpen(false)}>
          <div className="cs-modal-card" ref={sessionDialogRef} role="dialog" aria-modal="true" tabIndex={-1} aria-label="Edit active session" onClick={(e) => e.stopPropagation()}>
            <div className="cs-modal-header">
              <div>
                <h3>Active session</h3>
                <p>Set the venue for this lecture. It is saved to your timetable.</p>
              </div>
              <button
                type="button"
                className="cs-modal-close"
                onClick={() => setIsSessionModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSaveSession} className="cs-modal-form">
              <dl className="db-sess-facts">
                <div><dt>Course</dt><dd>{currentActiveClass?.title}{currentActiveClass?.code ? ` · ${currentActiveClass.code}` : ""}</dd></div>
                <div><dt>Batch</dt><dd>{currentActiveClass?.section || "—"}</dd></div>
                <div><dt>Time</dt><dd>{currentActiveClass?.timeRange || "—"}</dd></div>
              </dl>
              <div className="cs-form-group">
                <label htmlFor="session-room">Venue / Room</label>
                <input
                  id="session-room"
                  type="text"
                  maxLength={40}
                  placeholder="e.g. LP402"
                  value={sessionFormData.room}
                  onChange={(e) => setSessionFormData({ room: e.target.value })}
                />
              </div>
              {sessionError && <p className="db-sess-err" role="alert">{sessionError}</p>}
              <p className="db-sm db-sess-note">
                Course, batch or time wrong? <Link to="/settings?tab=requests">Send a request to the admin</Link>.
              </p>

              <div className="cs-modal-actions">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setIsSessionModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-modal-submit" disabled={sessionSaving}>
                  {sessionSaving ? "Saving…" : "Save venue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

        </>
      )}
    >
        <main className="db-main db-dash">
          <div className="db-cols">
            <div className="db-lcol">
              <div className="db-hd db-rise">
                <div>
                  <h1>{getGreeting()}</h1>
                  <p className="db-sm db-lead">
                    Ready to verify today&apos;s lectures, monitor biometric check-ins, and synchronize attendance.
                  </p>
                </div>
              </div>

              {/* Active session banner (Instruction 4); the details open the session editor */}
              <section className="db-card db-banner db-asn db-rise" style={{ animationDelay: "80ms" }}>
                {currentActiveClass ? (
                  <>
                    <div className="db-row db-wrap">
                      <span className="db-badge">
                        <span className="db-pulse" />
                        ACTIVE SESSION NOW
                      </span>
                      {activeStartedAgo !== null && (
                        <span className="db-sm db-ago">Lecture Started {activeStartedAgo}m ago</span>
                      )}
                    </div>
                    <button type="button" className="db-col" onClick={handleOpenSessionEdit} title="Set the venue">
                      <div className="db-course">{currentActiveClass.title}</div>
                      {currentActiveClass.code && <div className="db-code">{currentActiveClass.code}</div>}
                    </button>
                    <div className="db-g3">
                      <button type="button" className="db-col" onClick={handleOpenSessionEdit} title="Set the venue">
                        <div className="db-k">Batch / Section</div>
                        <div className="db-v">{currentActiveClass.section}</div>
                        {(currentActiveClass.department || authSession?.department) && <div className="db-g3-sub">{currentActiveClass.department || authSession.department}</div>}
                      </button>
                      <button type="button" className="db-col" onClick={handleOpenSessionEdit} title="Set the venue">
                        <div className="db-k">Venue</div>
                        <div className="db-v">{currentActiveClass.room || "Not set"}</div>
                      </button>
                      <button type="button" className="db-col" onClick={handleOpenSessionEdit} title="Set the venue">
                        <div className="db-k">Time</div>
                        <div className="db-v db-v-time">{currentActiveClass.timeRange}</div>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="db-row db-wrap">
                      <span className="db-badge db-badge-idle">
                        <span className="db-dot-idle" />
                        NO ACTIVE SESSION
                      </span>
                    </div>
                    <p className="db-sm db-idle-text">
                      No lecture is in progress. Start one from Today&apos;s Class Schedule to begin live attendance.
                    </p>
                  </>
                )}
              </section>

              {/* ================= MARK ATTENDANCE ================= */}
              <section className="db-card db-pad db-bur db-rise" style={{ animationDelay: "160ms" }}>
                <div className="db-row db-between">
                  <div>
                    <h2>Mark Attendance</h2>
                    <p className="db-sm">Biometric facial AI or contactless card scans</p>
                  </div>
                  <span className="db-ok2">
                    <i />
                    System Ready
                  </span>
                </div>

                <div className="db-tabs" role="tablist" aria-label="Attendance method">
                  <span className={`db-tpill ${attendanceTab === "nfc" ? "right" : ""}`} aria-hidden="true" />
                  <button
                    type="button"
                    role="tab"
                    aria-selected={attendanceTab === "photo"}
                    className={attendanceTab === "photo" ? "on" : ""}
                    onClick={() => setAttendanceTab("photo")}
                  >
                    <Camera size={16} strokeWidth={2} />
                    AI Photo Scan
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={attendanceTab === "nfc"}
                    className={attendanceTab === "nfc" ? "on" : ""}
                    onClick={() => setAttendanceTab("nfc")}
                  >
                    <Smartphone size={16} strokeWidth={2} />
                    NFC Library Card
                  </button>
                </div>

                <div className="db-pw">
                  {/* AI photo scan */}
                  <div
                    className={`db-pn db-pn-photo ${attendanceTab === "photo" ? "" : "off"}`}
                    role="tabpanel"
                    aria-hidden={attendanceTab !== "photo"}
                  >
                    <div className="db-drop">
                      <div className="db-emb db-seq" aria-hidden="true">
                        <i className="db-cn a" />
                        <i className="db-cn b" />
                        <i className="db-cn d" />
                        <i className="db-cn e" />
                        <Camera className="db-cam" size={28} strokeWidth={1.8} />
                        <Check className="db-tick" size={30} strokeWidth={2.4} />
                      </div>
                      <h3>Upload Classroom Photo to Mark Attendance</h3>
                      <p className="db-sm db-drop-text">
                        Take or upload a panoramic photo of the lecture hall. Neural network instantly matches
                        student face embeddings.
                      </p>
                      <button
                        type="button"
                        className="db-bm db-bm-lg"
                        onClick={() => navigate(scanSessionId ? `/attendance/${scanSessionId}` : "/attendance")}
                      >
                        Upload Classroom Photo
                      </button>
                      <div className="db-sm db-drop-meta">
                        Supports JPG, PNG up to 20MB • Wide panoramic angle recommended
                      </div>
                    </div>

                    <div className="db-scan">
                      <div className="db-row">
                        <div className="db-chk">✓</div>
                        <div>
                          <div className="db-scan-title">
                            Last Batch Scan: {scanClass ? scanClass.section : "—"} ({scanClass?.time || "—"})
                          </div>
                          <div className="db-sm">
                            {scanSummary.isSaved
                              ? `${scanSummary.recognized} faces recognized • ${scanMatchRate} match rate`
                              : attendanceError || "No attendance saved yet today"}
                          </div>
                        </div>
                      </div>
                      {scanSessionId && (
                        <Link to={`/attendance/${scanSessionId}`} className="db-link">
                          Log
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* NFC library card */}
                  <div
                    className={`db-pn db-pn-nfc ${attendanceTab === "nfc" ? "" : "off"}`}
                    role="tabpanel"
                    aria-hidden={attendanceTab !== "nfc"}
                  >
                    <div className="db-drop">
                      <div className={`db-emb ${nfcOn && !nfcFlash ? "db-wait" : ""}`} aria-hidden="true">
                        <Nfc size={28} strokeWidth={1.8} />
                      </div>
                      <h3>Tap Library Card to Mark Attendance</h3>
                      <p className="db-sm db-drop-text">
                        Press Start, then ask each student to hold their library card against the back of this phone.
                        Scan one student at a time.
                      </p>
                      <div className={`db-nst ${nfcFlash ? "rec" : ""}`} aria-live="polite">
                        <i />
                        <span>
                          {!nfcSupported()
                            ? "Open this page in Chrome on an Android phone"
                            : !scanClass
                            ? "No class to take attendance for yet"
                            : nfcFlash
                            ? "Card read"
                            : nfcOn
                            ? "Reader ready · waiting for a card"
                            : "Reader stopped · press Start"}
                        </span>
                      </div>
                      {nfcError && <div className="db-sm" role="alert">{nfcError}</div>}
                      <div className="db-sm db-drop-meta">
                        {scanClass ? `For ${scanClass.title} · ${scanClass.section}` : "Attendance is recorded for the ongoing lecture"}
                      </div>
                    </div>

                    {/* Keyed by the count so the pop/flash animation replays on every recorded card */}
                    <div key={nfcTaps.length} className={`db-scan ${nfcTaps.length > 0 ? "db-flash" : ""}`}>
                      <div className="db-row">
                        <div className={`db-chk ${nfcLast?.ok ? "db-pop" : "idle"}`}>{nfcLast ? (nfcLast.ok ? "✓" : "!") : "–"}</div>
                        <div>
                          <div className="db-scan-title">{nfcLast ? nfcLast.text : "No card scanned yet"}</div>
                          <div className="db-sm">Cards read this session: {nfcTaps.length}</div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="db-b1 db-b1-wide"
                      onClick={toggleNfc}
                      disabled={!nfcSupported() || !scanClass}
                    >
                      <span className="db-green-dot" />
                      {nfcOn ? "Stop reading cards" : "Start reading cards"}
                    </button>
                    {nfcTaps.length > 0 && (
                      <button type="button" className="db-bm db-bm-lg" onClick={reviewNfcTaps} disabled={!scanSessionId}>
                        Review &amp; save ({nfcTaps.length} {nfcTaps.length === 1 ? "student" : "students"})
                      </button>
                    )}
                  </div>
                </div>
              </section>
            </div>

            {/* ================= SCHEDULE OVERVIEW + TODAY'S LECTURES ================= */}
            <div className="db-rcol">
            <section className="db-card db-pad db-bur db-ovw db-rise" style={{ animationDelay: "240ms" }}>
              <div className="db-shd">
                <div>
                  <h2>Schedule Overview</h2>
                  <p className="db-sm">Monitor daily progression, attendance rates, and manage class details.</p>
                </div>
                <button type="button" className="db-btn" onClick={handleExportLedger}>
                  <Download size={14} strokeWidth={2} />
                  Export Daily Ledger
                </button>
              </div>

              <div className="db-stats">
                <div className="db-stat">
                  <div className="db-k">Today&apos;s Total</div>
                  <div className="db-big">
                    <CountUp value={daySummary.total} /> Lectures
                  </div>
                  <div className="db-sm">Scheduled today</div>
                </div>
                <div className="db-stat">
                  <div className="db-k">Next Lecture</div>
                  {daySummary.next ? (
                    <>
                      <div className="db-nl-name">
                        {daySummary.next.title}
                        {daySummary.next.code && <span>{daySummary.next.code}</span>}
                      </div>
                      <div className="db-sm">{daySummary.next.time}</div>
                      <div className="db-sm">{daySummary.next.room}</div>
                    </>
                  ) : (
                    <div className="db-nl-name">No upcoming lectures</div>
                  )}
                </div>
                <div className="db-stat">
                  <div className="db-k">Completed</div>
                  <div className="db-big">
                    <CountUp value={daySummary.done} /> of <CountUp value={daySummary.total} />
                  </div>
                  <div className="db-sm">
                    <CountUp value={daySummary.active} /> Currently in-session
                  </div>
                </div>
              </div>

            </section>

            <section className="db-card db-pad db-bur db-sched db-rise" style={{ animationDelay: "320ms" }}>
              <div className="db-shd db-lh">
                <div>
                  <h2>Today&apos;s Lectures</h2>
                  <p className="db-sm">Review attendance, start a lecture, or open class details.</p>
                </div>
                <span className="db-cap2">{listOverflows ? "Scroll for more" : ""}</span>
              </div>

              {scheduleList.length === 0 ? (
                <div className="db-ci db-empty">
                  <span className="db-sm" role={scheduleError ? "alert" : "status"}>
                    {scheduleLoading
                      ? "Loading today's lectures..."
                      : scheduleError || "No classes scheduled for today. An admin adds lecture times under Admin."}
                  </span>
                  {scheduleError && !scheduleLoading && (
                    <button type="button" className="db-b1" onClick={reloadSchedule}>
                      Try Again
                    </button>
                  )}
                </div>
              ) : (
                <div className="db-list" ref={scheduleListRef}>
                  {finalScheduleList.map((item, index) => {
                    const status = item.computedStatus;
                    const isActive = currentActiveClass?.id === item.id;
                    const sessionId = makeSessionId(item.id, todayKey);
                    const [clock, period] = (item.time || "").split(" ");
                    const summary = getSummary(item.id);
                    const enrolled = summary.total;
                    return (
                      <div
                        key={item.id}
                        className={`db-ci db-slidein ${isActive ? "act" : ""} ${status === "done" ? "dn" : ""}`}
                        style={{ animationDelay: `${index * 80}ms` }}
                      >
                        <div className="db-info">
                          <div className="db-tm">
                            {clock}
                            {period && <i>{period}</i>}
                          </div>
                          <div>
                            <div className="db-nm">
                              {item.title}
                              <span className={`db-tag t-${status}`}>{STATUS_LABELS[status] || "Scheduled"}</span>
                            </div>
                            <p className="db-sm">
                              {[item.section, item.room, item.code].filter(Boolean).join(" • ")}
                            </p>
                            {status === "done" ? (
                              <div className="db-ok">
                                Attendance: {summary.present}/{enrolled} Students (
                                {enrolled > 0 ? ((summary.present / enrolled) * 100).toFixed(1) : "0.0"}%)
                              </div>
                            ) : isActive ? (
                              <div className="db-warn">
                                {summary.isSaved ? "Attendance saved" : "Pending live class verification"}
                              </div>
                            ) : (
                              <div className="db-sm">{enrolled} total students</div>
                            )}
                          </div>
                        </div>

                        <div className="db-row db-acts">
                          {isActive ? (
                            <>
                              <button type="button" className="db-bm" onClick={() => navigate(`/attendance/${sessionId}`)}>
                                Take Attendance
                              </button>
                              <button type="button" className="db-be" onClick={() => handleEndClass(item.id)}>
                                Dismiss Lecture
                              </button>
                            </>
                          ) : status === "done" ? (
                            <button type="button" className="db-b1" onClick={() => navigate(`/attendance/${sessionId}`)}>
                              Review Attendance
                            </button>
                          ) : status === "next" ? (
                            <button type="button" className="db-b1" onClick={() => handleStartClass(item.id)}>
                              Start Early
                            </button>
                          ) : (
                            <button type="button" className="db-b1" onClick={() => handleOpenEditClass(item)}>
                              Class Details
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
            </div>
          </div>
        </main>
    </TeacherShell>
  );
}

export default Dashboard;