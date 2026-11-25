// Read-only pop-up with a subject's details: its name and code, the degree programmes it is allotted to and the teachers handling it.
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Pencil, X } from "lucide-react";
import { useAdminData } from "../../context/AdminDataContext";
import { listDegreeProgrammeCodes } from "../../api/degreeProgrammes";
import { num, subjectKey, teacherName } from "./format";

function SubjectDetailsModal({ subject, onClose }) {
  const { classrooms, userById, sessionsByClass } = useAdminData();
  const rows = useMemo(() => classrooms.filter((c) => subjectKey(c) === subject), [classrooms, subject]);
  const first = rows[0];
  const [codes, setCodes] = useState({});

  useEffect(() => {
    let live = true;
    listDegreeProgrammeCodes().then((d) => live && setCodes(d)).catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const allotted = new Map(); // programme -> first year of the batch it is meant for
  rows.forEach((c) => (c.programmes ?? []).forEach((p) => !allotted.has(p.degree_programme) && allotted.set(p.degree_programme, p.start_year)));
  const programmes = [...allotted.keys()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  if (!first) return null;

  return createPortal(
    <div className="adm-modal-back adm-sd-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-sd" role="dialog" aria-modal="true" aria-labelledby="sd-title">
        <button type="button" className="adm-sd-close" aria-label="Close" onClick={onClose}>
          <X size={20} aria-hidden="true" />
        </button>
        <header className="adm-sd-head">
          <h2 id="sd-title">{first.course}</h2>
          {first.course_code && <b className="adm-sd-code adm-mono">{first.course_code}</b>}
        </header>

        <div className="adm-sd-cards">
          <section className="adm-sd-card" aria-labelledby="sd-prog">
            <div className="adm-sd-card-hd">
              <h3 id="sd-prog">Allotted to degree programmes</h3>
              <span className="db-sm">{num(programmes.length)}</span>
            </div>
            <ul className="adm-allot-list adm-sd-list">
              {programmes.map((p) => (
                <li key={p}>
                  <b className="adm-name-chip-sm">{codes[p] ?? p.replace(/ \(.*\)$/, "")}</b>
                  <span className="adm-allot-name">{p}</span>
                  {allotted.get(p) && <span className="db-sm">from {allotted.get(p)}</span>}
                </li>
              ))}
              {!programmes.length && <li className="db-sm adm-allot-empty">Not allotted to a degree programme yet.</li>}
            </ul>
          </section>

          <section className="adm-sd-card" aria-labelledby="sd-teach">
            <div className="adm-sd-card-hd">
              <h3 id="sd-teach">Teachers handling this course</h3>
              <span className="db-sm">{num(rows.length)} batch{rows.length === 1 ? "" : "es"}</span>
            </div>
            <ul className="adm-allot-list adm-sd-list">
              {rows.map((c) => (
                <li key={c.id}>
                  <b className="adm-name-chip-sm">{c.section ? `${c.section}${c.subbatch ? ` · ${c.subbatch}` : ""}` : "—"}</b>
                  <span className="adm-allot-name">{c.teacher_id == null ? <span className="adm-dim">No teacher yet</span> : teacherName(userById, c.teacher_id)}</span>
                  <span className="db-sm">{num(sessionsByClass[c.id] ?? 0)} sessions</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <footer className="adm-sd-foot">
          <Link to={`/admin/subjects/${encodeURIComponent(subject)}/edit-details`} className="db-btn adm-primary">
            <Pencil size={15} aria-hidden="true" /> Edit details
          </Link>
        </footer>
      </div>
    </div>,
    document.querySelector(".admin-ui") || document.body
  );
}

export default SubjectDetailsModal;
