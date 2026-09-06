import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
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
  ArrowLeft,
  ScanFace,
  Menu,
  X,
  User,
  LineChart,
  Calendar,
  Layers,
} from "lucide-react";
import "./Dashboard.css";
import "./Reports.css";
import { useTheme } from "../context/ThemeContext";

function ReportDetails() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Dark mode state
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Parse parameters
  const mode = searchParams.get("mode") || "total"; // 'total' or 'range'
  const course = searchParams.get("course") || "Data Structures";
  const section = searchParams.get("section") || "3C2";
  const fromDate = searchParams.get("from") || "01 Sep 2026";
  const toDate = searchParams.get("to") || "05 Sep 2026";

  const isTotalMode = mode === "total";

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
                  onClick={() => navigate("/login")}
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

            <button type="button" className="sidebar-logout" onClick={() => navigate("/login")}>
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

          {/* Scope Card */}
          <div className="report-scope-card">
            <div>
              <div className="scope-title">
                {course} <span className="section-chip" style={{ fontSize: 13, verticalAlign: "middle" }}>{section}</span>
              </div>
              <div className="scope-meta">
                {isTotalMode ? (
                  <span>Showing Total Recorded Lectures (All-Time Cumulative Information)</span>
                ) : (
                  <span>
                    Custom Range Report: <strong>{fromDate}</strong> to <strong>{toDate}</strong>
                  </span>
                )}
              </div>
            </div>

            <div className="scope-badge">
              {isTotalMode ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Layers size={14} />
                  <span>All-Time Info</span>
                </span>
              ) : (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Calendar size={14} />
                  <span>Selected Date Range</span>
                </span>
              )}
            </div>
          </div>

          {/* Blank Metrics Canvas Placeholder */}
          <div className="blank-metrics-canvas">
            <div className="blank-canvas-icon">
              <LineChart size={32} />
            </div>
            <div className="blank-canvas-title">Detailed Metrics &amp; Analytics Canvas</div>
            <p className="blank-canvas-desc">
              {isTotalMode
                ? `Total recorded lecture metrics for ${course} (${section}) will be rendered here.`
                : `Filtered report metrics for ${course} (${section}) between ${fromDate} and ${toDate} will appear here.`}
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

export default ReportDetails;

