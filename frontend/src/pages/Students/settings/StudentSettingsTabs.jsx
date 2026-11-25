// src/pages/Students/settings/StudentSettingsTabs.jsx
// One component per student Settings tab. `m` is the student model from the portal layout.
// A student changes how ClassSight looks and notifies them, and their own password; their records,
// the attendance requirement and their face data are managed by the college and shown read-only.
import { useState } from "react";
import { Link } from "react-router-dom";
import { Sun, Moon, Monitor, ChevronDown, FileChartColumn, LogOut } from "lucide-react";
import pkg from "../../../../package.json";
import { termLabel } from "../../../utils/termLabel";
import { useTheme } from "../../../context/theme/ThemeContext";
import { getAtRiskFloor } from "../../../context/settings/settingsStore";
import { CLASS_WEIGHT } from "../../../context/students/studentCourses";
import { useMyPhoto } from "../../../context/students/useMyPhoto";
import { useAuth } from "../../../context/AuthContext";
import { SettingsCard, SettingRow, Toggle, Segmented } from "../../Settings/settingsUi";
import { PasswordCard, SignInsCard } from "../../Settings/AccountSecurity";

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
  const photo = useMyPhoto(session);
  const batches = [...new Set(m.courses.map((c) => c.group))].join(", ") || "—";
  return (
    <>
      <SettingsCard title="Profile" desc="How you appear to your teachers">
        <div className="ts-profile">
          <div className="ts-avatar" aria-hidden="true">
            {photo ? <img src={photo} alt="" className="ts-avatar-img" /> : initials(session.name)}
          </div>
          <div className="ts-profile-text">
            <strong>{session.name}</strong>
            <span>{session.email}</span>
          </div>
        </div>
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
  const { session } = useAuth();
  const photo = useMyPhoto(session);
  return (
    <>
      <SettingsCard title="Enrolment" desc="Whether ClassSight can recognise you">
        <div className="ts-enrol">
          <div className="ts-enrol-pic" aria-hidden="true">
            {photo ? <img src={photo} alt="" /> : <span>{initials(session.name)}</span>}
          </div>
          <div className="ts-enrol-text">
            <strong>{session.faceEnrolled ? "Your face is enrolled" : "Your face is not enrolled yet"}</strong>
            <span>
              {session.faceEnrolled
                ? "ClassSight can find you in the class photos your teacher takes. This is the photo your administrator set; it is also your profile picture."
                : "Your teacher or administrator enrols your face from 1–5 clear photos of only you. Until then your teacher marks you by hand."}
            </span>
          </div>
        </div>
        <p className="ts-hint">
          Not being recognised, or want your face data removed? Tell your teacher. They pass it on to the administrator,
          who can enrol your face again or delete it.
        </p>
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
        <p className="ts-hint">You can only ever see your own attendance.</p>
      </SettingsCard>
      <PasswordCard student />
      <SignInsCard student />
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
      "Settings marked “Saved in this browser” stay on this device only. Your password and sign-ins are kept by the ClassSight server.",
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
      <SettingsCard title="About" desc="This copy of ClassSight">
        <Details items={[["Application version", `${pkg.version}${import.meta.env.DEV ? " (development)" : ""}`]]} />
      </SettingsCard>
    </>
  );
}
