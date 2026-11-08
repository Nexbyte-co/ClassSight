import { Link, Navigate, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Lock, Mail, Moon, Sun } from "lucide-react";
import { useTheme } from "../../context/theme/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import "./Login.css";

function Login() {
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { session, loading, signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Already signed in (e.g. opened /login with a valid token): go straight to the dashboard.
  if (!loading && session) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setSubmitting(true);
    try {
      await signIn(email, password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Could not sign in.");
    } finally {
      setSubmitting(false);
    }
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
                aria-describedby="login-error"
              />
            </div>

          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>

            <div
              className="input-wrapper"
              style={error ? { borderColor: "#dc2626" } : undefined}
            >
              <Lock size={19} strokeWidth={1.8} />

              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                aria-invalid={Boolean(error)}
                aria-describedby="login-error"
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

          <button type="submit" className="login-submit" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign In"}
          </button>

        </form>

        <div className="login-footer">
          <span>ClassSight</span>
          <span>College Attendance System</span>
        </div>

      </div>
    </div>
  );
}

export default Login;
