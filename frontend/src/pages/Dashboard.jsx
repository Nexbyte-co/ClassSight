import { useState, useRef, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Camera,
  X,
  Trash2,
  AlertTriangle,
  Download,
  Smartphone,
  Nfc,
  Check,
} from "lucide-react";
import "./Dashboard.css";
import { useAttendance, useAttendanceSession } from "../context/AttendanceContext";
import { useSettings } from "../context/SettingsContext";
import { useSchedule } from "../context/ScheduleContext";
import {
  computeScheduleStatuses,
  getActiveClass,
  getScheduleNow,
  makeSessionId,
  parseTimeSlotMinutes,
} from "../context/scheduleStatus";
import TeacherShell from "../components/TeacherShell";
import { useDialogA11y } from "../hooks/useDialogA11y";

// Status tag text in Today's Class Schedule
const STATUS_LABELS = {
  done: "✓ Done",
  active: "Active Now",
  next: "Next Up",
  upcoming: "Scheduled",
  unstarted: "Scheduled",
};



const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Number that counts up from 0 when first shown, then updates in place
function CountUp({ value }) {
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? value : 0));
  const animated = useRef(false);
  useEffect(() => {
    if (animated.current || prefersReducedMotion()) {
      setShown(value);
      return undefined;
    }
    animated.current = true;
    const start = performance.now();
    let frame;
    const step = (now) => {
      const progress = Math.min(1, (now - start) / 700);
      setShown(Math.round(value * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return shown;
}

function Dashboard() {
  const navigate = useNavigate();


  // Photo scan state
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [isPhotoScanning, setIsPhotoScanning] = useState(false);
  const [photoScanSuccess, setPhotoScanSuccess] = useState(false);
  const fileInputRef = useRef(null);

  // Mark Attendance card tab: "photo" | "nfc"
  const [attendanceTab, setAttendanceTab] = useState("photo");

  // NFC scan state (Task 2)
  // Inline NFC reader: "" (ready) → "det" (card detected) → "rec" (recorded)
  const [nfcState, setNfcState] = useState("");
  const [nfcLast, setNfcLast] = useState(null);
  const [nfcCount, setNfcCount] = useState(0);
  const nfcTimers = useRef([]);
  useEffect(() => () => nfcTimers.current.forEach(clearTimeout), []);

  // Time of the last photo scan on this page (shown in the "Last Batch Scan" row)
  const [lastScanTime, setLastScanTime] = useState(null);

  // Schedule list & session tracking live in ScheduleContext so they survive navigation
  const {
    scheduleList,
    setScheduleList,
    manualActiveClassId,
    setManualActiveClassId,
    endedClassIds,
    setEndedClassIds,
    todayKey,
    fallbackClassId,
  } = useSchedule();
  const { getSession, getSessionSummary } = useAttendance();
  const { defaultLectureMinutes, defaultDepartment } = useSettings();

  // Dynamic status tracking (Instructions 4 & 5)
  const [currentTimeTick, setCurrentTimeTick] = useState(() => getScheduleNow());

  // Confirm delete modal state (Instruction 3)
  const [confirmDeleteClassId, setConfirmDeleteClassId] = useState(null);

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
  const { unverifiedStudents, verifiedStudents, absentStudents, resolveStudent } =
    useAttendanceSession(scanSessionId, scanClass);
  const scanRosterSize = verifiedStudents.length + unverifiedStudents.length + absentStudents.length;
  const scanMatchRate =
    scanRosterSize > 0 ? `${((verifiedStudents.length / scanRosterSize) * 100).toFixed(1)}%` : "0.0%";

  // Modal: Edit Active Session
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [sessionFormData, setSessionFormData] = useState({
    section: "",
    department: "",
    room: "",
    timeRange: "",
    title: "",
    code: "",
  });

  // Modal: Add / Edit Class in Today's Classes
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClassId, setEditingClassId] = useState(null);
  const [classFormData, setClassFormData] = useState({
    title: "",
    code: "",
    section: "",
    room: "",
    time: "",
    timeRange: "",
    department: defaultDepartment,
    status: "upcoming",
  });

  // Notifications
  const notifications = [
    {
      id: 1,
      title: "Attendance Processed",
      text: "3C2C Software Engineering attendance recorded (54/56 present).",
      time: "10m ago",
    },
    {
      id: 2,
      title: "Smart Camera Ready",
      text: "L105 high-resolution angle calibrated for facial detection.",
      time: "1h ago",
    },
    {
      id: 3,
      title: "Upcoming Lecture",
      text: "Database Management System II in L207 starts at 11:20 AM.",
      time: "2h ago",
    },
  ];

  // Dynamic greeting based on current hour
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning, Professor Jhonsy";
    if (hour < 17) return "Good afternoon, Professor Jhonsy";
    return "Good evening, Professor Jhonsy";
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
      const sessionId = makeSessionId(item.id, todayKey);
      const session = getSession(sessionId);
      return [
        item.timeRange || item.time,
        item.title,
        item.code,
        item.section,
        item.room,
        item.computedStatus,
        session.verified.length,
        session.unverified.length,
        session.absent.length,
        getSessionSummary(sessionId).isSaved ? "Yes" : "No",
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

  // Photo upload handlers
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const photoUrl = URL.createObjectURL(file);
      setSelectedPhoto(photoUrl);
      setIsPhotoScanning(true);
      setPhotoScanSuccess(false);

      // Simulate AI Face detection
      setTimeout(() => {
        setIsPhotoScanning(false);
        setPhotoScanSuccess(true);
        setLastScanTime(
          new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
        );
      }, 1600);
    }
  };

  const handleResetPhoto = () => {
    setSelectedPhoto(null);
    setPhotoScanSuccess(false);
    setIsPhotoScanning(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // NFC card tap (Task 2): verifies the next unmatched student of the scan session
  const handleNfcScan = () => {
    const student = unverifiedStudents[0];
    if (!student || nfcState) return;
    setNfcState("det");
    nfcTimers.current.push(
      setTimeout(() => {
        resolveStudent(student.id, "nfc");
        setNfcLast(student);
        setNfcCount((n) => n + 1);
        setNfcState("rec");
        nfcTimers.current.push(setTimeout(() => setNfcState(""), 2200));
      }, 900)
    );
  };

  // Active Session Edit Handlers
  const handleOpenSessionEdit = () => {
    if (!currentActiveClass) return;
    setSessionFormData({
      section: currentActiveClass.section || "",
      department: currentActiveClass.department || "Computer Science & Eng.",
      room: currentActiveClass.room || "",
      timeRange: currentActiveClass.timeRange || "",
      title: currentActiveClass.title || "",
      code: currentActiveClass.code || "",
    });
    setIsSessionModalOpen(true);
  };

  const handleSaveSession = (e) => {
    e.preventDefault();
    if (currentActiveClass) {
      setScheduleList((prev) =>
        prev.map((c) =>
          c.id === currentActiveClass.id ? { ...c, ...sessionFormData } : c
        )
      );
    }
    setIsSessionModalOpen(false);
  };

  // Scheduled Class (Add/Edit) Handlers
  const handleOpenAddClass = () => {
    setEditingClassId(null);
    setClassFormData({
      title: "",
      code: "",
      section: "",
      room: "",
      time: "",
      timeRange: "",
      department: defaultDepartment,
      status: "upcoming",
    });
    setIsClassModalOpen(true);
  };

  const handleOpenEditClass = (item) => {
    setEditingClassId(item.id);
    setClassFormData({
      title: item.title,
      code: item.code,
      section: item.section,
      room: item.room,
      time: item.time,
      timeRange: item.timeRange,
      department: item.department || "Computer Science & Eng.",
      status: item.computedStatus || item.status,
    });
    setIsClassModalOpen(true);
  };

  const handleSaveClass = (e) => {
    e.preventDefault();
    if (editingClassId) {
      // Edit existing
      setScheduleList((prev) =>
        prev.map((item) =>
          item.id === editingClassId ? { ...item, ...classFormData } : item
        )
      );
    } else {
      // Add new
      const newId = `class-${Date.now()}`;
      const newClass = {
        id: newId,
        ...classFormData,
      };
      setScheduleList((prev) => [...prev, newClass]);
    }
    setIsClassModalOpen(false);
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

  // Confirmed Delete Class Handler (Instruction 3)
  const confirmDeleteClass = (id) => {
    setScheduleList((prev) => prev.filter((item) => item.id !== id));
    if (manualActiveClassId === id) {
      setManualActiveClassId(null);
    }
    setEndedClassIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setConfirmDeleteClassId(null);
    setIsClassModalOpen(false);
  };

  // Accessible modal behaviour (focus in, Tab trapped, Escape closes, focus returned)
  const sessionDialogRef = useDialogA11y(isSessionModalOpen, () => setIsSessionModalOpen(false));
  const classDialogRef = useDialogA11y(isClassModalOpen, () => setIsClassModalOpen(false));
  const deleteDialogRef = useDialogA11y(Boolean(confirmDeleteClassId), () => setConfirmDeleteClassId(null));

  return (
    <TeacherShell
      active="dashboard"
      dateLabel={currentDateString}
      notifications={notifications}
      liveBadge={Boolean(currentActiveClass)}
      overlays={(
        <>
      {/* ================= MODAL: EDIT ACTIVE SESSION ================= */}
      {isSessionModalOpen && (
        <div className="cs-modal-backdrop" onClick={() => setIsSessionModalOpen(false)}>
          <div className="cs-modal-card" ref={sessionDialogRef} role="dialog" aria-modal="true" tabIndex={-1} aria-label="Edit active session" onClick={(e) => e.stopPropagation()}>
            <div className="cs-modal-header">
              <div>
                <h3>Edit Active Session</h3>
                <p>Customize batch, venue, time, and course for the current lecture.</p>
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
              <div className="form-row-2">
                <div className="cs-form-group">
                  <label htmlFor="session-batch">Batch / Section</label>
                  <input
                    id="session-batch"
                    type="text"
                    required
                    placeholder="e.g. 3C2"
                    value={sessionFormData.section}
                    onChange={(e) =>
                      setSessionFormData({ ...sessionFormData, section: e.target.value })
                    }
                  />
                </div>

                <div className="cs-form-group">
                  <label htmlFor="session-dept">Department / Subtext</label>
                  <input
                    id="session-dept"
                    type="text"
                    placeholder="e.g. Computer Science & Eng."
                    value={sessionFormData.department}
                    onChange={(e) =>
                      setSessionFormData({ ...sessionFormData, department: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="cs-form-group">
                  <label htmlFor="session-room">Venue / Room</label>
                  <input
                    id="session-room"
                    type="text"
                    required
                    placeholder="e.g. LP402"
                    value={sessionFormData.room}
                    onChange={(e) =>
                      setSessionFormData({ ...sessionFormData, room: e.target.value })
                    }
                  />
                </div>

                <div className="cs-form-group">
                  <label htmlFor="session-time">Time Range</label>
                  <input
                    id="session-time"
                    type="text"
                    required
                    placeholder="e.g. 08:00 AM – 08:50 AM"
                    value={sessionFormData.timeRange}
                    onChange={(e) =>
                      setSessionFormData({ ...sessionFormData, timeRange: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="cs-form-group">
                  <label htmlFor="session-title">Course / Subject</label>
                  <input
                    id="session-title"
                    type="text"
                    required
                    placeholder="e.g. Data Structures"
                    value={sessionFormData.title}
                    onChange={(e) =>
                      setSessionFormData({ ...sessionFormData, title: e.target.value })
                    }
                  />
                </div>

                <div className="cs-form-group">
                  <label htmlFor="session-code">Course Code</label>
                  <input
                    id="session-code"
                    type="text"
                    required
                    placeholder="e.g. UCE301"
                    value={sessionFormData.code}
                    onChange={(e) =>
                      setSessionFormData({ ...sessionFormData, code: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="cs-modal-actions">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setIsSessionModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-modal-submit">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT CLASS ================= */}
      {isClassModalOpen && (
        <div className="cs-modal-backdrop" onClick={() => setIsClassModalOpen(false)}>
          <div
            className="cs-modal-card"
            ref={classDialogRef} role="dialog" aria-modal="true" tabIndex={-1}
            aria-label={editingClassId ? "Edit scheduled lecture" : "Add lecture to today's schedule"}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cs-modal-header">
              <div>
                <h3>{editingClassId ? "Edit Scheduled Lecture" : "Add Lecture to Today's Schedule"}</h3>
                <p>Fill in the course, timing, and classroom details.</p>
              </div>
              <button
                type="button"
                className="cs-modal-close"
                onClick={() => setIsClassModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSaveClass} className="cs-modal-form">
              <div className="form-row-2">
                <div className="cs-form-group">
                  <label htmlFor="class-title">Course / Subject Title</label>
                  <input
                    id="class-title"
                    type="text"
                    required
                    placeholder="e.g. Data Structures"
                    value={classFormData.title}
                    onChange={(e) =>
                      setClassFormData({ ...classFormData, title: e.target.value })
                    }
                  />
                </div>

                <div className="cs-form-group">
                  <label htmlFor="class-code">Course Code</label>
                  <input
                    id="class-code"
                    type="text"
                    required
                    placeholder="e.g. UCE301"
                    value={classFormData.code}
                    onChange={(e) =>
                      setClassFormData({ ...classFormData, code: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="cs-form-group">
                  <label htmlFor="class-section">Batch / Section</label>
                  <input
                    id="class-section"
                    type="text"
                    required
                    placeholder="e.g. 3C2"
                    value={classFormData.section}
                    onChange={(e) =>
                      setClassFormData({ ...classFormData, section: e.target.value })
                    }
                  />
                </div>

                <div className="cs-form-group">
                  <label htmlFor="class-room">Venue / Room</label>
                  <input
                    id="class-room"
                    type="text"
                    required
                    placeholder="e.g. LP402"
                    value={classFormData.room}
                    onChange={(e) =>
                      setClassFormData({ ...classFormData, room: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="cs-form-group">
                  <label htmlFor="class-time">Start Time</label>
                  <input
                    id="class-time"
                    type="text"
                    required
                    placeholder="e.g. 08:00 AM"
                    value={classFormData.time}
                    onChange={(e) =>
                      setClassFormData({ ...classFormData, time: e.target.value })
                    }
                  />
                </div>

                <div className="cs-form-group">
                  <label htmlFor="class-timeRange">Full Time Slot</label>
                  <input
                    id="class-timeRange"
                    type="text"
                    required
                    placeholder="e.g. 08:00 AM – 08:50 AM"
                    value={classFormData.timeRange}
                    onChange={(e) =>
                      setClassFormData({ ...classFormData, timeRange: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="cs-form-group">
                <label htmlFor="class-status">Lecture Status</label>
                <select
                  id="class-status"
                  value={classFormData.status}
                  onChange={(e) =>
                    setClassFormData({ ...classFormData, status: e.target.value })
                  }
                >
                  <option value="done">Done (Completed)</option>
                  <option value="next">Next (Active / In Progress)</option>
                  <option value="upcoming">Upcoming</option>
                </select>
              </div>

              <div className="cs-modal-actions-split">
                {editingClassId && (
                  <button
                    type="button"
                    className="btn-modal-delete"
                    onClick={() => setConfirmDeleteClassId(editingClassId)}
                  >
                    <Trash2 size={15} strokeWidth={1.8} />
                    <span>Delete Class</span>
                  </button>
                )}
                <div className="cs-modal-actions-right">
                  <button
                    type="button"
                    className="btn-modal-cancel"
                    onClick={() => setIsClassModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-modal-submit">
                    {editingClassId ? "Save Changes" : "Add to Schedule"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Delete Class (Instruction 3) */}
      {confirmDeleteClassId && (
        <div className="cs-modal-backdrop" onClick={() => setConfirmDeleteClassId(null)}>
          <div className="cs-modal-card cs-modal-confirm" ref={deleteDialogRef} role="alertdialog" aria-modal="true" tabIndex={-1} aria-label="Delete class" onClick={(e) => e.stopPropagation()}>
            <div className="cs-modal-header">
              <div className="confirm-icon-danger">
                <AlertTriangle size={24} strokeWidth={2} />
              </div>
              <div>
                <h3>Delete Class</h3>
                <p className="cs-modal-subtitle">Are you sure you want to delete this class?</p>
              </div>
            </div>
            <p className="confirm-body-text">
              This class will be permanently removed from today&apos;s schedule list. Saved
              attendance records for this lecture are retained.
            </p>
            <div className="cs-modal-actions">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setConfirmDeleteClassId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-modal-delete-confirm"
                onClick={() => confirmDeleteClass(confirmDeleteClassId)}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

        </>
      )}
    >
        <main className="db-main">
          <div className="db-hd db-rise">
            <div>
              <h1>{getGreeting()}</h1>
              <p className="db-sm db-lead">
                Ready to verify today&apos;s lectures, monitor biometric check-ins, and synchronize attendance.
              </p>
            </div>
          </div>

          <div className="db-cols">
            <div className="db-lcol">
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
                    <button type="button" className="db-col" onClick={handleOpenSessionEdit} title="Edit Course / Subject">
                      <div className="db-course">{currentActiveClass.title}</div>
                      {currentActiveClass.code && <div className="db-code">{currentActiveClass.code}</div>}
                    </button>
                    <div className="db-g3">
                      <button type="button" className="db-col" onClick={handleOpenSessionEdit} title="Edit Batch / Section">
                        <div className="db-k">Batch / Section</div>
                        <div className="db-v">{currentActiveClass.section}</div>
                        <div className="db-g3-sub">{currentActiveClass.department || "Computer Science & Eng."}</div>
                      </button>
                      <button type="button" className="db-col" onClick={handleOpenSessionEdit} title="Edit Venue">
                        <div className="db-k">Venue</div>
                        <div className="db-v">{currentActiveClass.room}</div>
                      </button>
                      <button type="button" className="db-col" onClick={handleOpenSessionEdit} title="Edit Time">
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
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handlePhotoSelect}
                        accept="image/*"
                        style={{ display: "none" }}
                      />
                      {!selectedPhoto ? (
                        <>
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
                            onClick={() => fileInputRef.current?.click()}
                          >
                            Upload Classroom Photo
                          </button>
                        </>
                      ) : (
                        <div className="db-photo-result">
                          <div className="photo-preview-container">
                            <img src={selectedPhoto} alt="Classroom Scan Preview" className="photo-preview-img" />
                            {isPhotoScanning && <div className="scanning-laser" />}
                          </div>
                          {isPhotoScanning ? (
                            <p className="db-scanning">
                              Scanning faces{scanClass ? ` in ${scanClass.section}` : ""}...
                            </p>
                          ) : (
                            photoScanSuccess && (
                              <div className="db-row db-wrap db-center">
                                <button
                                  type="button"
                                  className="db-bm"
                                  onClick={() => navigate(scanSessionId ? `/attendance/${scanSessionId}` : "/dashboard")}
                                >
                                  View Results
                                </button>
                                <button type="button" className="db-b1" onClick={handleResetPhoto}>
                                  Upload Another Photo
                                </button>
                              </div>
                            )
                          )}
                        </div>
                      )}
                      <div className="db-sm db-drop-meta">
                        Supports JPG, PNG up to 20MB • Wide panoramic angle recommended
                      </div>
                    </div>

                    <div className="db-scan">
                      <div className="db-row">
                        <div className="db-chk">✓</div>
                        <div>
                          <div className="db-scan-title">
                            Last Batch Scan: {scanClass ? scanClass.section : "—"} ({lastScanTime || scanClass?.time || "—"})
                          </div>
                          <div className="db-sm">
                            {verifiedStudents.length} faces recognized • {scanMatchRate} match rate
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
                      <div className={`db-emb ${nfcState === "" ? "db-wait" : ""}`} aria-hidden="true">
                        <Nfc size={28} strokeWidth={1.8} />
                      </div>
                      <h3>Tap Library Card to Mark Attendance</h3>
                      <p className="db-sm db-drop-text">
                        Ask the student to hold their registered library card against the reader. Scan one student at
                        a time.
                      </p>
                      <div className={`db-nst ${nfcState}`} aria-live="polite">
                        <i />
                        <span>
                          {nfcState === "det"
                            ? "Card detected · reading…"
                            : nfcState === "rec"
                            ? "Attendance recorded"
                            : unverifiedStudents.length === 0
                            ? "Reader ready · all students verified"
                            : "Reader ready · waiting for a card"}
                        </span>
                      </div>
                      <div className="db-sm db-drop-meta">Attendance is recorded for the ongoing lecture</div>
                    </div>

                    {/* Keyed by the count so the pop/flash animation replays on every recorded card */}
                    <div key={nfcCount} className={`db-scan ${nfcCount > 0 ? "db-flash" : ""}`}>
                      <div className="db-row">
                        <div className={`db-chk ${nfcLast ? "db-pop" : "idle"}`}>{nfcLast ? "✓" : "–"}</div>
                        <div>
                          <div className="db-scan-title">
                            {nfcLast ? `${nfcLast.name} · ${nfcLast.roll}` : "No card scanned yet"}
                          </div>
                          <div className="db-sm">Recorded this session: {nfcCount}</div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="db-b1 db-b1-wide"
                      onClick={handleNfcScan}
                      disabled={nfcState !== "" || unverifiedStudents.length === 0}
                    >
                      <span className="db-green-dot" />
                      Scan Library Card
                    </button>
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
                  <span className="db-sm">No classes scheduled for today.</span>
                  <button type="button" className="db-b1" onClick={handleOpenAddClass}>
                    Add Lecture
                  </button>
                </div>
              ) : (
                <div className="db-list" ref={scheduleListRef}>
                  {finalScheduleList.map((item, index) => {
                    const status = item.computedStatus;
                    const isActive = currentActiveClass?.id === item.id;
                    const sessionId = makeSessionId(item.id, todayKey);
                    const [clock, period] = (item.time || "").split(" ");
                    const session = getSession(sessionId);
                    const enrolled =
                      session.verified.length + session.unverified.length + session.absent.length;
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
                                Attendance: {session.verified.length}/{enrolled} Students (
                                {enrolled > 0 ? ((session.verified.length / enrolled) * 100).toFixed(1) : "0.0"}%)
                              </div>
                            ) : isActive ? (
                              <div className="db-warn">Pending live class verification</div>
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