// src/pages/Settings/SettingsTabs.jsx
// One component per Settings tab. `form` holds the drafted browser settings (see index.jsx).
import { useState, useEffect } from "react";
import { termLabel } from "../../utils/termLabel";
import { Link } from "react-router-dom";
import { Sun, Moon, Monitor, Camera, ChevronDown, Eye } from "lucide-react";
import pkg from "../../../package.json";
import { useTheme } from "../../context/theme/ThemeContext";
import { getToken } from "../../api/client";
import { getCurrentUser } from "../../api/auth";
import {
  DEFAULT_SETTINGS,
  MIN_ATTENDANCE_THRESHOLD,
  MAX_ATTENDANCE_THRESHOLD,
  MIN_LECTURE_MINUTES,
  MAX_LECTURE_MINUTES,
  getAtRiskFloor,
} from "../../context/settings/settingsStore";
import { SettingsCard, SettingRow, Toggle, Segmented, Select, ServerNote, FieldError } from "./settingsUi";

// Demo teacher account (the same placeholder identity shown in the app headers)
const DEMO_ACCOUNT = {
  name: "Professor Jhonsy",
  email: "Jhonsy.Bansal@thapar.edu",
  role: "TEACHER",
  department: "Computer Science & Engineering",
  term: `${termLabel()} · Semester 6`,
};

