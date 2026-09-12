import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Camera,
  GraduationCap,
  BarChart3,
  Settings,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  LogOut,
  Search,
  ChevronRight,
  ArrowLeft,
  X,
  ScanFace,
  Menu,
  User,
  AlertCircle,
} from "lucide-react";
import "./Dashboard.css";
import "./Reports.css";
import { useTheme } from "../context/ThemeContext";

function AllReports() {
  const navigate = useNavigate();

  // Dark mode state
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

  return (
    <div className={`reports-root ${isDarkMode ? "dark-mode" : ""}`}>
      {/* ================= HEADER ================= */}
      <header className="dashboard-header">
        <div className="header-left">
          <button
            className="mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation"
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
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

          <div style={{ position: "relative" }}>
            <button
              className="header-icon-btn"
              onClick={() => {
                setIsNotificationsOpen(!isNotificationsOpen);
                setIsProfileOpen(false);
              }}
              aria-label="Notifications"
            >
              <Bell size={19} strokeWidth={1.8} />
              <span className="notification-badge" />
            </button>

            {isNotificationsOpen && (
              <div className="dropdown-menu">
                <div className="dropdown-user-header">
                  <div className="dropdown-user-name">Notifications</div>
                  <div className="dropdown-user-email">Classroom attendance alerts</div>
                </div>
                <div className="dropdown-item" style={{ flexDirection: "column", alignItems: "flex-start" }}>
                  <div style={{ fontWeight: 600, color: "var(--cs-text-primary)", fontSize: 13 }}>
                    Monthly Report Ready
                  </div>
                  <div style={{ fontSize: 12, color: "var(--cs-text-secondary)", marginTop: 2 }}>
                    August attendance consolidated for 3C2.
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="user-profile-wrapper">
            <button
              className="profile-trigger"
              onClick={() => {
                setIsProfileOpen(!isProfileOpen);
                setIsNotificationsOpen(false);
              }}
              aria-label="User menu"
            >
              <div className="profile-avatar">PJ</div>
              <span className="profile-name">Professor Jhonsy</span>
              <ChevronDown
                size={16}
                strokeWidth={2}
                className={`profile-chevron ${isProfileOpen ? "open" : ""}`}
              />
            </button>

            {isProfileOpen && (
              <div className="dropdown-menu">
                <div className="dropdown-user-header">
                  <div className="dropdown-user-name">Professor Jhonsy</div>
                  <div className="dropdown-user-email">Jhonsy.Bansal@thapar.edu</div>
                </div>

                <Link to="/settings" className="dropdown-item" onClick={() => setIsProfileOpen(false)}>
                  <User size={16} strokeWidth={1.8} />
                  <span>Profile Overview</span>
                </Link>

                <Link to="/settings" className="dropdown-item" onClick={() => setIsProfileOpen(false)}>
                  <Settings size={16} strokeWidth={1.8} />
                  <span>Account Settings</span>
                </Link>

                <div className="dropdown-divider" />

                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => navigate("/")}
                  style={{ color: "#dc2626" }}
                >
                  <LogOut size={16} strokeWidth={1.8} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ================= MAIN SHELL ================= */}
      <div className="dashboard-body">
        {/* Sidebar */}
        <aside className={`dashboard-sidebar ${isMobileMenuOpen ? "mobile-open" : ""}`}>
          <nav className="sidebar-nav">
            <Link to="/dashboard" className="nav-link" onClick={() => setIsMobileMenuOpen(false)}>
              <LayoutDashboard size={19} strokeWidth={1.8} />
              <span>Dashboard</span>
            </Link>

            <Link to="/attendance" className="nav-link" onClick={() => setIsMobileMenuOpen(false)}>
              <Camera size={19} strokeWidth={1.8} />
              <span>Attendance</span>
            </Link>

            <Link to="/students" className="nav-link" onClick={() => setIsMobileMenuOpen(false)}>
              <GraduationCap size={19} strokeWidth={1.8} />
              <span>Students</span>
            </Link>

            <Link to="/reports" className="nav-link active" onClick={() => setIsMobileMenuOpen(false)}>
              <BarChart3 size={19} strokeWidth={2} />
              <span>Reports</span>
            </Link>

            <Link to="/settings" className="nav-link" onClick={() => setIsMobileMenuOpen(false)}>
              <Settings size={19} strokeWidth={1.8} />
              <span>Settings</span>
            </Link>
          </nav>

          <div className="sidebar-footer">
            <div className="term-info-badge">
              <strong>Spring Term 2026</strong>
              <span>CSE Dept. · Semester 6</span>
            </div>

            <button type="button" className="sidebar-logout" onClick={() => navigate("/")}>
              <LogOut size={17} strokeWidth={1.8} />
              <span>Log Out</span>
            </button>
          </div>
        </aside>

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
          <div className="student-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="cs-modal-header">
              <div>
                <h3>
                  {activeModalLecture.course} ({activeModalLecture.section})
                </h3>
                <p>Enrolled Student Attendance Breakdown</p>
                <div className="criteria-pill">
                  <AlertCircle size={14} />
                  <span>Criteria: Students below 75% attendance are Detained</span>
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
                      const isDetained = pct < 75;
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

