// src/pages/Students/StatusLane.jsx — Critical / Warning / Good column, lowest % first
import { Maximize2 } from "lucide-react";
import StudentCard from "./StudentCard";
import { BAND_ICON } from "./bandIcons";
import { BAND_LABEL, bandRange } from "./studentsMock";

// Cards visible before the list scrolls (the footer counts against this)
const VISIBLE = 5;

export default function StatusLane({ band, students, thr, selectedKey, onSelect, onViewAll }) {
  const Icon = BAND_ICON[band];
  const n = students.length;
  return (
    <section className={`st-lane l${band}`} aria-label={`${BAND_LABEL[band]} students`}>
      <header>
        <span className="li">
          <Icon size={16} strokeWidth={2} aria-hidden="true" />
        </span>
        <div>
          <h4>{BAND_LABEL[band]}</h4>
          <p>{bandRange(band, thr)}</p>
        </div>
        <span className="lc">{n}</span>
      </header>
      <div className="st-ll">
        {n ? (
          students.map((s) => (
            <StudentCard key={s.key} student={s} band={band} selected={s.key === selectedKey} onSelect={onSelect} />
          ))
        ) : (
          <div className="st-lempty">
            <b>No students here</b>
            {band === "ok" ? "Nobody is above the line yet." : "Nobody in this band right now."}
          </div>
        )}
      </div>
      <footer>
        <span>
          Showing {Math.min(VISIBLE, n)} of {n}
        </span>
        <button type="button" className="st-lv" disabled={!n} onClick={() => onViewAll(band)}>
          View all
          <Maximize2 size={13} strokeWidth={2} aria-hidden="true" />
        </button>
      </footer>
    </section>
  );
}
