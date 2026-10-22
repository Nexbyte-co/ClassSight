// src/pages/Settings.jsx
// Teacher settings. Preferences are stored in this browser; account, security and
// notification delivery need the ClassSight server and are shown as unavailable.
import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, ScanFace, Sun, Moon, Settings as SettingsIcon, Eye, AlertTriangle } from "lucide-react";
import "./Dashboard.css";
import "./Reports.css";
import { useTheme } from "../context/ThemeContext";
import { useSettings } from "../context/SettingsContext";
import AppNavigationDrawer from "../components/AppNavigationDrawer";
import TeacherProfileMenu from "../components/TeacherProfileMenu";
import { useDialogA11y } from "../hooks/useDialogA11y";
import {
  DEFAULT_ATTENDANCE_THRESHOLD,
  DEFAULT_SETTINGS,
  MIN_ATTENDANCE_THRESHOLD,
  MAX_ATTENDANCE_THRESHOLD,
  MIN_LECTURE_MINUTES,
  MAX_LECTURE_MINUTES,
  getAtRiskFloor,
  validateThreshold,
  validateLectureMinutes,
  validateDepartment,
} from "../context/settingsStore";

// Demo teacher account (the same placeholder identity shown in the app headers)
const DEMO_ACCOUNT = {
  name: "Professor Jhonsy",
  email: "Jhonsy.Bansal@thapar.edu",
  department: "Computer Science & Engineering",
  term: "Spring Term 2026 · Semester 6",
};

const cardStyle = { padding: "20px 24px" };
const rowStyle = { display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" };
const errorStyle = { color: "var(--cs-danger, #dc2626)", fontSize: 13, marginTop: 6 };
const hintStyle = { color: "var(--cs-text-secondary)", fontSize: 13, lineHeight: 1.5 };

function StorageBadge({ local }) {
  return local ? (
    <span className="badge-eligible">Saved in this browser</span>
  ) : (
    <span
      className="badge-eligible"
      style={{ background: "var(--cs-card-hover)", color: "var(--cs-text-secondary)" }}
    >
      Requires server
    </span>
  );
}

function SectionHeading({ title, desc, local }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
      <div>
        <div className="section-title-tag">{title}</div>
        <div className="section-desc">{desc}</div>
      </div>
      <StorageBadge local={local} />
    </div>
  );
}

function SavedMessage({ text }) {
  return (
    <div role="status" aria-live="polite" style={{ minHeight: 20, marginTop: 10, fontSize: 13, color: "var(--cs-success)", fontWeight: 600 }}>
      {text}
    </div>
  );
}

function AttendanceRulesSection({ onDirtyChange }) {
  const { attendanceThreshold, updateSettings } = useSettings();
  const [draft, setDraft] = useState(String(attendanceThreshold));
  const [message, setMessage] = useState("");

  // Unsaved edit = the field differs from the saved value
  const isDirty = draft.trim() !== String(attendanceThreshold);
  useEffect(() => onDirtyChange?.(isDirty), [isDirty, onDirtyChange]);

  const error = validateThreshold(draft);
  const isUnchanged = !error && Number(draft) === attendanceThreshold;
  const previewThreshold = error ? attendanceThreshold : Number(draft);

  const save = (e) => {
    e.preventDefault();
    if (error) return;
    updateSettings({ attendanceThreshold: Number(draft) });
    setMessage(`Saved. ${draft}% now applies across Students, Reports and the student view.`);
  };

  const resetToDefault = () => {
    setDraft(String(DEFAULT_ATTENDANCE_THRESHOLD));
    updateSettings({ attendanceThreshold: DEFAULT_ATTENDANCE_THRESHOLD });
    setMessage(`Reset to the default ${DEFAULT_ATTENDANCE_THRESHOLD}%.`);
  };

  return (
    <section className="settings-section settings-attendance" style={{ marginBottom: 28 }}>
      <SectionHeading
        title="ATTENDANCE RULES"
        desc="Minimum attendance a student needs to be eligible"
        local
      />
      <form className="reports-table-card" style={cardStyle} onSubmit={save} noValidate>
        <label htmlFor="settings-threshold" className="picker-field-label">
          ATTENDANCE REQUIREMENT (%)
        </label>
        <div style={rowStyle}>
          <input
            id="settings-threshold"
            className="picker-date-input"
            style={{ maxWidth: 160 }}
            inputMode="numeric"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setMessage("");
            }}
            aria-invalid={Boolean(error)}
            aria-describedby="settings-threshold-help settings-threshold-error"
          />
          <button type="submit" className="btn-modal-submit" disabled={Boolean(error) || isUnchanged}>
            Save
          </button>
          <button
            type="button"
            className="btn-modal-cancel"
            onClick={resetToDefault}
            disabled={attendanceThreshold === DEFAULT_ATTENDANCE_THRESHOLD && draft === String(DEFAULT_ATTENDANCE_THRESHOLD)}
          >
            Reset to {DEFAULT_ATTENDANCE_THRESHOLD}%
          </button>
          {isDirty && (
            <button
              type="button"
              className="btn-modal-cancel settings-cancel"
              onClick={() => {
                setDraft(String(attendanceThreshold));
                setMessage("");
              }}
            >
              Cancel
            </button>
          )}
        </div>
        <div id="settings-threshold-error" style={errorStyle} role={error ? "alert" : undefined}>
          {error || ""}
        </div>
        <p id="settings-threshold-help" style={{ ...hintStyle, marginTop: 6 }}>
          Allowed range {MIN_ATTENDANCE_THRESHOLD}–{MAX_ATTENDANCE_THRESHOLD}%. With {previewThreshold}%: students at{" "}
          <strong>{previewThreshold}% or above</strong> are in good standing,{" "}
          <strong>
            {getAtRiskFloor(previewThreshold)}–{previewThreshold - 1}%
          </strong>{" "}
          are at risk, and below {getAtRiskFloor(previewThreshold)}% are critical. Used by the Students list,
          detention badges in Reports, Report Details and the student view.
        </p>
        <SavedMessage text={message} />
      </form>
    </section>
  );
}

