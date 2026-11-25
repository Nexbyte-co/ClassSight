// Read-only pop-up with a batch's details: degree programme, students, classes, sessions and subbatches.
import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { BookOpen, GraduationCap, Layers, Pencil, X } from "lucide-react";
import { useAdminData } from "../../context/AdminDataContext";
import { num, subbatchesOf } from "./format";

function BatchDetailsModal({ batchId, onClose }) {
  const { sections, classrooms, sessionsByClass } = useAdminData();
  const batch = sections.find((s) => s.id === batchId);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const classes = useMemo(() => (batch ? classrooms.filter((c) => c.section === batch.name) : []), [classrooms, batch]);
  const sessions = classes.reduce((n, c) => n + (sessionsByClass[c.id] ?? 0), 0);
  const subbatches = useMemo(() => (batch ? subbatchesOf(batch, sections) : []), [batch, sections]);
  if (!batch) return null;

  const tiles = [
    { Icon: GraduationCap, label: "Students", value: batch.student_count },
    { Icon: BookOpen, label: "Classes", value: classes.length },
    { Icon: BookOpen, label: "Sessions", value: sessions },
    { Icon: Layers, label: "Subbatches", value: subbatches.length },
  ];

  return createPortal(
    <div className="adm-modal-back adm-sd-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-bd" role="dialog" aria-modal="true" aria-labelledby="bd-title">
        <button type="button" className="adm-sd-close" aria-label="Close" onClick={onClose}>
          <X size={20} aria-hidden="true" />
        </button>
        <header className="adm-sd-head">
          <h2 id="bd-title">{batch.name}</h2>
          {batch.start_year && <b className="adm-sd-code">{batch.start_year}–{batch.end_year}</b>}
        </header>
        <div className="adm-bd-prog">
          <GraduationCap size={18} aria-hidden="true" />
          <div>
            <span className="adm-bd-label">Degree programme</span>
            <b>{batch.degree_programme || "Not set"}</b>
          </div>
        </div>
        <ul className="adm-bd-tiles">
          {tiles.map(({ Icon, label, value }) => (
            <li key={label}>
              <Icon size={18} aria-hidden="true" />
              <b>{num(value)}</b>
              <span>{label}</span>
            </li>
          ))}
        </ul>
        <footer className="adm-sd-foot">
          <Link to={`/admin/batches/${batch.id}/edit-details`} className="db-btn adm-primary">
            <Pencil size={15} aria-hidden="true" /> Edit details
          </Link>
        </footer>
      </div>
    </div>,
    document.querySelector(".admin-ui") || document.body
  );
}

export default BatchDetailsModal;
