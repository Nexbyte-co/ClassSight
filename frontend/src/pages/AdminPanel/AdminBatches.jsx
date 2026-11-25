import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowRight, ArrowUp, BookOpen, Plus, Search } from "lucide-react";
import { useAdminData } from "../../context/AdminDataContext";
import { AdminLoadState, AdminPageHeader, Card, Empty } from "../../components/admin/ui";
import SearchSelect from "../../components/admin/SearchSelect";
import BatchDetailsModal from "../../components/admin/BatchDetailsModal";
import { num, parentBatchOf } from "../../components/admin/format";

const SORTS = [
  { key: "name", label: "Batch name" },
  { key: "department", label: "Department" },
  { key: "students", label: "Students" },
  { key: "sessions", label: "Sessions" },
];

const byName = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

function AdminBatches() {
  const { sections, classrooms, sessionsByClass } = useAdminData();
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState(""); // "" = all departments
  const [sortKey, setSortKey] = useState("name");
  const [asc, setAsc] = useState(true);
  const [openId, setOpenId] = useState(null);

  // A batch = a section: its students, the departments of its classes and every session taken for it.
  const batches = useMemo(
    () =>
      sections.filter((s) => !parentBatchOf(s, sections)).map((s) => {
        const mine = classrooms.filter((c) => c.section === s.name);
        const departments = [...new Set(mine.map((c) => c.department).filter(Boolean))];
        const sessions = mine.reduce((sum, c) => sum + (sessionsByClass[c.id] ?? 0), 0);
        return {
          id: s.id,
          name: s.name,
          departments,
          students: s.student_count,
          sessions,
          programme: s.degree_programme || "",
          years: s.start_year ? `${s.start_year}–${s.end_year}` : "",
        };
      }),
    [sections, classrooms, sessionsByClass]
  );

  const departmentOptions = useMemo(() => [...new Set(batches.flatMap((b) => b.departments))].sort(byName), [batches]);

  const q = query.trim().toLowerCase();
  const rows = useMemo(() => {
    const dir = asc ? 1 : -1;
    const value = {
      name: (a, b) => byName(a.name, b.name),
      department: (a, b) => byName(a.departments.join(", "), b.departments.join(", ")),
      students: (a, b) => a.students - b.students,
      sessions: (a, b) => a.sessions - b.sessions,
    }[sortKey];
    return batches
      .filter((b) => !department || b.departments.includes(department))
      .filter((b) => !q || b.name.toLowerCase().includes(q) || b.programme.toLowerCase().includes(q) || b.departments.some((d) => d.toLowerCase().includes(q)))
      .sort((a, b) => dir * value(a, b) || byName(a.name, b.name));
  }, [batches, department, q, sortKey, asc]);

  const filtered = q || department;

  return (
    <div className="adm-fit">
      <AdminPageHeader
        title="Batches"
        lead="Every batch: its department, students and sessions."
        actions={
          <Link to="/admin/batches/new" className="db-btn">
            Set up a class <ArrowRight size={14} aria-hidden="true" />
          </Link>
        }
      />
      <AdminLoadState />
      <div className="adm-grid adm-fill adm-fill-one">
        <Card
          title="Batches"
          sub={filtered ? `${num(rows.length)} of ${num(batches.length)} shown` : `${num(batches.length)} in total`}
          delay={60}
          actions={
            <>
            <label className="adm-search">
              <Search size={15} aria-hidden="true" />
              <input
                type="search"
                placeholder="Search batch or department"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search batches"
              />
            </label>
            <Link to="/admin/batches/new" className="db-btn adm-primary">
              <Plus size={15} aria-hidden="true" /> Add Batch
            </Link>
            </>
          }
        >
          <div className="adm-toolbar">
            <SearchSelect
              id="batch-sort"
              label="Sort by"
              placeholder="Sort by"
              options={SORTS.map((o) => o.label)}
              value={SORTS.find((o) => o.key === sortKey).label}
              onChange={(label) => setSortKey(SORTS.find((o) => o.label === label)?.key ?? "name")}
              clearable={false}
            />
            <button
              type="button"
              className={`db-btn adm-dir ${asc ? "" : "desc"}`}
              onClick={() => setAsc((v) => !v)}
              aria-label={asc ? "Ascending, switch to descending" : "Descending, switch to ascending"}
              title={asc ? "Ascending" : "Descending"}
            >
              {asc ? <ArrowUp size={15} aria-hidden="true" /> : <ArrowDown size={15} aria-hidden="true" />}
              {asc ? "Ascending" : "Descending"}
            </button>
            <SearchSelect
              id="batch-dept"
              label="Department"
              placeholder="All departments"
              options={departmentOptions}
              value={department}
              onChange={setDepartment}
            />
            {filtered && (
              <button type="button" className="db-btn adm-clear" onClick={() => { setQuery(""); setDepartment(""); }}>
                Clear filters
              </button>
            )}
          </div>

          <div className="adm-scroll">
            {rows.length ? (
              <div className="adm-table-wrap">
                <table className="adm-table adm-table-grouped">
                  <thead>
                    <tr>
                      <th rowSpan={2}>Batch</th>
                      <th rowSpan={2}>Degree programme</th>
                      <th rowSpan={2}>Years</th>
                      <th rowSpan={2}>Department</th>
                      <th rowSpan={2} className="adm-num">Students</th>
                      <th colSpan={4} className="adm-group">Sessions</th>
                    </tr>
                    <tr className="adm-sub">
                      <th className="adm-num">Total</th>
                      <th className="adm-num">Lectures</th>
                      <th className="adm-num">Labs</th>
                      <th className="adm-num">Tutorials</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((b) => (
                      <tr key={b.id} className="adm-row-link" tabIndex={0} onClick={() => setOpenId(b.id)} onKeyDown={(e) => e.key === "Enter" && setOpenId(b.id)}>
                        <td>
                          <span className="adm-rowname">{b.name}</span>
                        </td>
                        <td>{b.programme || "—"}</td>
                        <td>{b.years || "—"}</td>
                        <td>{b.departments.length ? b.departments.join(", ") : "—"}</td>
                        <td className="adm-num">{num(b.students)}</td>
                        <td className="adm-num">{num(b.sessions)}</td>
                        {/* Sessions are not typed in the database yet, so there is no real split to show. */}
                        <td className="adm-num adm-dim">—</td>
                        <td className="adm-num adm-dim">—</td>
                        <td className="adm-num adm-dim">—</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty icon={BookOpen} title={filtered ? "No matching batches" : "No batches yet"}>
                {filtered ? "Try a different search or department." : "Batches appear when you add a section."}
              </Empty>
            )}
          </div>
        </Card>
      </div>
      {openId !== null && <BatchDetailsModal batchId={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

export default AdminBatches;
