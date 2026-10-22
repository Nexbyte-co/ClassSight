// src/pages/StudentOverview.jsx
// Teacher preview of the student-facing overview (frontend demo).
// A demo student is chosen at /student/preview and /student/preview/:studentId shows
// only that student's own information. (Signed-in students use the portal at /student.)
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ScanFace,
  Sun,
  Moon,
  Info,
  BookOpen,
  CheckCircle2,
  XCircle,
  Target,
  Mail,
  Phone,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import "./Dashboard.css";
import "./Reports.css";
import "./Students.css";
import { useTheme } from "../context/ThemeContext";
import { useAttendance } from "../context/AttendanceContext";
import { useSchedule } from "../context/ScheduleContext";
import { useSettings } from "../context/SettingsContext";
import { initialStudents } from "../data/mockStudents";
import { buildStudentOverview, findStudent } from "../context/studentOverview";

const LEVEL_LABELS = {
  safe: "Good Standing",
  warning: "At Risk",
  critical: "Below Requirement",
};

function DemoNotice() {
  return (
    <div
      className="student-demo-notice"
      role="note"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "12px 16px",
        marginBottom: 24,
        borderRadius: 12,
        border: "1px solid var(--cs-crimson-border)",
        background: "var(--cs-crimson-light)",
        color: "var(--cs-text-primary)",
        fontSize: 13,
        lineHeight: 1.5,
      }}
    >
      <Info size={16} style={{ flexShrink: 0, marginTop: 2, color: "var(--cs-crimson)" }} />
      <span>
        <strong>Student view — frontend demo.</strong> This is the teacher&apos;s preview. Data comes
        from the demo student records and from attendance recorded in this browser; nothing is
        loaded from a server.
      </span>
    </div>
  );
}

function StudentHeader() {
  const { isDarkMode, toggleDarkMode } = useTheme();
  return (
    <header className="dashboard-header">
      <div className="header-left">
        <Link to="/student/preview" className="brand-link">
          <div className="brand-icon">
            <ScanFace size={20} strokeWidth={2.2} />
          </div>
          <span className="brand-name">ClassSight</span>
        </Link>
        <span className="section-chip">Student · Demo</span>
      </div>

      <div className="header-right">
        <button
          type="button"
          className="header-icon-btn"
          onClick={toggleDarkMode}
          aria-label="Toggle color theme"
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDarkMode ? <Sun size={19} strokeWidth={1.8} /> : <Moon size={19} strokeWidth={1.8} />}
        </button>
        <Link to="/dashboard" className="btn-view-session" style={{ textDecoration: "none" }}>
          <span>Teacher view</span>
        </Link>
      </div>
    </header>
  );
}

