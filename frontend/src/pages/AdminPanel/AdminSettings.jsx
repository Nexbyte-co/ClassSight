import { useState } from "react";
import { Building2, CalendarRange, KeyRound, Moon, Server, ShieldCheck, Sun, UserCog } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/theme/ThemeContext";
import { getCurrentUser } from "../../api/auth";
import { AdminPageHeader, Card, FormMessage, Tabs } from "../../components/admin/ui";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// School profile and academic year have no server endpoint yet, so they are saved in this browser.
const SCHOOL_KEY = "classsight_admin_school_profile";
const DEFAULT_SCHOOL = {
  name: "",
  department: "",
  contactEmail: "",
  yearLabel: "",
  yearStart: "",
  yearEnd: "",
  term: "",
};
const readSchool = () => {
  try {
    return { ...DEFAULT_SCHOOL, ...JSON.parse(localStorage.getItem(SCHOOL_KEY) || "{}") };
  } catch {
    return DEFAULT_SCHOOL;
  }
};

const ROLES = [
  {
    role: "Administrator",
    Icon: ShieldCheck,
    can: [
      "Create teacher and administrator accounts",
      "Create classes, sections and lecture times",
      "Manage every section's student roster and face data",
      "View attendance and reports for every class",
    ],
  },
  {
    role: "Teacher",
    Icon: UserCog,
    can: [
      "See and manage only the classes assigned to them",
      "Take attendance (group photo, face recognition, confirm)",
      "View their own classes' attendance logs and analytics",
    ],
  },
];

function LocalNote() {
  return (
    <p className="adm-note">
      <KeyRound size={15} aria-hidden="true" /> Saved in this browser only. The ClassSight server doesn't store school
      settings yet, so other admins and devices won't see these values.
    </p>
  );
}

function SchoolForm({ fields }) {
  const [form, setForm] = useState(readSchool);
  const [msg, setMsg] = useState(null);
  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setMsg(null);
  };
  const save = (e) => {
    e.preventDefault();
    if (form.yearStart && form.yearEnd && form.yearStart > form.yearEnd) {
      setMsg({ kind: "error", text: "The academic year can't end before it starts." });
      return;
    }
    try {
      localStorage.setItem(SCHOOL_KEY, JSON.stringify({ ...readSchool(), ...form }));
      setMsg({ kind: "ok", text: "Saved on this device." });
    } catch {
      setMsg({ kind: "error", text: "This browser is blocking storage, so settings can't be saved." });
    }
  };
  return (
    <form className="adm-form adm-form-grid" onSubmit={save} noValidate>
      {fields.map(({ key, label, type = "text", placeholder }) => (
        <div className="adm-field" key={key}>
          <label htmlFor={`set-${key}`}>{label}</label>
          <input id={`set-${key}`} type={type} placeholder={placeholder} value={form[key]} onChange={set(key)} />
        </div>
      ))}
      <div className="adm-form-foot">
        <FormMessage msg={msg} />
        <button type="submit" className="db-btn adm-primary">
          Save
        </button>
      </div>
    </form>
  );
}

function SystemPanel() {
  const { session } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [check, setCheck] = useState(null);
  const [checking, setChecking] = useState(false);

  const runCheck = async () => {
    setChecking(true);
    const started = performance.now();
    try {
      await getCurrentUser();
      setCheck({ kind: "ok", text: `Server reachable and your session is valid (${Math.round(performance.now() - started)} ms).` });
    } catch (err) {
      setCheck({ kind: "error", text: err.message });
    } finally {
      setChecking(false);
    }
  };

  let remembered = false;
  try {
    remembered = Boolean(localStorage.getItem("classsight_access_token"));
  } catch {
    remembered = false;
  }

  return (
    <div className="adm-settings-list">
      <div className="adm-setting">
        <div>
          <b>Signed in as</b>
          <span className="db-sm">
            {session?.name} · {session?.email} · Administrator
          </span>
        </div>
      </div>
      <div className="adm-setting">
        <div>
          <b>Session</b>
          <span className="db-sm">
            {remembered ? "Remembered on this device" : "Ends when the browser closes"}. Choose with "Remember me" at sign-in.
          </span>
        </div>
      </div>
      <div className="adm-setting">
        <div>
          <b>API server</b>
          <span className="db-sm adm-mono">{API_BASE_URL}</span>
          <FormMessage msg={check} />
        </div>
        <button type="button" className="db-btn" onClick={runCheck} disabled={checking}>
          <Server size={15} aria-hidden="true" /> {checking ? "Checking…" : "Check connection"}
        </button>
      </div>
      <div className="adm-setting">
        <div>
          <b>Appearance</b>
          <span className="db-sm">{isDarkMode ? "Dark" : "Light"} theme, shared with the rest of ClassSight on this device.</span>
        </div>
        <button type="button" className="db-btn" onClick={toggleDarkMode}>
          {isDarkMode ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />}
          Switch to {isDarkMode ? "light" : "dark"}
        </button>
      </div>
    </div>
  );
}

function AdminSettings() {
  const [tab, setTab] = useState("school");
  const tabs = [
    { key: "school", label: "School profile" },
    { key: "roles", label: "Roles & permissions" },
    { key: "year", label: "Academic year" },
    { key: "system", label: "System" },
  ];

  return (
    <>
      <AdminPageHeader title="Settings" lead="School details, roles and system configuration." />
      <Card delay={40}>
        <Tabs tabs={tabs} value={tab} onChange={setTab} label="Settings section" />

        {tab === "school" && (
          <>
            <h3 className="adm-h3">
              <Building2 size={17} aria-hidden="true" /> School profile
            </h3>
            <SchoolForm
              fields={[
                { key: "name", label: "Institution name", placeholder: "e.g. Institute of Technology" },
                { key: "department", label: "Department", placeholder: "e.g. Computer Science & Engineering" },
                { key: "contactEmail", label: "Admin contact email", type: "email", placeholder: "office@college.edu" },
              ]}
            />
            <LocalNote />
          </>
        )}

        {tab === "year" && (
          <>
            <h3 className="adm-h3">
              <CalendarRange size={17} aria-hidden="true" /> Academic year
            </h3>
            <SchoolForm
              fields={[
                { key: "yearLabel", label: "Academic year", placeholder: "e.g. 2026–27" },
                { key: "term", label: "Current term", placeholder: "e.g. Odd semester" },
                { key: "yearStart", label: "Starts", type: "date" },
                { key: "yearEnd", label: "Ends", type: "date" },
              ]}
            />
            <LocalNote />
          </>
        )}

        {tab === "roles" && (
          <>
            <div className="adm-roles">
              {ROLES.map(({ role, Icon, can }) => (
                <div key={role} className="adm-role">
                  <h3 className="adm-h3">
                    <Icon size={17} aria-hidden="true" /> {role}
                  </h3>
                  <ul>
                    {can.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="adm-note">
              <ShieldCheck size={15} aria-hidden="true" /> These permissions are enforced by the server. Custom roles
              aren't supported yet.
            </p>
          </>
        )}

        {tab === "system" && <SystemPanel />}
      </Card>
    </>
  );
}

export default AdminSettings;
