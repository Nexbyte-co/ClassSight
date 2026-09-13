// src/pages/Students.jsx
import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  GraduationCap,
  Settings,
  Bell,
  Sun,
  Moon,
  LogOut,
  Search,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Calendar,
  CheckCircle2,
  AlertCircle,
  X,
  ScanFace,
  Menu,
  Eye,
  ArrowUpDown,
  Filter,
  Check,
  Radio,
  BookOpen,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import "./Dashboard.css";
import "./Students.css";
import { useTheme } from "../context/ThemeContext";
import AppNavigationDrawer from "../components/AppNavigationDrawer";
import {
  availableClasses,
  initialStudents,
  getAttendanceStatus,
} from "../data/mockStudents";

function Students() {
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useTheme();

  // Navigation & Menu States
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Filter, Search, and Sort States
  const [selectedClass, setSelectedClass] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("roll-asc");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Selected Student for Details View Modal (Task 3, Requirement 5)
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Dynamic Filter & Sort Pipeline
  const filteredAndSortedStudents = useMemo(() => {
    const list = initialStudents.filter((student) => {
      const matchesClass =
        selectedClass === "all" || student.class === selectedClass;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        student.name.toLowerCase().includes(q) ||
        student.roll.toLowerCase().includes(q);
      return matchesClass && matchesSearch;
    });

    list.sort((a, b) => {
      if (sortBy === "name-asc") return a.name.localeCompare(b.name);
      if (sortBy === "name-desc") return b.name.localeCompare(a.name);
      if (sortBy === "roll-asc") {
        return a.roll.localeCompare(b.roll, undefined, {
          numeric: true,
          sensitivity: "base",
        });
      }
      if (sortBy === "roll-desc") {
        return b.roll.localeCompare(a.roll, undefined, {
          numeric: true,
          sensitivity: "base",
        });
      }
      if (sortBy === "pct-desc") return b.attendancePct - a.attendancePct;
      if (sortBy === "pct-asc") return a.attendancePct - b.attendancePct;
      return 0;
    });

    return list;
  }, [selectedClass, searchQuery, sortBy]);

  // Pagination calculation
  const totalPages = Math.max(
    1,
    Math.ceil(filteredAndSortedStudents.length / pageSize)
  );

  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAndSortedStudents.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSortedStudents, currentPage, pageSize]);

  // Reset pagination when filter or search changes
  const handleClassChange = (classId) => {
    setSelectedClass(classId);
    setCurrentPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
    setCurrentPage(1);
  };

  // Metric summaries for current cohort
  const cohortMetrics = useMemo(() => {
    let safeCount = 0;
    let warningCount = 0;
    let criticalCount = 0;

    filteredAndSortedStudents.forEach((student) => {
      if (student.attendancePct >= 75) safeCount++;
      else if (student.attendancePct >= 65) warningCount++;
      else criticalCount++;
    });

    const avgAttendance =
      filteredAndSortedStudents.length > 0
        ? Math.round(
            filteredAndSortedStudents.reduce(
              (acc, s) => acc + s.attendancePct,
              0
            ) / filteredAndSortedStudents.length
          )
        : 0;

    return {
      total: filteredAndSortedStudents.length,
      safeCount,
      warningCount,
      criticalCount,
      avgAttendance,
    };
  }, [filteredAndSortedStudents]);

  return (
    <div className={`students-page-root ${isDarkMode ? "dark-mode" : ""}`}>
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

          <Link to="/dashboard" className="brand-link" title="ClassSight Dashboard">
            <div className="brand-icon">
              <ScanFace size={20} strokeWidth={2.2} />
            </div>
            <span className="brand-name">ClassSight</span>
          </Link>

          <span className="header-crumb-sep">/</span>
          <span className="header-crumb-current">Students</span>
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
              <div className="notifications-dropdown">
                <div className="dropdown-header">
                  <h4>Notifications</h4>
                  <span className="badge-count">1 New</span>
                </div>
                <div className="notification-list">
                  <div className="notification-item unread">
                    <div className="notif-dot" />
                    <div>
                      <p className="notif-msg">
                        Section 3C2 morning attendance completed.
                      </p>
                      <span className="notif-time">10 mins ago</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Profile */}
          <div style={{ position: "relative" }}>
            <div
              className="profile-pill"
              onClick={() => {
                setIsProfileOpen(!isProfileOpen);
                setIsNotificationsOpen(false);
              }}
            >
              <div className="profile-avatar">PJ</div>
              <span className="profile-name">Prof. Jhonsy</span>
              <ChevronDown size={14} strokeWidth={2} />
            </div>

            {isProfileOpen && (
              <div className="profile-dropdown">
                <div className="dropdown-user-info">
                  <strong>Prof. Jhonsy</strong>
                  <span>Head of CSE Department</span>
                </div>
                <div className="dropdown-divider" />
                <Link
                  to="/settings"
                  className="dropdown-item"
                  onClick={() => setIsProfileOpen(false)}
                >
                  <Settings size={16} strokeWidth={1.8} />
                  <span>Account Settings</span>
                </Link>
                <button
                  type="button"
                  className="dropdown-item text-danger"
                  onClick={() => navigate("/")}
                >
                  <LogOut size={16} strokeWidth={1.8} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Navigation Drawer */}
      <AppNavigationDrawer
        isOpen={isNavOpen}
        onClose={() => setIsNavOpen(false)}
        activePage="students"
      />

      {/* ================= MAIN CONTENT ================= */}
      <main className="students-main-content">
          {/* Header Banner */}
          <div className="students-page-header">
            <div>
              <h1 className="students-page-title">
                Student Directory & Attendance Overview
              </h1>
              <p className="students-page-subtitle">
                Class-wise student roster, multi-column sorting, live search, and comprehensive attendance history telemetry.
              </p>
            </div>

            <div className="cohort-date-badge">
              <Calendar size={15} strokeWidth={1.8} />
              <span>Academic Year 2025–2026</span>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="cohort-summary-grid">
            <div className="cohort-card">
              <div className="cohort-icon-box total">
                <GraduationCap size={22} strokeWidth={2} />
              </div>
              <div className="cohort-info">
                <span className="cohort-label">Enrolled Students</span>
                <strong className="cohort-value">{cohortMetrics.total}</strong>
              </div>
            </div>

            <div className="cohort-card">
              <div className="cohort-icon-box safe">
                <CheckCircle2 size={22} strokeWidth={2} />
              </div>
              <div className="cohort-info">
                <span className="cohort-label">Good / Safe (≥ 75%)</span>
                <strong className="cohort-value text-safe">
                  {cohortMetrics.safeCount}
                </strong>
              </div>
            </div>

            <div className="cohort-card">
              <div className="cohort-icon-box warning">
                <AlertTriangle size={22} strokeWidth={2} />
              </div>
              <div className="cohort-info">
                <span className="cohort-label">Warning (65% – 74%)</span>
                <strong className="cohort-value text-warning">
                  {cohortMetrics.warningCount}
                </strong>
              </div>
            </div>

            <div className="cohort-card">
              <div className="cohort-icon-box critical">
                <AlertCircle size={22} strokeWidth={2} />
              </div>
              <div className="cohort-info">
                <span className="cohort-label">Low / Critical (&lt; 65%)</span>
                <strong className="cohort-value text-critical">
                  {cohortMetrics.criticalCount}
                </strong>
              </div>
            </div>
          </div>

          {/* Controls Bar: Class Filter, Search, Sort (Task 3, Requirements 1, 2, 3) */}
          <div className="students-controls-card">
            {/* Class Filter Selector */}
            <div className="class-filter-group">
              <div className="filter-label">
                <Filter size={15} />
                <span>Class:</span>
              </div>
              <div className="class-pills">
                {availableClasses.map((cls) => (
                  <button
                    key={cls.id}
                    type="button"
                    className={`class-pill-btn ${
                      selectedClass === cls.id ? "active" : ""
                    }`}
                    onClick={() => handleClassChange(cls.id)}
                  >
                    {cls.id === "all" ? "All Classes" : cls.id}
                  </button>
                ))}
              </div>
            </div>

            {/* Right side controls: Search & Sort */}
            <div className="search-sort-group">
              {/* Search Field (Task 3, Requirement 3) */}
              <div className="student-search-box">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search by student name or roll number..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="search-input"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="clear-search-btn"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Multi-column Sort Dropdown (Task 3, Requirement 1) */}
              <div className="student-sort-box">
                <ArrowUpDown size={15} className="sort-icon" />
                <select
                  value={sortBy}
                  onChange={handleSortChange}
                  className="sort-select"
                  aria-label="Sort students list"
                >
                  <option value="roll-asc">Roll No: Low to High (Ascending)</option>
                  <option value="roll-desc">Roll No: High to Low (Descending)</option>
                  <option value="name-asc">Name: A to Z (Ascending)</option>
                  <option value="name-desc">Name: Z to A (Descending)</option>
                  <option value="pct-desc">Attendance: Highest to Lowest</option>
                  <option value="pct-asc">Attendance: Lowest to Highest</option>
                </select>
              </div>
            </div>
          </div>

          {/* Students Table Card */}
          <div className="students-table-card">
            <div className="table-top-meta">
              <span className="results-count">
                Showing{" "}
                <strong>
                  {filteredAndSortedStudents.length === 0
                    ? 0
                    : (currentPage - 1) * pageSize + 1}
                  –
                  {Math.min(
                    currentPage * pageSize,
                    filteredAndSortedStudents.length
                  )}
                </strong>{" "}
                of <strong>{filteredAndSortedStudents.length}</strong> students
              </span>

              {selectedClass !== "all" && (
                <span className="active-filter-tag">
                  Class: <strong>{selectedClass}</strong>
                </span>
              )}
            </div>

            {filteredAndSortedStudents.length === 0 ? (
              <div className="students-empty-state">
                <AlertCircle size={40} strokeWidth={1.8} />
                <h3>No Students Found</h3>
                <p>
                  No student records matched your current search &ldquo;{searchQuery}&rdquo; and class filter.
                </p>
                <button
                  type="button"
                  className="btn-reset-filters"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedClass("all");
                  }}
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="students-data-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Roll Number</th>
                      <th>Class</th>
                      <th>Attendance %</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedStudents.map((student) => {
                      const status = getAttendanceStatus(student.attendancePct);
                      return (
                        <tr
                          key={student.id}
                          className="student-table-row"
                          onClick={() => setSelectedStudent(student)}
                        >
                          {/* Student Info */}
                          <td>
                            <div className="student-cell">
                              <div className="student-avatar-badge">
                                {student.name.charAt(0)}
                              </div>
                              <div className="student-cell-info">
                                <span className="student-table-name">
                                  {student.name}
                                </span>
                                <span className="student-table-email">
                                  {student.email}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Roll Number */}
                          <td>
                            <span className="student-roll-tag">
                              {student.roll}
                            </span>
                          </td>

                          {/* Class / Section */}
                          <td>
                            <span className="student-class-badge">
                              {student.class}
                            </span>
                          </td>

                          {/* Attendance Percentage with mini visual bar */}
                          <td>
                            <div className="attendance-pct-cell">
                              <div className="pct-progress-bar-bg">
                                <div
                                  className={`pct-progress-bar-fill ${status.level}`}
                                  style={{ width: `${student.attendancePct}%` }}
                                />
                              </div>
                              <span className="pct-value-text">
                                {student.attendancePct}%
                              </span>
                            </div>
                          </td>

                          {/* Attendance Status Indicator (Task 3, Requirement 4) */}
                          <td>
                            <span
                              className={`attendance-status-badge ${status.badgeClass}`}
                            >
                              <span className="status-dot" />
                              <span>{status.label}</span>
                            </span>
                          </td>

                          {/* Action Button: View Details (Task 3, Requirement 5) */}
                          <td style={{ textAlign: "right" }}>
                            <button
                              type="button"
                              className="btn-view-details"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedStudent(student);
                              }}
                              title={`View attendance details for ${student.name}`}
                            >
                              <Eye size={15} />
                              <span>View Details</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls (Task 3, Requirement 6) */}
            {totalPages > 1 && (
              <div className="pagination-bar">
                <button
                  type="button"
                  className="btn-page-nav"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                  <span>Previous</span>
                </button>

                <div className="page-numbers">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (pageNum) => (
                      <button
                        key={pageNum}
                        type="button"
                        className={`page-num-btn ${
                          currentPage === pageNum ? "active" : ""
                        }`}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    )
                  )}
                </div>

                <button
                  type="button"
                  className="btn-page-nav"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                >
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </main>

      {/* ================= STUDENT DETAILS MODAL VIEW (Task 3, Requirement 5) ================= */}
      {selectedStudent && (
        <div
          className="cs-modal-backdrop"
          onClick={() => setSelectedStudent(null)}
        >
          <div
            className="cs-modal-card student-details-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-modal-title"
          >
            {/* Modal Header */}
            <div className="student-modal-header">
              <div className="student-profile-header">
                <div className="student-modal-avatar">
                  {selectedStudent.name.charAt(0)}
                </div>
                <div>
                  <div className="student-modal-title-row">
                    <h2 id="student-modal-title">{selectedStudent.name}</h2>
                    <span className="student-roll-tag modal">
                      {selectedStudent.roll}
                    </span>
                    <span className="student-class-badge modal">
                      Section {selectedStudent.class}
                    </span>
                  </div>
                  <p className="student-modal-dept">
                    {selectedStudent.department}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="cs-modal-close"
                onClick={() => setSelectedStudent(null)}
                aria-label="Close details modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Attendance Status Banner */}
            {(() => {
              const status = getAttendanceStatus(selectedStudent.attendancePct);
              return (
                <div className={`student-status-strip ${status.level}`}>
                  <div className="status-strip-left">
                    <div className={`status-pill-lg ${status.level}`}>
                      <span className="status-dot" />
                      <strong>{status.label}</strong>
                    </div>
                    <span className="status-threshold-hint">
                      {selectedStudent.attendancePct >= 75
                        ? "Meets college statutory attendance requirement (≥ 75%)"
                        : selectedStudent.attendancePct >= 65
                        ? "At risk of detention. Regular attendance recommended."
                        : "Detention threshold breached (< 65%). Immediate remediation required."}
                    </span>
                  </div>

                  <div className="attendance-gauge-box">
                    <span className="gauge-pct">
                      {selectedStudent.attendancePct}%
                    </span>
                    <span className="gauge-sub">Overall Attendance</span>
                  </div>
                </div>
              );
            })()}

            {/* Attendance Metrics Grid */}
            <div className="student-stats-grid">
              <div className="stat-card">
                <div className="stat-card-header">
                  <BookOpen size={16} />
                  <span>Total Classes</span>
                </div>
                <strong className="stat-card-value">
                  {selectedStudent.totalClasses}
                </strong>
              </div>

              <div className="stat-card">
                <div className="stat-card-header text-safe">
                  <CheckCircle2 size={16} />
                  <span>Classes Attended</span>
                </div>
                <strong className="stat-card-value text-safe">
                  {selectedStudent.classesAttended}
                </strong>
              </div>

              <div className="stat-card">
                <div className="stat-card-header text-critical">
                  <AlertCircle size={16} />
                  <span>Classes Missed</span>
                </div>
                <strong className="stat-card-value text-critical">
                  {selectedStudent.classesMissed}
                </strong>
              </div>

              <div className="stat-card">
                <div className="stat-card-header text-warning">
                  <TrendingUp size={16} />
                  <span>Attendance Rate</span>
                </div>
                <strong className="stat-card-value">
                  {selectedStudent.attendancePct}%
                </strong>
              </div>
            </div>

            {/* Attendance History Log Table (Task 3, Requirement 5) */}
            <div className="student-history-section">
              <div className="history-section-header">
                <h4>Recent Attendance History</h4>
                <span className="history-badge">Last 5 Verified Lectures</span>
              </div>

              <div className="table-responsive">
                <table className="student-history-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Subject / Code</th>
                      <th>Status</th>
                      <th>Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedStudent.history.map((record, index) => (
                      <tr key={index}>
                        <td>
                          <span className="history-date">{record.date}</span>
                        </td>
                        <td>
                          <span className="history-time">{record.time}</span>
                        </td>
                        <td>
                          <span className="history-subject">{record.subject}</span>
                        </td>
                        <td>
                          <span
                            className={`history-status-badge ${
                              record.status === "Present"
                                ? "present"
                                : record.status === "Late"
                                ? "late"
                                : "absent"
                            }`}
                          >
                            {record.status}
                          </span>
                        </td>
                        <td>
                          <span className="history-method-tag">
                            {record.method === "NFC" && <Radio size={12} />}
                            {record.method === "AI Match" && <Check size={12} />}
                            {record.method}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="student-modal-footer">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setSelectedStudent(null)}
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

export default Students;