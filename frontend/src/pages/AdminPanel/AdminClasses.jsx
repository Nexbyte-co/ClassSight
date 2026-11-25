import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, GraduationCap, Layers, Plus, UserRound } from "lucide-react";
import { useAdminData } from "../../context/AdminDataContext";
import { createSection, createSectionStudent } from "../../api/sections";
import { AdminLoadState, AdminPageHeader, Card, Empty, FormMessage, Tabs } from "../../components/admin/ui";
import { num, teacherName } from "../../components/admin/format";

function ClassesTable() {
  const { classrooms, userById, analytics, sections } = useAdminData();
  const sectionCount = useMemo(() => new Map(sections.map((s) => [s.name, s.student_count])), [sections]);
  if (!classrooms.length)
    return (
      <Empty icon={BookOpen} title="No classes yet">
        Create the first one in <Link to="/admin/setup">class setup</Link>.
      </Empty>
    );
  return (
    <div className="adm-table-wrap">
      <table className="adm-table">
        <thead>
          <tr>
            <th>Course</th>
            <th>Code</th>
            <th>Department</th>
            <th>Section</th>
            <th>Teacher</th>
            <th className="adm-num">Students</th>
            <th className="adm-num">Sessions</th>
          </tr>
        </thead>
        <tbody>
          {classrooms.map((c) => (
            <tr key={c.id}>
              <td>
                <b>{c.course}</b>
              </td>
              <td className="adm-mono">{c.course_code || "—"}</td>
              <td>{c.department || "—"}</td>
              <td>{c.section}</td>
              <td>{teacherName(userById, c.teacher_id)}</td>
              <td className="adm-num">{num(analytics[c.id]?.total_students ?? sectionCount.get(c.section) ?? 0)}</td>
              <td className="adm-num">{num(analytics[c.id]?.total_sessions ?? 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SubjectsTable() {
  const { classrooms } = useAdminData();
  // A subject = one course (by code, else name), possibly taught to several sections.
  const subjects = useMemo(() => {
    const m = new Map();
    classrooms.forEach((c) => {
      const key = (c.course_code || c.course).toLowerCase();
      const s = m.get(key) || { key, code: c.course_code, name: c.course, department: c.department, sections: new Set() };
      s.sections.add(c.section);
      m.set(key, s);
    });
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [classrooms]);
  if (!subjects.length) return <Empty icon={BookOpen} title="No subjects yet">Subjects come from the classes you create.</Empty>;
  return (
    <div className="adm-table-wrap">
      <table className="adm-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Subject</th>
            <th>Department</th>
            <th>Sections</th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((s) => (
            <tr key={s.key}>
              <td className="adm-mono">{s.code || "—"}</td>
              <td>
                <b>{s.name}</b>
              </td>
              <td>{s.department || "—"}</td>
              <td>{[...s.sections].join(", ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AssignmentsList() {
  const { teachers, classrooms } = useAdminData();
  if (!teachers.length) return <Empty icon={UserRound} title="No teachers yet">Add teachers under Users.</Empty>;
  return (
    <ul className="adm-assign">
      {teachers.map((t) => {
        const mine = classrooms.filter((c) => c.teacher_id === t.id);
        return (
          <li key={t.id}>
            <div className="adm-assign-who">
              <b>{t.name}</b>
              <span className="db-sm">{t.email}</span>
            </div>
            <div className="adm-assign-classes">
              {mine.length ? (
                mine.map((c) => (
                  <span key={c.id} className="adm-chip">
                    {c.course_code || c.course} · {c.section}
                  </span>
                ))
              ) : (
                <span className="db-sm">No classes assigned</span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function SectionsPanel() {
  const { sections, students, refresh } = useAdminData();
  const [selected, setSelected] = useState(null);
  const [name, setName] = useState("");
  const [sectionMsg, setSectionMsg] = useState(null);
  const [student, setStudent] = useState({ rollNumber: "", name: "" });
  const [studentMsg, setStudentMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const current = sections.find((s) => s.id === selected) || sections[0] || null;
  const roster = current ? students.filter((s) => s.section_id === current.id) : [];

  const addSection = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setSectionMsg({ kind: "error", text: "Enter a section name, e.g. 3C15." });
    setBusy(true);
    try {
      const s = await createSection(name.trim());
      setSectionMsg({ kind: "ok", text: `Section ${s.name} created.` });
      setName("");
      setSelected(s.id);
      refresh();
    } catch (err) {
      setSectionMsg({ kind: "error", text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const addStudent = async (e) => {
    e.preventDefault();
    if (!current) return;
    if (!student.rollNumber.trim() || !student.name.trim())
      return setStudentMsg({ kind: "error", text: "Roll number and name are required." });
    setBusy(true);
    try {
      const s = await createSectionStudent(current.id, {
        rollNumber: student.rollNumber.trim(),
        name: student.name.trim(),
      });
      setStudentMsg({ kind: "ok", text: `Added ${s.name} (${s.roll_number}) to ${current.name}.` });
      setStudent({ rollNumber: "", name: "" });
      refresh();
    } catch (err) {
      setStudentMsg({ kind: "error", text: err.status === 409 ? "That roll number already exists." : err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adm-sections">
      <div className="adm-sections-side">
        {sections.length ? (
          <ul className="adm-pick" aria-label="Sections">
            {sections.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className={current?.id === s.id ? "on" : ""}
                  aria-pressed={current?.id === s.id}
                  onClick={() => setSelected(s.id)}
                >
                  <b>{s.name}</b>
                  <span>{s.student_count} student{s.student_count === 1 ? "" : "s"}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <Empty icon={Layers} title="No sections yet" />
        )}
        <form className="adm-form adm-form-inline" onSubmit={addSection} noValidate>
          <div className="adm-field">
            <label htmlFor="new-section">New section</label>
            <div className="adm-input-group">
              <input id="new-section" placeholder="e.g. 3C15" value={name} onChange={(e) => { setName(e.target.value); setSectionMsg(null); }} disabled={busy} />
              <button type="submit" className="db-btn" disabled={busy}>
                <Plus size={15} aria-hidden="true" /> Add
              </button>
            </div>
          </div>
          <FormMessage msg={sectionMsg} />
        </form>
      </div>

      <div className="adm-sections-main">
        {current ? (
          <>
            <h3 className="adm-h3">
              Section {current.name} <span className="db-sm">· {roster.length} student{roster.length === 1 ? "" : "s"}</span>
            </h3>
            {roster.length ? (
              <div className="adm-table-wrap adm-table-short">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Roll no.</th>
                      <th>Name</th>
                      <th>Face data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map((s) => (
                      <tr key={s.id}>
                        <td className="adm-mono">{s.roll_number}</td>
                        <td>{s.name}</td>
                        <td>
                          <span className={`adm-chip ${s.face_enrolled ? "adm-chip-good" : ""}`}>
                            {s.face_enrolled ? "Enrolled" : "Not enrolled"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty icon={GraduationCap} title="No students in this section yet" />
            )}
            <form className="adm-form adm-form-row" onSubmit={addStudent} noValidate>
              <div className="adm-field">
                <label htmlFor="st-roll">Roll number</label>
                <input id="st-roll" value={student.rollNumber} onChange={(e) => { setStudent((s) => ({ ...s, rollNumber: e.target.value })); setStudentMsg(null); }} disabled={busy} />
              </div>
              <div className="adm-field">
                <label htmlFor="st-name">Student name</label>
                <input id="st-name" value={student.name} onChange={(e) => { setStudent((s) => ({ ...s, name: e.target.value })); setStudentMsg(null); }} disabled={busy} />
              </div>
              <button type="submit" className="db-btn adm-primary" disabled={busy}>
                <Plus size={15} aria-hidden="true" /> Add student
              </button>
              <FormMessage msg={studentMsg} />
            </form>
          </>
        ) : (
          <Empty icon={Layers} title="Create a section to start a roster">
            Every class is taught to a section; students belong to one section.
          </Empty>
        )}
      </div>
    </div>
  );
}

function AdminClasses() {
  const { classrooms, sections, teachers } = useAdminData();
  const [tab, setTab] = useState("classes");
  const subjectsCount = new Set(classrooms.map((c) => (c.course_code || c.course).toLowerCase())).size;

  const tabs = [
    { key: "classes", label: "Classes", count: classrooms.length },
    { key: "sections", label: "Sections", count: sections.length },
    { key: "subjects", label: "Subjects", count: subjectsCount },
    { key: "assignments", label: "Teacher assignments", count: teachers.length },
  ];

  return (
    <>
      <AdminPageHeader
        title="Classes & Subjects"
        lead="The academic structure: classes, sections, subjects and who teaches them."
        actions={
          <Link to="/admin/setup" className="db-btn adm-primary">
            <Plus size={15} aria-hidden="true" /> Set up a class <ArrowRight size={14} aria-hidden="true" />
          </Link>
        }
      />
      <AdminLoadState />
      <Card delay={60}>
        <Tabs tabs={tabs} value={tab} onChange={setTab} label="Academic structure" />
        {tab === "classes" && <ClassesTable />}
        {tab === "sections" && <SectionsPanel />}
        {tab === "subjects" && <SubjectsTable />}
        {tab === "assignments" && <AssignmentsList />}
      </Card>
    </>
  );
}

export default AdminClasses;
