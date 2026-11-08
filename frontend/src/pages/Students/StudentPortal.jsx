// src/pages/Students/StudentPortal.jsx
// Student portal (frontend demo): shared layout with student-only navigation,
// plus skeleton pages. Reached only through the mock demo sign-in (StudentArea guard).
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Calendar,
  CalendarDays,
  ChevronDown,
  FileChartColumn,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  ScanFace,
  Settings as SettingsIcon,
  Sun,
} from "lucide-react";
import "../../styles/Dashboard.css";
import "../../styles/Reports.css";
import "../../components/navigation/AppNavigationDrawer.css";
import "./StudentPortal.css";
import { useTheme } from "../../context/theme/ThemeContext";
import { useDemoSession } from "../../context/demo-session/DemoSessionContext";
import { useBuildStudentModel } from "../../context/students/useStudentModel";
import { useStudentPrefs } from "../../context/students/studentPrefs";
import TeacherNotificationsMenu from "../../components/navigation/TeacherNotificationsMenu";

const STUDENT_NAV = [
  { to: "/student", label: "Dashboard", Icon: LayoutDashboard, end: true },
  { to: "/student/timetable", label: "Timetable", Icon: CalendarDays },
  { to: "/student/courses", label: "My Courses", Icon: BookOpen },
  { to: "/student/reports", label: "Reports", Icon: FileChartColumn },
  { to: "/student/settings", label: "Settings", Icon: SettingsIcon },
];

// Fixed mock semester information
const TERM = { title: "Odd Semester", sub: "2026–27", note: "Student portal" };

