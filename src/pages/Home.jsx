import { Moon, Sun, ScanFace } from "lucide-react";
import "./Home.css";
import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

function Home() {
  const { isDarkMode, toggleDarkMode } = useTheme();

  return (
    <div className={`home-page ${isDarkMode ? "dark-mode" : ""}`}>
      <header className="home-header">
        <Link
          to="/"
          className="brand-link"
          onClick={(e) => {
            if (window.location.pathname === "/") {
              e.preventDefault();
            }
          }}
          aria-label="ClassSight Home"
        >
          <div className="brand-icon">
            <ScanFace size={20} strokeWidth={2.2} />
          </div>
          <span className="brand-name">ClassSight</span>
        </Link>

        <div className="header-actions">
          <button
            className="theme-toggle-home"
            onClick={toggleDarkMode}
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? (
              <Sun size={24} strokeWidth={1.8} />
            ) : (
              <Moon size={24} strokeWidth={1.8} />
            )}
          </button>
        </div>
      </header>

      <main className="home-content">
        <div className="home-text">
          <p className="home-eyebrow">
            SMART CLASSROOM TECHNOLOGY
          </p>

          <h1>
            Attendance,
            <br />
            <span>simplified.</span>
          </h1>

          <p className="home-description">
            AI-assisted classroom attendance and verification
            designed for modern educational environments.
          </p>

          <Link to="/login" className="login-button">
            Sign In
          </Link>
        </div>
      </main>
    </div>
  );
}

export default Home;