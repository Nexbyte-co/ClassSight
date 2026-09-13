import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Settings,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  LogOut,
  Search,
  ChevronRight,
  ChevronLeft,
  Calendar as CalendarIcon,
  X,
  ScanFace,
  Menu,
  User,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";
import "./Dashboard.css";
import "./Reports.css";
import { useTheme } from "../context/ThemeContext";
import AppNavigationDrawer from "../components/AppNavigationDrawer";

function Reports() {
  const navigate = useNavigate();

  // Global dark mode from ThemeContext
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Search & Filter state for Recorded Lectures
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name-asc");
  const [filterCourse, setFilterCourse] = useState("all");

  // Custom Report Form State
  const [customCourse, setCustomCourse] = useState("Data Structures");
  const [customSection, setCustomSection] = useState("3C2");
  const [fromDate, setFromDate] = useState("01 Sep 2026");
  const [toDate, setToDate] = useState("05 Sep 2026");

  // Interactive Calendar Navigation & Range Selection
  const [viewMonth, setViewMonth] = useState(8); // 8 = September (0-indexed)
  const [viewYear, setViewYear] = useState(2026);
  const [rangeStart, setRangeStart] = useState(new Date(2026, 8, 1));
  const [rangeEnd, setRangeEnd] = useState(new Date(2026, 8, 5));
  const [isPickingEnd, setIsPickingEnd] = useState(false);

  // Student Breakdown Modal State
  const [activeModalLecture, setActiveModalLecture] = useState(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");

  const monthNames = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
  ];
  const monthShortNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  const formatDateString = (date) => {
    if (!date) return "";
    const d = String(date.getDate()).padStart(2, "0");
    const m = monthShortNames[date.getMonth()];
    const y = date.getFullYear();
    return `${d} ${m} ${y}`;
  };

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  // Calendar Day Click Logic
  const handleCalendarDayClick = (dayNum) => {
    if (dayNum === null) return;
    const clickedDate = new Date(viewYear, viewMonth, dayNum);

    if (!isPickingEnd) {
      // First click: select new start date
      setRangeStart(clickedDate);
      setRangeEnd(clickedDate);
      setFromDate(formatDateString(clickedDate));
      setToDate(formatDateString(clickedDate));
      setIsPickingEnd(true);
    } else {
      // Second click: select end date
      if (clickedDate < rangeStart) {
        // Swapped if earlier
        setRangeStart(clickedDate);
        setRangeEnd(rangeStart);
        setFromDate(formatDateString(clickedDate));
        setToDate(formatDateString(rangeStart));
      } else {
        setRangeEnd(clickedDate);
        setToDate(formatDateString(clickedDate));
      }
      setIsPickingEnd(false);
    }
  };

  // Sample Recorded Lectures Data
  const recordedLectures = [
    {
      id: "lec-1",
      course: "Data Structures",
      code: "UCE301",
      section: "3C2",
      time: "08:00–08:50",
      room: "LP402",
      attendancePct: 86,
      totalStudents: 50,
      presentStudents: 43,
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
      totalStudents: 50,
      presentStudents: 41,
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
      totalStudents: 48,
      presentStudents: 44,
      totalLectures: 30,
    },
  ];

  // Sample Student Roster Data for Modal
  const studentRoster = [
    { roll: "3C2-001", name: "Aarav Sharma", attended: 25, total: 28 },
    { roll: "3C2-002", name: "Ananya Gupta", attended: 26, total: 28 },
    { roll: "3C2-003", name: "Devansh Patel", attended: 19, total: 28 }, // < 75%
    { roll: "3C2-004", name: "Isha Malhotra", attended: 27, total: 28 },
    { roll: "3C2-005", name: "Kabir Mehta", attended: 20, total: 28 }, // < 75%
    { roll: "3C2-006", name: "Meera Nair", attended: 24, total: 28 },
    { roll: "3C2-007", name: "Rohan Verma", attended: 28, total: 28 },
    { roll: "3C2-008", name: "Sanya Chawla", attended: 18, total: 28 }, // < 75%
    { roll: "3C2-009", name: "Tanmay Joshi", attended: 23, total: 28 },
    { roll: "3C2-010", name: "Zoya Khan", attended: 25, total: 28 },
  ];

  // Filtered & Sorted Recorded Lectures
  const filteredLectures = recordedLectures
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

  // Navigate to Report Details (All-time vs Range)
  const handleOpenCourseTotalReport = (lec) => {
    navigate(
      `/reports/details?mode=total&course=${encodeURIComponent(lec.course)}&section=${encodeURIComponent(lec.section)}`
    );
  };

  const handleGenerateCustomReport = (e) => {
    e.preventDefault();
    navigate(
      `/reports/details?mode=range&course=${encodeURIComponent(customCourse)}&section=${encodeURIComponent(customSection)}&from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}`
    );
  };

  // Dynamic calendar grid generation for viewMonth & viewYear
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  // Monday start offset: 0 for Monday, 6 for Sunday
  const leadingOffset = (firstDay + 6) % 7;

  const calendarGridDays = [];
  for (let i = 0; i < leadingOffset; i++) {
    calendarGridDays.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarGridDays.push(d);
  }

  return (
    <div className={`reports-root ${isDarkMode ? "dark-mode" : ""}`}>
      {/* ================= HEADER ================= */}
      <header className="dashboard-header">
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
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
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
        {/* Navigation Drawer */}
        <AppNavigationDrawer
          isOpen={isNavOpen}
          onClose={() => setIsNavOpen(false)}
          activePage="reports"
        />

        {/* ================= REPORTS CONTENT ================= */}
        <main className="reports-main">
          {/* Header */}
          <div className="reports-page-header">
            <h1 className="reports-title">
              <BarChart3 size={28} color="var(--cs-crimson)" strokeWidth={2.2} />
              <span>Reports</span>
            </h1>
            <p className="reports-subtitle">Attendance records &amp; report generation</p>
          </div>

          <div className="reports-divider" />

          {/* ================= SECTION 1: RECORDED LECTURES ================= */}
          <section>
            <div className="section-title-tag">RECORDED LECTURES</div>
            <div className="section-desc">Completed attendance sessions</div>

            {/* Search Input */}
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
                  </select>
                </div>
              </div>
            </div>

            {/* Recorded Lectures Table */}
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
                    {/* Combined Course & Section Button */}
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

                    {/* Time / Room */}
                    <div className="time-room-info">
                      <span className="time-text">{lec.time}</span>
                      <span className="room-text">{lec.room}</span>
                    </div>

                    {/* Attendance & View Action */}
                    <div className="attendance-action-cell">
                      <span className="attendance-pct-badge">{lec.attendancePct}%</span>
                      <button
                        type="button"
                        className="btn-view-session"
                        onClick={() => setActiveModalLecture(lec)}
                        title="View student list & attendance eligibility"
                      >
                        <span>View</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Read more Link */}
            <div className="read-more-wrapper">
              <button
                type="button"
                className="btn-read-more"
                onClick={() => navigate("/reports/all")}
              >
                <span>Read more →</span>
              </button>
            </div>
          </section>

          <div className="reports-divider" />

          {/* ================= SECTION 2: GENERATE CUSTOM REPORT ================= */}
          <section className="custom-report-section">
            <div className="section-title-tag">GENERATE CUSTOM REPORT</div>
            <div className="section-desc">Generate a detailed report for a specific course &amp; section</div>

            <form onSubmit={handleGenerateCustomReport}>
              {/* Selectors Row */}
              <div className="report-pickers-row">
                <div className="picker-field-box">
                  <label htmlFor="select-course" className="picker-field-label">
                    COURSE
                  </label>
                  <select
                    id="select-course"
                    value={customCourse}
                    onChange={(e) => setCustomCourse(e.target.value)}
                    className="picker-select"
                  >
                    <option value="Data Structures">Data Structures</option>
                    <option value="Database Systems">Database Systems</option>
                    <option value="Operating Systems">Operating Systems</option>
                  </select>
                </div>

                <div className="picker-field-box">
                  <label htmlFor="select-section" className="picker-field-label">
                    SECTION
                  </label>
                  <select
                    id="select-section"
                    value={customSection}
                    onChange={(e) => setCustomSection(e.target.value)}
                    className="picker-select"
                  >
                    <option value="3C2">3C2</option>
                    <option value="3C1">3C1</option>
                    <option value="3C3">3C3</option>
                  </select>
                </div>
              </div>

              {/* Date Inputs Row */}
              <div className="report-pickers-row">
                <div className="picker-field-box">
                  <label htmlFor="from-date-input" className="picker-field-label">
                    FROM
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      id="from-date-input"
                      type="text"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="picker-date-input"
                    />
                    <CalendarIcon
                      size={16}
                      style={{ position: "absolute", right: 14, top: 15, color: "var(--cs-text-muted)" }}
                    />
                  </div>
                </div>

                <div className="picker-field-box">
                  <label htmlFor="to-date-input" className="picker-field-label">
                    TO
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      id="to-date-input"
                      type="text"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="picker-date-input"
                    />
                    <CalendarIcon
                      size={16}
                      style={{ position: "absolute", right: 14, top: 15, color: "var(--cs-text-muted)" }}
                    />
                  </div>
                </div>
              </div>

              {/* Interactive Calendar Widget */}
              <div className="calendar-widget-container">
                <div className="calendar-header">
                  <button
                    type="button"
                    className="calendar-nav-btn"
                    onClick={handlePrevMonth}
                    aria-label="Previous Month"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="calendar-month-title">
                    {monthNames[viewMonth]} {viewYear}
                  </span>
                  <button
                    type="button"
                    className="calendar-nav-btn"
                    onClick={handleNextMonth}
                    aria-label="Next Month"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                <div className="calendar-hint-text">
                  {isPickingEnd ? (
                    <span className="active-hint">● Click second date to complete range (or click same date for single day)</span>
                  ) : (
                    <span>Click any date to select a start date, then click an end date</span>
                  )}
                </div>

                <div className="calendar-weekdays-row">
                  <span>Mo</span>
                  <span>Tu</span>
                  <span>We</span>
                  <span>Th</span>
                  <span>Fr</span>
                  <span>Sa</span>
                  <span>Su</span>
                </div>

                <div className="calendar-grid">
                  {calendarGridDays.map((day, idx) => {
                    if (day === null) {
                      return <div key={`empty-${idx}`} className="calendar-cell disabled" />;
                    }

                    const cellTime = new Date(viewYear, viewMonth, day).setHours(0, 0, 0, 0);
                    const startTime = rangeStart ? new Date(rangeStart).setHours(0, 0, 0, 0) : null;
                    const endTime = rangeEnd ? new Date(rangeEnd).setHours(0, 0, 0, 0) : null;

                    const isStart = startTime !== null && cellTime === startTime;
                    const isEnd = endTime !== null && cellTime === endTime;
                    const inRange = startTime !== null && endTime !== null && cellTime > startTime && cellTime < endTime;

                    let classes = "calendar-cell";
                    if (isStart && isEnd) {
                      classes += " range-single";
                    } else if (isStart) {
                      classes += " range-start";
                    } else if (isEnd) {
                      classes += " range-end";
                    } else if (inRange) {
                      classes += " in-range";
                    }

                    return (
                      <button
                        key={`day-${viewYear}-${viewMonth}-${day}`}
                        type="button"
                        className={classes}
                        onClick={() => handleCalendarDayClick(day)}
                        title={`Select ${day} ${monthShortNames[viewMonth]} ${viewYear}`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Generate Report Submit Button */}
              <div className="generate-report-btn-wrapper">
                <button type="submit" className="btn-generate-report">
                  <FileSpreadsheet size={18} />
                  <span>GENERATE REPORT →</span>
                </button>
              </div>
            </form>
          </section>
        </main>
      </div>

      {/* ================= STUDENT LIST BREAKDOWN MODAL ================= */}
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

            {/* Quick Search */}
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

            {/* Table */}
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

export default Reports;