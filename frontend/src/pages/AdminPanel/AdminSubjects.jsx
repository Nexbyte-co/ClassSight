import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Plus } from "lucide-react";
import { useAdminData } from "../../context/AdminDataContext";
import { AdminLoadState, AdminPageHeader, Card, Empty } from "../../components/admin/ui";
import SearchSelect from "../../components/admin/SearchSelect";
import { degreeProgramme, subjectKey } from "../../components/admin/format";
import { TypeChips, categoryLabel, creditsOf, formatCredits, typesOf } from "../../components/admin/SessionTypes";
import { listDepartments } from "../../api/departments";
import SubjectDetailsModal from "../../components/admin/SubjectDetailsModal";

// The programme the admin chose for the subject; older subjects fall back to the batch name's year + letters.
const programmeOf = (c, byBatch) => c.degree_programme || byBatch.get(c.section) || degreeProgramme(c.section) || "—";

// Every programme the subject is allotted to; older subjects fall back to the single one.
const programmesOf = (c, byBatch) => (c.programmes?.length ? c.programmes.map((p) => p.degree_programme) : [programmeOf(c, byBatch)]);

const byNum = (a, b) => a.localeCompare(b, undefined, { numeric: true });

function SubjectsTable({ department = "", programme = "", byBatch, onOpen }) {
  const { classrooms } = useAdminData();
  // A subject = one course (by code, else name), possibly taught to several sections.
  const subjects = useMemo(() => {
    const m = new Map();
    classrooms.forEach((c) => {
      if (department && c.department !== department) return;
      if (programme && !programmesOf(c, byBatch).includes(programme)) return;
      const key = subjectKey(c);
      const s = m.get(key) || { key, code: c.course_code, name: c.course, department: c.department, programmes: new Set(), classes: [] };
      s.classes.push(c);
      programmesOf(c, byBatch).forEach((p) => s.programmes.add(p));
      m.set(key, s);
    });
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [classrooms, department, programme, byBatch]);
  if (!subjects.length) return <Empty icon={BookOpen} title="No subjects yet">Subjects come from the classes you create.</Empty>;
  return (
    <div className="adm-table-wrap">
      <table className="adm-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Subject</th>
            <th>Department</th>
            <th>Category</th>
            <th className="adm-num">Credits</th>
            <th>Sessions</th>
            <th>Degree programme</th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((s) => (
            <tr key={s.key} className="adm-row-link" tabIndex={0} onClick={() => onOpen(s.key)} onKeyDown={(e) => e.key === "Enter" && onOpen(s.key)}>
              <td className="adm-mono">{s.code || "—"}</td>
              <td>
                <span className="adm-rowname">{s.name}</span>
              </td>
              <td>{s.department || "—"}</td>
              <td>{categoryLabel(s.classes[0].category)}</td>
              <td className="adm-num"><b>{formatCredits(creditsOf(typesOf(s.classes)))}</b></td>
              <td><TypeChips types={typesOf(s.classes)} /></td>
              <td>{[...s.programmes].sort(byNum).join(", ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminSubjects() {
  const { classrooms, sections } = useAdminData();
  const byBatch = useMemo(() => new Map(sections.filter((s) => s.degree_programme).map((s) => [s.name, s.degree_programme])), [sections]);
  const [department, setDepartment] = useState("");
  const [programme, setProgramme] = useState("");
  const [departments, setDepartments] = useState([]);
  const [deptError, setDeptError] = useState(false);
  const [openKey, setOpenKey] = useState(null);

  useEffect(() => {
    let live = true;
    listDepartments()
      .then((rows) => live && setDepartments(rows.map((d) => d.name)))
      .catch(() => live && setDeptError(true));
    return () => {
      live = false;
    };
  }, []);
  const programmes = [...new Set(classrooms.flatMap((c) => programmesOf(c, byBatch)))].filter((p) => p !== "—").sort(byNum);
  const filtered = Boolean(department || programme);
  const count = new Set(
    classrooms
      .filter((c) => !department || c.department === department)
      .filter((c) => !programme || programmesOf(c, byBatch).includes(programme))
      .map((c) => (c.course_code || c.course).toLowerCase())
  ).size;

  return (
    <div className="adm-fit">
      <AdminPageHeader title="Subjects" lead="The courses taught, by department." />
      <AdminLoadState />
      <Card title="Select department" sub={deptError ? "Could not load departments. Refresh to retry." : "Search or scroll to pick a department and a degree programme."} delay={40}>
        <div className="adm-filter">
          <SearchSelect
            id="adm-dept"
            label="Department"
            placeholder="Select department"
            options={departments}
            value={department}
            onChange={setDepartment}
          />
          <SearchSelect
            id="adm-programme"
            label="Degree programme"
            placeholder="All degree programmes"
            options={programmes}
            value={programme}
            onChange={setProgramme}
          />
        </div>
      </Card>
      <div className="adm-grid adm-fill adm-fill-one">
        <Card
          title="Subjects"
          sub={filtered ? `${count} matching` : `${count} in total`}
          delay={60}
          actions={
            <Link to="/admin/subjects/new" className="db-btn adm-primary">
              <Plus size={15} aria-hidden="true" /> Add Subject
            </Link>
          }
        >
          <div className="adm-scroll">
            <SubjectsTable department={department} programme={programme} byBatch={byBatch} onOpen={setOpenKey} />
          </div>
        </Card>
      </div>
      {openKey && <SubjectDetailsModal subject={openKey} onClose={() => setOpenKey(null)} />}
    </div>
  );
}

export default AdminSubjects;
