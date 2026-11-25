import { useMemo, useState } from "react";
import { Eye, EyeOff, KeyRound, Info, Search, ShieldCheck, UserPlus, Users } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useAdminData } from "../../context/AdminDataContext";
import { createUser } from "../../api/users";
import { AdminLoadState, AdminPageHeader, Card, Empty, FormMessage, Tabs } from "../../components/admin/ui";

const EMPTY_FORM = { name: "", email: "", password: "", role: "teacher" };

function AddUserForm() {
  const { refresh } = useAdminData();
  const [form, setForm] = useState(EMPTY_FORM);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setMsg(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setMsg({ kind: "error", text: "Name and email are required." });
      return;
    }
    if (form.password.length < 8) {
      setMsg({ kind: "error", text: "Password must be at least 8 characters." });
      return;
    }
    setBusy(true);
    try {
      const user = await createUser({ ...form, name: form.name.trim(), email: form.email.trim() });
      setMsg({ kind: "ok", text: `Created ${user.role} account for ${user.email}. Share the password with them securely.` });
      setForm(EMPTY_FORM);
      refresh();
    } catch (err) {
      setMsg({ kind: "error", text: err.status === 409 ? "That email is already registered." : err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="adm-form" onSubmit={submit} noValidate>
      <div className="adm-field">
        <label htmlFor="nu-role">Role</label>
        <select id="nu-role" value={form.role} onChange={set("role")} disabled={busy}>
          <option value="teacher">Teacher</option>
          <option value="admin">Administrator</option>
        </select>
      </div>
      <div className="adm-field">
        <label htmlFor="nu-name">Full name</label>
        <input id="nu-name" value={form.name} onChange={set("name")} disabled={busy} autoComplete="off" />
      </div>
      <div className="adm-field">
        <label htmlFor="nu-email">Email</label>
        <input id="nu-email" type="email" value={form.email} onChange={set("email")} disabled={busy} autoComplete="off" />
      </div>
      <div className="adm-field">
        <label htmlFor="nu-pass">Initial password</label>
        <div className="adm-input-group">
          <input
            id="nu-pass"
            type={show ? "text" : "password"}
            value={form.password}
            onChange={set("password")}
            disabled={busy}
            autoComplete="new-password"
            aria-describedby="nu-pass-hint"
          />
          <button type="button" className="adm-icon-btn" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"}>
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <span id="nu-pass-hint" className="db-sm">At least 8 characters.</span>
      </div>
      {form.role === "admin" && (
        <p className="adm-note">
          <ShieldCheck size={15} aria-hidden="true" /> Administrators get full access to every class, user and report.
        </p>
      )}
      <FormMessage msg={msg} />
      <button type="submit" className="db-btn adm-primary" disabled={busy}>
        <UserPlus size={16} aria-hidden="true" />
        {busy ? "Creating…" : `Create ${form.role === "admin" ? "administrator" : "teacher"}`}
      </button>
    </form>
  );
}

function AdminUsers() {
  const { session } = useAuth();
  const { teachers, admins, classrooms } = useAdminData();
  const [tab, setTab] = useState("teachers");
  const [query, setQuery] = useState("");

  const classCount = useMemo(() => {
    const m = new Map();
    classrooms.forEach((c) => m.set(c.teacher_id, (m.get(c.teacher_id) || 0) + 1));
    return m;
  }, [classrooms]);

  const q = query.trim().toLowerCase();
  const match = (...fields) => !q || fields.some((f) => String(f || "").toLowerCase().includes(q));

  const tabs = [
    { key: "teachers", label: "Teachers", count: teachers.length },
    { key: "admins", label: "Administrators", count: admins.length },
  ];

  const staffRows = (tab === "admins" ? admins : teachers).filter((u) => match(u.name, u.email));

  return (
    <div className="adm-fit">
      <AdminPageHeader title="Users" lead="Teacher and administrator accounts on ClassSight." />
      <AdminLoadState />

      <div className="adm-grid adm-grid-wide adm-fill">
        <Card
          title="Directory"
          className="adm-card-fill"
          delay={60}
          actions={
            <label className="adm-search">
              <Search size={15} aria-hidden="true" />
              <input
                type="search"
                placeholder="Search name or email"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search users"
              />
            </label>
          }
        >
          <Tabs tabs={tabs} value={tab} onChange={setTab} label="User type" />

          {staffRows.length ? (
            <div className="adm-table-wrap adm-scroll">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    {tab === "teachers" && <th>Classes</th>}
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {staffRows.map((u) => (
                    <tr key={u.id}>
                      <td>
                        {u.name}
                        {u.id === session?.id && <span className="adm-you">You</span>}
                      </td>
                      <td className="adm-mono">{u.email}</td>
                      <td>{u.role === "admin" ? "Administrator" : "Teacher"}</td>
                      {tab === "teachers" && <td>{classCount.get(u.id) || 0}</td>}
                      <td>
                        <span className="adm-chip adm-chip-good">Active</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty icon={Users} title={q ? "No matching users" : "No accounts yet"}>
              {!q && "Use the form to create one."}
            </Empty>
          )}

          <p className="adm-note">
            <Info size={15} aria-hidden="true" /> Editing, deactivating and password resets aren't available yet: the server
            doesn't provide them. Every account listed is active.
          </p>
        </Card>

        <div className="adm-col">
          <Card title="Add a user" sub="Create a teacher or administrator account" delay={100}>
            <AddUserForm />
          </Card>
          <Card title="Accounts at a glance" delay={140}>
            <div className="adm-mini-stats">
              <div className="adm-mini"><Users size={16} aria-hidden="true" /><b>{teachers.length}</b><span>Teachers</span></div>
              <div className="adm-mini"><ShieldCheck size={16} aria-hidden="true" /><b>{admins.length}</b><span>Admins</span></div>
              <div className="adm-mini"><UserPlus size={16} aria-hidden="true" /><b>{teachers.filter((t) => !classCount.get(t.id)).length}</b><span>Without classes</span></div>
            </div>
            <p className="adm-note">
              <KeyRound size={15} aria-hidden="true" /> New users sign in with the email and initial password you set here. Students don't need accounts; add them to a section under Classes &amp; Subjects.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default AdminUsers;