function SchedulePreferencesSection({ onDirtyChange }) {
  const { defaultLectureMinutes, defaultDepartment, updateSettings } = useSettings();
  const [minutes, setMinutes] = useState(String(defaultLectureMinutes));
  const [department, setDepartment] = useState(defaultDepartment);
  const [message, setMessage] = useState("");

  const isDirty = minutes.trim() !== String(defaultLectureMinutes) || department !== defaultDepartment;
  useEffect(() => onDirtyChange?.(isDirty), [isDirty, onDirtyChange]);

  const minutesError = validateLectureMinutes(minutes);
  const departmentError = validateDepartment(department);
  const hasError = Boolean(minutesError || departmentError);
  const isUnchanged =
    !hasError && Number(minutes) === defaultLectureMinutes && department.trim() === defaultDepartment;

  const save = (e) => {
    e.preventDefault();
    if (hasError) return;
    updateSettings({ defaultLectureMinutes: Number(minutes), defaultDepartment: department.trim() });
    setDepartment(department.trim());
    setMessage("Saved. Used for new lectures and for time slots without an end time.");
  };

  const resetToDefault = () => {
    setMinutes(String(DEFAULT_SETTINGS.defaultLectureMinutes));
    setDepartment(DEFAULT_SETTINGS.defaultDepartment);
    updateSettings({
      defaultLectureMinutes: DEFAULT_SETTINGS.defaultLectureMinutes,
      defaultDepartment: DEFAULT_SETTINGS.defaultDepartment,
    });
    setMessage("Reset to the defaults.");
  };

  return (
    <section className="settings-section settings-schedule" style={{ marginBottom: 28 }}>
      <SectionHeading title="CLASS & SCHEDULE" desc="Defaults for lectures you add on the Dashboard" local />
      <form className="reports-table-card" style={cardStyle} onSubmit={save} noValidate>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <div>
            <label htmlFor="settings-lecture-minutes" className="picker-field-label">
              DEFAULT LECTURE LENGTH (MINUTES)
            </label>
            <input
              id="settings-lecture-minutes"
              className="picker-date-input"
              inputMode="numeric"
              value={minutes}
              onChange={(e) => {
                setMinutes(e.target.value);
                setMessage("");
              }}
              aria-invalid={Boolean(minutesError)}
              aria-describedby="settings-lecture-minutes-error"
            />
            <div id="settings-lecture-minutes-error" style={errorStyle} role={minutesError ? "alert" : undefined}>
              {minutesError || ""}
            </div>
            <p style={hintStyle}>
              Used when a lecture&apos;s time slot has only a start time ({MIN_LECTURE_MINUTES}–{MAX_LECTURE_MINUTES}).
            </p>
          </div>
          <div>
            <label htmlFor="settings-department" className="picker-field-label">
              DEFAULT DEPARTMENT
            </label>
            <input
              id="settings-department"
              className="picker-date-input"
              value={department}
              onChange={(e) => {
                setDepartment(e.target.value);
                setMessage("");
              }}
              aria-invalid={Boolean(departmentError)}
              aria-describedby="settings-department-error"
            />
            <div id="settings-department-error" style={errorStyle} role={departmentError ? "alert" : undefined}>
              {departmentError || ""}
            </div>
            <p style={hintStyle}>
              Applied to new lectures you add on the Dashboard (shown in the active-session banner).
            </p>
          </div>
        </div>
        <div style={{ ...rowStyle, marginTop: 8 }}>
          <button type="submit" className="btn-modal-submit" disabled={hasError || isUnchanged}>
            Save
          </button>
          <button type="button" className="btn-modal-cancel" onClick={resetToDefault}>
            Reset to defaults
          </button>
          {isDirty && (
            <button
              type="button"
              className="btn-modal-cancel settings-cancel"
              onClick={() => {
                setMinutes(String(defaultLectureMinutes));
                setDepartment(defaultDepartment);
                setMessage("");
              }}
            >
              Cancel
            </button>
          )}
        </div>
        <SavedMessage text={message} />
      </form>
    </section>
  );
}

