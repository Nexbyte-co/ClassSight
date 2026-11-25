// Admin: every college department (/admin/departments), how many teachers and subjects each has, and adding one.
import { useEffect, useMemo, useState } from "react";
import { Building2, Plus, Search } from "lucide-react";
import { useAdminData } from "../../context/AdminDataContext";
import { createDepartment, listDepartments } from "../../api/departments";
import { AdminLoadState, AdminPageHeader, Card, Empty, FormMessage } from "../../components/admin/ui";
import { num, subjectKey } from "../../components/admin/format";
import DepartmentTeachersModal from "../../components/admin/DepartmentTeachersModal";
import TeacherDetailsModal from "../../components/admin/TeacherDetailsModal";

function AdminDepartments() {
  const { teachers, classrooms } = useAdminData();
  const [departments, setDepartments] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [open, setOpen] = useState(null); // department name whose teachers are shown
  const [teacherId, setTeacherId] = useState(null); // a teacher opened from that list

  const load = () =>
    listDepartments()
      .then((rows) => (setDepartments(rows), setLoadError("")))
      .catch((err) => setLoadError(err.message || "Could not load the departments."));
  useEffect(() => {
    load();
  }, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (departments ?? [])
      .filter((d) => !q || d.name.toLowerCase().includes(q))
      .map((d) => ({
        ...d,
        teachers: teachers.filter((t) => t.department === d.name).length,
        subjects: new Set(classrooms.filter((c) => c.department === d.name).map(subjectKey)).size,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [departments, teachers, classrooms, query]);

  const add = async (e) => {
    e.preventDefault();
    const clean = name.trim().replace(/\s+/g, " ");
    if (!clean) return setMsg({ kind: "error", text: "Type the department's name." });
    setBusy(true);
    setMsg(null);
    try {
      await createDepartment(clean);
      setName("");
      setMsg({ kind: "ok", text: `${clean} added.` });
      await load();
    } catch (err) {
      setMsg({ kind: "error", text: err.status === 409 ? "That department already exists." : err.message || "Could not add the department." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adm-fit adm-departments">
      <AdminPageHeader title="Departments" lead="The college's departments. Teachers and subjects belong to one." refresh={false} />
      <AdminLoadState />

      <Card title="Add a department" sub="Names are unique, ignoring capital letters." delay={40}>
        <form className="adm-dept-add" onSubmit={add} noValidate>
          <div className="adm-field">
            <label htmlFor="dept-name">Department name</label>
            <input id="dept-name" value={name} onChange={(e) => { setName(e.target.value); setMsg(null); }} disabled={busy} autoComplete="off" maxLength={120} placeholder="e.g. Department of Mathematics" />
          </div>
          <button type="submit" className="db-btn adm-primary" disabled={busy}>
            <Plus size={15} aria-hidden="true" /> {busy ? "Adding…" : "Add department"}
          </button>
        </form>
        <FormMessage msg={msg} />
      </Card>

      <div className="adm-grid adm-fill adm-fill-one">
      <Card
        title="All departments"
        sub={departments ? `${num(departments.length)} department${departments.length === 1 ? "" : "s"}` : "Loading…"}
        delay={90}
        actions={
          <label className="adm-dept-search">
            <Search size={14} aria-hidden="true" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" aria-label="Search departments" />
          </label>
        }
      >
        {loadError ? (
          <p className="adm-msg error">{loadError}</p>
        ) : rows.length ? (
          <div className="adm-scroll">
            <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th className="adm-num">Teachers</th>
                  <th className="adm-num">Subjects</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr key={d.id} className="adm-row-link" tabIndex={0} onClick={() => setOpen(d.name)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpen(d.name))}>
                    <td><span className="adm-rowname">{d.name}</span></td>
                    <td className="adm-num">{num(d.teachers)}</td>
                    <td className="adm-num">{num(d.subjects)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        ) : (
          <Empty icon={Building2} title={departments?.length ? "No department matches that search" : "No departments yet"}>
            {!departments?.length && "Add the first one above."}
          </Empty>
        )}
      </Card>
      </div>
      {open && <DepartmentTeachersModal department={open} onClose={() => setOpen(null)} onOpenTeacher={setTeacherId} />}
      {teacherId !== null && <TeacherDetailsModal teacherId={teacherId} onClose={() => setTeacherId(null)} />}
    </div>
  );
}

export default AdminDepartments;
