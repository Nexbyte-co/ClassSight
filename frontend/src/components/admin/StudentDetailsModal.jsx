// Read-only pop-up with a student's details: photo on the left, name, roll number and batch on the right.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Pencil, User, X } from "lucide-react";
import { useAdminData } from "../../context/AdminDataContext";
import { getSectionStudent } from "../../api/sections";

function StudentDetailsModal({ studentId, onClose }) {
  const { students, sectionById } = useAdminData();
  const student = students.find((s) => s.id === studentId);
  const [photo, setPhoto] = useState(null);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const enrolled = Boolean(student?.face_enrolled);
  const sectionId = student?.section_id;
  useEffect(() => {
    let live = true;
    if (!enrolled) return undefined;
    getSectionStudent(sectionId, studentId)
      .then((p) => live && setPhoto(p.photos[0]?.url ?? null))
      .catch(() => live && setPhoto(null));
    return () => {
      live = false;
    };
  }, [enrolled, sectionId, studentId]);

  if (!student) return null;
  const batch = sectionById.get(student.section_id)?.name;

  return createPortal(
    <div className="adm-modal-back adm-sd-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-stu" role="dialog" aria-modal="true" aria-labelledby="stu-title">
        <button type="button" className="adm-sd-close" aria-label="Close" onClick={onClose}>
          <X size={20} aria-hidden="true" />
        </button>
        <div className="adm-stu-body">
          <div className="adm-stu-photo">{enrolled && photo ? <img src={photo} alt={`${student.name}`} /> : <User strokeWidth={1.4} aria-hidden="true" />}</div>
          <dl className="adm-stu-info">
            <div>
              <dt>Name</dt>
              <dd id="stu-title" className="adm-stu-name">{student.name}</dd>
            </div>
            <div>
              <dt>Roll number</dt>
              <dd className="adm-mono">{student.roll_number}</dd>
            </div>
            <div>
              <dt>Batch</dt>
              <dd>{batch ? `${batch}${student.subbatch ? ` · ${student.subbatch}` : ""}` : "No batch yet"}</dd>
            </div>
          </dl>
        </div>
        <footer className="adm-sd-foot">
          <Link to={`/admin/students/${student.id}/edit-details`} className="db-btn adm-primary">
            <Pencil size={15} aria-hidden="true" /> Edit details
          </Link>
        </footer>
      </div>
    </div>,
    document.querySelector(".admin-ui") || document.body
  );
}

export default StudentDetailsModal;
