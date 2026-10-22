import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  ScanFace,
  Sun,
  Moon,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Radio,
  Camera,
  UserCheck,
  UserX,
  X,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Clock,
  MapPin,
  GraduationCap,
  Save,
  Check,
  RotateCcw,
  Menu,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useAttendanceSession } from "../context/AttendanceContext";
import { useSessionRoute } from "../context/ScheduleContext";
import { formatSessionDate } from "../context/scheduleStatus";
import { getCompletionMessage } from "../context/attendanceSessions";
import { usePhotoRescan } from "../hooks/usePhotoRescan";
import AppNavigationDrawer from "../components/AppNavigationDrawer";
import TeacherProfileMenu from "../components/TeacherProfileMenu";
import { useDialogA11y } from "../hooks/useDialogA11y";
import "./Attendance.css";

function Attendance() {
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useTheme();

  // Session comes from the URL (/attendance/:sessionId)
  const { sessionId, sessionClass: scheduledClass, sessionDateKey, redirectTo } = useSessionRoute();
  const {
    sessionData,
    verifiedStudents,
    unverifiedStudents,
    absentStudents,
    resolveStudent,
    returnAbsentStudent,
    saveAttendanceRecord,
    isSaved,
    lastSavedTimestamp,
    totalStudentsCount,
    resetAttendanceData,
    classSnapshot,
  } = useAttendanceSession(sessionId, scheduledClass);

  // Recorded sessions show the class details from when attendance was taken
  const sessionClass = classSnapshot || scheduledClass;

  const currentClassTitle = sessionClass.title;
  const currentCourseCode = sessionClass.code;
  const currentSection = sessionClass.section;
  const currentRoom = sessionClass.room;
  const currentTimeRange = sessionClass.timeRange;
  const sessionDateString = formatSessionDate(sessionDateKey);

  // Navigation drawer state
  const [isNavOpen, setIsNavOpen] = useState(false);

  // Resolve modal state (Instructions 10 & 11)
  const [resolvingStudent, setResolvingStudent] = useState(null);
  const [resolveSuccessToast, setResolveSuccessToast] = useState(null);

  // Save confirmation modal state (Instruction 13)
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveSuccessToast, setSaveSuccessToast] = useState(false);

  // Interactive Chart Tooltip state (Instruction 12)
  const [hoveredSlice, setHoveredSlice] = useState(null);

  // Top 8 slice for tables (Instructions 8 & 9)
  const visibleUnverified = unverifiedStudents.slice(0, 8);
  const visibleVerified = verifiedStudents.slice(0, 8);

  const presentCount = verifiedStudents.length;
  const unverifiedCount = unverifiedStudents.length;
  const absentCount = absentStudents.length;
  const presentPct = totalStudentsCount > 0 ? Math.round((presentCount / totalStudentsCount) * 100) : 0;
  const unverifiedPct = totalStudentsCount > 0 ? Math.round((unverifiedCount / totalStudentsCount) * 100) : 0;
  const absentPct = totalStudentsCount > 0 ? Math.round((absentCount / totalStudentsCount) * 100) : 0;

  // Donut chart SVG geometry
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const presentStroke = (presentCount / totalStudentsCount) * circumference;
  const unverifiedStroke = (unverifiedCount / totalStudentsCount) * circumference;
  const absentStroke = (absentCount / totalStudentsCount) * circumference;

  const handleOpenResolve = (student) => {
    setResolvingStudent(student);
  };

  // "Upload Another Photo": verify only after a photo is chosen and the simulated re-scan finishes
  const { fileInputRef, rescanState, startRescan, cancelRescan, handleRescanFileChange } =
    usePhotoRescan((studentId) => handleExecuteResolve(studentId, "photo"));

  function handleExecuteResolve(studentId, method) {
    const student = unverifiedStudents.find((s) => s.id === studentId);
    cancelRescan();
    setResolvingStudent(null);
    if (!student) return;
    resolveStudent(studentId, method);

    const actionMessage =
      method === "absent"
        ? `Marked ${student?.name || "Student"} as Absent`
        : `Verified ${student?.name || "Student"} via ${
            method === "nfc" ? "NFC Card" : method === "photo" ? "AI Photo Match" : "Manual Check"
          }`;

    setResolveSuccessToast(actionMessage);
    setTimeout(() => {
      setResolveSuccessToast(null);
    }, 3500);
  }

  // Undo a confirmed absence: the student returns to the unverified queue
  const handleUndoAbsent = (student) => {
    returnAbsentStudent(student.id);
    setResolveSuccessToast(`Moved ${student.name} back to Unverified`);
    setTimeout(() => {
      setResolveSuccessToast(null);
    }, 3500);
  };

  const handleCloseResolve = () => {
    cancelRescan();
    setResolvingStudent(null);
  };

  const handleConfirmSave = () => {
    saveAttendanceRecord();
    setIsSaveModalOpen(false);
    setSaveSuccessToast(true);
    setTimeout(() => {
      setSaveSuccessToast(false);
    }, 4000);
  };

  // Accessible modal behaviour (focus in, Tab trapped, Escape closes, focus returned)
  const resolveDialogRef = useDialogA11y(Boolean(resolvingStudent), handleCloseResolve);
  const saveDialogRef = useDialogA11y(isSaveModalOpen, () => setIsSaveModalOpen(false));

  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  const completionMessage = getCompletionMessage(presentCount, absentCount);

  const isRescanning =
    rescanState.status === "scanning" && rescanState.studentId === resolvingStudent?.id;
  const isRescanInvalid =
    rescanState.status === "invalid" && rescanState.studentId === resolvingStudent?.id;

  return (
    <div className={`attendance-page-root teacher-ui ${isDarkMode ? "dark-mode" : ""}`}>
      {/* ================= GLOBAL TOP HEADER ================= */}
      <header className="attendance-top-header">
        <div className="header-left">
          <button
            type="button"
            className="hamburger-nav-btn"
            aria-expanded={isNavOpen}
            onClick={() => setIsNavOpen(!isNavOpen)}
            aria-label={isNavOpen ? "Close navigation menu" : "Open navigation menu"}
            title={isNavOpen ? "Close navigation" : "Open navigation"}
          >
            <Menu size={22} aria-hidden="true" />
          </button>

          {/* Instruction 1: Clickable ClassSight Logo */}
          <Link to="/dashboard" className="brand-link" title="ClassSight Dashboard">
            <div className="brand-icon">
              <ScanFace size={20} strokeWidth={2.2} />
            </div>
            <span className="brand-name">ClassSight</span>
          </Link>

          <span className="header-crumb-sep">/</span>
          <span className="header-crumb-current">Attendance Verification</span>
        </div>

        <div className="header-right">
          {/* Theme Toggle */}
          <button
            className="header-icon-btn"
            onClick={toggleDarkMode}
            aria-label="Toggle color theme"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? <Sun size={19} strokeWidth={1.8} /> : <Moon size={19} strokeWidth={1.8} />}
          </button>

          {/* Teacher Profile */}
          <TeacherProfileMenu />
        </div>
      </header>

      {/* Navigation Drawer */}
      <AppNavigationDrawer
        isOpen={isNavOpen}
        onClose={() => setIsNavOpen(false)}
        activePage="attendance"
      />

      {/* ================= SUB-HEADER / SESSION BANNER (Instruction 7) ================= */}
      <div className="session-context-bar">
        <div className="session-context-inner">
          <div className="session-context-left">
            <button
              type="button"
              className="btn-back-dashboard"
              onClick={() => navigate("/dashboard")}
              title="Return to Dashboard"
            >
              <ArrowLeft size={16} strokeWidth={2.2} />
              <span>Back to Dashboard</span>
            </button>

            <div className="session-title-block">
              <div className="session-badge-row">
                <span className="badge-section">{currentSection}</span>
                <span className="badge-course-code">{currentCourseCode}</span>
                {isSaved ? (
                  <span className="badge-status-saved">
                    <Check size={12} strokeWidth={2.5} />
                    <span>Saved {lastSavedTimestamp ? `at ${lastSavedTimestamp}` : ""}</span>
                  </span>
                ) : (
                  <span className="badge-status-review">
                    <span className="pulse-dot-amber" />
                    <span>In Review</span>
                  </span>
                )}
              </div>
              <h1 className="session-main-title">{currentClassTitle}</h1>
            </div>
          </div>

          <div className="session-context-meta">
            <div className="meta-pill">
              <Calendar size={15} strokeWidth={2} />
              <span>{sessionDateString}</span>
            </div>
            <div className="meta-pill">
              <Clock size={15} strokeWidth={2} />
              <span>{currentTimeRange}</span>
            </div>
            <div className="meta-pill">
              <MapPin size={15} strokeWidth={2} />
              <span>{currentRoom}</span>
            </div>
            <div className="meta-pill">
              <GraduationCap size={15} strokeWidth={2} />
              <span>{sessionData.department}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= MAIN VERIFICATION WORKSPACE ================= */}
      <main className="attendance-workspace-container">
        <div className="attendance-grid-layout">
          {/* ================= LEFT COLUMN: STUDENT TABLES ================= */}
          <div className="attendance-tables-column">
            {/* 1. UNVERIFIED STUDENTS TABLE (Instruction 8) */}
            <section className="attendance-card-section unverified-section">
              <div className="table-card-header">
                <div className="table-card-title-group">
                  <div className="icon-badge unverified-badge">
                    <AlertCircle size={18} strokeWidth={2.2} />
                  </div>
                  <div>
                    <div className="title-with-pill">
                      <h3>Unverified Students</h3>
                      <span className="count-pill amber">{unverifiedCount} Action Required</span>
                    </div>
                    <p className="table-card-subtitle">
                      Students not automatically matched during facial scanning. Review and resolve each student.
                    </p>
                  </div>
                </div>

                {unverifiedStudents.length > 8 && (
                  <Link
                    to={`/attendance/${sessionId}/unverified`}
                    className="link-read-more"
                    title="View all unverified students"
                  >
                    <span>Read More ({unverifiedStudents.length})</span>
                    <ChevronRight size={15} strokeWidth={2} />
                  </Link>
                )}
              </div>

              {unverifiedStudents.length === 0 ? (
                <div className="empty-table-state">
                  <CheckCircle2 size={36} strokeWidth={2} color="#16a34a" />
                  <h4>{completionMessage.title}</h4>
                  <p>{completionMessage.body}</p>
                </div>
              ) : (
                <div className="table-responsive-wrapper">
                  <table className="cs-table attendance-table">
                    <thead>
                      <tr>
                        <th style={{ width: "30%" }}>Student Name</th>
                        <th style={{ width: "20%" }}>Roll No.</th>
                        <th style={{ width: "30%" }}>Status</th>
                        <th style={{ width: "20%", textAlign: "right" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleUnverified.map((student) => (
                        <tr key={student.id} className="table-row-unverified">
                          <td>
                            <div className="student-name-cell">
                              <span className="student-avatar-letter">
                                {student.name.charAt(0)}
                              </span>
                              <div className="student-meta-text">
                                <span className="name-bold">{student.name}</span>
                                {student.reason && (
                                  <span className="sub-reason">{student.reason}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="roll-badge">{student.roll}</span>
                          </td>
                          <td>
                            <span className="status-badge-unverified">
                              <AlertCircle size={13} strokeWidth={2.2} />
                              <span>{student.status}</span>
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <button
                              type="button"
                              className="btn-resolve-action"
                              onClick={() => handleOpenResolve(student)}
                            >
                              Resolve
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {unverifiedStudents.length > 8 && (
                <div className="table-card-footer">
                  <span>Showing first 8 of {unverifiedStudents.length} unverified students</span>
                  <Link to={`/attendance/${sessionId}/unverified`} className="footer-read-more-btn">
                    <span>Read More</span>
                    <ChevronRight size={14} />
                  </Link>
                </div>
              )}
            </section>

            {/* CONFIRMED ABSENT TABLE (shown only when at least one student is confirmed absent) */}
            {absentCount > 0 && (
              <section className="attendance-card-section">
                <div className="table-card-header">
                  <div className="table-card-title-group">
                    <div
                      className="icon-badge"
                      style={{ background: "var(--cs-absent-bg, var(--att-hover-row))", color: "var(--cs-absent, var(--cs-text-secondary))" }}
                    >
                      <UserX size={18} strokeWidth={2.2} />
                    </div>
                    <div>
                      <div className="title-with-pill">
                        <h3>Confirmed Absent</h3>
                        <span
                          className="count-pill"
                          style={{ background: "var(--cs-absent-bg, var(--att-hover-row))", color: "var(--cs-absent, var(--cs-text-secondary))" }}
                        >
                          {absentCount} Absent
                        </span>
                      </div>
                      <p className="table-card-subtitle">
                        Students confirmed not in the classroom. Use Undo to return a student to the unverified queue.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="table-responsive-wrapper">
                  <table className="cs-table attendance-table">
                    <thead>
                      <tr>
                        <th style={{ width: "30%" }}>Student Name</th>
                        <th style={{ width: "20%" }}>Roll No.</th>
                        <th style={{ width: "30%" }}>Status</th>
                        <th style={{ width: "20%", textAlign: "right" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {absentStudents.map((student) => (
                        <tr key={student.id}>
                          <td>
                            <div className="student-name-cell">
                              <span
                                className="student-avatar-letter"
                                style={{ background: "var(--cs-absent-bg, var(--att-hover-row))", color: "var(--cs-absent, var(--cs-text-secondary))" }}
                              >
                                {student.name.charAt(0)}
                              </span>
                              <span className="name-bold">{student.name}</span>
                            </div>
                          </td>
                          <td>
                            <span className="roll-badge">{student.roll}</span>
                          </td>
                          <td>
                            <span
                              className="status-badge-unverified"
                              style={{ background: "var(--cs-absent-bg, var(--att-hover-row))", color: "var(--cs-absent, var(--cs-text-secondary))" }}
                            >
                              <UserX size={13} strokeWidth={2.2} />
                              <span>{student.status}</span>
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <button
                              type="button"
                              className="btn-resolve-action"
                              onClick={() => handleUndoAbsent(student)}
                              title={`Return ${student.name} to the unverified queue`}
                            >
                              Undo
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* 2. VERIFIED STUDENTS TABLE (Instruction 9) */}
            <section className="attendance-card-section verified-section">
              <div className="table-card-header">
                <div className="table-card-title-group">
                  <div className="icon-badge verified-badge">
                    <CheckCircle2 size={18} strokeWidth={2.2} />
                  </div>
                  <div>
                    <div className="title-with-pill">
                      <h3>Verified Students</h3>
                      <span className="count-pill green">{presentCount} Present</span>
                    </div>
                    <p className="table-card-subtitle">
                      Students confirmed present, strictly sorted in ascending order by Roll No.
                    </p>
                  </div>
                </div>

                {verifiedStudents.length > 8 && (
                  <Link
                    to={`/attendance/${sessionId}/verified`}
                    className="link-read-more"
                    title="View full verified roster"
                  >
                    <span>Read More ({verifiedStudents.length})</span>
                    <ChevronRight size={15} strokeWidth={2} />
                  </Link>
                )}
              </div>

              {verifiedStudents.length === 0 ? (
                <div className="empty-table-state">
                  <p>No verified students recorded yet.</p>
                </div>
              ) : (
                <div className="table-responsive-wrapper">
                  <table className="cs-table attendance-table">
                    <thead>
                      <tr>
                        <th style={{ width: "32%" }}>Student Name</th>
                        <th style={{ width: "20%" }}>Roll No.</th>
                        <th style={{ width: "24%" }}>Status</th>
                        <th style={{ width: "24%", textAlign: "right" }}>Verification Method</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleVerified.map((student) => (
                        <tr key={student.id} className="table-row-verified">
                          <td>
                            <div className="student-name-cell">
                              <span className="student-avatar-letter green">
                                {student.name.charAt(0)}
                              </span>
                              <span className="name-bold">{student.name}</span>
                            </div>
                          </td>
                          <td>
                            <span className="roll-badge">{student.roll}</span>
                          </td>
                          <td>
                            <span className="status-badge-present">
                              <Check size={13} strokeWidth={2.5} />
                              <span>{student.status}</span>
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <span
                              className={`method-pill ${
                                student.method === "AI Match"
                                  ? "method-ai"
                                  : student.method === "NFC"
                                  ? "method-nfc"
                                  : "method-manual"
                              }`}
                            >
                              {student.method === "AI Match" && <Camera size={12} strokeWidth={2} />}
                              {student.method === "NFC" && <Radio size={12} strokeWidth={2} />}
                              {student.method === "Manual" && <UserCheck size={12} strokeWidth={2} />}
                              <span>{student.method}</span>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {verifiedStudents.length > 8 && (
                <div className="table-card-footer">
                  <span>Showing first 8 of {verifiedStudents.length} verified students</span>
                  <Link to={`/attendance/${sessionId}/verified`} className="footer-read-more-btn">
                    <span>Read More</span>
                    <ChevronRight size={14} />
                  </Link>
                </div>
              )}
            </section>
          </div>

          {/* ================= RIGHT COLUMN: INTERACTIVE DONUT CHART (Instruction 12) ================= */}
          <aside className="attendance-sidebar-column">
            <div className="interactive-chart-card">
              <div className="chart-card-header">
                <h3>Attendance Summary</h3>
                <span className="chart-total-chip">{totalStudentsCount} Enrolled</span>
              </div>

              {/* Responsive SVG Donut Chart */}
              <div className="donut-chart-wrapper">
                <svg
                  className="donut-svg"
                  viewBox="0 0 160 160"
                  aria-label="Attendance distribution donut chart"
                >
                  {/* Background Track */}
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    className="donut-track"
                    strokeWidth="18"
                    fill="none"
                  />

                  {/* Present Segment (Green) */}
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    className={`donut-segment segment-present ${
                      hoveredSlice === "present" ? "slice-hovered" : ""
                    }`}
                    strokeWidth="18"
                    fill="none"
                    strokeDasharray={`${presentStroke} ${circumference}`}
                    strokeDashoffset="0"
                    transform="rotate(-90 80 80)"
                    onMouseEnter={() => setHoveredSlice("present")}
                    onMouseLeave={() => setHoveredSlice(null)}
                    onClick={() =>
                      setHoveredSlice(hoveredSlice === "present" ? null : "present")
                    }
                  />

                  {/* Unverified Segment (Amber) */}
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    className={`donut-segment segment-unverified ${
                      hoveredSlice === "unverified" ? "slice-hovered" : ""
                    }`}
                    strokeWidth="18"
                    fill="none"
                    strokeDasharray={`${unverifiedStroke} ${circumference}`}
                    strokeDashoffset={-presentStroke}
                    transform="rotate(-90 80 80)"
                    onMouseEnter={() => setHoveredSlice("unverified")}
                    onMouseLeave={() => setHoveredSlice(null)}
                    onClick={() =>
                      setHoveredSlice(hoveredSlice === "unverified" ? null : "unverified")
                    }
                  />

                  {/* Confirmed Absent Segment (neutral grey: --cs-absent-mark) */}
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    className={`donut-segment segment-absent ${
                      hoveredSlice === "absent" ? "slice-hovered" : ""
                    }`}
                    style={{ stroke: "var(--cs-absent-mark, var(--cs-text-muted))" }}
                    strokeWidth="18"
                    fill="none"
                    strokeDasharray={`${absentStroke} ${circumference}`}
                    strokeDashoffset={-(presentStroke + unverifiedStroke)}
                    transform="rotate(-90 80 80)"
                    onMouseEnter={() => setHoveredSlice("absent")}
                    onMouseLeave={() => setHoveredSlice(null)}
                    onClick={() =>
                      setHoveredSlice(hoveredSlice === "absent" ? null : "absent")
                    }
                  />

                  {/* Center Content */}
                  <g className="donut-center-group">
                    <text x="80" y="74" textAnchor="middle" className="donut-center-num">
                      {hoveredSlice === "present"
                        ? `${presentPct}%`
                        : hoveredSlice === "unverified"
                        ? `${unverifiedPct}%`
                        : hoveredSlice === "absent"
                        ? `${absentPct}%`
                        : `${presentPct}%`}
                    </text>
                    <text x="80" y="93" textAnchor="middle" className="donut-center-label">
                      {hoveredSlice === "present"
                        ? "Present"
                        : hoveredSlice === "unverified"
                        ? "Unverified"
                        : hoveredSlice === "absent"
                        ? "Absent"
                        : "Turnout"}
                    </text>
                  </g>
                </svg>

                {/* Tooltip on hover/click */}
                {hoveredSlice && (
                  <div className="donut-tooltip">
                    {hoveredSlice === "present" ? (
                      <div>
                        <strong>{presentCount} Students</strong>
                        <span>({presentPct}% verified present)</span>
                      </div>
                    ) : hoveredSlice === "absent" ? (
                      <div>
                        <strong>{absentCount} Students</strong>
                        <span>({absentPct}% confirmed absent)</span>
                      </div>
                    ) : (
                      <div>
                        <strong>{unverifiedCount} Students</strong>
                        <span>({unverifiedPct}% pending review)</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Chart Legend with interactive highlight */}
              <div className="chart-legend-list">
                <div
                  className={`legend-row ${hoveredSlice === "present" ? "active-legend" : ""}`}
                  onMouseEnter={() => setHoveredSlice("present")}
                  onMouseLeave={() => setHoveredSlice(null)}
                  onClick={() =>
                    setHoveredSlice(hoveredSlice === "present" ? null : "present")
                  }
                >
                  <div className="legend-label-group">
                    <span className="legend-dot green-dot" />
                    <span className="legend-name">Present &amp; Verified</span>
                  </div>
                  <div className="legend-stat">
                    <strong>{presentCount}</strong>
                    <span className="legend-pct">({presentPct}%)</span>
                  </div>
                </div>

                <div
                  className={`legend-row ${hoveredSlice === "unverified" ? "active-legend" : ""}`}
                  onMouseEnter={() => setHoveredSlice("unverified")}
                  onMouseLeave={() => setHoveredSlice(null)}
                  onClick={() =>
                    setHoveredSlice(hoveredSlice === "unverified" ? null : "unverified")
                  }
                >
                  <div className="legend-label-group">
                    <span className="legend-dot amber-dot" />
                    <span className="legend-name">Not Matched / Unverified</span>
                  </div>
                  <div className="legend-stat">
                    <strong>{unverifiedCount}</strong>
                    <span className="legend-pct">({unverifiedPct}%)</span>
                  </div>
                </div>

                <div
                  className={`legend-row ${hoveredSlice === "absent" ? "active-legend" : ""}`}
                  onMouseEnter={() => setHoveredSlice("absent")}
                  onMouseLeave={() => setHoveredSlice(null)}
                  onClick={() =>
                    setHoveredSlice(hoveredSlice === "absent" ? null : "absent")
                  }
                >
                  <div className="legend-label-group">
                    <span
                      className="legend-dot"
                      style={{ background: "var(--cs-absent-mark, var(--cs-text-muted))" }}
                    />
                    <span className="legend-name">Confirmed Absent</span>
                  </div>
                  <div className="legend-stat">
                    <strong>{absentCount}</strong>
                    <span className="legend-pct">({absentPct}%)</span>
                  </div>
                </div>
              </div>

              {/* Quick Method Breakdown */}
              <div className="verification-methods-breakdown">
                <h4>Verification Methods</h4>
                <div className="method-counts-grid">
                  <div className="method-mini-card">
                    <Camera size={14} />
                    <div>
                      <span className="mini-card-num">
                        {verifiedStudents.filter((s) => s.method === "AI Match").length}
                      </span>
                      <span className="mini-card-label">AI Photo</span>
                    </div>
                  </div>
                  <div className="method-mini-card">
                    <Radio size={14} />
                    <div>
                      <span className="mini-card-num">
                        {verifiedStudents.filter((s) => s.method === "NFC").length}
                      </span>
                      <span className="mini-card-label">NFC Reader</span>
                    </div>
                  </div>
                  <div className="method-mini-card">
                    <UserCheck size={14} />
                    <div>
                      <span className="mini-card-num">
                        {verifiedStudents.filter((s) => s.method === "Manual").length}
                      </span>
                      <span className="mini-card-label">Manual</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reset state helper for testing */}
              <button
                type="button"
                className="btn-reset-demo"
                onClick={resetAttendanceData}
                title="Reset attendance records to initial demo state"
              >
                <RotateCcw size={13} />
                <span>Reset Demo State</span>
              </button>
            </div>
          </aside>
        </div>

        {/* ================= BOTTOM ACTION BAR: SAVE RECORD (Instruction 13) ================= */}
        <div className="attendance-bottom-save-strip">
          <div className="save-strip-info">
            {/* State comes from the real session data: unverified count + saved/unsaved */}
            <h4 className="save-strip-heading">
              {unverifiedCount > 0
                ? "Review in progress"
                : isSaved
                ? "Attendance complete and saved"
                : "Review complete — ready to save"}
            </h4>
            <div className="save-strip-progress" style={{ display: "flex", alignItems: "center", gap: 10, margin: "6px 0 8px" }}>
              <div
                className="teacher-progress"
                role="progressbar"
                aria-label="Students reviewed"
                aria-valuemin={0}
                aria-valuemax={totalStudentsCount}
                aria-valuenow={presentCount + absentCount}
                style={{ flex: "0 1 240px" }}
              >
                <span
                  style={{
                    width: `${totalStudentsCount > 0 ? Math.round(((presentCount + absentCount) / totalStudentsCount) * 100) : 0}%`,
                  }}
                />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                {presentCount + absentCount} of {totalStudentsCount} reviewed
              </span>
            </div>
            <p>
              Current session: <strong>{presentCount} Present</strong> &bull;{" "}
              <strong>{unverifiedCount + absentCount} Unverified / Absent</strong> out of{" "}
              <strong>{totalStudentsCount} students</strong>.
            </p>
          </div>

          <button
            type="button"
            className="btn-save-record-primary"
            onClick={() => setIsSaveModalOpen(true)}
          >
            <Save size={18} strokeWidth={2.2} />
            <span>Save Record</span>
          </button>
        </div>
      </main>

      {/* ================= MODAL: RESOLVE UNVERIFIED STUDENT (Instructions 10 & 11) ================= */}
      {resolvingStudent && (
        <div className="cs-modal-backdrop" onClick={handleCloseResolve}>
          <div className="cs-modal-card resolve-modal-card" ref={resolveDialogRef} role="dialog" aria-modal="true" tabIndex={-1} aria-label={`Resolve verification for ${resolvingStudent.name}`} onClick={(e) => e.stopPropagation()}>
            <div className="cs-modal-header">
              <div className="resolve-student-profile">
                <div className="resolve-avatar">
                  {resolvingStudent.name.charAt(0)}
                </div>
                <div>
                  <h3>Resolve Verification</h3>
                  <p className="cs-modal-subtitle">
                    <strong>{resolvingStudent.name}</strong> &bull; Roll No:{" "}
                    <strong>{resolvingStudent.roll}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="cs-modal-close"
                onClick={handleCloseResolve}
                aria-label="Close modal"
              >
                <X size={19} />
              </button>
            </div>

            <div className="resolve-modal-body">
              {resolvingStudent.reason && (
                <div className="detection-note">
                  <AlertCircle size={15} strokeWidth={2} />
                  <span>Detection Note: {resolvingStudent.reason}</span>
                </div>
              )}

              <p className="resolve-instruction-text">
                Select an action to verify attendance for {resolvingStudent.name}:
              </p>

              <div className="resolve-options-grid">
                {/* 1. NFC Verify */}
                <button
                  type="button"
                  className="resolve-option-btn option-nfc"
                  onClick={() => handleExecuteResolve(resolvingStudent.id, "nfc")}
                  disabled={isRescanning}
                >
                  <div className="option-icon-box">
                    <Radio size={20} strokeWidth={2} />
                  </div>
                  <div className="option-text-box">
                    <strong>NFC Verify</strong>
                    <span>Scan physical smart card or student tag</span>
                  </div>
                </button>

                {/* 2. Upload Another Photo */}
                <button
                  type="button"
                  className="resolve-option-btn option-photo"
                  onClick={() => startRescan(resolvingStudent.id)}
                  disabled={isRescanning}
                >
                  <div className="option-icon-box">
                    <Camera size={20} strokeWidth={2} />
                  </div>
                  <div className="option-text-box">
                    <strong>{isRescanning ? "Re-scanning photo…" : "Upload Another Photo"}</strong>
                    <span>
                      {isRescanning
                        ? "Simulated re-scan in progress"
                        : isRescanInvalid
                        ? "Choose an image file (max 20 MB)"
                        : "Re-scan with alternative angle or close-up"}
                    </span>
                  </div>
                </button>

                {/* 3. Mark Present Manually */}
                <button
                  type="button"
                  className="resolve-option-btn option-manual"
                  onClick={() => handleExecuteResolve(resolvingStudent.id, "manual")}
                  disabled={isRescanning}
                >
                  <div className="option-icon-box">
                    <UserCheck size={20} strokeWidth={2} />
                  </div>
                  <div className="option-text-box">
                    <strong>Mark Present Manually</strong>
                    <span>Teacher manual roll-call override</span>
                  </div>
                </button>

                {/* 4. Keep Absent */}
                <button
                  type="button"
                  className="resolve-option-btn option-absent"
                  onClick={() => handleExecuteResolve(resolvingStudent.id, "absent")}
                  disabled={isRescanning}
                >
                  <div className="option-icon-box">
                    <UserX size={20} strokeWidth={2} />
                  </div>
                  <div className="option-text-box">
                    <strong>Keep Absent</strong>
                    <span>Confirm student is not in classroom</span>
                  </div>
                </button>
              </div>
            </div>

            <div className="cs-modal-actions">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={handleCloseResolve}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: SAVE RECORD CONFIRMATION (Instruction 13) ================= */}
      {isSaveModalOpen && (
        <div className="cs-modal-backdrop" onClick={() => setIsSaveModalOpen(false)}>
          <div className="cs-modal-card cs-modal-save-confirm" ref={saveDialogRef} role="dialog" aria-modal="true" tabIndex={-1} aria-label="Save attendance record" onClick={(e) => e.stopPropagation()}>
            <div className="cs-modal-header">
              <div className="confirm-icon-success">
                <ShieldCheck size={24} strokeWidth={2.2} />
              </div>
              <div>
                <h3>Save Attendance Record</h3>
                <p className="cs-modal-subtitle">
                  Are you sure you want to save this attendance record?
                </p>
              </div>
            </div>

            <div className="save-confirm-summary-box">
              <div className="summary-stat-row">
                <span>Lecture:</span>
                <strong>
                  {currentSection} &bull; {currentClassTitle} ({currentCourseCode})
                </strong>
              </div>
              <div className="summary-stat-row">
                <span>Date &amp; Time:</span>
                <strong>
                  {sessionDateString} ({currentTimeRange})
                </strong>
              </div>
              <div className="summary-divider" />
              <div className="summary-pills-row">
                <span className="summary-chip green">{presentCount} Present</span>
                <span className="summary-chip amber">{unverifiedCount + absentCount} Unverified / Absent</span>
                <span className="summary-chip gray">{totalStudentsCount} Total</span>
              </div>
            </div>

            <p className="save-confirm-note">
              {unverifiedCount > 0
                ? `${unverifiedCount} student${unverifiedCount === 1 ? " is" : "s are"} still unverified and will be saved as unverified. You can resolve them later and save again.`
                : "Saving will preserve this snapshot for college compliance and analytics reports."}
            </p>

            <div className="cs-modal-actions">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setIsSaveModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-modal-save-confirm"
                onClick={handleConfirmSave}
              >
                <Check size={16} strokeWidth={2.5} />
                <span>Save Record</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleRescanFileChange}
        accept="image/*"
        style={{ display: "none" }}
      />

      {/* Floating Success Toasts */}
      {resolveSuccessToast && (
        <div className="attendance-floating-toast" role="status" aria-live="polite">
          <CheckCircle2 size={18} strokeWidth={2.2} color="#16a34a" />
          <span>{resolveSuccessToast}</span>
        </div>
      )}

      {saveSuccessToast && (
        <div className="attendance-floating-toast toast-success-save" role="status" aria-live="polite">
          <ShieldCheck size={20} strokeWidth={2.2} />
          <div>
            <h5>Attendance Record Saved Successfully!</h5>
            <p>
              {presentCount} students recorded present for {currentSection} {currentClassTitle}.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Attendance;