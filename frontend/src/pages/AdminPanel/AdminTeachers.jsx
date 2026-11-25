import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, GraduationCap, Search, UserPlus, Users } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useAdminData } from "../../context/AdminDataContext";
import { AdminLoadState, AdminPageHeader, Card, Empty, StatTile } from "../../components/admin/ui";
import { num } from "../../components/admin/format";
import SearchSelect from "../../components/admin/SearchSelect";
import TeacherDetailsModal from "../../components/admin/TeacherDetailsModal";

const byName = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

function AdminTeachers() {
  const { session } = useAuth();
  const { teachers, classrooms } = useAdminData();
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState(""); // "" = all
  const [openId, setOpenId] = useState(null);

  const classCount = useMemo(() => {
    const m = new Map();
    classrooms.forEach((c) => m.set(c.teacher_id, (m.get(c.teacher_id) || 0) + 1));
    return m;
  }, [classrooms]);

  const q = query.trim().toLowerCase();
  const rows = useMemo(
    () =>
      teachers
        .filter((u) => !department || u.department === department)
        .filter((u) => !q || [u.name, u.email].some((f) => String(f || "").toLowerCase().includes(q)))
        .sort((a, b) => byName(a.name, b.name)),
    [teachers, department, q]
  );
  const departments = useMemo(() => [...new Set(teachers.map((t) => t.department).filter(Boolean))].sort(byName), [teachers]);
  const withClasses = teachers.filter((t) => classCount.get(t.id)).length;
  const filtered = q || department;

  return (
    <div className="adm-fit">
      <AdminPageHeader title="Teachers" lead="Teacher accounts on ClassSight." />
      <AdminLoadState />

      <div className="adm-stats db-rise" style={{ animationDelay: "60ms" }}>
        <StatTile icon={Users} label="Total teachers" value={num(teachers.length)} sub="accounts on ClassSight" />
        <StatTile icon={BookOpen} label="With classes" value={num(withClasses)} sub="teaching at least one class" />
        <StatTile icon={GraduationCap} label="Without classes" value={num(teachers.length - withClasses)} sub="not assigned yet" />
      </div>

      <Card title="Search & filters" sub="Narrow the list by name, email or department." delay={80}>
        <div className="adm-filter adm-filter-teachers">
          <div className="adm-field">
            <label htmlFor="tch-search">Search</label>
            <label className="adm-search">
              <Search size={15} aria-hidden="true" />
              <input id="tch-search" type="search" placeholder="Name or email" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
          </div>
          <SearchSelect id="tch-dept" label="Department" placeholder="All departments" options={departments} value={department} onChange={setDepartment} />
        </div>
      </Card>

      <div className="adm-grid adm-fill adm-fill-one">
        <Card
          title="Teacher info"
          sub={filtered ? `${num(rows.length)} of ${num(teachers.length)} shown` : `${num(teachers.length)} in total`}
          delay={120}
          actions={
            <Link to="/admin/teachers/new" className="db-btn adm-primary">
              <UserPlus size={15} aria-hidden="true" /> Add Teacher
            </Link>
          }
        >
          {rows.length ? (
            <div className="adm-scroll">
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Department</th>
                      <th className="adm-num">Classes</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((u) => (
                      <tr key={u.id} className="adm-row-link" tabIndex={0} onClick={() => setOpenId(u.id)} onKeyDown={(e) => e.key === "Enter" && setOpenId(u.id)}>
                        <td>
                          <span className="adm-rowname">{u.name}</span>
                          {u.id === session?.id && <span className="adm-you">You</span>}
                        </td>
                        <td className="adm-mono">{u.email}</td>
                        <td>{u.department || "—"}</td>
                        <td className="adm-num">{num(classCount.get(u.id) || 0)}</td>
                        <td>
                          <span className="adm-chip adm-chip-good">Active</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <Empty icon={Users} title={filtered ? "No matching teachers" : "No teachers yet"}>
              {filtered ? "Try a different search or department." : "Add a teacher and they will show up here."}
            </Empty>
          )}
        </Card>
      </div>
      {openId !== null && <TeacherDetailsModal teacherId={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

export default AdminTeachers;