// Signed in through the API: show the real name/email/role; otherwise the demo account
function useAccount() {
  const [account, setAccount] = useState(DEMO_ACCOUNT);
  const [isDemo, setIsDemo] = useState(true);
  useEffect(() => {
    if (!getToken()) return undefined;
    let cancelled = false;
    getCurrentUser()
      .then((user) => {
        if (cancelled) return;
        setAccount({ ...DEMO_ACCOUNT, name: user.name, email: user.email, role: user.role });
        setIsDemo(false);
      })
      .catch(() => {
        /* keep the demo account */
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return { account, isDemo };
}

const initials = (name) =>
  name
    .replace(/^(professor|prof\.?|dr\.?)\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

// Number input bound to a drafted setting, with its error line
function DraftNumber({ form, field, id, suffix }) {
  const error = form.errors[field];
  return (
    <>
      <div className="ts-input-wrap">
        <input
          id={id}
          className="ts-input ts-input-num"
          inputMode="numeric"
          value={form.draft[field]}
          onChange={(e) => form.set(field, e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={`${id}-desc ${id}-error`}
        />
        <span className="ts-input-suffix">{suffix}</span>
      </div>
      <FieldError id={`${id}-error`} text={error} />
    </>
  );
}

function ResetLink({ onClick, disabled, children }) {
  return (
    <button type="button" className="ts-link" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

/* ---------------------------------------------------------------- Account */

export function AccountTab({ goToTab }) {
  const { account, isDemo } = useAccount();
  const details = [
    ["Full name", account.name],
    ["Institutional email", account.email],
    ["Role", account.role === "ADMIN" ? "Administrator" : "Teacher"],
    ["Department", account.department],
    ["Current term", account.term],
  ];

  return (
    <>
      <SettingsCard title="Profile" desc="How you appear to students and administrators" server>
        <div className="ts-profile">
          <div className="ts-avatar" aria-hidden="true">
            {initials(account.name)}
          </div>
          <div className="ts-profile-text">
            <strong>{account.name}</strong>
            <span>{account.email}</span>
          </div>
          <button type="button" className="btn-modal-cancel" disabled>
            <Camera size={15} strokeWidth={2} aria-hidden="true" />
            Change photo
          </button>
        </div>
        <SettingRow id="ts-phone" label="Contact number" desc="Used by administrators to reach you about classes." disabled>
          <input id="ts-phone" className="ts-input" type="tel" placeholder="Not set" disabled />
        </SettingRow>
        <SettingRow id="ts-password-link" label="Password" desc="Change the password you use to sign in.">
          <button id="ts-password-link" type="button" className="btn-modal-cancel" onClick={() => goToTab("security")}>
            Go to Security
          </button>
        </SettingRow>
      </SettingsCard>

      <SettingsCard title="Institutional details" desc="Managed by your institution's administrator. Read-only.">
        <dl className="ts-details">
          {details.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <p className="ts-hint">
          {isDemo
            ? "Demo account details. Ask your administrator to correct anything here."
            : "Name, email and role come from your ClassSight account. Ask your administrator to correct them."}
        </p>
        <Link to="/student/preview" className="btn-view-session ts-preview-link">
          <Eye size={14} aria-hidden="true" />
          <span>Preview student view (demo)</span>
        </Link>
      </SettingsCard>
    </>
  );
}

/* ---------------------------------------------------------- Notifications */

const NOTIFICATION_TYPES = [
  ["attendance", "Attendance alerts", "When a session finishes processing or needs your review."],
  ["schedule", "Schedule changes", "Room, time or cancellation changes to your classes."],
  ["low", "Low-attendance alerts", "When a student drops below the attendance threshold."],
  ["weekly", "Weekly summaries", "A short digest of attendance across your classes."],
];

export function NotificationsTab() {
  return (
    <>
      <ServerNote>
        Notification delivery runs on the ClassSight server, which isn&apos;t connected yet. These are the
        defaults that will apply; they can&apos;t be changed until then. Alerts in the header are demo content.
      </ServerNote>
      <SettingsCard title="All notifications" desc="Turn every ClassSight notification on or off" server>
        <SettingRow id="ts-notify-all" label="Notifications" desc="Master switch for in-app and email alerts." disabled>
          <Toggle id="ts-notify-all" checked disabled label="Notifications" />
        </SettingRow>
      </SettingsCard>
      <SettingsCard title="What to notify you about" desc="Choose a channel for each kind of alert" server>
        <div className="ts-matrix" role="table" aria-label="Notification channels">
          <div className="ts-matrix-head" role="row">
            <span role="columnheader">Alert</span>
            <span role="columnheader">In-app</span>
            <span role="columnheader">Email</span>
          </div>
          {NOTIFICATION_TYPES.map(([key, label, desc]) => (
            <div className="ts-matrix-row" role="row" key={key}>
              <div role="cell">
                <span className="ts-row-label">{label}</span>
                <p className="ts-row-desc">{desc}</p>
              </div>
              <div role="cell">
                <Toggle checked disabled label={`${label} in-app`} />
              </div>
              <div role="cell">
                <Toggle checked={key === "weekly" || key === "low"} disabled label={`${label} by email`} />
              </div>
            </div>
          ))}
        </div>
      </SettingsCard>
    </>
  );
}

/* ------------------------------------------------------------- Attendance */

export function AttendanceTab({ form }) {
  return (
    <>
      <SettingsCard
        title="Sessions"
        local
        desc="Defaults for the attendance sessions you start"
        footer={
          <div className="ts-card-foot">
            <ResetLink
              onClick={() => form.reset("defaultLectureMinutes", DEFAULT_SETTINGS.defaultLectureMinutes)}
              disabled={form.saved.defaultLectureMinutes === DEFAULT_SETTINGS.defaultLectureMinutes}
            >
              Reset to {DEFAULT_SETTINGS.defaultLectureMinutes} minutes
            </ResetLink>
          </div>
        }
      >
        <SettingRow
          id="ts-duration"
          label="Default session duration"
          desc={`Used for new lectures and for time slots that only have a start time (${MIN_LECTURE_MINUTES}–${MAX_LECTURE_MINUTES} min).`}
        >
          <DraftNumber form={form} field="defaultLectureMinutes" id="ts-duration" suffix="min" />
        </SettingRow>
      </SettingsCard>

      <SettingsCard title="Verification" desc="How students are verified during a session" server>
        <SettingRow id="ts-method" label="Default verification method" desc="The method a new session starts with." disabled>
          <Select id="ts-method" value="Face recognition" options={["Face recognition", "NFC", "Manual"]} disabled />
        </SettingRow>
        <SettingRow id="ts-autoclose" label="Close sessions automatically" desc="End a session when its time slot is over." disabled>
          <Toggle id="ts-autoclose" checked={false} disabled label="Close sessions automatically" />
        </SettingRow>
        <SettingRow id="ts-manual" label="Allow manual marking" desc="Let you mark a student present by hand when other methods fail." disabled>
          <Toggle id="ts-manual" checked disabled label="Allow manual marking" />
        </SettingRow>
        <SettingRow id="ts-face" label="Face verification" desc="Match students from the class photo. Accept/reject rules are set by your institution." disabled>
          <Toggle id="ts-face" checked disabled label="Face verification" />
        </SettingRow>
        <SettingRow id="ts-nfc" label="NFC verification" desc="Let students tap their ID card to check in." disabled>
          <Toggle id="ts-nfc" checked disabled label="NFC verification" />
        </SettingRow>
      </SettingsCard>
    </>
  );
}

/* --------------------------------------------------------- Class & Schedule */

export function ScheduleTab({ form }) {
  return (
    <>
      <SettingsCard
        title="New lectures"
        local
        desc="Applied to lectures you add on the Dashboard"
        footer={
          <div className="ts-card-foot">
            <ResetLink
              onClick={() => form.reset("defaultDepartment", DEFAULT_SETTINGS.defaultDepartment)}
              disabled={form.saved.defaultDepartment === DEFAULT_SETTINGS.defaultDepartment}
            >
              Reset department
            </ResetLink>
          </div>
        }
      >
        <SettingRow id="ts-department" label="Default department" desc="Shown in the active-session banner.">
          <input
            id="ts-department"
            className="ts-input"
            value={form.draft.defaultDepartment}
            onChange={(e) => form.set("defaultDepartment", e.target.value)}
            aria-invalid={Boolean(form.errors.defaultDepartment)}
            aria-describedby="ts-department-desc ts-department-error"
          />
          <FieldError id="ts-department-error" text={form.errors.defaultDepartment} />
        </SettingRow>
      </SettingsCard>

      <SettingsCard title="Views" desc="Where ClassSight opens and how your timetable is shown" server>
        <SettingRow id="ts-timetable" label="Default timetable view" desc="Class Schedule opens in this view." disabled>
          <Segmented
            id="ts-timetable"
            label="Default timetable view"
            value="weekly"
            options={[
              { value: "daily", label: "Daily" },
              { value: "weekly", label: "Weekly" },
            ]}
            disabled
          />
        </SettingRow>
        <SettingRow id="ts-landing" label="Default landing page" desc="The page you see after signing in." disabled>
          <Select id="ts-landing" value="Dashboard" options={["Dashboard", "Classes", "Attendance", "Reports"]} disabled />
        </SettingRow>
      </SettingsCard>
    </>
  );
}

/* --------------------------------------------------------- Reports */

export function ReportsTab({ form }) {
  const preview = form.errors.attendanceThreshold
    ? form.saved.attendanceThreshold
    : Number(form.draft.attendanceThreshold);
  const floor = getAtRiskFloor(preview);

  return (
    <>
      <SettingsCard
        title="Attendance threshold"
        local
        desc="Minimum attendance a student needs to stay eligible"
        footer={
          <div className="ts-card-foot">
            <ResetLink
              onClick={() => form.reset("attendanceThreshold", DEFAULT_SETTINGS.attendanceThreshold)}
              disabled={form.saved.attendanceThreshold === DEFAULT_SETTINGS.attendanceThreshold}
            >
              Reset to {DEFAULT_SETTINGS.attendanceThreshold}%
            </ResetLink>
          </div>
        }
      >
        <SettingRow
          id="ts-threshold"
          label="Attendance requirement"
          desc={`Used by Students, Reports, Report Details and the student view (${MIN_ATTENDANCE_THRESHOLD}–${MAX_ATTENDANCE_THRESHOLD}%).`}
        >
          <DraftNumber form={form} field="attendanceThreshold" id="ts-threshold" suffix="%" />
        </SettingRow>
        <div className="ts-bands" aria-label="How students are grouped">
          <span className="ts-band ok">
            <i aria-hidden="true" />
            Good standing · {preview}% and above
          </span>
          <span className="ts-band risk">
            <i aria-hidden="true" />
            At risk · {floor}–{preview - 1}%
          </span>
          <span className="ts-band crit">
            <i aria-hidden="true" />
            Critical · below {floor}%
          </span>
        </div>
      </SettingsCard>

      <SettingsCard title="Report defaults" desc="How reports open and export" server>
        <SettingRow id="ts-period" label="Default reporting period" desc="The date range reports open with." disabled>
          <Select id="ts-period" value="This month" options={["This week", "This month", "This term"]} disabled />
        </SettingRow>
        <SettingRow id="ts-view" label="Default report view" desc="Show reports as charts or as a table first." disabled>
          <Segmented
            id="ts-view"
            label="Default report view"
            value="charts"
            options={[
              { value: "charts", label: "Charts" },
              { value: "table", label: "Table" },
            ]}
            disabled
          />
        </SettingRow>
        <SettingRow id="ts-export" label="Export format" desc="File type for downloaded reports." disabled>
          <Select id="ts-export" value="PDF" options={["PDF", "CSV", "Excel"]} disabled />
        </SettingRow>
        <SettingRow id="ts-weekly" label="Weekly report summary" desc="Prepare a summary of each week's attendance." disabled>
          <Toggle id="ts-weekly" checked disabled label="Weekly report summary" />
        </SettingRow>
      </SettingsCard>
    </>
  );
}

/* ------------------------------------------------------------- Appearance */

const SIDE_COLLAPSED_KEY = "cs-side-collapsed"; // read by TeacherShell
const readSidebar = () => {
  try {
    return localStorage.getItem(SIDE_COLLAPSED_KEY) === "1" ? "collapsed" : "expanded";
  } catch {
    return "expanded";
  }
};

export function AppearanceTab() {
  const { themePreference, setThemePreference } = useTheme();
  const [sidebar, setSidebar] = useState(readSidebar);

  const changeSidebar = (value) => {
    setSidebar(value);
    try {
      localStorage.setItem(SIDE_COLLAPSED_KEY, value === "collapsed" ? "1" : "0");
    } catch {
      /* storage blocked */
    }
  };

  return (
    <>
      <SettingsCard title="Theme & layout" desc="Applied straight away on this device" local>
        <SettingRow id="ts-theme" label="Theme" desc="System follows your device's light or dark setting.">
          <Segmented
            id="ts-theme"
            label="Theme"
            value={themePreference}
            onChange={setThemePreference}
            options={[
              { value: "system", label: "System", Icon: Monitor },
              { value: "light", label: "Light", Icon: Sun },
              { value: "dark", label: "Dark", Icon: Moon },
            ]}
          />
        </SettingRow>
        <SettingRow id="ts-sidebar" label="Sidebar" desc="How the sidebar starts on wide screens. Takes effect on the next page you open.">
          <Segmented
            id="ts-sidebar"
            label="Sidebar"
            value={sidebar}
            onChange={changeSidebar}
            options={[
              { value: "expanded", label: "Expanded" },
              { value: "collapsed", label: "Collapsed" },
            ]}
          />
        </SettingRow>
      </SettingsCard>
      <SettingsCard title="Density" desc="Spacing of lists and tables" server>
        <SettingRow id="ts-density" label="Interface density" desc="Compact fits more rows on screen." disabled>
          <Segmented
            id="ts-density"
            label="Interface density"
            value="comfortable"
            options={[
              { value: "comfortable", label: "Comfortable" },
              { value: "compact", label: "Compact" },
            ]}
            disabled
          />
        </SettingRow>
      </SettingsCard>
    </>
  );
}

/* --------------------------------------------------------------- Security */

export function SecurityTab() {
  return (
    <>
      <ServerNote>
        Sign-in, passwords and sessions are managed by the ClassSight server, which isn&apos;t connected yet.
        No security settings are stored in this browser.
      </ServerNote>
      <SettingsCard title="Change password" desc="Use at least 8 characters" server>
        <div className="ts-pw-grid">
          {[
            ["ts-pw-current", "Current password"],
            ["ts-pw-new", "New password"],
            ["ts-pw-confirm", "Confirm new password"],
          ].map(([id, label]) => (
            <div key={id}>
              <label htmlFor={id} className="ts-row-label">
                {label}
              </label>
              <input id={id} className="ts-input" type="password" autoComplete="off" disabled />
            </div>
          ))}
        </div>
        <div className="ts-card-actions">
          <button type="button" className="btn-modal-submit" disabled>
            Update password
          </button>
        </div>
      </SettingsCard>
      <SettingsCard title="Active sessions" desc="Devices signed in to your account" server>
        <p className="ts-empty">Session history will appear here once the server is connected.</p>
        <div className="ts-card-actions">
          <button type="button" className="btn-modal-cancel" disabled>
            Sign out of other devices
          </button>
        </div>
      </SettingsCard>
      <SettingsCard title="Recent login activity" desc="Sign-ins over the last 30 days" server>
        <p className="ts-empty">No login activity to show.</p>
      </SettingsCard>
    </>
  );
}

/* ------------------------------------------------------------------- Help */

const GUIDE = [
  ["Start a session", "Open a lecture on the Dashboard and start attendance for it."],
  ["Capture the class", "Upload a group photo; ClassSight matches faces to enrolled students."],
  ["Resolve the rest", "Verify anyone left unmatched by NFC or manually, then confirm."],
  ["Review", "Track eligibility and low attendance on Students and Reports."],
];

const FAQS = [
  [
    "Why wasn't a student recognised?",
    "ClassSight only accepts confident matches — a wrong match is worse than a miss. Poor lighting, a turned face or no enrolment photo can leave a student unverified; resolve them manually or by NFC.",
  ],
  [
    "Where are my settings saved?",
    "Settings marked “Saved in this browser” are stored on this device only. Settings marked “Needs server” will sync to your account once the server is connected.",
  ],
  [
    "Who sets the attendance threshold for my institution?",
    "Your institution's policy decides eligibility. The threshold here only changes how ClassSight groups students in your views.",
  ],
  [
    "How do I fix my name or department?",
    "Institutional details are managed by your administrator. Contact them to correct your profile.",
  ],
];

export function HelpTab() {
  const [open, setOpen] = useState(null);
  return (
    <>
      <SettingsCard title="User guide" desc="Taking attendance in four steps">
        <ol className="ts-guide">
          {GUIDE.map(([title, text]) => (
            <li key={title}>
              <strong>{title}</strong>
              <span>{text}</span>
            </li>
          ))}
        </ol>
      </SettingsCard>
      <SettingsCard title="FAQs" desc="Answers to common questions">
        <div className="ts-faq">
          {FAQS.map(([q, a], i) => (
            <div key={q} className={`ts-faq-item ${open === i ? "open" : ""}`}>
              <button
                type="button"
                aria-expanded={open === i}
                aria-controls={`ts-faq-${i}`}
                onClick={() => setOpen(open === i ? null : i)}
              >
                {q}
                <ChevronDown size={16} strokeWidth={2} aria-hidden="true" />
              </button>
              {open === i && <p id={`ts-faq-${i}`}>{a}</p>}
            </div>
          ))}
        </div>
      </SettingsCard>
      <SettingsCard title="Get help" desc="Report a problem or reach your administrator" server>
        <SettingRow id="ts-report" label="Report an issue" desc="Send a description and screenshot to the ClassSight team." disabled>
          <button id="ts-report" type="button" className="btn-modal-cancel" disabled>
            Report issue
          </button>
        </SettingRow>
        <SettingRow id="ts-contact" label="Contact administrator" desc="Message your institution's ClassSight administrator." disabled>
          <button id="ts-contact" type="button" className="btn-modal-cancel" disabled>
            Contact
          </button>
        </SettingRow>
      </SettingsCard>
      <SettingsCard title="About" desc="This copy of ClassSight">
        <dl className="ts-details">
          <div>
            <dt>Application version</dt>
            <dd>
              {pkg.version}
              {import.meta.env.DEV ? " (development)" : ""}
            </dd>
          </div>
        </dl>
      </SettingsCard>
    </>
  );
}
