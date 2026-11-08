import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sun,
  Moon,
  Calendar,
  Menu,
  ScanFace,
} from "lucide-react";
import "../../styles/Dashboard.css";
import { useTheme } from "../../context/theme/ThemeContext";
import { logout } from "../../api/auth";
import { useDemoSession } from "../../context/demo-session/DemoSessionContext";
import AppNavigationDrawer from "./AppNavigationDrawer";
import Sidebar from "./Sidebar";
import TeacherProfileMenu from "./TeacherProfileMenu";
import TeacherNotificationsMenu from "./TeacherNotificationsMenu";

// Below this width the sidebar is hidden and the hamburger opens the drawer instead
const MOBILE_NAV_QUERY = "(max-width: 700px)";

// The desktop teacher sidebar is shared through this shell; mobile uses its drawer counterpart.
const SIDE_COLLAPSED_KEY = "cs-side-collapsed";
const readSideCollapsed = () => {
  try {
    return localStorage.getItem(SIDE_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
};

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
 * Teacher page frame: top bar, collapsible sidebar and the mobile drawer.
 * `active` is "dashboard" | "classes" | "schedule" | "attendance" | ... ; `children` is the page's <main>.
 */
function TeacherShell({
  active,
  children,
  overlays = null,
  notifications = DEFAULT_NOTIFICATIONS,
  dateLabel = DEFAULT_DATE,
  liveBadge = false,
  rootClassName = "",
}) {
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { signOut } = useDemoSession();

  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isSideCollapsed, setIsSideCollapsed] = useState(readSideCollapsed);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const isMobileNav = () => window.matchMedia(MOBILE_NAV_QUERY).matches;
  const handleToggleNav = () => {
    if (isMobileNav()) setIsNavOpen((open) => !open);
    else
      setIsSideCollapsed((collapsed) => {
        try {
          localStorage.setItem(SIDE_COLLAPSED_KEY, collapsed ? "0" : "1");
        } catch {
          // storage blocked: the toggle still works for this page
        }
        return !collapsed;
      });
  };

  // Ends the mock demo sign-in and returns to the public landing page
  const handleSignOut = () => {
    logout(); // also clear any API token from the backend login
    signOut();
    navigate("/", { replace: true });
  };


  return (
    <div className={`dashboard-root db-page teacher-ui ${rootClassName} ${isDarkMode ? "dark-mode" : ""}`}>
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

        <Sidebar
          active={active === "schedule" ? "schedule" : active}
          collapsed={isSideCollapsed}
          liveBadge={liveBadge}
          onSignOut={handleSignOut}
        />

        {children}
      </div>

      {overlays}
    </div>
  );
}

export default TeacherShell;
