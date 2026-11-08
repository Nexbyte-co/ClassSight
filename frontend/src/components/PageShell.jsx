// Header + navigation drawer shared by the real-data pages (Students, Admin, Verify).
// Same look as the Students page header; page content goes in `children`.
import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, Moon, ScanFace, Sun } from "lucide-react";
import "../styles/Dashboard.css";
import "../pages/Students/Students.css";
import "../pages/Manage.css";
import { useTheme } from "../context/theme/ThemeContext";
import AppNavigationDrawer from "./navigation/AppNavigationDrawer";
import TeacherProfileMenu from "./navigation/TeacherProfileMenu";
import ClassPicker from "./ClassPicker";

function PageShell({ crumb, activePage, showClassPicker = true, children }) {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [isNavOpen, setIsNavOpen] = useState(false);

  return (
    <div className={`students-page-root teacher-ui ${isDarkMode ? "dark-mode" : ""}`}>
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
          <Link to="/dashboard" className="brand-link" title="ClassSight Dashboard">
            <div className="brand-icon">
              <ScanFace size={20} strokeWidth={2.2} />
            </div>
            <span className="brand-name">ClassSight</span>
          </Link>
          <span className="header-crumb-sep">/</span>
          <span className="header-crumb-current">{crumb}</span>
        </div>

        <div className="header-right">
          {showClassPicker && <ClassPicker />}
          <button
            className="header-icon-btn"
            onClick={toggleDarkMode}
            aria-label="Toggle color theme"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? <Sun size={19} strokeWidth={1.8} /> : <Moon size={19} strokeWidth={1.8} />}
          </button>
          <TeacherProfileMenu />
        </div>
      </header>

      <AppNavigationDrawer
        isOpen={isNavOpen}
        onClose={() => setIsNavOpen(false)}
        activePage={activePage}
      />

      <main className="students-main-content">{children}</main>
    </div>
  );
}

export default PageShell;
