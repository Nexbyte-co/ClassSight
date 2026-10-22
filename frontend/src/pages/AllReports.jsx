import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Sun,
  Moon,
  Search,
  ChevronRight,
  ArrowLeft,
  X,
  ScanFace,
  Menu,
  AlertCircle,
} from "lucide-react";
import "./Dashboard.css";
import "./Reports.css";
import { useTheme } from "../context/ThemeContext";
import { useSettings } from "../context/SettingsContext";
import AppNavigationDrawer from "../components/AppNavigationDrawer";
import TeacherProfileMenu from "../components/TeacherProfileMenu";
import TeacherNotificationsMenu from "../components/TeacherNotificationsMenu";
import { useDialogA11y } from "../hooks/useDialogA11y";

function AllReports() {
  const navigate = useNavigate();

  // Dark mode state
  const { isDarkMode, toggleDarkMode } = useTheme();
  // Attendance requirement from Settings (default 75%)
  const { attendanceThreshold } = useSettings();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name-asc");
  const [filterCourse, setFilterCourse] = useState("all");

  // Student Breakdown Modal State
  const [activeModalLecture, setActiveModalLecture] = useState(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");

  // All Recorded Lectures for Professor Jhonsy (Expanded list)
  const allRecordedLectures = [
    {
      id: "lec-1",
      course: "Data Structures",
      code: "UCE301",
      section: "3C2",
      time: "08:00–08:50",
      room: "LP402",
      attendancePct: 86,
      totalLectures: 28,
    },
    {
      id: "lec-2",
      course: "Database Systems",
      code: "UCE305",
      section: "3C2",
      time: "10:00–10:50",
      room: "LP402",
      attendancePct: 82,
      totalLectures: 26,
    },
    {
      id: "lec-3",
      course: "Operating Systems",
      code: "UCE304",
      section: "3C1",
      time: "02:00–02:50",
      room: "LT101",
      attendancePct: 91,
      totalLectures: 30,
    },
    {
      id: "lec-4",
      course: "Computer Networks",
      code: "UCE308",
      section: "3C1",
      time: "11:00–11:50",
      room: "LT102",
      attendancePct: 88,
      totalLectures: 25,
    },
    {
      id: "lec-5",
      course: "Algorithm Design",
      code: "UCE312",
      section: "3C2",
      time: "09:00–09:50",
      room: "LP402",
      attendancePct: 79,
      totalLectures: 27,
    },
    {
      id: "lec-6",
      course: "Software Engineering",
      code: "UCE315",
      section: "3C3",
      time: "03:00–03:50",
      room: "LT201",
      attendancePct: 84,
      totalLectures: 24,
    },
    {
      id: "lec-7",
      course: "Data Structures Lab",
      code: "UCE301L",
      section: "3C2",
      time: "04:00–05:40",
      room: "CSLab-3",
      attendancePct: 94,
      totalLectures: 14,
    },
  ];

  const studentRoster = [
    { roll: "3C2-001", name: "Aarav Sharma", attended: 25, total: 28 },
    { roll: "3C2-002", name: "Ananya Gupta", attended: 26, total: 28 },
    { roll: "3C2-003", name: "Devansh Patel", attended: 19, total: 28 },
    { roll: "3C2-004", name: "Isha Malhotra", attended: 27, total: 28 },
    { roll: "3C2-005", name: "Kabir Mehta", attended: 20, total: 28 },
    { roll: "3C2-006", name: "Meera Nair", attended: 24, total: 28 },
    { roll: "3C2-007", name: "Rohan Verma", attended: 28, total: 28 },
    { roll: "3C2-008", name: "Sanya Chawla", attended: 18, total: 28 },
    { roll: "3C2-009", name: "Tanmay Joshi", attended: 23, total: 28 },
    { roll: "3C2-010", name: "Zoya Khan", attended: 25, total: 28 },
  ];

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
      if (sortBy === "att-high") return b.attendancePct - a.attendancePct;
      if (sortBy === "att-low") return a.attendancePct - b.attendancePct;
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
    <div className={`reports-root teacher-ui ${isDarkMode ? "dark-mode" : ""}`}>
      {/* ================= HEADER ================= */}
      <header className="dashboard-header">
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

          <Link to="/dashboard" className="brand-link">
            <div className="brand-icon">
              <ScanFace size={20} strokeWidth={2.2} />
            </div>
            <span className="brand-name">ClassSight</span>
          </Link>
        </div>

        <div className="header-right">
          <button
            className="header-icon-btn"
            onClick={toggleDarkMode}
            aria-label="Toggle color theme"
          >
            {isDarkMode ? <Sun size={19} strokeWidth={1.8} /> : <Moon size={19} strokeWidth={1.8} />}
          </button>

          {/* Notifications (demo content) */}
          <TeacherNotificationsMenu
            items={[{ id: 1, title: "Monthly Report Ready", text: "August attendance consolidated for 3C2." }]}
            open={isNotificationsOpen}
            onOpenChange={(open) => {
              setIsNotificationsOpen(open);
              if (open) setIsProfileOpen(false);
            }}
          />

          <TeacherProfileMenu
            open={isProfileOpen}
            onOpenChange={(open) => {
              setIsProfileOpen(open);
              if (open) setIsNotificationsOpen(false);
            }}
          />
        </div>
      </header>

      {/* ================= MAIN SHELL ================= */}
      <div className="dashboard-body">
        {/* Navigation Drawer */}
        <AppNavigationDrawer
          isOpen={isNavOpen}
          onClose={() => setIsNavOpen(false)}
          activePage="reports"
        />

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
                  <option value="Data Structures">Data Structures</option>
                  <option value="Database Systems">Database Systems</option>
                  <option value="Operating Systems">Operating Systems</option>
                  <option value="Computer Networks">Computer Networks</option>
                  <option value="Algorithm Design">Algorithm Design</option>
                  <option value="Software Engineering">Software Engineering</option>
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
                No recorded lectures found matching your criteria.
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
                    <span className="attendance-pct-badge">{lec.attendancePct}%</span>
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
      </div>

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
                      const pct = Math.round((student.attended / student.total) * 100);
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
    </div>
  );
}

export default AllReports;

