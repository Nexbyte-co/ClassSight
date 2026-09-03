import { NavLink } from "react-router-dom";
import { Home, LogIn, Moon, Sun, X } from "lucide-react";
import "./NavigationDrawer.css";

function NavigationDrawer({
  isOpen,
  onClose,
  isDarkMode,
  onToggleDarkMode,
}) {
  return (
    <>
      <div
        className={`drawer-backdrop ${isOpen ? "open" : ""}`}
        onClick={onClose}
      />

      <aside className={`navigation-drawer ${isOpen ? "open" : ""}`}>
        <button
          className="drawer-close"
          onClick={onClose}
          aria-label="Close navigation"
        >
          <X size={24} strokeWidth={1.8} />
        </button>

        <nav className="drawer-nav">
          <NavLink to="/" onClick={onClose}>
            <Home size={19} strokeWidth={1.8} />
            <span>Home</span>
          </NavLink>

          <NavLink to="/login" onClick={onClose}>
            <LogIn size={19} strokeWidth={1.8} />
            <span>Sign In</span>
          </NavLink>
        </nav>

        <div className="drawer-bottom">
          <button
            className="theme-toggle"
            onClick={onToggleDarkMode}
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? (
              <Sun size={22} strokeWidth={1.8} />
            ) : (
              <Moon size={22} strokeWidth={1.8} />
            )}
          </button>
        </div>
      </aside>
    </>
  );
}

export default NavigationDrawer;