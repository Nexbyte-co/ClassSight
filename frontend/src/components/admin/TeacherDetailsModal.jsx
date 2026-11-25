// Read-only pop-up with a teacher's details: name, email, department and the classes they teach.
import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { BookOpen, Building2, CalendarDays, ChevronRight, Mail, Pencil, X } from "lucide-react";
import { useAdminData } from "../../context/AdminDataContext";
import { num } from "./format";

const initials = (name) => {
  const w = name.split(/\s+/).filter(Boolean);
  if (!w.length) return "?";
  return (w[0][0] + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase();
};

function TeacherDetailsModal({ teacherId, onClose }) {
  const { teachers, classrooms } = useAdminData();
  const teacher = teachers.find((t) => t.id === teacherId);
  const classes = useMemo(() => classrooms.filter((c) => c.teacher_id === teacherId), [classrooms, teacherId]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!teacher) return null;
  return createPortal(
    <div className="adm-modal-back adm-sd-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-tp" role="dialog" aria-modal="true" aria-labelledby="tch-title">
        <button type="button" className="adm-sd-close" aria-label="Close" onClick={onClose}>
          <X size={20} aria-hidden="true" />
        </button>
        <header className="adm-tp-head">
          <span className="adm-tp-avatar" aria-hidden="true">{initials(teacher.name)}</span>
          <div className="adm-tp-id">
            <h2 id="tch-title">{teacher.name}</h2>
            {teacher.designation && <span className="adm-tp-badge">{teacher.designation}</span>}
            <a className="adm-tp-mail adm-mono" href={`mailto:${teacher.email}`}>
              <Mail size={14} aria-hidden="true" /> {teacher.email}
            </a>
          </div>
        </header>
        <div className="adm-tp-facts">
          <div>
            <dt><Building2 size={14} aria-hidden="true" /> Department</dt>
            <dd>{teacher.department || "—"}</dd>
          </div>
          <div>
            <dt><BookOpen size={14} aria-hidden="true" /> Classes</dt>
            <dd>{num(classes.length)}</dd>
          </div>
        </div>
        <Link to={`/admin/teachers/${teacher.id}/schedule`} className="adm-tp-sched" onClick={onClose}>
          <CalendarDays size={18} aria-hidden="true" />
          <span>
            <b>View and edit schedule</b>
            <small>{classes.length ? `${num(classes.length)} class${classes.length === 1 ? "" : "es"} · drag to rearrange the weekly timetable` : "No classes yet"}</small>
          </span>
          <ChevronRight size={18} aria-hidden="true" />
        </Link>
        <footer className="adm-sd-foot">
          <Link to={`/admin/teachers/${teacher.id}/edit-details`} className="db-btn adm-primary">
            <Pencil size={15} aria-hidden="true" /> Edit details
          </Link>
        </footer>
      </div>
    </div>,
    document.querySelector(".admin-ui") || document.body
  );
}

export default TeacherDetailsModal;
