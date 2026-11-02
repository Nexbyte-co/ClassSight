// src/pages/Students/StudentCard.jsx — one student in a status lane (click to load them into the student deck)
import AttendanceRing from "../../components/attendance/AttendanceRing";
import { initials } from "./studentsMock";

export default function StudentCard({ student, band, selected, onSelect }) {
  return (
    <button type="button" className={`st-sc ${selected ? "on" : ""}`} aria-pressed={selected} onClick={() => onSelect(student.key)}>
      <span className="st-av" aria-hidden="true">
        {initials(student.name)}
      </span>
      <span className="stn">
        <b>{student.name}</b>
        <i>
          {student.roll} · {student.batch}
        </i>
      </span>
      <AttendanceRing pct={student.pct} size={40} stroke={4} fontSize={10.5} color={`var(--st-${band}f)`} />
    </button>
  );
}