// Demo stand-in for a student login: pick which student to view as
function StudentChooser() {
  const students = [...initialStudents].sort((a, b) =>
    a.roll.localeCompare(b.roll, undefined, { numeric: true })
  );
  return (
    <>
      <div className="greeting-section">
        <div className="greeting-text">
          <h1>Choose a demo student</h1>
          <p>Stands in for a student login. Each student sees only their own attendance.</p>
        </div>
      </div>

      <div className="reports-table-card student-chooser-list">
        <div className="reports-table-header">
          <div>STUDENT</div>
          <div>SECTION</div>
          <div />
        </div>
        {students.map((s) => (
          <div key={s.id} className="reports-table-row">
            <span className="course-title-text">
              {s.name}
              <span className="section-chip">{s.roll}</span>
            </span>
            <span className="room-text">{s.department}</span>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Link to={`/student/preview/${s.id}`} className="btn-view-session" style={{ textDecoration: "none" }}>
                <span>View as student</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function StudentOverviewContent({ overview, threshold }) {
  const [historyFilter, setHistoryFilter] = useState("all");
  const { profile, summary, history, subjects } = overview;

  const presentCount = history.filter((h) => h.status === "Present").length;
  const absentCount = history.filter((h) => h.status === "Absent").length;
  const visibleHistory =
    historyFilter === "all" ? history : history.filter((h) => h.status.toLowerCase() === historyFilter);

  const filters = [
    ["all", `All (${history.length})`],
    ["present", `Present (${presentCount})`],
    ["absent", `Absent (${absentCount})`],
  ];

  return (
    <>
      <div className="greeting-section">
        <div className="greeting-text">
          <h1>Hi, {profile.name.split(" ")[0]} 👋</h1>
          <p>
            {profile.roll} · Section {profile.section} · {profile.department}
          </p>
        </div>
        <Link to="/student/preview" className="btn-view-session" style={{ textDecoration: "none" }}>
          <ArrowLeft size={14} />
          <span>Switch demo student</span>
        </Link>
      </div>

      {/* Overall standing & threshold guidance */}
      {summary.pct === null ? (
        <div className="student-status-strip warning student-attendance-status">
          <div className="status-strip-left">
            <div className="status-pill-lg warning">
              <span className="status-dot" />
              <strong>No classes recorded yet</strong>
            </div>
            <span className="status-threshold-hint">
              Your attendance percentage will appear once classes are recorded.
            </span>
          </div>
        </div>
      ) : (
        <div className={`student-status-strip ${summary.level} student-attendance-status`}>
          <div className="status-strip-left">
            <div className={`status-pill-lg ${summary.level}`}>
              <span className="status-dot" />
              <strong>{LEVEL_LABELS[summary.level]}</strong>
            </div>
            <span className="status-threshold-hint">
              {summary.belowThreshold
                ? `Your attendance is below the ${threshold}% requirement. Attend the next ${summary.classesNeeded} class${summary.classesNeeded === 1 ? "" : "es"} in a row to reach ${threshold}%.`
                : `You meet the ${threshold}% requirement. You can miss up to ${summary.classesCanMiss} more class${summary.classesCanMiss === 1 ? "" : "es"} and stay at or above ${threshold}%.`}
            </span>
          </div>
          <div className="attendance-gauge-box">
            <span className="gauge-pct">{summary.pct}%</span>
            <span className="gauge-sub">Overall Attendance</span>
          </div>
        </div>
      )}

      <div className="student-stats-grid" style={{ marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-card-header">
            <BookOpen size={16} />
            <span>Total Classes</span>
          </div>
          <strong className="stat-card-value">{summary.total}</strong>
        </div>
        <div className="stat-card">
          <div className="stat-card-header text-safe">
            <CheckCircle2 size={16} />
            <span>Attended</span>
          </div>
          <strong className="stat-card-value text-safe">{summary.attended}</strong>
        </div>
        <div className="stat-card">
          <div className="stat-card-header text-critical">
            <XCircle size={16} />
            <span>Missed</span>
          </div>
          <strong className="stat-card-value text-critical">{summary.missed}</strong>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <Target size={16} />
            <span>Requirement</span>
          </div>
          <strong className="stat-card-value">{threshold}%</strong>
        </div>
      </div>

      {/* Subject-wise attendance */}
      <section className="student-subjects-section" style={{ marginBottom: 28 }}>
        <div className="section-title-tag">SUBJECT-WISE ATTENDANCE</div>
        <div className="section-desc">
          Based on the recent lectures listed below, not the full semester
        </div>
        <div className="reports-table-card">
          <div className="reports-table-header">
            <div>SUBJECT</div>
            <div>ATTENDED</div>
            <div>ATTENDANCE</div>
          </div>
          {subjects.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "var(--cs-text-muted)" }}>
              No subject attendance to show yet.
            </div>
          ) : (
            subjects.map((s) => (
              <div key={s.subject} className="reports-table-row student-subject-row">
                <span className="course-title-text">{s.subject}</span>
                <span className="room-text">
                  {s.present} of {s.total} lecture{s.total === 1 ? "" : "s"}
                </span>
                <div className="attendance-action-cell">
                  <span className="attendance-pct-badge">{s.pct}%</span>
                  {s.belowThreshold ? (
                    <span className="badge-detained">Below {threshold}%</span>
                  ) : (
                    <span className="badge-eligible">On track</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Recent attendance history */}
      <section className="student-history-block" style={{ marginBottom: 28 }}>
        <div className="section-title-tag">RECENT ATTENDANCE</div>
        <div className="section-desc">Your most recent lectures, newest first</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0 16px" }}>
          {filters.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className="btn-view-session student-history-filter"
              aria-pressed={historyFilter === value}
              onClick={() => setHistoryFilter(value)}
              style={
                historyFilter === value
                  ? { background: "var(--cs-crimson)", borderColor: "var(--cs-crimson)", color: "#ffffff" }
                  : undefined
              }
            >
              {label}
            </button>
          ))}
        </div>
        <div className="reports-table-card" style={{ overflowX: "auto" }}>
          {visibleHistory.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "var(--cs-text-muted)" }}>
              {history.length === 0
                ? "No attendance history yet."
                : `No ${historyFilter} lectures in this list.`}
            </div>
          ) : (
            <table className="student-history-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Method</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {visibleHistory.map((h) => (
                  <tr key={h.key} className="student-history-row">
                    <td>
                      <span className="history-date">{h.date}</span>
                      {h.time && <span className="history-time"> · {h.time}</span>}
                    </td>
                    <td>
                      <span className="history-subject">{h.subject}</span>
                    </td>
                    <td>
                      <span
                        className={`history-status-badge ${
                          h.status === "Present" ? "present" : h.status === "Pending" ? "late" : "absent"
                        }`}
                      >
                        {h.status}
                      </span>
                    </td>
                    <td>
                      <span className="history-method-tag">{h.method}</span>
                    </td>
                    <td>
                      <span className="room-text">{h.source}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Profile */}
      <section className="student-profile-block">
        <div className="section-title-tag">MY PROFILE</div>
        <div className="reports-table-card" style={{ padding: "18px 24px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16,
              fontSize: 14,
              color: "var(--cs-text-primary)",
            }}
          >
            {[
              ["Name", profile.name],
              ["Roll No.", profile.roll],
              ["Section", profile.section],
              ["Department", profile.department],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="room-text">{label}</div>
                <strong>{value || "—"}</strong>
              </div>
            ))}
            <div>
              <div className="room-text">Email</div>
              <strong style={{ display: "inline-flex", alignItems: "center", gap: 6, overflowWrap: "anywhere" }}>
                <Mail size={14} /> {profile.email || "—"}
              </strong>
            </div>
            <div>
              <div className="room-text">Phone</div>
              <strong style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Phone size={14} /> {profile.phone || "—"}
              </strong>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function StudentOverview() {
  const { studentId } = useParams();
  const { isDarkMode } = useTheme();
  const { sessions } = useAttendance();
  const { scheduleList } = useSchedule();
  const { attendanceThreshold } = useSettings();

  const student = studentId ? findStudent(initialStudents, studentId) : null;
  const overview = student
    ? buildStudentOverview(student, sessions, scheduleList, attendanceThreshold)
    : null;

  return (
    <div className={`dashboard-root student-view-root ${isDarkMode ? "dark-mode" : ""}`}>
      <StudentHeader />
      <main className="dashboard-main">
        <DemoNotice />
        {!studentId ? (
          <StudentChooser />
        ) : !overview ? (
          <div
            className="student-unavailable"
            style={{ padding: 40, textAlign: "center", color: "var(--cs-text-muted)" }}
          >
            <h2 style={{ color: "var(--cs-text-primary)", marginBottom: 8 }}>
              Student record unavailable
            </h2>
            <p style={{ marginBottom: 16 }}>This demo student could not be found.</p>
            <Link to="/student/preview" className="btn-view-session" style={{ textDecoration: "none" }}>
              <span>Choose a demo student</span>
            </Link>
          </div>
        ) : (
          <StudentOverviewContent
            key={student.id}
            overview={overview}
            threshold={attendanceThreshold}
          />
        )}
      </main>
    </div>
  );
}

export default StudentOverview;
