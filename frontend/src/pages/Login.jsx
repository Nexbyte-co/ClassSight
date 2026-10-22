import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Mail, Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useDemoSession } from "../context/DemoSessionContext";
import { DEMO_ACCOUNTS, UNKNOWN_ACCOUNT_ERROR } from "../context/demoSession";
import "./Login.css";

// Demo sign-in: routes the two approved demo accounts to their experience.
// There is no password and no server check — this is not real authentication.
function Login() {
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { session, signIn } = useDemoSession();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Enter your college email address.");
      return;
    }
    const account = signIn(email);
    if (!account) {
      setError(UNKNOWN_ACCOUNT_ERROR);
      return;
    }
    navigate(account.home);
  };

  return (
    <div className={`login-page ${isDarkMode ? "dark-mode" : ""}`}>
      <button
        className="login-theme-toggle"
        onClick={toggleDarkMode}
        aria-label="Toggle dark mode"
        type="button"
      >
        {isDarkMode ? (
          <Sun size={20} strokeWidth={1.8} />
        ) : (
          <Moon size={20} strokeWidth={1.8} />
        )}
      </button>

      <div className="login-card">

        <div className="login-header">
          <Link to="/" className="login-brand">
            ClassSight
          </Link>

          <h1>Welcome back</h1>

          <p>
            Sign in to access your ClassSight account.
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>

          <div className="form-group">
            <label htmlFor="email">College Email</label>

            <div
              className="input-wrapper"
              style={error ? { borderColor: "#dc2626" } : undefined}
            >
              <Mail size={19} strokeWidth={1.8} />

              <input
                id="email"
                type="text"
                inputMode="email"
                autoComplete="email"
                placeholder="Enter your college email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                aria-invalid={Boolean(error)}
                aria-describedby="login-error login-demo-note"
              />
            </div>

            <div
              id="login-error"
              className="login-error"
              role="alert"
              style={{ minHeight: 18, marginTop: 6, fontSize: 13, fontWeight: 600, color: "#dc2626" }}
            >
              {error}
            </div>
          </div>

          <button type="submit" className="login-submit">
            Sign In
          </button>

        </form>

        <div
          id="login-demo-note"
          className="login-demo-note"
          style={{ marginTop: 18, fontSize: 13, lineHeight: 1.5, color: isDarkMode ? "#bdbdbd" : "#555555" }}
        >
          <strong>Demo sign-in.</strong> No password is needed and nothing is checked by a server —
          this only switches between the two demo experiences.
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                className="forgot-password login-demo-fill"
                onClick={() => {
                  setEmail(account.email);
                  setError("");
                }}
                title={account.email}
              >
                Use {account.role} demo
              </button>
            ))}
          </div>
          {session && (
            <p className="login-current-session" style={{ marginTop: 10 }}>
              Currently signed in as <strong>{session.email}</strong> ({session.role}). Signing in
              again switches the demo account.
            </p>
          )}
        </div>

        <div className="login-footer">
          <span>ClassSight</span>
          <span>College Attendance System</span>
        </div>

      </div>
    </div>
  );
}

export default Login;
