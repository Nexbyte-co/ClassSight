// src/pages/Students/StudentSettings.jsx
// Student settings: profile (read-only), account security, notification preferences, theme and logout.
// Notification preferences decide which attendance alerts reach the bell; the theme is the portal's real theme.
import { useNavigate } from "react-router-dom";
import { Bell, LogOut, Moon, Palette, ShieldCheck, Sun, UserRound } from "lucide-react";
import "./StudentPages.css";
import { useTheme } from "../../context/theme/ThemeContext";
import { useDemoSession } from "../../context/demo-session/DemoSessionContext";
import { useStudentModel } from "../../context/students/useStudentModel";

function Toggle({ id, label, hint, checked, onChange }) {
  return (
    <div className="st-opt">
      <span>
        <b id={`${id}-l`}>{label}</b>
        <span id={`${id}-h`}>{hint}</span>
      </span>
      <button type="button" role="switch" id={id} className="sp-switch" aria-checked={checked} aria-labelledby={`${id}-l`} aria-describedby={`${id}-h`} onClick={() => onChange(!checked)} />
    </div>
  );
}

export default function StudentSettings() {
  const navigate = useNavigate();
  const { session, signOut } = useDemoSession();
  const { isDarkMode, setIsDarkMode } = useTheme();
  const m = useStudentModel();
  const first = m.courses[0];

  const logout = () => {
    signOut();
    navigate("/", { replace: true });
  };

  return (
    <div className="sp-page sp-settings">
      <header className="sp-hd">
        <div>
          <h1>Settings</h1>
          <p>Your profile and how ClassSight looks and notifies you.</p>
        </div>
      </header>

      <div className="st-grid">
        <section className="sp-card" aria-labelledby="st-profile">
          <header className="sp-ch">
            <h2 id="st-profile"><UserRound size={16} strokeWidth={2} />Profile</h2>
            <span className="sp-sub">Managed by your college</span>
          </header>
          <dl className="sp-facts">
            <div><dt>Name</dt><dd>{session.name}</dd></div>
            <div><dt>Role</dt><dd>Student</dd></div>
            <div><dt>Email</dt><dd>{session.email}</dd></div>
            <div><dt>Batch</dt><dd>{m.courses.map((c) => c.group).join(", ") || "—"}<small>{first ? `${m.courses.length} course${m.courses.length === 1 ? "" : "s"}` : ""}</small></dd></div>
          </dl>
        </section>

        <section className="sp-card" aria-labelledby="st-security">
          <header className="sp-ch">
            <h2 id="st-security"><ShieldCheck size={16} strokeWidth={2} />Account security</h2>
          </header>
          <ul className="st-list">
            <li><b>Sign-in method</b><span>Demo role sign-in. There is no password in this version of ClassSight.</span></li>
            <li><b>This device</b><span>You stay signed in on this browser until you log out.</span></li>
            <li><b>Your data</b><span>You can only see your own attendance records.</span></li>
          </ul>
        </section>

        <section className="sp-card" aria-labelledby="st-notify">
          <header className="sp-ch">
            <h2 id="st-notify"><Bell size={16} strokeWidth={2} />Notifications</h2>
            <span className="sp-sub">Shown under the bell</span>
          </header>
          <Toggle
            id="pref-low"
            label="Low attendance"
            hint={`Tell me when a course drops below the ${m.threshold}% requirement.`}
            checked={m.prefs.lowAttendance}
            onChange={(v) => m.setPref("lowAttendance", v)}
          />
          <Toggle
            id="pref-review"
            label="Classes awaiting review"
            hint="Tell me when a class is unverified and waiting for my teacher."
            checked={m.prefs.pendingReview}
            onChange={(v) => m.setPref("pendingReview", v)}
          />
        </section>

        <section className="sp-card" aria-labelledby="st-theme">
          <header className="sp-ch">
            <h2 id="st-theme"><Palette size={16} strokeWidth={2} />Appearance</h2>
          </header>
          <div className="st-themes" role="radiogroup" aria-label="Theme">
            <button type="button" role="radio" aria-checked={!isDarkMode} className={`st-theme ${!isDarkMode ? "on" : ""}`} onClick={() => setIsDarkMode(false)}>
              <Sun size={18} strokeWidth={2} />Light
            </button>
            <button type="button" role="radio" aria-checked={isDarkMode} className={`st-theme ${isDarkMode ? "on" : ""}`} onClick={() => setIsDarkMode(true)}>
              <Moon size={18} strokeWidth={2} />Dark
            </button>
          </div>
        </section>

        <section className="sp-card st-wide" aria-labelledby="st-logout">
          <header className="sp-ch">
            <h2 id="st-logout"><LogOut size={16} strokeWidth={2} />Log out</h2>
          </header>
          <div className="st-opt">
            <span>
              <b>Sign out of ClassSight</b>
              <span>You will return to the home page.</span>
            </span>
            <button type="button" className="sp-btn danger" onClick={logout}>Log out</button>
          </div>
        </section>
      </div>
    </div>
  );
}
