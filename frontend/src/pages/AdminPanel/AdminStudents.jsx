import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, GraduationCap, ScanFace, Search, UserPlus } from "lucide-react";
import { useAdminData } from "../../context/AdminDataContext";
import { AdminLoadState, AdminPageHeader, Card, Empty, StatTile } from "../../components/admin/ui";
import { num, pct } from "../../components/admin/format";
import SearchSelect from "../../components/admin/SearchSelect";
import StudentDetailsModal from "../../components/admin/StudentDetailsModal";

function AdminStudents() {
  const { students, sections, sectionById, sessions, faceEnrolled } = useAdminData();
  const [query, setQuery] = useState("");
  const [section, setSection] = useState(""); // section name; "" = all
  const [programme, setProgramme] = useState(""); // degree programme; "" = all
  const [face, setFace] = useState("all");
  const [openId, setOpenId] = useState(null);

  // Attendance per student across every saved session: present / records.
  const attendance = useMemo(() => {
    const m = new Map();
    sessions.forEach((s) =>
      s.records.forEach((r) => {
        const a = m.get(r.student_id) || { present: 0, total: 0 };
        a.total += 1;
        if (r.status === "present") a.present += 1;
        m.set(r.student_id, a);
      })
    );
    return m;
  }, [sessions]);

  const q = query.trim().toLowerCase();
  const rows = useMemo(
    () =>
      students
        .filter((s) => !programme || sectionById.get(s.section_id)?.degree_programme === programme)
        .filter((s) => !section || sectionById.get(s.section_id)?.name === section)
        .filter((s) => face === "all" || (face === "enrolled") === Boolean(s.face_enrolled))
        .filter((s) => !q || s.name.toLowerCase().includes(q) || s.roll_number.toLowerCase().includes(q))
        .sort((a, b) => a.roll_number.localeCompare(b.roll_number, undefined, { numeric: true })),
    [students, sectionById, programme, section, face, q]
  );

  const faceTabs = [
    { key: "all", label: "All", count: students.length },
    { key: "enrolled", label: "Enrolled", count: faceEnrolled },
    { key: "pending", label: "Not enrolled", count: students.length - faceEnrolled },
  ];
  const faceIndex = faceTabs.findIndex((t) => t.key === face);
  const faceNow = faceTabs[faceIndex];
  const nextFace = () => setFace(faceTabs[(faceIndex + 1) % faceTabs.length].key);
  const programmes = [...new Set(sections.map((x) => x.degree_programme).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const sectionOptions = sections
    .filter((x) => !programme || x.degree_programme === programme)
    .map((x) => x.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const filtered = q || programme || section || face !== "all";

  return (
    <div className="adm-fit">
      <AdminPageHeader title="Students" lead="Everyone enrolled across all sections." />
      <AdminLoadState />

      <div className="adm-stats db-rise" style={{ animationDelay: "60ms" }}>
        <StatTile icon={GraduationCap} label="Total students" value={num(students.length)} sub="across all sections" />
        <StatTile icon={BookOpen} label="Sections" value={num(sections.length)} sub="with student rosters" />
        <StatTile
          icon={ScanFace}
          label="Face enrolled"
          value={students.length ? pct(faceEnrolled / students.length) : "—"}
          sub={`${num(faceEnrolled)} ready for AI attendance`}
        />
      </div>

      <Card title="Search & filters" sub="Narrow the list by name, degree programme, section or face data." delay={80}>
        <div className="adm-filter adm-filter-students">
          <div className="adm-field">
            <label htmlFor="stu-search">Search</label>
            <label className="adm-search">
              <Search size={15} aria-hidden="true" />
              <input
                id="stu-search"
                type="search"
                placeholder="Name or roll number"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          </div>
          <SearchSelect
            id="stu-programme"
            label="Degree programme"
            placeholder="All degree programmes"
            options={programmes}
            value={programme}
            onChange={(v) => {
              setProgramme(v);
              setSection("");
            }}
          />
          <SearchSelect id="stu-section" label="Section" placeholder="All sections" options={sectionOptions} value={section} onChange={setSection} />
          <div className="adm-field">
            <label>Face data</label>
            <button type="button" className="adm-cycle" onClick={nextFace} title="Click to show all, enrolled or not enrolled" aria-label={`Face data: ${faceNow.label}, ${faceNow.count}. Click to change.`}>
              <ScanFace size={16} aria-hidden="true" />
              <span className="adm-cycle-label">
                {faceTabs.map((t) => (
                  <span key={t.key} className={t.key === face ? "on" : ""} aria-hidden={t.key !== face}>{t.label}</span>
                ))}
              </span>
              <b className="adm-cycle-count">{num(faceNow.count)}</b>
              <span className="adm-cycle-dots" aria-hidden="true">
                {faceTabs.map((t) => <i key={t.key} className={t.key === face ? "on" : ""} />)}
              </span>
            </button>
          </div>
        </div>
      </Card>

      <div className="adm-grid adm-fill adm-fill-one">
        <Card
          title="Student info"
          sub={filtered ? `${num(rows.length)} of ${num(students.length)} shown` : `${num(students.length)} in total`}
          delay={120}
          actions={
            <Link to="/admin/students/new" className="db-btn adm-primary">
              <UserPlus size={15} aria-hidden="true" /> Add Student
            </Link>
          }
        >
          {rows.length ? (
            <div className="adm-scroll">
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Roll no.</th>
                      <th>Name</th>
                      <th>Section</th>
                      <th>Face data</th>
                      <th className="adm-num">Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((s) => {
                      const a = attendance.get(s.id);
                      return (
                        <tr key={s.id} className="adm-row-link" tabIndex={0} onClick={() => setOpenId(s.id)} onKeyDown={(e) => e.key === "Enter" && setOpenId(s.id)}>
                          <td className="adm-mono">{s.roll_number}</td>
                          <td>
                            <span className="adm-rowname">{s.name}</span>
                          </td>
                          <td>{sectionById.get(s.section_id)?.name || "—"}</td>
                          <td>
                            <span className={`adm-chip ${s.face_enrolled ? "adm-chip-good" : ""}`}>
                              {s.face_enrolled ? "Enrolled" : "Not enrolled"}
                            </span>
                          </td>
                          <td className="adm-num">{a ? `${pct(a.present / a.total)} · ${a.total} session${a.total === 1 ? "" : "s"}` : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <Empty icon={GraduationCap} title={filtered ? "No matching students" : "No students yet"}>
              {filtered ? "Try a different search or filter." : "Add students to a section and they will show up here."}
            </Empty>
          )}
        </Card>
      </div>
      {openId !== null && <StudentDetailsModal studentId={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

export default AdminStudents;
