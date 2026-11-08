// Standalone admin area chrome: no teacher navigation, no class picker.
// Admin setup is its own space, separate from the teacher panel.
import { Link, useNavigate } from "react-router-dom";
import { LogOut, Moon, ScanFace, ShieldCheck, Sun } from "lucide-react";
import "../styles/Dashboard.css";
import "../pages/Students/Students.css";
import "../pages/Manage.css";
import { useTheme } from "../context/theme/ThemeContext";
import { useAuth } from "../context/AuthContext";

function AdminShell({ children }) {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { session, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    signOut();
    navigate("/", { replace: true });
  };

  return (
    <div className={`students-page-root teacher-ui ${isDarkMode ? "dark-mode" : ""}`}>
      <header className="dashboard-header">
        <div className="header-left">
          <Link to="/admin" className="brand-link" title="ClassSight Admin">
            <div className="brand-icon">
              <ScanFace size={20} strokeWidth={2.2} />
            </div>
            <span className="brand-name">ClassSight</span>
          </Link>
          <span className="header-crumb-sep">/</span>
          <span className="header-crumb-current">
            <ShieldCheck size={15} strokeWidth={2} style={{ verticalAlign: "-2px", marginRight: 4 }} />
            Admin
          </span>
        </div>

        <div className="header-right">
          {session?.email && <span className="header-crumb-current">{session.email}</span>}
          <button
            className="header-icon-btn"
            onClick={toggleDarkMode}
            aria-label="Toggle color theme"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? <Sun size={19} strokeWidth={1.8} /> : <Moon size={19} strokeWidth={1.8} />}
          </button>
          <button
            className="header-icon-btn"
            onClick={handleSignOut}
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={19} strokeWidth={1.8} />
          </button>
        </div>
      </header>

      <main className="students-main-content">{children}</main>
    </div>
  );
}

export default AdminShell;
