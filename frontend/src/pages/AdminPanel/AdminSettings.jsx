import { useState } from "react";
import { Building2, CalendarRange, KeyRound, Moon, Server, ShieldCheck, Sun, UserCog, UserPlus, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/theme/ThemeContext";
import { getCurrentUser } from "../../api/auth";
import { createUser } from "../../api/users";
import { changePassword, signOutOtherDevices } from "../../api/account";
import { useAdminData } from "../../context/AdminDataContext";
import PasswordGen from "../../components/admin/PasswordGen";
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

// The signed-in admin's own password. The server ends their other sessions and hands this one a fresh token.
const MIN_PASSWORD = 8;
function MyAccountPanel() {
  const [fields, setFields] = useState({ current: "", next: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [others, setOthers] = useState({ busy: false, msg: null });
  const set = (key) => (e) => {
    setFields((f) => ({ ...f, [key]: e.target.value }));
    setMsg(null);
  };
  const submit = async (e) => {
    e.preventDefault();
    if (!fields.current) return setMsg({ kind: "error", text: "Enter your current password." });
    if (fields.next.length < MIN_PASSWORD) return setMsg({ kind: "error", text: `The new password needs at least ${MIN_PASSWORD} characters.` });
    if (fields.next !== fields.confirm) return setMsg({ kind: "error", text: "The two new passwords don't match." });
    setBusy(true);
    try {
      await changePassword({ currentPassword: fields.current, newPassword: fields.next });
      setFields({ current: "", next: "", confirm: "" });
      setMsg({ kind: "ok", text: "Password changed. Your other devices were signed out." });
    } catch (err) {
      setMsg({ kind: "error", text: err.message || "Could not change the password." });
    } finally {
      setBusy(false);
    }
  };
  const signOutOthers = async () => {
    setOthers({ busy: true, msg: null });
    try {
      await signOutOtherDevices();
      setOthers({ busy: false, msg: { kind: "ok", text: "Signed out everywhere else. This device stays signed in." } });
    } catch (err) {
      setOthers({ busy: false, msg: { kind: "error", text: err.message || "Could not sign out the other devices." } });
    }
  };
  return (
    <>
      <h3 className="adm-h3">
        <KeyRound size={17} aria-hidden="true" /> Change your password
      </h3>
      <form className="adm-form adm-form-grid" onSubmit={submit} noValidate>
        <div className="adm-field">
          <label htmlFor="me-current">Current password</label>
          <input id="me-current" type="password" value={fields.current} onChange={set("current")} disabled={busy} autoComplete="current-password" />
        </div>
        <div className="adm-field">
          <label htmlFor="me-next">New password</label>
          <input id="me-next" type="password" value={fields.next} onChange={set("next")} disabled={busy} autoComplete="new-password" />
        </div>
        <div className="adm-field">
          <label htmlFor="me-confirm">Confirm new password</label>
          <input id="me-confirm" type="password" value={fields.confirm} onChange={set("confirm")} disabled={busy} autoComplete="new-password" />
        </div>
        <div className="adm-form-foot">
          <FormMessage msg={msg} />
          <button type="submit" className="db-btn adm-primary" disabled={busy}>
            <KeyRound size={15} aria-hidden="true" /> {busy ? "Saving…" : "Update password"}
          </button>
        </div>
      </form>
      <div className="adm-settings-list">
        <div className="adm-setting">
          <div>
            <b>Other devices</b>
            <span className="db-sm">Sign out every other browser or device that is signed in as you. This one stays signed in.</span>
            <FormMessage msg={others.msg} />
          </div>
          <button type="button" className="db-btn" onClick={signOutOthers} disabled={others.busy}>
            <LogOut size={15} aria-hidden="true" /> {others.busy ? "Working…" : "Sign out other devices"}
          </button>
        </div>
      </div>
    </>
  );
}

// Add another administrator: they get the same full access, so the form says so and shows who already has it.
function AdminsPanel() {
  const { admins, refresh } = useAdminData();
  const { session } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setMsg(null);
  };
  const submit = async (e) => {
    e.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim();
    if (!name || !email) return setMsg({ kind: "error", text: "Enter the administrator's name and email." });
    if (form.password.length < 8) return setMsg({ kind: "error", text: "The password needs at least 8 characters." });
    setBusy(true);
    try {
      await createUser({ name, email, password: form.password, role: "admin" });
      await refresh();
      setForm({ name: "", email: "", password: "" });
      setMsg({ kind: "ok", text: `${name} can now sign in as an administrator. Share the password with them securely.` });
    } catch (err) {
      setMsg({ kind: "error", text: err.message || "Could not add the administrator." });
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <h3 className="adm-h3">
        <UserPlus size={17} aria-hidden="true" /> Add an administrator
      </h3>
      <form className="adm-form adm-form-grid" onSubmit={submit} noValidate>
        <div className="adm-field">
          <label htmlFor="adm-new-name">Full name</label>
          <input id="adm-new-name" value={form.name} onChange={set("name")} disabled={busy} autoComplete="off" />
        </div>
        <div className="adm-field">
          <label htmlFor="adm-new-email">Email address</label>
          <input id="adm-new-email" type="email" value={form.email} onChange={set("email")} disabled={busy} autoComplete="off" />
        </div>
        <PasswordGen
          id="adm-new-pass"
          label="Password"
          value={form.password}
          onChange={(v) => {
            setForm((f) => ({ ...f, password: v }));
            setMsg(null);
          }}
          disabled={busy}
          hint="At least 8 characters."
        />
        <div className="adm-form-foot">
          <FormMessage msg={msg} />
          <button type="submit" className="db-btn adm-primary" disabled={busy}>
            <UserPlus size={15} aria-hidden="true" /> {busy ? "Adding…" : "Add administrator"}
          </button>
        </div>
      </form>
      <p className="adm-note">
        <ShieldCheck size={15} aria-hidden="true" /> Administrators have full access: accounts, classes, students and
        every report. Only add people you trust.
      </p>
      <h3 className="adm-h3">Current administrators ({admins.length})</h3>
      <div className="adm-settings-list">
        {admins.map((a) => (
          <div className="adm-setting" key={a.id}>
            <div>
              <b>
                {a.name}
                {a.id === session?.id ? " (you)" : ""}
              </b>
              <span className="db-sm">{a.email}</span>
            </div>
          </div>
        ))}
      </div>
    </>
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
    { key: "admins", label: "Administrators" },
    { key: "account", label: "My account" },
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

        {tab === "admins" && <AdminsPanel />}

        {tab === "account" && <MyAccountPanel />}

        {tab === "system" && <SystemPanel />}
      </Card>
    </>
  );
}

export default AdminSettings;
