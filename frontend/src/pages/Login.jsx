import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();

    // Temporary navigation until backend authentication is connected
    navigate("/dashboard");
  };

  return (
    <div className="login-page">
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

        <form className="login-form" onSubmit={handleSubmit}>

          <div className="form-group">
            <label htmlFor="email">College ID / Email</label>

            <div className="input-wrapper">
              <Mail size={19} strokeWidth={1.8} />

              <input
                id="email"
                type="text"
                placeholder="Enter your college ID or email"
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

          <button type="submit" className="login-submit">
            Sign In
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