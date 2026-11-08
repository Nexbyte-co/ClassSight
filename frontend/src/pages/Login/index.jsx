import { Link, Navigate, useNavigate } from "react-router-dom";
import { useState } from "react";
import { AlertCircle, ArrowLeft, Eye, EyeOff, Info, Loader2, Lock, Mail, Moon, ShieldCheck, Sun } from "lucide-react";
import { useTheme } from "../../context/theme/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import "./Login.css";

// Admins have their own area; teachers go to the teacher panel.
const homeFor = (session) => (session?.apiRole === "admin" ? "/admin" : "/dashboard");

// With "Remember me" on, the email is prefilled next time (never the password).
const REMEMBERED_EMAIL_KEY = "classsight_remembered_email";
const readRememberedEmail = () => {
  try {
    return localStorage.getItem(REMEMBERED_EMAIL_KEY) || "";
  } catch {
    return "";
  }
};
const writeRememberedEmail = (email) => {
  try {
    if (email) localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
    else localStorage.removeItem(REMEMBERED_EMAIL_KEY);
  } catch {
    // storage blocked: nothing to remember
  }
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Login() {
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { session, loading, signIn } = useAuth();

  const [email, setEmail] = useState(readRememberedEmail);
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in (e.g. opened /login with a valid token): go to that role's home.
  if (!loading && session) {
    return <Navigate to={homeFor(session)} replace />;
  }

  const validate = () => {
    const next = {};
    if (!email.trim()) next.email = "Enter your email address.";
    else if (!EMAIL_PATTERN.test(email.trim())) next.email = "Enter a valid email address.";
    if (!password) next.password = "Enter your password.";
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!validate()) return;
    setSubmitting(true);
    try {
      const next = await signIn(email, password, { remember });
      writeRememberedEmail(remember ? email.trim() : "");
      navigate(homeFor(next), { replace: true });
    } catch (err) {
      setError(
        err.status === 401
          ? "Incorrect email or password."
          : err.message || "Could not sign in. Please try again."
      );
      setPassword("");
    } finally {
      setSubmitting(false);
    }
  };

  const trackCapsLock = (e) => {
    if (typeof e.getModifierState === "function") setCapsLock(e.getModifierState("CapsLock"));
  };

  return (
    <div className={`login-page ${isDarkMode ? "dark-mode" : ""}`}>
      <Link to="/" className="login-back-link">
        <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
        <span>Back to home</span>
      </Link>

      <button
        className="login-theme-toggle"
        onClick={toggleDarkMode}
        aria-label="Toggle dark mode"
        type="button"
      >
        {isDarkMode ? <Sun size={20} strokeWidth={1.8} /> : <Moon size={20} strokeWidth={1.8} />}
      </button>

      <div className="login-card">
        <div className="login-header">
          <Link to="/" className="login-brand">
            ClassSight
          </Link>
          <h1>Welcome back</h1>
          <p>Sign in to access your ClassSight account.</p>
        </div>

        {error && (
          <div className="login-alert" role="alert">
            <AlertCircle size={17} strokeWidth={2} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="email">College Email</label>
            <div className={`input-wrapper ${fieldErrors.email ? "has-error" : ""}`}>
              <Mail size={19} strokeWidth={1.8} aria-hidden="true" />
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="name@college.edu"
                value={email}
                disabled={submitting}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFieldErrors((f) => ({ ...f, email: undefined }));
                  setError("");
                }}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
              />
            </div>
            {fieldErrors.email && (
              <p id="email-error" className="field-error">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className={`input-wrapper ${fieldErrors.password ? "has-error" : ""}`}>
              <Lock size={19} strokeWidth={1.8} aria-hidden="true" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                disabled={submitting}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFieldErrors((f) => ({ ...f, password: undefined }));
                  setError("");
                }}
                onKeyDown={trackCapsLock}
                onKeyUp={trackCapsLock}
                onBlur={() => setCapsLock(false)}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={
                  [fieldErrors.password && "password-error", capsLock && "caps-warning"]
                    .filter(Boolean)
                    .join(" ") || undefined
                }
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} strokeWidth={1.8} /> : <Eye size={18} strokeWidth={1.8} />}
              </button>
            </div>
            {fieldErrors.password && (
              <p id="password-error" className="field-error">
                {fieldErrors.password}
              </p>
            )}
            {capsLock && (
              <p id="caps-warning" className="field-hint">
                Caps Lock is on.
              </p>
            )}
          </div>

          <div className="login-options">
            <label className="remember-me">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span>Remember me</span>
            </label>
            <button
              type="button"
              className="forgot-password"
              onClick={() => setShowForgot((v) => !v)}
              aria-expanded={showForgot}
              aria-controls="forgot-note"
            >
              Forgot password?
            </button>
          </div>

          {showForgot && (
            <div id="forgot-note" className="login-note">
              <Info size={16} strokeWidth={2} aria-hidden="true" />
              <span>
                Passwords are managed by your ClassSight administrator. Contact them to reset your
                password.
              </span>
            </div>
          )}

          <button type="submit" className="login-submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 size={18} strokeWidth={2} className="login-spinner" aria-hidden="true" />
                <span>Signing in…</span>
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <p className="login-secure">
          <ShieldCheck size={14} strokeWidth={2} aria-hidden="true" />
          <span>
            {remember
              ? "You'll stay signed in on this device."
              : "You'll be signed out when you close the browser."}
          </span>
        </p>

        <div className="login-footer">
          <span>ClassSight</span>
          <span>College Attendance System</span>
        </div>
      </div>
    </div>
  );
}

export default Login;
