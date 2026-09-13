// src/pages/Classes.jsx
import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sun,
  Moon,
  Bell,
  ChevronDown,
  LogOut,
  Settings,
  Search,
  X,
  ScanFace,
  Menu,
  User,
  BookOpen,
  Clock,
  MapPin,
  Users,
  Calendar,
  Check,
  ChevronRight,
} from "lucide-react";
import "./Dashboard.css";
import "./Classes.css";
import { useTheme } from "../context/ThemeContext";
import AppNavigationDrawer from "../components/AppNavigationDrawer";

// Mock course/class data the teacher is responsible for
const mockClasses = [
  {
    id: "cls-1",
    title: "Data Structures",
    code: "UCE301",
    section: "3C2",
    department: "Computer Science & Eng.",
    room: "LP402",
    schedule: [
      { day: "Monday", time: "08:00 AM – 08:50 AM" },
      { day: "Wednesday", time: "08:00 AM – 08:50 AM" },
      { day: "Friday", time: "08:00 AM – 08:50 AM" },
    ],
    totalStudents: 50,
    totalLectures: 28,
    avgAttendance: 86,
    semester: "6th Semester",
    credits: 4,
    color: "#7a1515",
  },
  {
    id: "cls-2",
    title: "Operating Systems",
    code: "UCE304",
    section: "3C1",
    department: "Computer Science & Eng.",
    room: "LT101",
    schedule: [
      { day: "Tuesday", time: "10:00 AM – 10:50 AM" },
      { day: "Thursday", time: "10:00 AM – 10:50 AM" },
    ],
    totalStudents: 48,
    totalLectures: 22,
    avgAttendance: 91,
    semester: "6th Semester",
    credits: 3,
    color: "#1b5e20",
  },
  {
    id: "cls-3",
    title: "Database Management",
    code: "UCE305",
    section: "3C2",
    department: "Computer Science & Eng.",
    room: "LP402",
    schedule: [
      { day: "Monday", time: "02:00 PM – 02:50 PM" },
      { day: "Thursday", time: "02:00 PM – 02:50 PM" },
    ],
    totalStudents: 50,
    totalLectures: 20,
    avgAttendance: 82,
    semester: "6th Semester",
    credits: 3,
    color: "#1565c0",
  },
  {
    id: "cls-4",
    title: "Discrete Mathematics",
    code: "UMA301",
    section: "3C2",
    department: "Mathematics",
    room: "LP403",
    schedule: [
      { day: "Tuesday", time: "09:00 AM – 09:50 AM" },
      { day: "Friday", time: "09:00 AM – 09:50 AM" },
    ],
    totalStudents: 50,
    totalLectures: 18,
    avgAttendance: 78,
    semester: "6th Semester",
    credits: 3,
    color: "#6a1b9a",
  },
  {
    id: "cls-5",
    title: "Computer Networks",
    code: "UCE306",
    section: "4C1",
    department: "Computer Science & Eng.",
    room: "LT203",
    schedule: [
      { day: "Wednesday", time: "11:00 AM – 11:50 AM" },
      { day: "Friday", time: "11:00 AM – 11:50 AM" },
    ],
    totalStudents: 44,
    totalLectures: 16,
    avgAttendance: 88,
    semester: "7th Semester",
    credits: 3,
    color: "#e65100",
  },
];

