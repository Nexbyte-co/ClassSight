// Admin setup: create teacher accounts and classes (and assign each class to a teacher).
import { useCallback, useEffect, useState } from "react";
import PageShell from "../components/PageShell";
import { createTeacher, listUsers } from "../api/users";
import { createClassroom } from "../api/classrooms";
import { useClassroom } from "../context/ClassroomContext";

function Admin() {
  const { classrooms, reload: reloadClassrooms, selectClassroom } = useClassroom();
  const [users, setUsers] = useState([]);
  const [loadError, setLoadError] = useState("");

  const [teacher, setTeacher] = useState({ name: "", email: "", password: "" });
  const [teacherBusy, setTeacherBusy] = useState(false);
  const [teacherMsg, setTeacherMsg] = useState(null); // { kind: "ok" | "error", text }

  const [cls, setCls] = useState({ course: "", section: "", teacherId: "" });
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
      });
      setCls({ course: "", section: "", teacherId: cls.teacherId });
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
            Create a teacher account, create a class for that teacher, then add and enroll the
            students under Students. The teacher signs in with the email and password you set here.
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
    </PageShell>
  );
}

export default Admin;
