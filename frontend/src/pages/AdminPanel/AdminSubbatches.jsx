// Admin: every subbatch of one batch (/admin/batches/:sectionId/subbatches), e.g. 3C23 inside 3C2.
import { useMemo } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Layers } from "lucide-react";
import { useAdminData } from "../../context/AdminDataContext";
import { AdminLoadState, AdminPageHeader, Card, Empty } from "../../components/admin/ui";
import { num, subbatchesOf } from "../../components/admin/format";

function AdminSubbatches() {
  const { sectionId } = useParams();
  const navigate = useNavigate();
  const { sections, students, classrooms, loadedAt } = useAdminData();
  const batch = sections.find((s) => s.id === Number(sectionId));
  const rows = useMemo(
    () =>
      batch
        ? subbatchesOf(batch, sections)
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }))
            .map((s) => ({
              ...s,
              students: students.filter((x) => x.section_id === s.id).length,
              classes: classrooms.filter((c) => c.section === s.name).length,
            }))
        : [],
    [batch, sections, students, classrooms]
  );

  if (loadedAt && !batch) return <Navigate to="/admin/batches" replace />;

  return (
    <div className="adm-detail">
      <Link to={`/admin/batches/${sectionId}/edit-details`} className="adm-back-link">
        <ArrowLeft size={15} aria-hidden="true" /> Back to {batch?.name ?? "batch"}
      </Link>
      <AdminPageHeader title={`Subbatches of ${batch?.name ?? ""}`} lead={`${num(rows.length)} subbatch${rows.length === 1 ? "" : "es"}`} refresh={false} />
      <AdminLoadState />
      <Card title="All subbatches" sub={`Groups inside ${batch?.name ?? "this batch"}. Click one to open it.`} delay={40}>
        {rows.length ? (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Subbatch</th>
                  <th>Degree programme</th>
                  <th className="adm-num">Students</th>
                  <th className="adm-num">Classes</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} className="adm-row-link" onClick={() => navigate(`/admin/batches/${s.id}/edit-details`)}>
                    <td>
                      <Link to={`/admin/batches/${s.id}/edit-details`} className="adm-rowname" onClick={(e) => e.stopPropagation()}>{s.name}</Link>
                    </td>
                    <td>{s.degree_programme || "—"}</td>
                    <td className="adm-num">{num(s.students)}</td>
                    <td className="adm-num">{num(s.classes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon={Layers} title="No subbatches">Batches whose name continues this one (like 3C23 for 3C2) appear here.</Empty>
        )}
      </Card>
    </div>
  );
}

export default AdminSubbatches;