// Below this width the sidebar is hidden and the menu button opens the drawer instead (same as TeacherShell)
const MOBILE_NAV_QUERY = "(max-width: 700px)";
const SIDE_COLLAPSED_KEY = "cs-student-side-collapsed";
const readSideCollapsed = () => {
  try {
    return localStorage.getItem(SIDE_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
};

const TODAY = new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

// Keep the active-pill position between layout mounts so page changes slide smoothly (as in Sidebar.jsx)
let lastPill = null;

/** Active-item background that slides between sidebar links, measured like the teacher Sidebar. */
function useNavPill(navRef, pathname, collapsed) {
  const [pill, setPill] = useState(lastPill);
  const [animates, setAnimates] = useState(false);
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return undefined;
    const place = () => {
      const item = nav.querySelector(".db-ni.on");
      if (!item) return setPill(null);
      const n = nav.getBoundingClientRect();
      const r = item.getBoundingClientRect();
      const next = { top: r.top - n.top, height: r.height };
      lastPill = next;
      setPill((p) => (p && p.top === next.top && p.height === next.height ? p : next));
    };
    const frame = requestAnimationFrame(() => {
      setAnimates(true);
      place();
    });
    const ro = new ResizeObserver(place);
    ro.observe(nav);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [navRef, pathname, collapsed]);
  return { pill, animates };
}

const isActive = (pathname, { to, end }) => (end ? pathname === to || pathname === `${to}/` : pathname.startsWith(to));

/** Avatar + name with a small account menu (settings, sign out), styled like the teacher profile menu. */
function StudentProfileMenu({ session, onSignOut }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const btnRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const first = session.name.split(" ")[0];
  return (
    <div className="user-profile-wrapper teacher-profile-menu" ref={wrapRef}>
      <button
        ref={btnRef}
        type="button"
        className="profile-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${session.name}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="profile-avatar" aria-hidden="true">{session.name.charAt(0)}</span>
        <span className="profile-stack">
          <span className="profile-stack-name">{first}</span>
          <span className="profile-stack-dept">{session.roll ?? "Student"}</span>
        </span>
        <ChevronDown size={16} strokeWidth={2} className={`profile-chevron ${open ? "open" : ""}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="dropdown-menu" role="menu" aria-label="Account">
          <div className="dropdown-user-header">
            <div className="dropdown-user-name">{session.name}</div>
            <div className="dropdown-user-email">{session.email}</div>
          </div>
          <Link to="/student/settings" role="menuitem" className="dropdown-item" onClick={() => setOpen(false)}>
            <SettingsIcon size={16} strokeWidth={2} />
            Settings
          </Link>
          <div className="dropdown-divider" role="separator" />
          <button type="button" role="menuitem" className="dropdown-item dropdown-item-danger" onClick={onSignOut}>
            <LogOut size={16} strokeWidth={2} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

/** Phone navigation: the same slide-in drawer styles as the teacher side, with the student links. */
function StudentDrawer({ isOpen, onClose, pathname, onSignOut }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onDown = (e) => {
      if (ref.current?.contains(e.target)) return;
      if (e.target instanceof Element && e.target.closest(".hamburger-nav-btn")) return;
      onClose();
    };
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("pointerdown", onDown, true);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  return (
    <aside ref={ref} className={`app-nav-drawer ${isOpen ? "open" : ""}`} aria-label="Student navigation" inert={!isOpen}>
      <div className="app-nav-header">
        <Link to="/student" className="app-nav-brand" onClick={onClose}>
          <div className="app-nav-brand-icon">
            <ScanFace size={20} strokeWidth={2.2} />
          </div>
          <span className="app-nav-brand-name">ClassSight</span>
        </Link>
      </div>
      <nav className="app-nav-links">
        {STUDENT_NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`app-nav-link ${isActive(pathname, item) ? "active" : ""}`}
            aria-current={isActive(pathname, item) ? "page" : undefined}
            onClick={onClose}
          >
            <item.Icon size={19} strokeWidth={1.8} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="app-nav-footer">
        <div className="app-nav-term-badge">
          <strong>{TERM.title}</strong>
          <span>{TERM.sub}</span>
        </div>
        <button type="button" className="app-nav-logout-btn" onClick={onSignOut}>
          <LogOut size={17} strokeWidth={1.8} />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}

/**
 * Student portal frame, laid out like TeacherShell: top bar, collapsible sidebar, phone drawer.
 * Only the top bar and sidebar sit inside `.db-page.teacher-ui` wrappers (that is where the teacher
 * shell styles live); the page content keeps the student portal's own styles.
 */
export function StudentPortalLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { session, signOut } = useDemoSession();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isSideCollapsed, setIsSideCollapsed] = useState(readSideCollapsed);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const model = useBuildStudentModel(session);
  const [prefs, setPref] = useStudentPrefs();
  // The bell shows the student's own attendance alerts, minus the kinds they switched off in Settings
  const notifications = model.alerts
    .filter((a) => (a.id === "unverified" ? prefs.pendingReview : prefs.lowAttendance))
    .map((a) => ({ id: a.id, title: a.title, text: a.text }));
  const navRef = useRef(null);
  const { pill, animates } = useNavPill(navRef, pathname, isSideCollapsed);

  const handleSignOut = () => {
    signOut();
    navigate("/", { replace: true });
  };

  // Used by the menu button and by Settings > Appearance
  const setSideCollapsed = (collapsed) => {
    setIsSideCollapsed(collapsed);
    try {
      localStorage.setItem(SIDE_COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {
      // storage blocked: the setting still works for this page
    }
  };

  const handleToggleNav = () => {
    if (window.matchMedia(MOBILE_NAV_QUERY).matches) setIsNavOpen((open) => !open);
    else setSideCollapsed(!isSideCollapsed);
  };

  const chrome = `db-page teacher-ui sp-chrome ${isDarkMode ? "dark-mode" : ""}`;

  return (
    <div className={`dashboard-root student-portal-root sp-fit ${isDarkMode ? "dark-mode" : ""}`}>
      <div className={`${chrome} sp-top`}>
        <header className="db-top">
          <div className="db-row">
            <button
              type="button"
              className="db-ib hamburger-nav-btn"
              onClick={handleToggleNav}
              aria-label="Toggle navigation"
              aria-expanded={isNavOpen || !isSideCollapsed}
            >
              <Menu size={20} strokeWidth={2} aria-hidden="true" />
            </button>
            <Link to="/student" className="db-row db-brand-link">
              <div className="db-logo">
                <ScanFace size={20} strokeWidth={2} />
              </div>
              <span className="db-brand">ClassSight</span>
            </Link>
            <span className="sp-badge">Student</span>
          </div>

          <div className="db-row">
            <div className="db-pill">
              <Calendar size={14} strokeWidth={2} />
              <span>{TODAY}</span>
            </div>
            <button
              type="button"
              className="db-ib db-ib-sm"
              onClick={toggleDarkMode}
              aria-label="Night mode"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun size={16} strokeWidth={2} /> : <Moon size={16} strokeWidth={2} />}
            </button>
            <TeacherNotificationsMenu items={notifications} open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen} />
            <StudentProfileMenu session={session} onSignOut={handleSignOut} />
          </div>
        </header>
      </div>

      <div className="sp-body">
        <div className={`${chrome} sp-side`}>
          <aside className={`db-side ${isSideCollapsed ? "c" : ""}`} aria-label="Student navigation">
            <nav className="db-nav" ref={navRef}>
              {pill && (
                <span className={`db-ind ${animates ? "anim" : ""}`} style={{ top: pill.top, height: pill.height }} aria-hidden="true" />
              )}
              {STUDENT_NAV.map((item) => {
                const on = isActive(pathname, item);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`db-ni ${on ? "on" : ""}`}
                    aria-current={on ? "page" : undefined}
                    title={isSideCollapsed ? item.label : undefined}
                  >
                    <item.Icon size={20} strokeWidth={2} />
                    <span className="db-tx">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="db-bot">
              <div className="db-term">
                <b>{TERM.title}</b>
                <span>{TERM.sub}</span>
                <i>{TERM.note}</i>
              </div>
              <button type="button" className="db-logout" onClick={handleSignOut} title={isSideCollapsed ? "Log out" : undefined}>
                <LogOut size={16} strokeWidth={2} />
                <span className="db-tx">Log Out</span>
              </button>
            </div>
          </aside>
        </div>

        <main className="dashboard-main">
          <Outlet context={{ ...model, prefs, setPref, sideCollapsed: isSideCollapsed, setSideCollapsed, signOut: handleSignOut }} />
        </main>
      </div>

      <div className={chrome + " sp-drawer"}>
        <StudentDrawer isOpen={isNavOpen} onClose={() => setIsNavOpen(false)} pathname={pathname} onSignOut={handleSignOut} />
      </div>
    </div>
  );
}
