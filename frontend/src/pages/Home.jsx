import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import "./Home.css";
import { Link } from "react-router-dom";
import { Menu } from "lucide-react";

function Home() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  return (
    <div className={`home-page ${isDarkMode ? "dark-mode" : ""}`}>
      <header className="home-header">
        <div className="logo">
          ClassSight
        </div>

        <div className="header-actions">
          <button
  className="theme-toggle-home"
  onClick={() => setIsDarkMode(!isDarkMode)}
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