// Admin: one teacher's account: reset their password, hand classes to them, or delete them.
// Step 1: type the new password twice. Step 2: type the user's email and your own password.
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, Eye, EyeOff, KeyRound, ShieldAlert, Trash2, Undo2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useAdminData } from "../../context/AdminDataContext";
import { getUser, resetUserPassword, setUserDepartment, setUserDesignation } from "../../api/users";
import { listDepartments } from "../../api/departments";
import { listDesignations } from "../../api/designations";
import SearchSelect from "../../components/admin/SearchSelect";
import { assignClassroomTeacher } from "../../api/classrooms";
import { AdminPageHeader, Card, Empty, FormMessage } from "../../components/admin/ui";
import { ConfirmTeacherDelete, DELETE_DELAY_SECONDS, useTeacherDeletion } from "../../components/admin/TeacherDeletion";
import { teacherName } from "../../components/admin/format";

function PasswordField({ id, label, value, onChange, disabled, hint, autoComplete = "new-password" }) {
  const [show, setShow] = useState(false);
  return (
    <div className="adm-field">
      <label htmlFor={id}>{label}</label>
      <div className="adm-input-group">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          autoComplete={autoComplete}
        />
        <button type="button" className="adm-icon-btn" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"}>
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {hint && <span className="db-sm">{hint}</span>}
    </div>
  );
}

