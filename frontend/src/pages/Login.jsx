import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail, Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { login } from "../api/auth";
import { ApiError } from "../api/client";
import "./Login.css";

function Login() {
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useTheme();

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to sign in. Please try again.");
    } finally {
      setIsSubmitting(false);
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
          <Link to="/dashboard" className="login-brand">
            ClassSight
          </Link>

          <h1>Welcome back</h1>

          <p>
            Sign in to access your ClassSight account.
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>

          <div className="form-group">
            <label htmlFor="email">College ID / Email</label>

            <div className="input-wrapper">
              <Mail size={19} strokeWidth={1.8} />

              <input
                id="email"
                type="text"
                placeholder="Enter your college ID or email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>

            <div className="input-wrapper">
              <LockKeyhole size={19} strokeWidth={1.8} />

              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
              >
                {showPassword ? (
                  <EyeOff size={19} />
                ) : (
                  <Eye size={19} />
                )}
              </button>
            </div>
          </div>

          <div className="login-options">

            <label className="remember-me">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />

              <span>Remember me</span>
            </label>

            <button
              type="button"
              className="forgot-password"
            >
              Forgot password?
            </button>

          </div>

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="login-submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing In..." : "Sign In"}
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