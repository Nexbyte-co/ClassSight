// src/pages/AttendanceSession/AbsentLane.jsx — students confirmed not in class (Undo asks first)
import { CircleMinus } from "lucide-react";
import { initials } from "../Students/studentsMock";

export default function AbsentLane({ rows, saved, onUndo }) {
  return (
    <section className="as-lane lne db-rise" aria-label="Absent">
      <header>
        <span className="li">
          <CircleMinus size={16} strokeWidth={2} aria-hidden="true" />
        </span>
        <div>
          <h4>Absent</h4>
          <p>Confirmed not in class</p>
        </div>
        <span className="lc">{rows.length}</span>
      </header>
      <div className="as-ll">
        {rows.length ? (
          rows.map((r) => (
            <div key={r.j} className="as-ac2">
              <span className="as-av" aria-hidden="true">
                {initials(r.name)}
              </span>
              <span className="as-stn">
                <b>{r.name}</b>
                <i>{r.roll}</i>
              </span>
              {!saved && (
                <button type="button" className="as-undo" onClick={(e) => onUndo(r.j, e.currentTarget)}>
                  Undo
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="as-lempty">
            <b>No absentees</b>
            Students you mark absent show here.
          </div>
        )}
      </div>
    </section>
  );
}
