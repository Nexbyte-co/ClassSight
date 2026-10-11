import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
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
import { useAttendance } from "../context/AttendanceContext";
import AppNavigationDrawer from "../components/AppNavigationDrawer";
import "./Attendance.css";

function Attendance() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const {
    sessionData,
    verifiedStudents,
    unverifiedStudents,
    resolveStudent,
    saveAttendanceRecord,
    isSaved,
    lastSavedTimestamp,
    totalStudentsCount,
    resetAttendanceData,
  } = useAttendance();

  // If navigated from Dashboard with specific class data, overlay that info
  const incomingClass = location.state?.classData;
  const currentClassTitle = incomingClass?.title || sessionData.classTitle;
  const currentCourseCode = incomingClass?.code || sessionData.courseCode;
  const currentSection = incomingClass?.section || sessionData.section;
  const currentRoom = incomingClass?.room || sessionData.room;
  const currentTimeRange = incomingClass?.timeRange || sessionData.timeRange;

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
  const presentPct = totalStudentsCount > 0 ? Math.round((presentCount / totalStudentsCount) * 100) : 0;
  const unverifiedPct = totalStudentsCount > 0 ? Math.round((unverifiedCount / totalStudentsCount) * 100) : 0;

  // Donut chart SVG geometry
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const presentStroke = (presentCount / totalStudentsCount) * circumference;
  const unverifiedStroke = (unverifiedCount / totalStudentsCount) * circumference;

  const handleOpenResolve = (student) => {
    setResolvingStudent(student);
  };

  const handleExecuteResolve = (studentId, method) => {
    const student = unverifiedStudents.find((s) => s.id === studentId);
    resolveStudent(studentId, method);
    setResolvingStudent(null);

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
  };

  const handleConfirmSave = () => {
    saveAttendanceRecord();
    setIsSaveModalOpen(false);
    setSaveSuccessToast(true);
    setTimeout(() => {
      setSaveSuccessToast(false);
    }, 4000);
  };

  return (
    <div className={`attendance-page-root ${isDarkMode ? "dark-mode" : ""}`}>
      {/* ================= GLOBAL TOP HEADER ================= */}
      <header className="attendance-top-header">
        <div className="header-left">
          <button
            type="button"
            className="hamburger-nav-btn"
            onClick={() => setIsNavOpen(!isNavOpen)}
            aria-label={isNavOpen ? "Close navigation menu" : "Open navigation menu"}
            title={isNavOpen ? "Close navigation" : "Open navigation"}
          >
            {isNavOpen ? <X size={22} /> : <Menu size={22} />}
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
          <div className="profile-pill">
            <div className="profile-avatar">PJ</div>
            <span className="profile-name">Prof. Jhonsy</span>
          </div>
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
              <span>{sessionData.dateString}</span>
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
                    to="/attendance/unverified"
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
                  <h4>All Students Verified!</h4>
                  <p>There are no remaining unverified students for this lecture session.</p>
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
                  <Link to="/attendance/unverified" className="footer-read-more-btn">
                    <span>Read More</span>
                    <ChevronRight size={14} />
                  </Link>
                </div>
              )}
            </section>

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
                    to="/attendance/verified"
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
                  <Link to="/attendance/verified" className="footer-read-more-btn">
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

                  {/* Center Content */}
                  <g className="donut-center-group">
                    <text x="80" y="74" textAnchor="middle" className="donut-center-num">
                      {hoveredSlice === "present"
                        ? `${presentPct}%`
                        : hoveredSlice === "unverified"
                        ? `${unverifiedPct}%`
                        : `${presentPct}%`}
                    </text>
                    <text x="80" y="93" textAnchor="middle" className="donut-center-label">
                      {hoveredSlice === "present"
                        ? "Present"
                        : hoveredSlice === "unverified"
                        ? "Unverified"
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
            <h4>Ready to finalise this lecture attendance?</h4>
            <p>
              Current session: <strong>{presentCount} Present</strong> &bull;{" "}
              <strong>{unverifiedCount} Unverified / Absent</strong> out of{" "}
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
        <div className="cs-modal-backdrop" onClick={() => setResolvingStudent(null)}>
          <div className="cs-modal-card resolve-modal-card" onClick={(e) => e.stopPropagation()}>
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
                onClick={() => setResolvingStudent(null)}
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
                  onClick={() => handleExecuteResolve(resolvingStudent.id, "photo")}
                >
                  <div className="option-icon-box">
                    <Camera size={20} strokeWidth={2} />
                  </div>
                  <div className="option-text-box">
                    <strong>Upload Another Photo</strong>
                    <span>Re-scan with alternative angle or close-up</span>
                  </div>
                </button>

                {/* 3. Mark Present Manually */}
                <button
                  type="button"
                  className="resolve-option-btn option-manual"
                  onClick={() => handleExecuteResolve(resolvingStudent.id, "manual")}
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
                onClick={() => setResolvingStudent(null)}
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
          <div className="cs-modal-card cs-modal-save-confirm" onClick={(e) => e.stopPropagation()}>
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
                  {sessionData.dateString} ({currentTimeRange})
                </strong>
              </div>
              <div className="summary-divider" />
              <div className="summary-pills-row">
                <span className="summary-chip green">{presentCount} Present</span>
                <span className="summary-chip amber">{unverifiedCount} Unverified / Absent</span>
                <span className="summary-chip gray">{totalStudentsCount} Total</span>
              </div>
            </div>

            <p className="save-confirm-note">
              Saving will preserve this snapshot for college compliance and analytics reports.
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

      {/* Floating Success Toasts */}
      {resolveSuccessToast && (
        <div className="attendance-floating-toast">
          <CheckCircle2 size={18} strokeWidth={2.2} color="#16a34a" />
          <span>{resolveSuccessToast}</span>
        </div>
      )}

      {saveSuccessToast && (
        <div className="attendance-floating-toast toast-success-save">
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