// Pop-up listing every teacher of one department, with a search box. Scrolls when there are many.
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";
import { useAdminData } from "../../context/AdminDataContext";
import { num } from "./format";

const initials = (name) => {
  const w = name.split(/\s+/).filter(Boolean);
  return w.length ? (w[0][0] + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase() : "?";
};

function DepartmentTeachersModal({ department, onClose, onOpenTeacher }) {
  const { teachers, classrooms } = useAdminData();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const mine = useMemo(() => teachers.filter((t) => t.department === department).sort((a, b) => a.name.localeCompare(b.name)), [teachers, department]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? mine.filter((t) => t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q)) : mine;
  }, [mine, query]);
  const classCount = (id) => classrooms.filter((c) => c.teacher_id === id).length;

  return createPortal(
    <div className="adm-modal-back adm-sd-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-dtm" role="dialog" aria-modal="true" aria-labelledby="dtm-title">
        <button type="button" className="adm-sd-close" aria-label="Close" onClick={onClose}>
          <X size={20} aria-hidden="true" />
        </button>
        <header className="adm-dtm-hd">
          <h2 id="dtm-title">{department}</h2>
          <p>{num(mine.length)} teacher{mine.length === 1 ? "" : "s"}</p>
        </header>
        {mine.length > 0 && (
          <label className="adm-dtm-search">
            <Search size={14} aria-hidden="true" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or email" aria-label="Search teachers" />
          </label>
        )}
        <ul className="adm-dtm-list">
          {shown.map((t) => (
            <li key={t.id}>
              <button type="button" className="adm-dtm-row" onClick={() => onOpenTeacher(t.id)}>
                <span className="adm-avatar" aria-hidden="true">{initials(t.name)}</span>
                <span className="adm-dtm-main">
                  <b>{t.name}</b>
                  <span className="db-sm">{[t.designation, t.email].filter(Boolean).join(" · ")}</span>
                </span>
                <span className="adm-dtm-n">{num(classCount(t.id))} class{classCount(t.id) === 1 ? "" : "es"}</span>
              </button>
            </li>
          ))}
          {!shown.length && <li className="adm-dtm-empty">{mine.length ? "No teacher matches that search." : "No teacher belongs to this department yet."}</li>}
        </ul>
      </div>
    </div>,
    document.querySelector(".admin-ui") || document.body
  );
}

export default DepartmentTeachersModal;
