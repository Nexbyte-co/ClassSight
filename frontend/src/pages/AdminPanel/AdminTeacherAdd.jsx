// Admin: add a teacher (/admin/teachers/new), laid out like the add-student page.
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, KeyRound, Save, Trash2, Undo2, UserPlus, X } from "lucide-react";
import { useAdminData } from "../../context/AdminDataContext";
import { createUser, getUser, updateUser } from "../../api/users";
import { assignClassroomTeacher, unassignClassroom, updateClassroom } from "../../api/classrooms";
import { createLecture, listClassLectures } from "../../api/lectures";
import { useAuth } from "../../context/AuthContext";
import { createPortal } from "react-dom";
import { ResetPassword } from "./AdminTeacherDetail";
import { clock, ConfirmTeacherDelete, useTeacherDeletion } from "../../components/admin/TeacherDeletion";
import { listDesignations } from "../../api/designations";
import { subjectKey } from "../../components/admin/format";
import { SESSION_TYPES } from "../../components/admin/SessionTypes";
import { listDepartments } from "../../api/departments";
import { AdminLoadState, AdminPageHeader, Card, FormMessage } from "../../components/admin/ui";
import SearchSelect from "../../components/admin/SearchSelect";
import PasswordGen from "../../components/admin/PasswordGen";
import TimePicker, { addMinutes } from "../../components/admin/TimePicker";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const EMPTY_SLOT = { subject: "", batch: "", type: "", picks: [] }; // picks: one { day, start, end, room } per session, in the order the days were clicked
const EMPTY = { name: "", email: "", password: "", department: "", designation: "" };
const initials = (name) => {
  const w = name.split(/\s+/).filter(Boolean);
  if (!w.length) return "?";
  return (w[0][0] + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase();
};

// Small buttons under the edit form: reset password (opens a window) and delete (confirm, then a 20 s undo).
function TeacherActions({ user, classCount, isMe }) {
  const { pending, schedule, cancel, secondsLeft } = useTeacherDeletion();
  const [resetting, setResetting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const isPending = Boolean(pending[user.id]);
  useEffect(() => {
    if (!resetting) return undefined;
    const onKey = (e) => e.key === "Escape" && setResetting(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [resetting]);
  if (isMe) return null;
  return (
    <div className="adm-tch-actions">
      <button type="button" className="db-btn adm-sm" onClick={() => setResetting(true)}>
        <KeyRound size={14} aria-hidden="true" /> Reset password
      </button>
      {isPending ? (
        <button type="button" className="db-btn adm-sm" onClick={() => cancel(user.id)}>
          <Undo2 size={14} aria-hidden="true" /> Undo delete <span className="adm-clock">{clock(secondsLeft(user.id) ?? 0)}</span>
        </button>
      ) : (
        <button type="button" className="db-btn adm-sm adm-danger" disabled={classCount > 0} title={classCount ? `Still teaches ${classCount} class${classCount === 1 ? "" : "es"}. Give them to another teacher first.` : undefined} onClick={() => setConfirming(true)}>
          <Trash2 size={14} aria-hidden="true" /> Delete teacher
        </button>
      )}
      {confirming && <ConfirmTeacherDelete user={user} onClose={() => setConfirming(false)} onConfirm={() => { setConfirming(false); schedule(user); }} />}
      {resetting &&
        createPortal(
          <div className="adm-modal-back" onMouseDown={(e) => e.target === e.currentTarget && setResetting(false)}>
            <div className="adm-modal adm-modal-form" role="dialog" aria-modal="true" aria-label="Reset password">
              <button type="button" className="adm-sd-close" aria-label="Close" onClick={() => setResetting(false)}>
                <X size={20} aria-hidden="true" />
              </button>
              <ResetPassword user={user} />
            </div>
          </div>,
          document.querySelector(".admin-ui") || document.body
        )}
    </div>
  );
}

// /admin/teachers/new adds a teacher; /admin/teachers/:userId/edit-details edits one (and can delete them).
function AdminTeacherAdd() {
  const { userId } = useParams();
  const editing = Boolean(userId);
  const { session } = useAuth();
  const { refresh, classrooms, sections, userById, loadedAt } = useAdminData();
  const [user, setUser] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [slot, setSlot] = useState(EMPTY_SLOT); // the class being filled in: subject, batch, type and the chosen days with their times
  const [slots, setSlots] = useState([]); // one entry per class, type and day: [{ classroom, batch, type, day, start, end, room }]
  const [slotMsg, setSlotMsg] = useState(null);
  // Edit mode: the classes this teacher already has and their saved timetable slots.
  const mine = useMemo(() => (editing ? classrooms.filter((c) => c.teacher_id === Number(userId)) : []), [editing, classrooms, userId]);
  const mineIds = mine.map((c) => c.id).join(",");
  const [saved, setSaved] = useState([]); // [{ classroom, lecture }]
  const [savedKey, setSavedKey] = useState(0);
  useEffect(() => {
    if (!mineIds) {
      setSaved([]);
      return undefined;
    }
    let live = true;
    Promise.all(mineIds.split(",").map(Number).map(async (id) => ({ id, rows: await listClassLectures(id) })))
      .then((all) => live && setSaved(all.flatMap(({ id, rows }) => rows.map((lecture) => ({ classroom: classrooms.find((c) => c.id === id), lecture })))))
      .catch(() => {});
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mineIds, savedKey]);
  const removeClass = async (c) => {
    setSlotMsg(null);
    try {
      await unassignClassroom(c.id);
      setSavedKey((k) => k + 1);
      refresh();
    } catch (err) {
      setSlotMsg({ kind: "error", text: err.message || "Could not take that class off the teacher." });
    }
  };

  // Subjects that already exist; the batch list follows the chosen subject and its degree programmes.
  const subjectLabels = useMemo(() => {
    const m = new Map();
    classrooms.forEach((c) => m.set(`${c.course_code ? `${c.course_code} · ` : ""}${c.course}`, subjectKey(c)));
    return m;
  }, [classrooms]);
  const group = useMemo(() => {
    const key = subjectLabels.get(slot.subject);
    return key ? classrooms.filter((c) => subjectKey(c) === key) : [];
  }, [classrooms, subjectLabels, slot.subject]);
  // Only batches of a degree programme the subject is allotted to. A subject with no batch yet can take any such batch.
  const batchOptions = useMemo(() => {
    if (!group.length) return [];
    const progs = new Set(group.flatMap((c) => [c.degree_programme, ...(c.programmes ?? []).map((p) => p.degree_programme)]).filter(Boolean));
    const fits = (name) => !progs.size || progs.has(sections.find((x) => x.name === name)?.degree_programme);
    const taken = new Set(group.map((c) => c.section).filter(Boolean));
    const names = new Set([...taken].filter(fits));
    if (group.some((c) => !c.section)) sections.forEach((x) => !taken.has(x.name) && fits(x.name) && names.add(x.name));
    return [...names].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [group, sections]);
  // The class for this subject and batch; a batch-less class picked for a batch is attached to it when saved.
  const classroom = useMemo(() => {
    if (!slot.batch) return null;
    const own = group.find((c) => c.section === slot.batch);
    if (own) return own;
    const free = group.find((c) => !c.section && !slots.some((x) => x.classroom.id === c.id && x.classroom.attach !== slot.batch));
    return free ? { ...free, attach: slot.batch } : null;
  }, [group, slot.batch, slots]);
  const typeOf = (type) => SESSION_TYPES.find((t) => t.key === type);
  // Sessions of each kind the class has a week, minus the ones already saved or added to the list.
  const perWeek = (type) => (classroom ? classroom[typeOf(type).field] ?? 0 : 0);
  const left = (type) => perWeek(type) - slots.filter((x) => x.classroom.id === classroom?.id && x.type === type).length - saved.filter((x) => x.classroom?.id === classroom?.id && x.lecture.session_type === type).length;
  const remaining = slot.type ? left(slot.type) - slot.picks.length : 0; // still to place on a day
  const countOn = (day) => slot.picks.filter((p) => p.day === day).length;

  const pickType = (type) => {
    setSlot((f) => ({ ...f, type, picks: [] }));
    setSlotMsg(null);
  };
  // A click puts one session on the day (click again for another); three quick clicks in a row clear the day.
  const clickDay = (day, e) => {
    const triple = e.detail >= 3;
    setSlot((f) => {
      if (triple) return { ...f, picks: f.picks.filter((p) => p.day !== day) };
      if (left(f.type) - f.picks.length <= 0) return f;
      return { ...f, picks: [...f.picks, { day, start: "", end: "", room: "" }] };
    });
    setSlotMsg(null);
  };
  const setPick = (i, key, value) => {
    // A lecture or tutorial runs one 50-minute period, a lab two; the end follows the start.
    setSlot((f) => ({
      ...f,
      picks: f.picks.map((p, j) => (j !== i ? p : key === "start" ? { ...p, start: value, end: addMinutes(value, f.type === "lab" ? 100 : 50) } : { ...p, [key]: value })),
    }));
    setSlotMsg(null);
  };
  const addSlots = () => {
    if (!classroom) return setSlotMsg({ kind: "error", text: "Choose a subject and one of its batches." });
    if (!slot.type) return setSlotMsg({ kind: "error", text: "Choose Lecture, Lab or Tutorial." });
    if (remaining > 0) return setSlotMsg({ kind: "error", text: `Place the other ${remaining} ${typeOf(slot.type).label.toLowerCase()}${remaining === 1 ? "" : "s"} on a day first.` });
    if (!slot.picks.length) return setSlotMsg({ kind: "error", text: "Choose at least one day." });
    for (const p of slot.picks) {
      if (!p.start || !p.end || p.end <= p.start) return setSlotMsg({ kind: "error", text: `${p.day}: give a start time and a later end time.` });
    }
    // Two sessions of one class on the same day must not overlap.
    const others = [
      ...slots.filter((x) => x.classroom.id === classroom.id).map((x) => ({ day: x.day, start: x.start, end: x.end })),
      ...saved.filter((x) => x.classroom?.id === classroom.id).map((x) => ({ day: DAYS[x.lecture.weekday], start: x.lecture.start_time.slice(0, 5), end: x.lecture.end_time.slice(0, 5) })),
    ];
    const all = [...others, ...slot.picks];
    for (const p of slot.picks) {
      if (all.filter((q) => q.day === p.day && q.start < p.end && p.start < q.end).length > 1) return setSlotMsg({ kind: "error", text: `${p.day}: two sessions of ${slot.subject} overlap.` });
    }
    const added = slot.picks.map((p) => ({ classroom, batch: slot.batch, type: slot.type, day: p.day, start: p.start, end: p.end, room: p.room }));
    if (editing) return saveNow(added); // the teacher exists: save straight away
    setSlots((l) => [...l, ...added]);
    setSlot(EMPTY_SLOT);
    setSlotMsg(null);
  };
  // Edit mode: attach the batch if the class had none, give the class to this teacher and save its slots.
  const [savingSlots, setSavingSlots] = useState(false);
  const saveNow = async (added) => {
    setSavingSlots(true);
    setSlotMsg(null);
    const c = added[0].classroom;
    let done = 0;
    try {
      if (c.attach) await updateClassroom(c.id, { section: c.attach });
      if (c.teacher_id !== user.id) await assignClassroomTeacher(c.id, user.id);
      for (const x of added) {
        await createLecture(c.id, { weekday: DAYS.indexOf(x.day), startTime: x.start, endTime: x.end, room: x.room.trim(), sessionType: x.type });
        done += 1;
      }
      setSlot(EMPTY_SLOT);
      setSlotMsg({ kind: "ok", text: `Saved ${c.course} for ${added[0].batch}: ${summarize(added.map((x) => x.type))}. It is on the timetables now.` });
    } catch (err) {
      setSlotMsg({ kind: "error", text: `${done ? `${done} saved, then it stopped: ` : ""}${err.message || "Could not save the class."}` });
    } finally {
      setSavingSlots(false);
      setSavedKey((k) => k + 1);
      refresh();
    }
  };
  // "2 lectures · 1 lab" from a list of session types.
  const summarize = (types) =>
    SESSION_TYPES.map((t) => [t, types.filter((x) => x === t.key).length])
      .filter(([, n]) => n > 0)
      .map(([t, n]) => `${n} ${t.label.toLowerCase()}${n === 1 ? "" : "s"}`)
      .join(" · ");
  useEffect(() => {
    if (!editing) return undefined;
    let live = true;
    getUser(userId)
      .then((u) => {
        if (!live) return;
        setUser(u);
        setForm({ name: u.name, email: u.email, password: "", department: u.department || "", designation: u.designation || "" });
      })
      .catch((err) => live && setLoadError(err.status === 404 ? "This account doesn't exist." : err.message));
    return () => {
      live = false;
    };
  }, [editing, userId]);

  useEffect(() => {
    let live = true;
    listDepartments().then((rows) => live && setDepartments(rows.map((d) => d.name))).catch(() => {});
    listDesignations().then((rows) => live && setDesignations(rows)).catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setMsg(null);
  };

  // Classes that had no batch get the batch they were scheduled for.
  const attachBatches = async () => {
    const todo = new Map(slots.filter((x) => x.classroom.attach).map((x) => [x.classroom.id, x.classroom.attach]));
    for (const [id, name] of todo) await updateClassroom(id, { section: name });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return setMsg({ kind: "error", text: "Name and email are required." });
    if (!form.department) return setMsg({ kind: "error", text: "Choose the teacher's department." });
    if (editing) {
      setBusy(true);
      try {
        const updated = await updateUser(user.id, { name: form.name.trim(), email: form.email.trim(), department: form.department, designation: form.designation });
        let done = 0;
        try {
          await attachBatches();
          for (const x of slots) {
            await assignClassroomTeacher(x.classroom.id, user.id);
            await createLecture(x.classroom.id, { weekday: DAYS.indexOf(x.day), startTime: x.start, endTime: x.end, room: x.room.trim(), sessionType: x.type });
            done += 1;
          }
        } catch (err) {
          setSlots((l) => l.slice(done));
          setUser(updated);
          setSavedKey((k) => k + 1);
          refresh();
          return setMsg({ kind: "error", text: `Details saved, ${done} class slot${done === 1 ? "" : "s"} added, then it stopped: ${err.message}` });
        }
        setUser(updated);
        setSlots([]);
        setSavedKey((k) => k + 1);
        setMsg({ kind: "ok", text: `Saved.${slots.length ? ` ${slots.length} class slot${slots.length === 1 ? "" : "s"} added.` : ""}` });
        refresh();
      } catch (err) {
        setMsg({ kind: "error", text: err.message || "Could not save the teacher." });
      } finally {
        setBusy(false);
      }
      return;
    }
    if (form.password.length < 8) return setMsg({ kind: "error", text: "Password must be at least 8 characters." });
    setBusy(true);
    try {
      await attachBatches();
      const user = await createUser({
        ...form,
        role: "teacher",
        name: form.name.trim(),
        email: form.email.trim(),
        schedule: slots.map((x) => ({
          classroomId: x.classroom.id,
          weekday: DAYS.indexOf(x.day),
          startTime: x.start,
          endTime: x.end,
          room: x.room.trim(),
          sessionType: x.type,
        })),
      });
      let text = `Created teacher account for ${user.email}. Password: ${form.password}. Share it securely; it won't be shown again.`;
      if (slots.length) text += ` ${slots.length} class${slots.length === 1 ? "" : "es"} assigned.`;
      setSlots([]);
      setMsg({ kind: "ok", text });
      setForm(EMPTY);
      refresh();
    } catch (err) {
      setMsg({ kind: "error", text: err.message || "Could not create the teacher." });
    } finally {
      setBusy(false);
    }
  };

  if (editing && (loadError || !user)) {
    return (
      <div className="adm-detail">
        <Link to="/admin/teachers" className="adm-back-link">
          <ArrowLeft size={15} aria-hidden="true" /> Back to Teachers
        </Link>
        <AdminPageHeader title="Teacher" lead={loadError || "Loading…"} refresh={false} />
      </div>
    );
  }
  // Deleted (the countdown finished while this page was open): back to the list.
  if (editing && loadedAt && !userById.has(user.id)) return <Navigate to="/admin/teachers" replace />;
  const theirClasses = editing ? classrooms.filter((c) => c.teacher_id === user.id) : [];
  const isMe = editing && user.id === session?.id;
  const isTeacher = !editing || user.role === "teacher";

  return (
    <div className="adm-fit adm-detail adm-student-page adm-teacher-add">
      <Link to="/admin/teachers" className="adm-back-link">
        <ArrowLeft size={15} aria-hidden="true" /> Back to Teachers
      </Link>
      <AdminPageHeader title={editing ? "Edit teacher" : "Add a teacher"} lead={editing ? "Change their details, add classes, reset their password or delete the account." : "Create a teacher account and give them a first password."} refresh={false} />
      <AdminLoadState />

      <Card title="Preview" delay={90} className="adm-st-preview adm-tch-preview">
        <div className="adm-preview">
          <span className="adm-avatar" aria-hidden="true">{initials(form.name)}</span>
          <div>
            <b>{form.name || "Teacher name"}</b>
            <span className="db-sm adm-mono">{form.email || "Email address"}</span>
            <span className="db-sm">{[form.designation, form.department].filter(Boolean).join(" · ") || "No department yet"}</span>
          </div>
        </div>
      </Card>

      <Card title="Teacher details" sub="Name, department and sign-in details." delay={40} className="adm-st-details">
        <form className="adm-form adm-st-form" onSubmit={submit} noValidate>
          <div className="adm-field">
            <label htmlFor="nt-name">Full name</label>
            <input id="nt-name" value={form.name} onChange={set("name")} disabled={busy} autoComplete="off" />
          </div>
          <div className="adm-st-row">
            <SearchSelect
              id="nt-dept"
              label="Department"
              placeholder="Choose a department"
              options={departments}
              value={form.department}
              onChange={(department) => {
                setForm((f) => ({ ...f, department }));
                setMsg(null);
              }}
              clearable={false}
            />
            <SearchSelect
              id="nt-designation"
              label="Designation"
              placeholder="Choose a designation"
              options={designations}
              value={form.designation}
              onChange={(designation) => {
                setForm((f) => ({ ...f, designation }));
                setMsg(null);
              }}
              clearable={false}
            />
          </div>
          <div className="adm-st-row">
            <div className="adm-field">
              <label htmlFor="nt-email">Email address</label>
              <input id="nt-email" type="email" value={form.email} onChange={set("email")} disabled={busy} autoComplete="off" />
            </div>
            {!editing && <PasswordGen
              id="nt-pass"
              label="Initial password"
              value={form.password}
              onChange={(v) => {
                setForm((f) => ({ ...f, password: v }));
                setMsg(null);
              }}
              disabled={busy}
              hint="At least 8 characters. Generated ones are 16 characters."
            />}
          </div>
          {editing && isTeacher && <TeacherActions user={user} classCount={theirClasses.length} isMe={isMe} />}
          <div className="adm-form-foot">
            <FormMessage msg={msg} />
            <Link to="/admin/teachers" className="db-btn">
              Cancel
            </Link>
            <button type="submit" className="db-btn adm-primary" disabled={busy}>
              {editing ? <Save size={15} aria-hidden="true" /> : <UserPlus size={15} aria-hidden="true" />} {editing ? (busy ? "Saving…" : "Save changes") : busy ? "Creating…" : "Create teacher"}
            </button>
          </div>
        </form>
      </Card>


      <Card title="Classes this teacher takes" sub={editing ? "Pick a subject, batch, type and days, then Save class: it goes on the teacher's, the admin's and the batch's timetables at once. Picking a class that has another teacher moves it to this one." : "Subject, batch, day, time and venue. Picking a class that has another teacher moves it to this one."} delay={110} className="adm-tch-classes">
        <div className="adm-tch-slotform">
          <SearchSelect id="ns-subject" label="Subject" placeholder="Choose a subject" options={[...subjectLabels.keys()].sort((a, b) => a.localeCompare(b))} value={slot.subject} onChange={(subject) => { setSlot({ ...EMPTY_SLOT, subject }); setSlotMsg(null); }} clearable={false} />
          <SearchSelect id="ns-batch" label="Batch" placeholder={slot.subject ? (batchOptions.length ? "Choose a batch" : "No batch of its programmes") : "Choose a subject first"} options={batchOptions} value={slot.batch} disabled={!slot.subject} onChange={(batch) => { setSlot((f) => ({ ...EMPTY_SLOT, subject: f.subject, batch })); setSlotMsg(null); }} clearable={false} />
          <div className="adm-field adm-tch-types" role="group" aria-label="Session type">
            <span className="adm-types-label">Session type</span>
            <div className="adm-types">
              {SESSION_TYPES.map(({ key, label, Icon }) => {
                const none = !classroom || left(key) <= 0;
                return (
                  <button key={key} type="button" className={`adm-type ${slot.type === key ? "on" : ""}`} aria-pressed={slot.type === key} disabled={none} title={classroom && none ? (perWeek(key) ? `All ${label.toLowerCase()}s are already added` : `${slot.subject} has no ${label.toLowerCase()}s`) : undefined} onClick={() => pickType(key)}>
                    <Icon size={17} aria-hidden="true" /> {label}{classroom && perWeek(key) > 0 ? <span className="adm-type-n">{left(key)}/{perWeek(key)}</span> : null}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="adm-field adm-tch-days" role="group" aria-label="Days">
            <div className="adm-tch-days-hd">
              <span className="adm-types-label">Day</span>
              <span className="db-sm adm-tch-days-hint">{slot.type ? "Click a day to put a session there, click again for another on the same day, triple-click to clear the day" : "Choose a subject, batch and session type first"}</span>
            </div>
            <div className="adm-days">
              {DAYS.map((d) => {
                const n = countOn(d);
                return (
                  <button key={d} type="button" className={`adm-type ${n ? "on" : ""}`} aria-pressed={n > 0} disabled={!slot.type || (!n && remaining <= 0)} title={n ? `${n} on ${d}. Triple-click to clear` : undefined} onClick={(e) => clickDay(d, e)}>
                    {d.slice(0, 3)}{n > 0 && <span className="adm-type-n">×{n}</span>}
                  </button>
                );
              })}
            </div>
          </div>
          {slot.picks.map((p, i) => {
            const nth = slot.picks.slice(0, i + 1).filter((q) => q.day === p.day).length;
            return (
              <div className="adm-tch-daytime" key={`${p.day}-${i}`}>
                <b className="adm-name-chip-sm">{p.day.slice(0, 3)}{countOn(p.day) > 1 ? ` ${nth}` : ""}</b>
                <TimePicker id={`ns-start-${i}`} label="Starts" value={p.start} onChange={(v) => setPick(i, "start", v)} />
                <TimePicker id={`ns-end-${i}`} label="Ends" value={p.end} readOnly hint={slot.type === "lab" ? "100 min" : "50 min"} />
                <div className="adm-field">
                  <label htmlFor={`ns-room-${i}`}>Venue</label>
                  <input id={`ns-room-${i}`} value={p.room} onChange={(e) => setPick(i, "room", e.target.value)} autoComplete="off" placeholder="e.g. LT-3" maxLength={40} />
                </div>
              </div>
            );
          })}
          <div className="adm-tch-add">
            {slot.type && (
              <span className={`adm-tch-left ${remaining > 0 ? "" : "done"}`} role="status">
                {remaining > 0 ? `${remaining} ${typeOf(slot.type).label.toLowerCase()}${remaining === 1 ? "" : "s"} left to place` : `All ${typeOf(slot.type).label.toLowerCase()}s placed`}
              </span>
            )}
            <button type="button" className="db-btn adm-primary" onClick={addSlots} disabled={savingSlots || !slot.type || remaining > 0 || !slot.picks.length}>
              <Check size={16} aria-hidden="true" /> {savingSlots ? "Saving…" : editing ? "Save class" : "Add class"}
            </button>
          </div>
        </div>
        <FormMessage msg={slotMsg} />
        <div className="adm-allot-sub">
          {editing && (
            <>
              <b className="adm-allot-sub-title">Saved classes <span className="db-sm">({mine.length})</span></b>
              <ul className="adm-allot-list" aria-label="Saved classes">
                {mine.map((c) => {
                  const types = saved.filter((x) => x.classroom?.id === c.id).map((x) => x.lecture.session_type);
                  return (
                    <li key={`c-${c.id}`} className="adm-tch-slot">
                      <b className="adm-name-chip-sm">{c.section || "No batch"}</b>
                      <span className="adm-allot-name">{c.course}</span>
                      <span className="db-sm">{types.length ? `${summarize(types)} / week` : "No timetable slots yet"}</span>
                      <button type="button" className="adm-allot-x" aria-label={`Take ${c.course} off this teacher`} title="Take this class off the teacher" onClick={() => removeClass(c)}>
                        <X size={15} aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
                {!mine.length && <li className="db-sm adm-allot-empty">No classes yet.</li>}
              </ul>
            </>
          )}
          {!editing && (
            <>
          <b className="adm-allot-sub-title">{editing ? "To add" : "Classes for this teacher"} <span className="db-sm">({new Set(slots.map((x) => x.classroom.id)).size})</span></b>
          <ul className="adm-allot-list" aria-label="Classes for this teacher">
            {[...new Map(slots.map((x) => [x.classroom.id, x.classroom])).values()].map((c) => {
              const mineSlots = slots.filter((x) => x.classroom.id === c.id);
              return (
                <li key={c.id} className="adm-tch-slot">
                  <b className="adm-name-chip-sm">{mineSlots[0].batch}</b>
                  <span className="adm-allot-name">{c.course}</span>
                  <span className="db-sm">{summarize(mineSlots.map((x) => x.type))} / week</span>
                  <button type="button" className="adm-allot-x" aria-label={`Remove ${c.course}`} onClick={() => setSlots((l) => l.filter((x) => x.classroom.id !== c.id))}>
                    <X size={15} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
            {!slots.length && <li className="db-sm adm-allot-empty">No classes added yet. They are saved when you {editing ? "save" : "create the teacher"}.</li>}
          </ul>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

export default AdminTeacherAdd;
