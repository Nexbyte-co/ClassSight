// src/pages/Students/settings/StudentSettingsTabs.jsx
// One component per student Settings tab. `m` is the student model from the portal layout.
// A student can only change how ClassSight looks and notifies them; their records, the attendance
// requirement and their face data are managed by the college, so those are shown read-only or as "Needs server".
import { useState } from "react";
import { Link } from "react-router-dom";
import { Sun, Moon, Monitor, Camera, ChevronDown, FileChartColumn, LogOut } from "lucide-react";
import pkg from "../../../../package.json";
import { termLabel } from "../../../utils/termLabel";
import { useTheme } from "../../../context/theme/ThemeContext";
import { getAtRiskFloor } from "../../../context/settings/settingsStore";
import { CLASS_WEIGHT } from "../../../context/students/studentCourses";
import { SettingsCard, SettingRow, Toggle, Segmented, ServerNote } from "../../Settings/settingsUi";

const initials = (name) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : word.endsWith("s") ? "es" : "s"}`;

function Details({ items }) {
  return (
    <dl className="ts-details">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ---------------------------------------------------------------- Profile */

export function ProfileTab({ m, session, goToTab }) {
  const batches = [...new Set(m.courses.map((c) => c.group))].join(", ") || "—";
  return (
    <>
      <SettingsCard title="Profile" desc="How you appear to your teachers" server>
        <div className="ts-profile">
          <div className="ts-avatar" aria-hidden="true">
            {initials(session.name)}
          </div>
          <div className="ts-profile-text">
            <strong>{session.name}</strong>
            <span>{session.email}</span>
          </div>
          <button type="button" className="btn-modal-cancel" disabled>
            <Camera size={15} strokeWidth={2} aria-hidden="true" />
            Change photo
          </button>
        </div>
        <SettingRow id="ss-phone" label="Contact number" desc="Lets your teachers reach you about classes." disabled>
          <input id="ss-phone" className="ts-input" type="tel" placeholder="Not set" disabled />
        </SettingRow>
        <SettingRow id="ss-face-link" label="Face data" desc="See how ClassSight recognises you in class photos.">
          <button id="ss-face-link" type="button" className="btn-modal-cancel" onClick={() => goToTab("face")}>
            Go to Face data
          </button>
        </SettingRow>
      </SettingsCard>

      <SettingsCard title="Academic details" desc="Managed by your college. Read-only.">
        <Details
          items={[
            ["Full name", session.name],
            ["Roll number", session.roll ?? "—"],
            ["Institutional email", session.email],
            ["Role", "Student"],
            ["Batch / sections", batches],
            ["Enrolled courses", plural(m.courses.length, "course")],
            ["Current term", termLabel()],
          ]}
        />
        <p className="ts-hint">Something wrong here? Ask your class coordinator or the college office to correct it.</p>
      </SettingsCard>
    </>
  );
}

/* ---------------------------------------------------------- Notifications */

export function NotificationsTab({ m }) {
  const shown = m.alerts.filter((a) => (a.id === "unverified" ? m.prefs.pendingReview : m.prefs.lowAttendance)).length;
  return (
    <>
      <SettingsCard title="Alerts under the bell" desc="Applied straight away on this device" local>
        <SettingRow
          id="ss-low"
          label="Low attendance"
          desc={`When a course drops below the ${m.threshold}% requirement, with how many classes you need to recover.`}
        >
          <Toggle id="ss-low" checked={m.prefs.lowAttendance} onChange={(v) => m.setPref("lowAttendance", v)} label="Low attendance" />
        </SettingRow>
        <SettingRow
          id="ss-review"
          label="Classes awaiting review"
          desc="When face verification was unclear and your teacher still has to confirm a class."
        >
          <Toggle id="ss-review" checked={m.prefs.pendingReview} onChange={(v) => m.setPref("pendingReview", v)} label="Classes awaiting review" />
        </SettingRow>
        <p className="ts-hint">
          {shown === 0 ? "No alerts under the bell right now." : `${plural(shown, "alert")} under the bell right now.`}
        </p>
      </SettingsCard>

      <SettingsCard title="Email and reminders" desc="Sent by the ClassSight server" server>
        <SettingRow id="ss-email-low" label="Email me about low attendance" desc="A message to your college email when a course falls below the requirement." disabled>
          <Toggle id="ss-email-low" checked disabled label="Email me about low attendance" />
        </SettingRow>
        <SettingRow id="ss-remind" label="Class reminders" desc="A reminder a few minutes before each class starts." disabled>
          <Toggle id="ss-remind" checked={false} disabled label="Class reminders" />
        </SettingRow>
        <SettingRow id="ss-changes" label="Timetable changes" desc="When a class is moved, cancelled or changes room." disabled>
          <Toggle id="ss-changes" checked disabled label="Timetable changes" />
        </SettingRow>
        <SettingRow id="ss-weekly" label="Weekly summary" desc="Your attendance for the week, every Sunday." disabled>
          <Toggle id="ss-weekly" checked={false} disabled label="Weekly summary" />
        </SettingRow>
      </SettingsCard>
    </>
  );
}

/* ------------------------------------------------------------- Attendance */

export function AttendanceTab({ m }) {
  const floor = getAtRiskFloor(m.threshold);
  const { pct } = m.overall;
  return (
    <>
      <SettingsCard title="Attendance requirement" desc="Set by your college and teachers. You can't change it.">
        <Details
          items={[
            ["Minimum attendance", `${m.threshold}% in every course`],
            ["Your overall attendance", pct === null ? "No classes recorded yet" : `${pct}%`],
            ["Courses below requirement", m.atRisk.length === 0 ? "None" : plural(m.atRisk.length, "course")],
          ]}
        />
        <div className="ts-bands" aria-label="How your courses are grouped">
          <span className="ts-band ok">
            <i aria-hidden="true" />
            Healthy · {m.threshold}% and above
          </span>
          <span className="ts-band risk">
            <i aria-hidden="true" />
            Warning · {floor}–{m.threshold - 1}%
          </span>
          <span className="ts-band crit">
            <i aria-hidden="true" />
            Critical · below {floor}%
          </span>
        </div>
        <Link to="/student/reports" className="btn-view-session ts-preview-link">
          <FileChartColumn size={14} aria-hidden="true" />
          <span>Open my reports</span>
        </Link>
      </SettingsCard>

      <SettingsCard title="How your percentage is counted" desc="The same rules are used on every page">
        <Details
          items={[
            ["Lecture", plural(CLASS_WEIGHT.Lecture, "class")],
            ["Tutorial", plural(CLASS_WEIGHT.Tutorial, "class")],
            ["Lab", `${plural(CLASS_WEIGHT.Lab, "class")} (a lab is two periods)`],
            ["Awaiting review", "Not counted until your teacher confirms it"],
          ]}
        />
      </SettingsCard>

      <SettingsCard title="Corrections" desc="Ask for a record to be checked" server>
        <SettingRow
          id="ss-dispute"
          label="Report a wrong record"
          desc="Marked absent for a class you attended? Send it to your teacher to review."
          disabled
        >
          <button id="ss-dispute" type="button" className="btn-modal-cancel" disabled>
            Request review
          </button>
        </SettingRow>
      </SettingsCard>
    </>
  );
}

/* -------------------------------------------------------------- Face data */

const FACE_FACTS = [
  ["What is stored", "Up to 5 enrolment photos and one face signature made from them, kept private."],
  ["Who can see it", "Your teachers and the college's ClassSight administrators. Never other students."],
  ["When it's used", "Only to find you in the class photos your teacher uploads during attendance."],
  ["Unclear matches", "ClassSight never guesses. If it isn't sure, the class waits for your teacher instead of marking you absent."],
];

export function FaceTab() {
  return (
    <>
      <ServerNote>
        Your teacher or administrator enrols your face from 1–5 clear photos of only you. Your enrolment status and
        requests need the ClassSight server, which isn&apos;t connected yet.
      </ServerNote>
      <SettingsCard title="Enrolment" desc="Whether ClassSight can recognise you" server>
        <p className="ts-empty">Your enrolment status will appear here once the server is connected.</p>
        <SettingRow id="ss-reenrol" label="Ask to re-enrol" desc="Your look changed, or you keep showing as awaiting review." disabled>
          <button id="ss-reenrol" type="button" className="btn-modal-cancel" disabled>
            Request re-enrolment
          </button>
        </SettingRow>
        <SettingRow
          id="ss-face-delete"
          label="Remove my face data"
          desc="Ask for your photos and face signature to be deleted. Your teacher will then mark you by ID card or by hand."
          disabled
        >
          <button id="ss-face-delete" type="button" className="btn-modal-cancel" disabled>
            Request removal
          </button>
        </SettingRow>
      </SettingsCard>
      <SettingsCard title="How your face data is used" desc="What ClassSight keeps and why">
        <Details items={FACE_FACTS} />
      </SettingsCard>
    </>
  );
}

/* ------------------------------------------------------------- Appearance */

export function AppearanceTab({ m }) {
  const { themePreference, setThemePreference } = useTheme();
  return (
    <SettingsCard title="Theme & layout" desc="Applied straight away on this device" local>
      <SettingRow id="ss-theme" label="Theme" desc="System follows your device's light or dark setting.">
        <Segmented
          id="ss-theme"
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
      <SettingRow id="ss-sidebar" label="Sidebar" desc="Show the sidebar with labels, or only icons. Wide screens only.">
        <Segmented
          id="ss-sidebar"
          label="Sidebar"
          value={m.sideCollapsed ? "collapsed" : "expanded"}
          onChange={(v) => m.setSideCollapsed(v === "collapsed")}
          options={[
            { value: "expanded", label: "Expanded" },
            { value: "collapsed", label: "Collapsed" },
          ]}
        />
      </SettingRow>
    </SettingsCard>
  );
}

/* --------------------------------------------------------------- Security */

export function SecurityTab({ m, session }) {
  return (
    <>
      <SettingsCard title="This device" desc="You stay signed in on this browser until you log out">
        <SettingRow id="ss-signout" label="Signed in as" desc={session.email}>
          <button id="ss-signout" type="button" className="btn-modal-delete-confirm" onClick={m.signOut}>
            <LogOut size={15} strokeWidth={2} aria-hidden="true" />
            Log out
          </button>
        </SettingRow>
        <p className="ts-hint">There is no password yet. You can only ever see your own attendance.</p>
      </SettingsCard>
      <SettingsCard title="Change password" desc="Use at least 8 characters" server>
        <div className="ts-pw-grid">
          {[
            ["ss-pw-current", "Current password"],
            ["ss-pw-new", "New password"],
            ["ss-pw-confirm", "Confirm new password"],
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
        <p className="ts-empty">Your other devices will appear here once the server is connected.</p>
        <div className="ts-card-actions">
          <button type="button" className="btn-modal-cancel" disabled>
            Sign out of other devices
          </button>
        </div>
      </SettingsCard>
    </>
  );
}

/* ------------------------------------------------------------------- Help */

const GUIDE = [
  ["Your teacher starts the class", "Attendance is opened for the lecture, lab or tutorial on the timetable."],
  ["A class photo is taken", "ClassSight finds your face in it and marks you present."],
  ["Anything unclear is reviewed", "If you weren't recognised, your teacher checks you by ID card or by hand."],
  ["You check your record", "Dashboard, My Courses and Reports show where you stand in every course."],
];

export function HelpTab({ m }) {
  const [open, setOpen] = useState(null);
  const faqs = [
    [
      "Why does a class say “awaiting review”?",
      "The class photo didn't show you clearly enough for a confident match. It isn't counted as an absence; your teacher will confirm it.",
    ],
    [
      "How is my percentage worked out?",
      `Classes attended divided by classes held, per course. A lab counts as ${CLASS_WEIGHT.Lab} classes. You need ${m.threshold}% in each course.`,
    ],
    [
      "I was in class but marked absent. What do I do?",
      "Tell your teacher as soon as possible. They can correct the record for that class.",
    ],
    [
      "Can I change my name, roll number or courses?",
      "No. They come from your college's records. Ask your class coordinator or the college office to fix them.",
    ],
    [
      "Where are my settings saved?",
      "Settings marked “Saved in this browser” stay on this device only. Settings marked “Needs server” will follow your account once the server is connected.",
    ],
  ];
  return (
    <>
      <SettingsCard title="How attendance works" desc="From the class photo to your report">
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
          {faqs.map(([q, a], i) => (
            <div key={q} className={`ts-faq-item ${open === i ? "open" : ""}`}>
              <button type="button" aria-expanded={open === i} aria-controls={`ss-faq-${i}`} onClick={() => setOpen(open === i ? null : i)}>
                {q}
                <ChevronDown size={16} strokeWidth={2} aria-hidden="true" />
              </button>
              {open === i && <p id={`ss-faq-${i}`}>{a}</p>}
            </div>
          ))}
        </div>
      </SettingsCard>
      <SettingsCard title="Get help" desc="Report a problem with the app" server>
        <SettingRow id="ss-report" label="Report an issue" desc="Send a description and screenshot to the ClassSight team." disabled>
          <button id="ss-report" type="button" className="btn-modal-cancel" disabled>
            Report issue
          </button>
        </SettingRow>
      </SettingsCard>
      <SettingsCard title="About" desc="This copy of ClassSight">
        <Details items={[["Application version", `${pkg.version}${import.meta.env.DEV ? " (development)" : ""}`]]} />
      </SettingsCard>
    </>
  );
}
