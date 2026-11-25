import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Search,
  ChevronRight,
  ArrowLeft,
  X,
  AlertCircle,
} from "lucide-react";
import "../../styles/Dashboard.css";
import "../../styles/Reports.css";
import { useSettings } from "../../context/settings/SettingsContext";
import TeacherShell from "../../components/navigation/TeacherShell";
import { useDialogA11y } from "../../hooks/useDialogA11y";
import { useReports } from "./useReports";

function AllReports() {
  const navigate = useNavigate();

  // Dark mode state
  // Attendance requirement from Settings (default 75%)
  const { attendanceThreshold } = useSettings();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name-asc");
  const [filterCourse, setFilterCourse] = useState("all");

  // Student Breakdown Modal State
  const [activeModalLecture, setActiveModalLecture] = useState(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");

  // One row per class of this teacher, from their real saved attendance
  const { BATCHES, SEMESTER_START, SEMESTER_END, studentRows, loading, error } = useReports();
  const allRecordedLectures = BATCHES.map((b) => {
    const slot = b.lectures[0];
    const hhmm = (t) => String(t).slice(0, 5);
    return {
      id: `class-${b.id}`,
      batchIndex: b.index,
      course: b.name,
      code: b.code,
      section: b.group,
      time: slot ? `${hhmm(slot.start_time)}–${hhmm(slot.end_time)}` : "No slot yet",
      room: slot?.room || "—",
      attendancePct: b.avg,
      totalLectures: b.sessions.length,
    };
  });
  const courseNames = [...new Set(allRecordedLectures.map((l) => l.course))].sort();

  // Students of the class whose breakdown is open: attended / held over all saved sessions
  const studentRoster = activeModalLecture
    ? studentRows(activeModalLecture.batchIndex, false, SEMESTER_START, SEMESTER_END).map((r) => ({
        roll: r.roll,
        name: r.name,
        attended: r.a,
        total: r.h,
      }))
    : [];

  const filteredLectures = allRecordedLectures
    .filter((lec) => {
      const matchSearch =
        lec.course.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lec.section.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lec.room.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lec.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCourse =
        filterCourse === "all" || lec.course.toLowerCase() === filterCourse.toLowerCase();
      return matchSearch && matchCourse;
    })
    .sort((a, b) => {
      if (sortBy === "name-asc") return a.course.localeCompare(b.course);
      if (sortBy === "name-desc") return b.course.localeCompare(a.course);
      if (sortBy === "att-high") return (b.attendancePct ?? -1) - (a.attendancePct ?? -1);
      if (sortBy === "att-low") return (a.attendancePct ?? 101) - (b.attendancePct ?? 101);
      return 0;
    });

  const handleOpenCourseTotalReport = (lec) => {
    navigate(
      `/reports/details?mode=total&course=${encodeURIComponent(lec.course)}&section=${encodeURIComponent(lec.section)}`
    );
  };

  // Accessible modal behaviour (focus in, Tab trapped, Escape closes, focus returned)
  const studentDialogRef = useDialogA11y(Boolean(activeModalLecture), () => setActiveModalLecture(null));

  return (
    <TeacherShell active="reports" rootClassName="reports-root">

        {/* Content */}
        <main className="reports-main">
          {/* Back breadcrumb */}
          <div style={{ marginBottom: 20 }}>
            <Link to="/reports" className="btn-back-breadcrumb">
              <ArrowLeft size={16} />
              <span>Back to Reports</span>
            </Link>
          </div>

          <div className="reports-page-header">
            <h1 className="reports-title">
              <BarChart3 size={28} color="var(--cs-crimson)" strokeWidth={2.2} />
              <span>All Recorded Lectures</span>
            </h1>
            <p className="reports-subtitle">Comprehensive history across all your assigned courses and sections</p>
          </div>

          <div className="reports-divider" />

          {/* Search bar */}
          <div className="reports-search-bar">
            <Search size={18} className="reports-search-icon" />
            <input
              type="text"
              placeholder="Search course / section / room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="reports-search-input"
            />
          </div>

          {/* Controls Bar */}
          <div className="reports-controls-bar">
            <div className="controls-group">
              <div className="control-item">
                <span>Sort by:</span>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="name-asc">Course A–Z</option>
                  <option value="name-desc">Course Z–A</option>
                  <option value="att-high">Attendance (High to Low)</option>
                  <option value="att-low">Attendance (Low to High)</option>
                </select>
              </div>

              <div className="control-item">
                <span>Group by:</span>
                <select defaultValue="course">
                  <option value="course">Course</option>
                  <option value="section">Section</option>
                </select>
              </div>
            </div>

            <div className="controls-group">
              <div className="control-item">
                <span>Filter:</span>
                <select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)}>
                  <option value="all">All Courses</option>
                  {courseNames.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Full Table */}
          <div className="reports-table-card">
            <div className="reports-table-header">
              <div>COURSE &amp; SECTION</div>
              <div>TIME / ROOM</div>
              <div>ATTENDANCE</div>
            </div>

            {filteredLectures.length === 0 ? (
              <div style={{ padding: "32px", textAlign: "center", color: "var(--cs-text-muted)" }}>
                {loading ? "Loading…" : error ? `We couldn't load your classes: ${error}` : allRecordedLectures.length ? "No classes match your search." : "You have no classes yet."}
              </div>
            ) : (
              filteredLectures.map((lec) => (
                <div key={lec.id} className="reports-table-row">
                  <div>
                    <button
                      type="button"
                      className="course-section-btn"
                      onClick={() => handleOpenCourseTotalReport(lec)}
                      title="Click to view total recorded lecture info"
                    >
                      <span className="course-title-text">
                        {lec.course}
                        <span className="section-chip">{lec.section}</span>
                      </span>
                      <span style={{ fontSize: 12, color: "var(--cs-text-muted)" }}>
                        {lec.code}
                      </span>
                    </button>
                  </div>

                  <div className="time-room-info">
                    <span className="time-text">{lec.time}</span>
                    <span className="room-text">{lec.room}</span>
                  </div>

                  <div className="attendance-action-cell">
                    <span className="attendance-pct-badge">{lec.attendancePct == null ? "—" : `${lec.attendancePct}%`}</span>
                    <button
                      type="button"
                      className="btn-view-session"
                      onClick={() => setActiveModalLecture(lec)}
                    >
                      <span>View</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>

      {/* Student Breakdown Modal */}
      {activeModalLecture && (
        <div className="cs-modal-backdrop" onClick={() => setActiveModalLecture(null)}>
          <div className="student-modal-card" ref={studentDialogRef} role="dialog" aria-modal="true" tabIndex={-1} aria-label={`${activeModalLecture.course} student attendance`} onClick={(e) => e.stopPropagation()}>
            <div className="cs-modal-header">
              <div>
                <h3>
                  {activeModalLecture.course} ({activeModalLecture.section})
                </h3>
                <p>Enrolled Student Attendance Breakdown</p>
                <div className="criteria-pill">
                  <AlertCircle size={14} />
                  <span>Criteria: Students below {attendanceThreshold}% attendance are Detained</span>
                </div>
              </div>
              <button
                type="button"
                className="cs-modal-close"
                onClick={() => setActiveModalLecture(null)}
                aria-label="Close"
              >
                <X size={19} />
              </button>
            </div>

            <div style={{ marginTop: 12 }}>
              <input
                type="text"
                placeholder="Filter student by name or roll number..."
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
                className="picker-select"
                style={{ height: 38, fontSize: 13 }}
              />
            </div>

            <div className="student-list-container">
              <table className="student-list-table">
                <thead>
                  <tr>
                    <th>Roll No</th>
                    <th>Student Name</th>
                    <th>Attendance</th>
                    <th>Percentage</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {studentRoster
                    .filter(
                      (s) =>
                        s.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
                        s.roll.toLowerCase().includes(studentSearchQuery.toLowerCase())
                    )
                    .map((student) => {
                      const pct = student.total > 0 ? Math.round((student.attended / student.total) * 100) : 0;
                      const isDetained = pct < attendanceThreshold;
                      return (
                        <tr key={student.roll}>
                          <td style={{ fontWeight: 600 }}>{student.roll}</td>
                          <td>{student.name}</td>
                          <td>
                            {student.attended} / {student.total}
                          </td>
                          <td style={{ fontWeight: 700 }}>{pct}%</td>
                          <td>
                            {isDetained ? (
                              <span className="badge-detained">Detained</span>
                            ) : (
                              <span className="badge-eligible">Eligible</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            <div className="cs-modal-actions" style={{ marginTop: "auto" }}>
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setActiveModalLecture(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </TeacherShell>
  );
}

export default AllReports;

