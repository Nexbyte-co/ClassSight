import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  Camera,
  GraduationCap,
  BarChart3,
  Settings,
  LogOut,
  X,
  ScanFace,
} from "lucide-react";
import "./AppNavigationDrawer.css";

function AppNavigationDrawer({ isOpen, onClose, activePage }) {
  const navigate = useNavigate();

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll while drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleSignOut = () => {
    onClose();
    navigate("/");
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={`app-nav-backdrop ${isOpen ? "open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in Navigation Drawer */}
      <aside
        className={`app-nav-drawer ${isOpen ? "open" : ""}`}
        aria-label="Application Navigation Drawer"
      >
        {/* Drawer Header */}
        <div className="app-nav-header">
          <Link to="/dashboard" className="app-nav-brand" onClick={onClose}>
            <div className="app-nav-brand-icon">
              <ScanFace size={20} strokeWidth={2.2} />
            </div>
            <span className="app-nav-brand-name">ClassSight</span>
          </Link>

          <button
            type="button"
            className="app-nav-close-btn"
            onClick={onClose}
            aria-label="Close navigation panel"
            title="Close menu"
          >
            <X size={20} strokeWidth={2.2} />
          </button>
        </div>

        {/* Main Navigation Links */}
        <nav className="app-nav-links">
          <Link
            to="/dashboard"
            className={`app-nav-link ${activePage === "dashboard" ? "active" : ""}`}
            onClick={onClose}
          >
            <LayoutDashboard size={19} strokeWidth={2} />
            <span>Dashboard</span>
          </Link>

          <Link
            to="/classes"
            className={`app-nav-link ${activePage === "classes" ? "active" : ""}`}
            onClick={onClose}
          >
            <BookOpen size={19} strokeWidth={1.8} />
            <span>Classes</span>
          </Link>

          <Link
            to="/attendance"
            className={`app-nav-link ${activePage === "attendance" ? "active" : ""}`}
            onClick={onClose}
          >
            <Camera size={19} strokeWidth={1.8} />
            <span>Attendance</span>
          </Link>

          <Link
            to="/students"
            className={`app-nav-link ${activePage === "students" ? "active" : ""}`}
            onClick={onClose}
          >
            <GraduationCap size={19} strokeWidth={1.8} />
            <span>Students</span>
          </Link>

          <Link
            to="/reports"
            className={`app-nav-link ${activePage === "reports" ? "active" : ""}`}
            onClick={onClose}
          >
            <BarChart3 size={19} strokeWidth={1.8} />
            <span>Reports</span>
          </Link>

          <Link
            to="/settings"
            className={`app-nav-link ${activePage === "settings" ? "active" : ""}`}
            onClick={onClose}
          >
            <Settings size={19} strokeWidth={1.8} />
            <span>Settings</span>
          </Link>
        </nav>

        {/* Drawer Footer */}
        <div className="app-nav-footer">
          <div className="app-nav-term-badge">
            <strong>Spring Term 2026</strong>
            <span>CSE Dept. · Semester 6</span>
          </div>

          <button
            type="button"
            className="app-nav-logout-btn"
            onClick={handleSignOut}
          >
            <LogOut size={17} strokeWidth={1.8} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default AppNavigationDrawer;

