import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sun,
  Moon,
  Calendar,
  Menu,
  ScanFace,
  CircleCheck,
  LayoutDashboard,
  BookOpen,
  UserRound,
  Settings,
  LogOut,
  ChevronDown,
  Layers,
  CalendarDays,
} from "lucide-react";
import "../pages/Dashboard.css";
import { useTheme } from "../context/ThemeContext";
import { logout } from "../api/auth";
import { useDemoSession } from "../context/DemoSessionContext";
import AppNavigationDrawer from "./AppNavigationDrawer";
import ReportsIcon from "./ReportsIcon";
import TeacherProfileMenu from "./TeacherProfileMenu";
import TeacherNotificationsMenu from "./TeacherNotificationsMenu";

// Below this width the sidebar is hidden and the hamburger opens the drawer instead
const MOBILE_NAV_QUERY = "(max-width: 700px)";

const SIDEBAR_LINKS = [
  { to: "/dashboard", key: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { to: "/classes", key: "classes", label: "Classes", Icon: BookOpen },
  { to: "/attendance", key: "attendance", label: "Attendance", Icon: CircleCheck },
  { to: "/students", key: "students", label: "Students", Icon: UserRound },
  { to: "/reports", key: "reports", label: "Reports", Icon: ReportsIcon },
  { to: "/settings", key: "settings", label: "Settings", Icon: Settings },
];

const DEFAULT_DATE = new Date().toLocaleDateString("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

const DEFAULT_NOTIFICATIONS = [
  { id: 1, title: "Schedule Updated", text: "UCS503P room changed to L105", time: "2 hours ago" },
];

/**
 * Teacher page frame: top bar, collapsible sidebar (with the Classes submenu) and the mobile drawer.
 * `active` is "dashboard" | "classes" | "schedule" | "attendance" | ... ; `children` is the page's <main>.
 */
function TeacherShell({
  active,
  children,
  overlays = null,
  notifications = DEFAULT_NOTIFICATIONS,
  dateLabel = DEFAULT_DATE,
  liveBadge = false,
}) {
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { signOut } = useDemoSession();

  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isSideCollapsed, setIsSideCollapsed] = useState(false);
  const [isClassesMenuOpen, setIsClassesMenuOpen] = useState(active === "classes" || active === "schedule");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const isMobileNav = () => window.matchMedia(MOBILE_NAV_QUERY).matches;
  const handleToggleNav = () => {
    if (isMobileNav()) setIsNavOpen((open) => !open);
    else setIsSideCollapsed((collapsed) => !collapsed);
  };

  // Ends the mock demo sign-in and returns to the public landing page
  const handleSignOut = () => {
    logout(); // also clear any API token from the backend login
    signOut();
    navigate("/", { replace: true });
  };

  const onClassesPage = active === "classes" || active === "schedule";

  return (
    <div className={`dashboard-root db-page teacher-ui ${isDarkMode ? "dark-mode" : ""}`}>
      <header className="db-top">
        <div className="db-row">
          <button
            type="button"
            className="db-ib hamburger-nav-btn"
            onClick={handleToggleNav}
            aria-label="Toggle navigation"
            aria-expanded={isMobileNav() ? isNavOpen : !isSideCollapsed}
          >
            <Menu size={20} strokeWidth={2} aria-hidden="true" />
          </button>
          <Link to="/dashboard" className="db-row db-brand-link">
            <div className="db-logo">
              <ScanFace size={20} strokeWidth={2} />
            </div>
            <span className="db-brand">ClassSight</span>
          </Link>
        </div>

        <div className="db-row">
          <div className="db-pill">
            <Calendar size={14} strokeWidth={2} />
            <span>{dateLabel}</span>
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

          <TeacherNotificationsMenu
            items={notifications}
            open={isNotificationsOpen}
            onOpenChange={(open) => {
              setIsNotificationsOpen(open);
              if (open) setIsProfileOpen(false);
            }}
          />

          <TeacherProfileMenu
            variant="stacked"
            open={isProfileOpen}
            onOpenChange={(open) => {
              setIsProfileOpen(open);
              if (open) setIsNotificationsOpen(false);
            }}
          />
        </div>
      </header>

      <div className="db-body">
        {/* Small screens: the slide-in drawer replaces the sidebar */}
        <AppNavigationDrawer
          isOpen={isNavOpen}
          onClose={() => setIsNavOpen(false)}
          activePage={active === "schedule" ? "class-schedule" : active}
        />

        <aside className={`db-side ${isSideCollapsed ? "c" : ""}`} aria-label="Main navigation">
          <nav className="db-nav">
            {SIDEBAR_LINKS.map(({ to, key, label, Icon }) => {
              const isOn = key === "classes" ? onClassesPage : key === active;
              const link = (
                <Link
                  key={to}
                  to={to}
                  className={`db-ni ${isOn ? "on" : ""}`}
                  aria-current={isOn ? "page" : undefined}
                  title={isSideCollapsed ? label : undefined}
                >
                  <Icon size={20} strokeWidth={2} />
                  <span className="db-tx">{label}</span>
                  {key === "attendance" && liveBadge && <span className="db-live">Live</span>}
                </Link>
              );
              if (key !== "classes") return link;
              // Clicking Classes toggles its submenu instead of navigating
              const toggleLink = (
                <button
                  type="button"
                  className={`db-ni db-ni-btn ${isOn ? "on" : ""}`}
                  aria-expanded={isClassesMenuOpen && !isSideCollapsed}
                  aria-controls="db-classes-sub"
                  title={isSideCollapsed ? label : undefined}
                  onClick={() => (isSideCollapsed ? navigate(to) : setIsClassesMenuOpen((v) => !v))}
                >
                  <Icon size={20} strokeWidth={2} />
                  <span className="db-tx">{label}</span>
                </button>
              );
              const open = isClassesMenuOpen && !isSideCollapsed;
              return (
                <div
                  key={to}
                  className={`db-grp ${open ? "open" : ""}`}
                  onKeyDown={(e) => e.key === "Escape" && setIsClassesMenuOpen(false)}
                >
                  {toggleLink}
                  {!isSideCollapsed && <ChevronDown size={16} strokeWidth={2} className="db-chv" aria-hidden="true" />}
                  <div className="db-subl" id="db-classes-sub">
                    <div className="db-subi">
                      <Link to="/classes" className={`db-si ${active === "classes" ? "cur" : ""}`} tabIndex={open ? 0 : -1}>
                        <span className="db-st"><Layers size={16} strokeWidth={1.8} />All Classes</span>
                      </Link>
                      <Link to="/classes/schedule" className={`db-si ${active === "schedule" ? "cur" : ""}`} tabIndex={open ? 0 : -1}>
                        <span className="db-st"><CalendarDays size={16} strokeWidth={1.8} />Class Schedule</span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </nav>
          <div className="db-bot">
            <div className="db-term">
              <b>Spring Term 2026</b>
              <span>CSE Dept. • Semester 6</span>
              <i>Academic Week 8</i>
            </div>
            <button type="button" className="db-logout" onClick={handleSignOut}>
              <LogOut size={16} strokeWidth={2} />
              <span className="db-tx">Log Out Faculty</span>
            </button>
          </div>
        </aside>

        {children}
      </div>

      {overlays}
    </div>
  );
}

export default TeacherShell;