const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function Classes() {
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useTheme();

  // Navigation drawer state
  const [isNavOpen, setIsNavOpen] = useState(false);

  // Profile & notification dropdowns
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSection, setFilterSection] = useState("all");

  // Selected class details panel
  const [selectedClass, setSelectedClass] = useState(null);

  const sections = useMemo(() => {
    const s = new Set(mockClasses.map((c) => c.section));
    return ["all", ...Array.from(s).sort()];
  }, []);

  const filteredClasses = useMemo(() => {
    return mockClasses.filter((cls) => {
      const matchesSearch =
        cls.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cls.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cls.section.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cls.room.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSection =
        filterSection === "all" || cls.section === filterSection;
      return matchesSearch && matchesSection;
    });
  }, [searchQuery, filterSection]);

  // Summary metrics
  const totalCourses = mockClasses.length;
  const totalStudentsAll = mockClasses.reduce(
    (sum, c) => sum + c.totalStudents,
    0
  );
  const avgAttendanceAll =
    mockClasses.length > 0
      ? Math.round(
          mockClasses.reduce((sum, c) => sum + c.avgAttendance, 0) /
            mockClasses.length
        )
      : 0;
  const totalLecturesAll = mockClasses.reduce(
    (sum, c) => sum + c.totalLectures,
    0
  );

  const handleSignOut = () => {
    navigate("/");
  };

  return (
    <div className={`dashboard-root ${isDarkMode ? "dark-mode" : ""}`}>
      {/* ================= HEADER ================= */}
      <header className="dashboard-header">
        <div className="header-left">
          <button
            type="button"
            className="hamburger-nav-btn"
            onClick={() => setIsNavOpen(!isNavOpen)}
            aria-label={
              isNavOpen ? "Close navigation menu" : "Open navigation menu"
            }
            title={isNavOpen ? "Close navigation" : "Open navigation"}
          >
            {isNavOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <Link to="/dashboard" className="brand-link">
            <div className="brand-icon">
              <ScanFace size={20} strokeWidth={2.2} />
            </div>
            <span className="brand-name">ClassSight</span>
          </Link>

          <span className="header-crumb-sep">/</span>
          <span className="header-crumb-current">Classes</span>
        </div>

        <div className="header-right">
          {/* Dark / Light Mode Toggle */}
          <button
            className="header-icon-btn"
            onClick={toggleDarkMode}
            aria-label="Toggle color theme"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? (
              <Sun size={19} strokeWidth={1.8} />
            ) : (
              <Moon size={19} strokeWidth={1.8} />
            )}
          </button>

          {/* Notifications */}
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
                  <div className="dropdown-user-email">
                    Classroom attendance alerts
                  </div>
                </div>
                <div
                  className="dropdown-item"
                  style={{
                    flexDirection: "column",
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      color: "var(--cs-text-primary)",
                      fontSize: 13,
                    }}
                  >
                    Schedule Updated
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--cs-text-secondary)",
                      marginTop: 2,
                    }}
                  >
                    UCE301 room changed to LP402
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      color: "var(--cs-text-muted)",
                      marginTop: 4,
                    }}
                  >
                    2 hours ago
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Dropdown */}
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
                  <div className="dropdown-user-email">
                    Jhonsy.Bansal@thapar.edu
                  </div>
                </div>

                <Link
                  to="/settings"
                  className="dropdown-item"
                  onClick={() => setIsProfileOpen(false)}
                >
                  <User size={16} strokeWidth={1.8} />
                  <span>Profile Overview</span>
                </Link>

                <Link
                  to="/settings"
                  className="dropdown-item"
                  onClick={() => setIsProfileOpen(false)}
                >
                  <Settings size={16} strokeWidth={1.8} />
                  <span>Account Settings</span>
                </Link>

                <div className="dropdown-divider" />

                <button
                  type="button"
                  className="dropdown-item"
                  onClick={handleSignOut}
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
        {/* Navigation Drawer */}
        <AppNavigationDrawer
          isOpen={isNavOpen}
          onClose={() => setIsNavOpen(false)}
          activePage="classes"
        />

        {/* ================= MAIN CONTENT ================= */}
        <main className="classes-main-content">
          {/* Page Header */}
          <div className="classes-page-header">
            <div>
              <h1 className="classes-page-title">
                <BookOpen
                  size={28}
                  color="var(--cs-crimson)"
                  strokeWidth={2.2}
                />
                <span>My Classes</span>
              </h1>
              <p className="classes-page-subtitle">
                Manage your courses, sections, and lecture schedules
              </p>
            </div>

            <div className="classes-header-badge">
              <Calendar size={15} strokeWidth={2} />
              <span>Spring Term 2026</span>
            </div>
          </div>

          {/* Summary Metric Strip */}
          <div className="classes-metrics-strip">
            <div className="classes-metric-card">
              <div className="metric-icon-box total">
                <BookOpen size={20} strokeWidth={2} />
              </div>
              <div className="metric-info">
                <span className="metric-label">Total Courses</span>
                <span className="metric-value">{totalCourses}</span>
              </div>
            </div>

            <div className="classes-metric-card">
              <div className="metric-icon-box students">
                <Users size={20} strokeWidth={2} />
              </div>
              <div className="metric-info">
                <span className="metric-label">Total Students</span>
                <span className="metric-value">{totalStudentsAll}</span>
              </div>
            </div>

            <div className="classes-metric-card">
              <div className="metric-icon-box lectures">
                <Clock size={20} strokeWidth={2} />
              </div>
              <div className="metric-info">
                <span className="metric-label">Lectures Held</span>
                <span className="metric-value">{totalLecturesAll}</span>
              </div>
            </div>

            <div className="classes-metric-card">
              <div className="metric-icon-box attendance">
                <Check size={20} strokeWidth={2.5} />
              </div>
              <div className="metric-info">
                <span className="metric-label">Avg. Attendance</span>
                <span className="metric-value">{avgAttendanceAll}%</span>
              </div>
            </div>
          </div>

          {/* Controls Row: Search + Section Filter */}
          <div className="classes-controls-row">
            <div className="classes-search-box">
              <Search
                size={16}
                strokeWidth={2}
                className="classes-search-icon"
              />
              <input
                type="text"
                className="classes-search-input"
                placeholder="Search courses, codes, rooms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="classes-search-clear"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="classes-section-pills">
              {sections.map((sec) => (
                <button
                  key={sec}
                  type="button"
                  className={`section-pill ${
                    filterSection === sec ? "active" : ""
                  }`}
                  onClick={() => setFilterSection(sec)}
                >
                  {sec === "all" ? "All Sections" : sec}
                </button>
              ))}
            </div>
          </div>

          {/* Classes Grid */}
          <div className="classes-grid">
            {filteredClasses.length === 0 ? (
              <div className="classes-empty-state">
                <BookOpen size={48} strokeWidth={1.2} />
                <h3>No classes found</h3>
                <p>Try adjusting your search or filter.</p>
              </div>
            ) : (
              filteredClasses.map((cls) => (
                <div
                  key={cls.id}
                  className="class-card"
                  onClick={() => setSelectedClass(cls)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setSelectedClass(cls);
                  }}
                >
                  {/* Card Header with color accent */}
                  <div
                    className="class-card-accent"
                    style={{ background: cls.color }}
                  />

                  <div className="class-card-body">
                    <div className="class-card-top-row">
                      <span className="class-card-code">{cls.code}</span>
                      <span className="class-card-section">{cls.section}</span>
                    </div>

                    <h3 className="class-card-title">{cls.title}</h3>
                    <p className="class-card-dept">{cls.department}</p>

                    <div className="class-card-meta">
                      <div className="class-card-meta-item">
                        <MapPin size={13} strokeWidth={2} />
                        <span>{cls.room}</span>
                      </div>
                      <div className="class-card-meta-item">
                        <Users size={13} strokeWidth={2} />
                        <span>{cls.totalStudents} students</span>
                      </div>
                      <div className="class-card-meta-item">
                        <Clock size={13} strokeWidth={2} />
                        <span>
                          {cls.schedule.length}x / week
                        </span>
                      </div>
                    </div>

                    {/* Attendance bar */}
                    <div className="class-card-att-row">
                      <span className="class-card-att-label">Attendance</span>
                      <div className="class-card-att-bar-bg">
                        <div
                          className={`class-card-att-bar-fill ${
                            cls.avgAttendance >= 85
                              ? "high"
                              : cls.avgAttendance >= 70
                              ? "mid"
                              : "low"
                          }`}
                          style={{ width: `${cls.avgAttendance}%` }}
                        />
                      </div>
                      <span
                        className={`class-card-att-pct ${
                          cls.avgAttendance >= 85
                            ? "high"
                            : cls.avgAttendance >= 70
                            ? "mid"
                            : "low"
                        }`}
                      >
                        {cls.avgAttendance}%
                      </span>
                    </div>

                    {/* Schedule preview */}
                    <div className="class-card-schedule">
                      {cls.schedule
                        .sort(
                          (a, b) =>
                            dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day)
                        )
                        .map((s, i) => (
                          <span key={i} className="schedule-chip">
                            {s.day.slice(0, 3)}
                          </span>
                        ))}
                    </div>
                  </div>

                  <div className="class-card-footer">
                    <span className="class-card-credits">
                      {cls.credits} Credits · {cls.semester}
                    </span>
                    <ChevronRight
                      size={16}
                      className="class-card-arrow"
                      strokeWidth={2}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      </div>

      {/* ================= CLASS DETAIL MODAL ================= */}
      {selectedClass && (
        <div
          className="cs-modal-backdrop"
          onClick={() => setSelectedClass(null)}
        >
          <div
            className="cs-modal-card class-detail-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="class-detail-title"
          >
            {/* Modal Header */}
            <div className="class-detail-header">
              <div className="class-detail-header-left">
                <div
                  className="class-detail-color-dot"
                  style={{ background: selectedClass.color }}
                />
                <div>
                  <div className="class-detail-title-row">
                    <h2 id="class-detail-title">{selectedClass.title}</h2>
                    <span className="class-detail-code-badge">
                      {selectedClass.code}
                    </span>
                  </div>
                  <p className="class-detail-dept">
                    {selectedClass.department} · Section{" "}
                    {selectedClass.section}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="class-detail-close"
                onClick={() => setSelectedClass(null)}
                aria-label="Close class details"
              >
                <X size={20} strokeWidth={2} />
              </button>
            </div>

            {/* Info Grid */}
            <div className="class-detail-info-grid">
              <div className="detail-info-item">
                <MapPin size={16} strokeWidth={2} />
                <div>
                  <span className="detail-info-label">Room</span>
                  <span className="detail-info-value">
                    {selectedClass.room}
                  </span>
                </div>
              </div>
              <div className="detail-info-item">
                <Users size={16} strokeWidth={2} />
                <div>
                  <span className="detail-info-label">Enrolled</span>
                  <span className="detail-info-value">
                    {selectedClass.totalStudents} students
                  </span>
                </div>
              </div>
              <div className="detail-info-item">
                <BookOpen size={16} strokeWidth={2} />
                <div>
                  <span className="detail-info-label">Credits</span>
                  <span className="detail-info-value">
                    {selectedClass.credits} ({selectedClass.semester})
                  </span>
                </div>
              </div>
              <div className="detail-info-item">
                <Clock size={16} strokeWidth={2} />
                <div>
                  <span className="detail-info-label">Lectures Held</span>
                  <span className="detail-info-value">
                    {selectedClass.totalLectures}
                  </span>
                </div>
              </div>
            </div>

            {/* Attendance Stat */}
            <div
              className={`class-detail-att-strip ${
                selectedClass.avgAttendance >= 85
                  ? "high"
                  : selectedClass.avgAttendance >= 70
                  ? "mid"
                  : "low"
              }`}
            >
              <div className="att-strip-left">
                <span className="att-strip-label">Average Attendance</span>
                <span className="att-strip-value">
                  {selectedClass.avgAttendance}%
                </span>
              </div>
              <div className="att-strip-bar-bg">
                <div
                  className="att-strip-bar-fill"
                  style={{ width: `${selectedClass.avgAttendance}%` }}
                />
              </div>
            </div>

            {/* Weekly Schedule Table */}
            <div className="class-detail-schedule-section">
              <h3 className="detail-section-title">
                <Calendar size={16} strokeWidth={2} />
                <span>Weekly Schedule</span>
              </h3>
              <div className="detail-schedule-table-wrap">
                <table className="detail-schedule-table">
                  <thead>
                    <tr>
                      <th>Day</th>
                      <th>Time Slot</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedClass.schedule
                      .sort(
                        (a, b) =>
                          dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day)
                      )
                      .map((s, i) => (
                        <tr key={i}>
                          <td>
                            <span className="schedule-day-badge">
                              {s.day}
                            </span>
                          </td>
                          <td>{s.time}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="class-detail-footer">
              <button
                type="button"
                className="btn-class-detail-close"
                onClick={() => setSelectedClass(null)}
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

export default Classes;