function TeacherDepartment({ user }) {
  const { refresh } = useAdminData();
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [draft, setDraft] = useState(null);
  const [rankDraft, setRankDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    let live = true;
    listDepartments().then((rows) => live && setDepartments(rows.map((d) => d.name))).catch(() => {});
    listDesignations().then((rows) => live && setDesignations(rows)).catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  const value = draft ?? user.department ?? "";
  const rank = rankDraft ?? user.designation ?? "";
  const changed = value !== (user.department ?? "") || rank !== (user.designation ?? "");
  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      if (value !== (user.department ?? "")) await setUserDepartment(user.id, value);
      if (rank !== (user.designation ?? "")) await setUserDesignation(user.id, rank);
      await refresh();
      setDraft(null);
      setRankDraft(null);
      setMsg({ kind: "ok", text: "Saved. Their subjects follow the department." });
    } catch (err) {
      setMsg({ kind: "error", text: err.message || "Could not save." });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="adm-form">
      <SearchSelect id="td-dept" label="Department" placeholder="Choose a department" options={departments} value={value} onChange={setDraft} clearable={false} />
      <SearchSelect id="td-rank" label="Designation" placeholder="Choose a designation" options={designations} value={rank} onChange={setRankDraft} clearable={false} />
      <FormMessage msg={msg} />
      <button type="button" className="db-btn adm-primary" onClick={save} disabled={busy || !changed}>
        {busy ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}

export function ResetPassword({ user }) {
  const [step, setStep] = useState(1);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [typedEmail, setTypedEmail] = useState("");
  const [adminPw, setAdminPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const restart = (text) => {
    setStep(1);
    setPw("");
    setPw2("");
    setTypedEmail("");
    setAdminPw("");
    setMsg(text ? { kind: "ok", text } : null);
  };

  const next = (e) => {
    e.preventDefault();
    if (pw.length < 8) return setMsg({ kind: "error", text: "The new password must be at least 8 characters." });
    if (pw !== pw2) return setMsg({ kind: "error", text: "The two passwords don't match." });
    setMsg(null);
    setStep(2);
  };

  const confirm = async (e) => {
    e.preventDefault();
    if (typedEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
      return setMsg({ kind: "error", text: "The email you typed doesn't match this account." });
    }
    if (!adminPw) return setMsg({ kind: "error", text: "Enter your own password to confirm." });
    setBusy(true);
    setMsg(null);
    try {
      await resetUserPassword(user.id, { newPassword: pw, adminPassword: adminPw });
      restart(`Password changed for ${user.email}. Share the new password with them securely.`);
    } catch (err) {
      setAdminPw("");
      setMsg({ kind: "error", text: err.message || "Could not change the password." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Reset password" sub={`Step ${step} of 2`} delay={100}>
      {step === 1 ? (
        <form className="adm-form" onSubmit={next} noValidate>
          <PasswordField id="rp-new" label="New password" value={pw} onChange={setPw} hint="At least 8 characters." />
          <PasswordField id="rp-new2" label="Type it again" value={pw2} onChange={setPw2} />
          <FormMessage msg={msg} />
          <button type="submit" className="db-btn adm-primary">
            Continue
          </button>
        </form>
      ) : (
        <form className="adm-form" onSubmit={confirm} noValidate>
          <p className="adm-note">
            <ShieldAlert size={15} aria-hidden="true" /> {user.name} will no longer be able to sign in with their old password.
            Anyone signed in as them stays signed in until their session expires.
          </p>
          <div className="adm-field">
            <label htmlFor="rp-email">
              Type <b className="adm-mono">{user.email}</b> to confirm
            </label>
            <input
              id="rp-email"
              value={typedEmail}
              onChange={(e) => setTypedEmail(e.target.value)}
              disabled={busy}
              autoComplete="off"
              onPaste={(e) => e.preventDefault()}
            />
          </div>
          <PasswordField
            id="rp-admin"
            label="Your password"
            value={adminPw}
            onChange={setAdminPw}
            disabled={busy}
            autoComplete="current-password"
          />
          <FormMessage msg={msg} />
          <div className="db-row db-wrap" style={{ gap: 8 }}>
            <button type="button" className="db-btn" onClick={() => restart()} disabled={busy}>
              Back
            </button>
            <button type="submit" className="db-btn adm-primary" disabled={busy}>
              <KeyRound size={16} aria-hidden="true" />
              {busy ? "Changing…" : "Change password"}
            </button>
          </div>
        </form>
      )}
    </Card>
  );
}

// Pick classes (currently taught by someone else) and give them to this teacher.
function AssignClasses({ user }) {
  const { classrooms, userById, refresh } = useAdminData();
  const [picked, setPicked] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const others = useMemo(
    () =>
      classrooms
        .filter((c) => c.teacher_id !== user.id)
        .sort((a, b) => a.section.localeCompare(b.section, undefined, { numeric: true }) || a.course.localeCompare(b.course)),
    [classrooms, user.id]
  );
  const mine = classrooms.filter((c) => c.teacher_id === user.id);

  const toggle = (id) => {
    setMsg(null);
    setPicked((set) => {
      const next = new Set(set);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  };

  const assign = async () => {
    const ids = [...picked];
    setBusy(true);
    setMsg(null);
    let done = 0;
    try {
      for (const id of ids) {
        await assignClassroomTeacher(id, user.id);
        done += 1;
      }
      setMsg({ kind: "ok", text: `${done} class${done === 1 ? "" : "es"} now taught by ${user.name}.` });
    } catch (err) {
      setMsg({ kind: "error", text: `${done} assigned, then it stopped: ${err.message}` });
    } finally {
      setPicked(new Set());
      setBusy(false);
      refresh();
    }
  };

  return (
    <Card
      title="Assign classes"
      sub={`${mine.length} class${mine.length === 1 ? "" : "es"} now. Tick the ones to give to ${user.name}.`}
      className="adm-card-assign"
      delay={140}
    >
      {others.length ? (
        <ul className="adm-checks adm-scroll">
          {others.map((c) => (
            <li key={c.id}>
              <label className={picked.has(c.id) ? "on" : ""}>
                <input type="checkbox" checked={picked.has(c.id)} onChange={() => toggle(c.id)} disabled={busy} />
                <span className="adm-checks-main">
                  <b>{c.course}</b>
                  <span className="db-sm">{c.section || "No batch yet"}{c.course_code ? ` · ${c.course_code}` : ""}</span>
                </span>
                <span className="adm-checks-from">now {teacherName(userById, c.teacher_id)}</span>
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <Empty icon={BookOpen} title={classrooms.length ? "They already teach every class" : "No classes yet"}>
          {!classrooms.length && "Create one in the class setup."}
        </Empty>
      )}
      <div className="adm-assign-foot">
        <FormMessage msg={msg} />
        <button type="button" className="db-btn adm-primary" onClick={assign} disabled={busy || !picked.size}>
          {busy ? "Assigning…" : picked.size ? `Give ${picked.size} class${picked.size === 1 ? "" : "es"} to ${user.name}` : "Pick classes to assign"}
        </button>
      </div>
    </Card>
  );
}

// Permanent delete: confirm, then a DELETE_DELAY_SECONDS countdown with Undo (see TeacherDeletion).
export function DeleteTeacher({ user, classCount }) {
  const { pending, schedule, cancel, secondsLeft } = useTeacherDeletion();
  const [confirming, setConfirming] = useState(false);
  const isPending = Boolean(pending[user.id]);
  const left = secondsLeft(user.id);

  return (
    <Card title="Delete teacher" sub="Removes this account for good" className="adm-card-danger" delay={180}>
      {confirming && (
        <ConfirmTeacherDelete
          user={user}
          onClose={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            schedule(user);
          }}
        />
      )}
      {isPending ? (
        <div className="adm-pending">
          <p className="adm-note adm-note-warn">
            <Trash2 size={15} aria-hidden="true" />
            <span>
              Scheduled. {user.name} will be permanently deleted in <b>{left}s</b>.
            </span>
          </p>
          <button type="button" className="db-btn" onClick={() => cancel(user.id)}>
            <Undo2 size={15} aria-hidden="true" /> Undo deletion
          </button>
        </div>
      ) : classCount ? (
        <p className="adm-note">
          <ShieldAlert size={15} aria-hidden="true" /> {user.name} still teaches {classCount} class{classCount === 1 ? "" : "es"}. Give{" "}
          {classCount === 1 ? "it" : "them"} to another teacher first (open that teacher and use Assign classes).
        </p>
      ) : (
        <>
          <p className="db-sm">
            Deleting is permanent. After you confirm, there is a {DELETE_DELAY_SECONDS}-second window to undo it before the account
            is removed from the database.
          </p>
          <button type="button" className="db-btn adm-danger" onClick={() => setConfirming(true)}>
            <Trash2 size={15} aria-hidden="true" /> Delete {user.name}
          </button>
        </>
      )}
    </Card>
  );
}

function AdminTeacherDetail() {
  const { userId } = useParams();
  const { session } = useAuth();
  const { classrooms, userById, loadedAt } = useAdminData();
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getUser(userId)
      .then((u) => !cancelled && (setUser(u), setError("")))
      .catch((err) => !cancelled && setError(err.status === 404 ? "This account doesn't exist." : err.message));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const back = (
    <Link to="/admin/teachers" className="adm-back-link">
      <ArrowLeft size={16} aria-hidden="true" /> Back to Teachers
    </Link>
  );

  if (error || !user) {
    return (
      <div className="adm-detail">
        {back}
        <AdminPageHeader title="Teacher" lead={error || "Loading…"} refresh={false} />
      </div>
    );
  }

  // Deleted (the countdown finished while this page was open): back to the list.
  if (loadedAt && !userById.has(user.id)) return <Navigate to="/admin/teachers" replace />;

  const theirClasses = classrooms.filter((c) => c.teacher_id === user.id);
  const isMe = user.id === session?.id;
  const isTeacher = user.role === "teacher";

  return (
    <div className="adm-detail">
      {back}
      <AdminPageHeader title={user.name} lead={user.email} refresh={false} />
      <div className="adm-grid adm-grid-wide">
        <div className="adm-col">
          <Card title="Account" delay={60}>
            <table className="adm-table">
              <tbody>
                <tr><td>Role</td><td>{isTeacher ? "Teacher" : "Administrator"}</td></tr>
                <tr><td>Email</td><td className="adm-mono">{user.email}</td></tr>
                {isTeacher && (
                  <tr>
                    <td>Classes</td>
                    <td>{theirClasses.length ? theirClasses.map((c) => `${c.course} · ${c.section || "no batch yet"}`).join(", ") : "None yet"}</td>
                  </tr>
                )}
              </tbody>
            </table>
            {isTeacher && <TeacherDepartment user={user} />}
          </Card>
          {isTeacher && <AssignClasses user={user} />}
        </div>
        <div className="adm-col">
          {isMe ? (
            <Card title="Reset password" delay={100}>
              <p className="adm-note">
                <ShieldAlert size={15} aria-hidden="true" /> You can't reset your own password here. Ask another administrator.
              </p>
            </Card>
          ) : (
            <ResetPassword user={user} />
          )}
          {isTeacher && !isMe && <DeleteTeacher user={user} classCount={theirClasses.length} />}
        </div>
      </div>
    </div>
  );
}

export default AdminTeacherDetail;