function AppearanceSection() {
  const { isDarkMode, setIsDarkMode } = useTheme();
  const options = [
    [false, "Light", Sun],
    [true, "Dark", Moon],
  ];
  return (
    <section className="settings-section settings-appearance" style={{ marginBottom: 28 }}>
      <SectionHeading title="APPEARANCE" desc="Colour theme for this browser" local />
      <div className="reports-table-card" style={cardStyle}>
        <div role="radiogroup" aria-label="Colour theme" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {options.map(([dark, label, Icon]) => (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={isDarkMode === dark}
              className={isDarkMode === dark ? "btn-modal-submit" : "btn-modal-cancel"}
              onClick={() => setIsDarkMode(dark)}
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function UnavailableSection({ className, title, desc, children }) {
  return (
    <section className={`settings-section ${className}`} style={{ marginBottom: 28 }}>
      <SectionHeading title={title} desc={desc} local={false} />
      <div className="reports-table-card" style={cardStyle}>
        <p style={hintStyle}>{children}</p>
      </div>
    </section>
  );
}

// Protects unsaved Settings edits: in-app link clicks ask for confirmation first,
// and reloading/closing the tab triggers the browser's own warning.
function useUnsavedChangesGuard(isDirty) {
  const navigate = useNavigate();
  const [pendingHref, setPendingHref] = useState(null);
  const isDirtyRef = useRef(isDirty);
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    // Capture phase: runs before React Router's link handler
    const onClick = (e) => {
      if (!isDirtyRef.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const link = e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (!link || link.target === "_blank") return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const to = url.pathname + url.search + url.hash;
      if (to === window.location.pathname + window.location.search + window.location.hash) return;
      e.preventDefault();
      e.stopPropagation();
      setPendingHref(to);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return {
    pendingHref,
    stay: () => setPendingHref(null),
    discard: () => {
      const to = pendingHref;
      isDirtyRef.current = false;
      setPendingHref(null);
      navigate(to);
    },
  };
}

function DiscardChangesDialog({ onStay, onDiscard }) {
  const dialogRef = useDialogA11y(true, onStay);
  return (
    <div className="cs-modal-backdrop" onClick={onStay}>
      <div
        className="cs-modal-card cs-modal-confirm settings-discard-dialog"
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="discard-title"
        aria-describedby="discard-desc"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cs-modal-header">
          <div className="confirm-icon-danger">
            <AlertTriangle size={22} strokeWidth={2} aria-hidden="true" />
          </div>
          <div>
            <h3 id="discard-title">Discard unsaved changes?</h3>
            <p id="discard-desc" className="cs-modal-subtitle">
              You have edits in Settings that haven&apos;t been saved. If you leave now, they will be discarded.
            </p>
          </div>
        </div>
        <div className="cs-modal-actions">
          <button type="button" className="btn-modal-submit settings-stay" onClick={onStay}>
            Stay on this page
          </button>
          <button type="button" className="btn-modal-delete-confirm settings-discard" onClick={onDiscard}>
            Discard changes
          </button>
        </div>
      </div>
    </div>
  );
}

function Settings() {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [rulesDirty, setRulesDirty] = useState(false);
  const [scheduleDirty, setScheduleDirty] = useState(false);
  const guard = useUnsavedChangesGuard(rulesDirty || scheduleDirty);

  return (
    <div className={`reports-root settings-root teacher-ui ${isDarkMode ? "dark-mode" : ""}`}>
      <header className="dashboard-header">
        <div className="header-left">
          <button
            type="button"
            className="hamburger-nav-btn"
            aria-expanded={isNavOpen}
            onClick={() => setIsNavOpen(!isNavOpen)}
            aria-label={isNavOpen ? "Close navigation menu" : "Open navigation menu"}
            title={isNavOpen ? "Close navigation" : "Open navigation"}
          >
            <Menu size={22} aria-hidden="true" />
          </button>
          <Link to="/dashboard" className="brand-link">
            <div className="brand-icon">
              <ScanFace size={20} strokeWidth={2.2} />
            </div>
            <span className="brand-name">ClassSight</span>
          </Link>
        </div>
        <div className="header-right">
          <button
            type="button"
            className="header-icon-btn"
            onClick={toggleDarkMode}
            aria-label="Toggle color theme"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? <Sun size={19} strokeWidth={1.8} /> : <Moon size={19} strokeWidth={1.8} />}
          </button>
          <TeacherProfileMenu />
        </div>
      </header>

      <div className="dashboard-body">
        <AppNavigationDrawer isOpen={isNavOpen} onClose={() => setIsNavOpen(false)} activePage="settings" />

        <main className="reports-main">
          <div className="reports-page-header">
            <h1 className="reports-title">
              <SettingsIcon size={28} color="var(--cs-crimson)" strokeWidth={2.2} />
              <span>Settings</span>
            </h1>
            <p className="reports-subtitle">
              Preferences marked <strong>Saved in this browser</strong> take effect immediately on this
              device. Sections marked <strong>Requires server</strong> are not available in this frontend
              demo.
            </p>
          </div>

          <div className="reports-divider" />

          {/* Group 1 — Attendance preferences */}
          <div className="settings-group" role="group" aria-labelledby="settings-group-attendance">
            <h2 id="settings-group-attendance" className="settings-group-title">Attendance preferences</h2>
            <AttendanceRulesSection onDirtyChange={setRulesDirty} />
            <SchedulePreferencesSection onDirtyChange={setScheduleDirty} />
          </div>

          {/* Group 2 — Appearance */}
          <div className="settings-group" role="group" aria-labelledby="settings-group-appearance">
            <h2 id="settings-group-appearance" className="settings-group-title">Appearance</h2>
            <AppearanceSection />
          </div>

          {/* Group 3 — Account */}
          <div className="settings-group" role="group" aria-labelledby="settings-group-account">
            <h2 id="settings-group-account" className="settings-group-title">Account</h2>
          <section className="settings-section settings-profile" style={{ marginBottom: 28 }}>
            <SectionHeading title="PROFILE" desc="Your teacher account" local={false} />
            <div className="reports-table-card" style={cardStyle}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, fontSize: 14 }}>
                {[
                  ["Name", DEMO_ACCOUNT.name],
                  ["Email", DEMO_ACCOUNT.email],
                  ["Department", DEMO_ACCOUNT.department],
                  ["Term", DEMO_ACCOUNT.term],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div className="room-text">{label}</div>
                    <strong style={{ color: "var(--cs-text-primary)", overflowWrap: "anywhere" }}>{value}</strong>
                  </div>
                ))}
              </div>
              <p style={{ ...hintStyle, marginTop: 14 }}>
                Demo account details. Editing your profile needs the ClassSight server, which is not connected.
              </p>
              <Link
                to="/student/preview"
                className="btn-view-session"
                style={{ textDecoration: "none", marginTop: 12 }}
              >
                <Eye size={14} />
                <span>Preview student view (demo)</span>
              </Link>
            </div>
          </section>

            <UnavailableSection
              className="settings-notifications"
              title="NOTIFICATIONS"
              desc="Attendance alerts and reminders"
            >
              Notification delivery (email or push) needs the ClassSight server and is not available yet. The
              alerts in the header are demo content.
            </UnavailableSection>

            <UnavailableSection
              className="settings-security"
              title="ACCOUNT & SECURITY"
              desc="Sign-in, password and sessions"
            >
              Sign-in, password changes and session management are handled by the ClassSight server, which is
              not connected to this frontend demo. No security settings are stored in the browser.
            </UnavailableSection>
          </div>
        </main>
      </div>

      {guard.pendingHref && <DiscardChangesDialog onStay={guard.stay} onDiscard={guard.discard} />}
    </div>
  );
}

export default Settings;
