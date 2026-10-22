import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  Camera,
  GraduationCap,
  Settings,
  LogOut,
  ScanFace,
  Layers,
  CalendarDays,
} from "lucide-react";
import "./AppNavigationDrawer.css";
import ReportsIcon from "./ReportsIcon";
import { useDemoSession } from "../context/DemoSessionContext";

// Delay before the drawer closes after a mouse pointer leaves it (avoids flicker).
// Only mouse pointers trigger it; touch and pen keep the click-only behaviour.
const AUTO_CLOSE_DELAY_MS = 250;

function AppNavigationDrawer({ isOpen, onClose, activePage }) {
  const navigate = useNavigate();

  // Auto-close is armed only once the mouse has been inside the drawer since it opened,
  // so opening it (by click or keyboard) with the pointer elsewhere never closes it.
  const pointerWasInside = useRef(false);
  const closeTimer = useRef(null);
  const drawerRef = useRef(null);

  const cancelAutoClose = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };

  // Reset on every open/close and clear any pending timer on unmount
  useEffect(() => {
    pointerWasInside.current = false;
    cancelAutoClose();
    return cancelAutoClose;
  }, [isOpen]);

  const handlePointerEnter = (e) => {
    if (e.pointerType !== "mouse") return;
    pointerWasInside.current = true;
    cancelAutoClose();
  };

  const handlePointerLeave = (e) => {
    if (!isOpen || e.pointerType !== "mouse" || !pointerWasInside.current) return;
    cancelAutoClose();
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null;
      onClose();
    }, AUTO_CLOSE_DELAY_MS);
  };

  // The page stays visible and usable while the drawer is open (no overlay).
  // A tap or click outside the drawer closes it without blocking that tap/click,
  // which keeps closing usable on touch devices. The toggle button is ignored here
  // because it handles its own open/close.
  useEffect(() => {
    if (!isOpen) return undefined;
    const handlePointerDownOutside = (e) => {
      if (drawerRef.current?.contains(e.target)) return;
      if (e.target instanceof Element && e.target.closest(".hamburger-nav-btn")) return;
      onClose();
    };
    document.addEventListener("pointerdown", handlePointerDownOutside, true);
    return () => document.removeEventListener("pointerdown", handlePointerDownOutside, true);
  }, [isOpen, onClose]);

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

  // Prevent body scroll while drawer is open, and mark the body so the page content
  // is pushed aside to make room for the drawer (see AppNavigationDrawer.css)
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    document.body.classList.toggle("app-nav-open", isOpen);
    return () => {
      document.body.style.overflow = "";
      document.body.classList.remove("app-nav-open");
    };
  }, [isOpen]);

  // Ends the mock demo sign-in and returns to the public landing page
  const { signOut } = useDemoSession();
  const handleSignOut = () => {
    onClose();
    signOut();
    navigate("/", { replace: true });
  };

  return (
    <>
      {/* Slide-in Navigation Drawer */}
      <aside
        ref={drawerRef}
        className={`app-nav-drawer ${isOpen ? "open" : ""}`}
        aria-label="Application Navigation Drawer"
        onPointerEnter={handlePointerEnter}
        onPointerMove={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        {/* Drawer Header */}
        <div className="app-nav-header">
          <Link to="/dashboard" className="app-nav-brand" onClick={onClose}>
            <div className="app-nav-brand-icon">
              <ScanFace size={20} strokeWidth={2.2} />
            </div>
            <span className="app-nav-brand-name">ClassSight</span>
          </Link>
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
            className={`app-nav-link ${activePage === "classes" || activePage === "class-schedule" ? "parent" : ""}`}
            onClick={onClose}
          >
            <BookOpen size={19} strokeWidth={1.8} />
            <span>Classes</span>
          </Link>
          <div className="app-nav-sublinks">
            <Link
              to="/classes"
              className={`app-nav-sublink ${activePage === "classes" ? "active" : ""}`}
              onClick={onClose}
            >
              <Layers size={15} strokeWidth={1.8} />
              <span>All Classes</span>
            </Link>
            <Link
              to="/classes/schedule"
              className={`app-nav-sublink ${activePage === "class-schedule" ? "active" : ""}`}
              onClick={onClose}
            >
              <CalendarDays size={15} strokeWidth={1.8} />
              <span>Class Schedule</span>
            </Link>
          </div>

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
            <ReportsIcon size={19} strokeWidth={1.8} />
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

