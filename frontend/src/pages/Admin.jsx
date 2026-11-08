// Admin setup: create teacher accounts and classes (and assign each class to a teacher).
import { useCallback, useEffect, useRef, useState } from "react";
import PageShell from "../components/PageShell";
import { createTeacher, listUsers } from "../api/users";
import { createClassroom } from "../api/classrooms";
import { createLecture, deleteLecture, listClassLectures } from "../api/lectures";
import { useClassroom } from "../context/ClassroomContext";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const to12Hour = (time) => {
  const [h, m] = time.slice(0, 5).split(":").map(Number);
  return `${String(h % 12 || 12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

// Weekly lecture times of one class (the dashboard's "Today's Lectures" are built from these).
function LectureTimes({ classrooms }) {
  const [classId, setClassId] = useState("");
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState({ weekday: "0", startTime: "", endTime: "", room: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const requestId = useRef(0);

  const selectedId = classrooms.some((c) => String(c.id) === classId) ? classId : classrooms[0] ? String(classrooms[0].id) : "";

  const load = useCallback(async () => {
    const id = ++requestId.current; // a newer request or class switch makes this one stale
    setLectures([]);
    setLoadError("");
    if (!selectedId) return;
    setLoading(true);
    try {
      const list = await listClassLectures(selectedId);
      if (id === requestId.current) setLectures(list);
    } catch (err) {
      if (id === requestId.current) setLoadError(err.message || "Could not load lecture times.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await createLecture(selectedId, {
        weekday: Number(form.weekday),
        startTime: form.startTime,
        endTime: form.endTime,
        room: form.room.trim(),
      });
      setForm({ ...form, startTime: "", endTime: "", room: "" });
      setMsg({ kind: "ok", text: `Lecture added on ${WEEKDAYS[Number(form.weekday)]}.` });
      await load();
    } catch (err) {
      setMsg({
        kind: "error",
        text: err.status === 409 ? `This class already has a lecture on ${WEEKDAYS[Number(form.weekday)]}. Delete it first to change it.` : err.message,
      });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (lecture) => {
    setMsg(null);
    try {
      await deleteLecture(selectedId, lecture.id);
      await load();
    } catch (err) {
      setMsg({ kind: "error", text: err.message });
    }
  };

  return (
    <form className="mg-card" onSubmit={add}>
      <h2>3. Add lecture time</h2>
      <p className="mg-hint">
        A class has one lecture per weekday. These times fill the teacher&apos;s Today&apos;s Lectures on the dashboard.
      </p>
      {classrooms.length === 0 ? (
        <p className="mg-hint">Create a class first.</p>
      ) : (
        <>
          <div className="mg-grid">
            <label className="mg-field">
              Class
              <select value={selectedId} onChange={(e) => { setClassId(e.target.value); setMsg(null); }}>
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.course} - {c.section}
                  </option>
                ))}
              </select>
            </label>
            <label className="mg-field">
              Weekday
              <select value={form.weekday} onChange={(e) => setForm({ ...form, weekday: e.target.value })}>
                {WEEKDAYS.map((day, index) => (
                  <option key={day} value={index}>{day}</option>
                ))}
              </select>
            </label>
            <label className="mg-field">
              Start time
              <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required />
            </label>
            <label className="mg-field">
              End time
              <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required />
            </label>
            <label className="mg-field">
              Room
              <input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} maxLength={40} placeholder="e.g. LP402" />
            </label>
            <button type="submit" className="mg-btn" disabled={busy}>
              {busy ? "Adding..." : "Add lecture time"}
            </button>
          </div>
          {msg && <div className={`mg-alert ${msg.kind}`} role={msg.kind === "error" ? "alert" : "status"}>{msg.text}</div>}
          {loadError && (
            <div className="mg-alert error" role="alert">
              {loadError}{" "}
              <button type="button" className="mg-btn secondary small" onClick={load}>Try again</button>
            </div>
          )}
          {loading && <p className="mg-hint" role="status">Loading lecture times...</p>}
          {!loading && !loadError && lectures.length === 0 && <p className="mg-hint">No lecture times for this class yet.</p>}
          {lectures.length > 0 && (
            <table className="mg-table" style={{ marginTop: 16 }}>
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Time</th>
                  <th>Room</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {lectures.map((lecture) => (
                  <tr key={lecture.id}>
                    <td>{WEEKDAYS[lecture.weekday]}</td>
                    <td>{to12Hour(lecture.start_time)} – {to12Hour(lecture.end_time)}</td>
                    <td>{lecture.room || "—"}</td>
                    <td>
                      <div className="mg-actions">
                        <button
                          type="button"
                          className="mg-btn danger small"
                          aria-label={`Delete the ${WEEKDAYS[lecture.weekday]} lecture`}
                          onClick={() => remove(lecture)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </form>
  );
}

function Admin() {
  const { classrooms, reload: reloadClassrooms, selectClassroom } = useClassroom();
  const [users, setUsers] = useState([]);
  const [loadError, setLoadError] = useState("");

  const [teacher, setTeacher] = useState({ name: "", email: "", password: "" });
  const [teacherBusy, setTeacherBusy] = useState(false);
  const [teacherMsg, setTeacherMsg] = useState(null); // { kind: "ok" | "error", text }

  const [cls, setCls] = useState({ course: "", section: "", teacherId: "", courseCode: "", department: "" });
  const [classBusy, setClassBusy] = useState(false);
  const [classMsg, setClassMsg] = useState(null);

  const reloadUsers = useCallback(async () => {
    try {
      setUsers(await listUsers());
      setLoadError("");
    } catch (err) {
      setLoadError(err.message || "Could not load users.");
    }
  }, []);

  useEffect(() => {
    reloadUsers();
  }, [reloadUsers]);

  const teachers = users.filter((u) => u.role === "teacher");
  const teacherName = (id) => users.find((u) => u.id === id)?.name ?? `#${id}`;

  const addTeacher = async (e) => {
    e.preventDefault();
    setTeacherBusy(true);
    setTeacherMsg(null);
    try {
      const created = await createTeacher({
        name: teacher.name.trim(),
        email: teacher.email.trim(),
        password: teacher.password,
      });
      setTeacher({ name: "", email: "", password: "" });
      setTeacherMsg({ kind: "ok", text: `Teacher account created for ${created.email}.` });
      setCls((current) => ({ ...current, teacherId: String(created.id) }));
      await reloadUsers();
    } catch (err) {
      setTeacherMsg({ kind: "error", text: err.status === 409 ? "That email is already registered." : err.message });
    } finally {
      setTeacherBusy(false);
    }
  };

  const addClass = async (e) => {
    e.preventDefault();
    setClassBusy(true);
    setClassMsg(null);
    try {
      const created = await createClassroom({
        course: cls.course.trim(),
        section: cls.section.trim(),
        teacherId: Number(cls.teacherId),
        courseCode: cls.courseCode.trim(),
        department: cls.department.trim(),
      });
      setCls({ course: "", section: "", teacherId: cls.teacherId, courseCode: "", department: "" });
      setClassMsg({ kind: "ok", text: `Class ${created.course} - ${created.section} created.` });
      await reloadClassrooms();
      selectClassroom(created.id);
    } catch (err) {
      setClassMsg({ kind: "error", text: err.message });
    } finally {
      setClassBusy(false);
    }
  };

  return (
    <PageShell crumb="Admin" activePage="admin" showClassPicker={false}>
      <div className="students-page-header">
        <div>
          <h1 className="students-page-title">Admin setup</h1>
          <p className="students-page-subtitle">
            Create a teacher account, create a class for that teacher, then open Students, select a
            section, and add and enroll its students. The teacher signs in with the email and password you set here.
          </p>
        </div>
      </div>

      {loadError && <div className="mg-alert error">{loadError}</div>}

      <form className="mg-card" onSubmit={addTeacher}>
        <h2>1. Add a teacher</h2>
        <p className="mg-hint">The password needs at least 8 characters. Share it with the teacher privately.</p>
        <div className="mg-grid">
          <label className="mg-field">
            Full name
            <input value={teacher.name} onChange={(e) => setTeacher({ ...teacher, name: e.target.value })} required maxLength={120} />
          </label>
          <label className="mg-field">
            Email
            <input type="email" value={teacher.email} onChange={(e) => setTeacher({ ...teacher, email: e.target.value })} required autoComplete="off" />
          </label>
          <label className="mg-field">
            Password
            <input type="password" value={teacher.password} onChange={(e) => setTeacher({ ...teacher, password: e.target.value })} required minLength={8} autoComplete="new-password" />
          </label>
          <button type="submit" className="mg-btn" disabled={teacherBusy}>
            {teacherBusy ? "Creating..." : "Create teacher"}
          </button>
        </div>
        {teacherMsg && <div className={`mg-alert ${teacherMsg.kind}`} role={teacherMsg.kind === "error" ? "alert" : "status"}>{teacherMsg.text}</div>}

        {teachers.length > 0 && (
          <table className="mg-table" style={{ marginTop: 16 }}>
            <thead>
              <tr>
                <th>Teacher</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td>{t.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </form>

      <form className="mg-card" onSubmit={addClass}>
        <h2>2. Create a class</h2>
        <p className="mg-hint">A class belongs to one teacher. Only that teacher (and admins) can see its students and attendance.</p>
        <div className="mg-grid">
          <label className="mg-field">
            Course
            <input value={cls.course} onChange={(e) => setCls({ ...cls, course: e.target.value })} required maxLength={120} placeholder="e.g. Computer Networks" />
          </label>
          <label className="mg-field">
            Section
            <input value={cls.section} onChange={(e) => setCls({ ...cls, section: e.target.value })} required maxLength={40} placeholder="e.g. 3C2" />
          </label>
          <label className="mg-field">
            Course code (optional)
            <input value={cls.courseCode} onChange={(e) => setCls({ ...cls, courseCode: e.target.value })} maxLength={20} placeholder="e.g. UCS503" />
          </label>
          <label className="mg-field">
            Department (optional)
            <input value={cls.department} onChange={(e) => setCls({ ...cls, department: e.target.value })} maxLength={120} placeholder="e.g. Computer Science & Eng." />
          </label>
          <label className="mg-field">
            Teacher
            <select value={cls.teacherId} onChange={(e) => setCls({ ...cls, teacherId: e.target.value })} required>
              <option value="" disabled>
                {teachers.length ? "Select a teacher" : "Create a teacher first"}
              </option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.email})
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="mg-btn" disabled={classBusy || teachers.length === 0}>
            {classBusy ? "Creating..." : "Create class"}
          </button>
        </div>
        {classMsg && <div className={`mg-alert ${classMsg.kind}`} role={classMsg.kind === "error" ? "alert" : "status"}>{classMsg.text}</div>}

        {classrooms.length > 0 && (
          <table className="mg-table" style={{ marginTop: 16 }}>
            <thead>
              <tr>
                <th>Class</th>
                <th>Section</th>
                <th>Teacher</th>
              </tr>
            </thead>
            <tbody>
              {classrooms.map((c) => (
                <tr key={c.id}>
                  <td>{c.course}</td>
                  <td>{c.section}</td>
                  <td>{teacherName(c.teacher_id)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </form>

      <LectureTimes classrooms={classrooms} />
    </PageShell>
  );
}

export default Admin;
