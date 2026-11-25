// src/pages/Settings/SettingsTabs.jsx
// One component per Settings tab. `form` holds the drafted browser settings (see index.jsx).
import { useState } from "react";
import { termLabel } from "../../utils/termLabel";
import { Sun, Moon, Monitor, ChevronDown } from "lucide-react";
import pkg from "../../../package.json";
import { useTheme } from "../../context/theme/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import {
  DEFAULT_SETTINGS,
  MIN_ATTENDANCE_THRESHOLD,
  MAX_ATTENDANCE_THRESHOLD,
  getAtRiskFloor,
} from "../../context/settings/settingsStore";
import { SettingsCard, SettingRow, Toggle, Segmented, FieldError } from "./settingsUi";
import { PasswordCard, SignInsCard } from "./AccountSecurity";
import { useSettings } from "../../context/settings/SettingsContext";

// The signed-in user (from /auth/me, via AuthContext).
function useAccount() {
  const { session } = useAuth();
  return {
    account: {
      name: session?.name || "",
      email: session?.email || "",
      role: (session?.apiRole || "teacher").toUpperCase(),
      department: session?.department || "Not assigned yet",
      designation: session?.designation || "Not set",
      term: termLabel(),
    },
  };
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
  const { account } = useAccount();
  const details = [
    ["Full name", account.name],
    ["Institutional email", account.email],
    ["Role", account.role === "ADMIN" ? "Administrator" : "Teacher"],
    ["Department", account.department],
    ["Designation", account.designation],
    ["Current term", account.term],
  ];

  return (
    <>
      <SettingsCard title="Profile" desc="How you appear to students and administrators">
        <div className="ts-profile">
          <div className="ts-avatar" aria-hidden="true">
            {initials(account.name)}
          </div>
          <div className="ts-profile-text">
            <strong>{account.name}</strong>
            <span>{account.email}</span>
          </div>
        </div>
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
          These come from your ClassSight account. To correct them, send a request from the Requests tab.
        </p>
      </SettingsCard>
    </>
  );
}

/* ---------------------------------------------------------- Notifications */

export function NotificationsTab() {
  const { notifyRequestUpdates, updateSettings } = useSettings();
  return (
    <SettingsCard title="Alerts under the bell" desc="Applied straight away on this device" local>
      <SettingRow
        id="ts-notify-requests"
        label="Request updates"
        desc="When an administrator starts working on or fixes a request you sent (last 14 days)."
      >
        <Toggle
          id="ts-notify-requests"
          checked={notifyRequestUpdates}
          onChange={(v) => updateSettings({ notifyRequestUpdates: v })}
          label="Request updates"
        />
      </SettingRow>
    </SettingsCard>
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
    </>
  );
}

/* --------------------------------------------------------------- Security */

export function SecurityTab() {
  return (
    <>
      <PasswordCard />
      <SignInsCard />
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
    "Settings marked “Saved in this browser” are stored on this device only. Your password and sign-ins are kept by the ClassSight server.",
  ],
  [
    "Who sets the attendance threshold for my institution?",
    "Your institution's policy decides eligibility. The threshold here only changes how ClassSight groups students in your views.",
  ],
  [
    "How do I fix my name or department?",
    "Institutional details are managed by your administrator. Send them a request from Settings → Requests.",
  ],
];

export function HelpTab({ goToTab }) {
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
      <SettingsCard title="Get help" desc="Reach your institution's ClassSight administrator">
        <SettingRow id="ts-contact" label="Contact administrator" desc="Report a problem or ask for a change. It stays on their dashboard until it's fixed.">
          <button id="ts-contact" type="button" className="btn-modal-cancel" onClick={() => goToTab("requests")}>
            Open Requests
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
