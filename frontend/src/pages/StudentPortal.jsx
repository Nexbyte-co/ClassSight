// src/pages/StudentPortal.jsx
// Student portal (frontend demo): shared layout with student-only navigation,
// plus skeleton pages. Reached only through the mock demo sign-in (StudentArea guard).
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { ScanFace, Sun, Moon, CalendarDays, ClipboardList, Settings as SettingsIcon, LogOut } from "lucide-react";
import "./Dashboard.css";
import "./Reports.css";
import "../components/AppNavigationDrawer.css";
import "./StudentPortal.css";
import { useTheme } from "../context/ThemeContext";
import { useDemoSession } from "../context/DemoSessionContext";

const STUDENT_NAV = [
  { to: "/student/timetable", label: "Timetable", Icon: CalendarDays },
  { to: "/student/attendance-reports", label: "Attendance Reports", Icon: ClipboardList },
  { to: "/student/settings", label: "Settings", Icon: SettingsIcon },
];

export function StudentPortalLayout() {
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { session, signOut } = useDemoSession();

  const handleSignOut = () => {
    signOut();
    navigate("/", { replace: true });
  };

  return (
    <div className={`dashboard-root student-portal-root ${isDarkMode ? "dark-mode" : ""}`}>
      <div className="student-portal">
        {/* Student navigation (separate from the teacher drawer) */}
        <aside className="student-sidebar" aria-label="Student navigation">
          <div className="app-nav-header">
            <Link to="/student" className="app-nav-brand">
              <div className="app-nav-brand-icon">
                <ScanFace size={20} strokeWidth={2.2} />
              </div>
              <span className="app-nav-brand-name">ClassSight</span>
            </Link>
          </div>

          <nav className="app-nav-links">
            {STUDENT_NAV.map(({ to, label, Icon }) => (
              <NavLink key={to} to={to} className="app-nav-link">
                <Icon size={19} strokeWidth={1.8} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Fixed mock semester information */}
          <div className="app-nav-footer">
            <div className="app-nav-term-badge student-semester">
              <strong>Odd Semester</strong>
              <span>2026–27</span>
            </div>
          </div>
        </aside>

        <div className="student-portal-body">
          <header className="dashboard-header">
            <div className="header-left">
              <span className="section-chip">Student portal · Demo</span>
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
              <div
                className="student-identity"
                title={`Signed in (demo) as ${session.email}`}
                style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}
              >
                <div className="profile-avatar">{session.name.charAt(0)}</div>
                <span className="profile-name">{session.name}</span>
              </div>
              <button
                type="button"
                className="btn-view-session student-sign-out"
                onClick={handleSignOut}
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut size={14} />
                {/* label hidden below 600px by the existing .profile-name rule */}
                <span className="profile-name">Sign out</span>
              </button>
            </div>
          </header>

          <main className="dashboard-main">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

// Placeholder for pages that are not built yet
function SkeletonPage({ title, description }) {
  return (
    <div className="student-skeleton-page">
      <div className="greeting-section">
        <div className="greeting-text">
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>
      <div
        className="reports-table-card"
        style={{ padding: 40, textAlign: "center", color: "var(--cs-text-muted)" }}
      >
        This page is not available yet in the frontend demo.
      </div>
    </div>
  );
}

export function StudentTimetable() {
  return <SkeletonPage title="Timetable" description="Your weekly class schedule." />;
}

export function StudentAttendanceReports() {
  return <SkeletonPage title="Attendance Reports" description="Detailed attendance reports for your subjects." />;
}

export function StudentSettings() {
  return <SkeletonPage title="Settings" description="Your student portal preferences." />;
}
