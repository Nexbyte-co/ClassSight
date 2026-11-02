// src/pages/AttendanceSession/ReviewLane.jsx — students the group photo couldn't match.
// Click (or Enter / Space) a row to load it into the Resolve card.
import { CircleAlert } from "lucide-react";
import { initials } from "../Students/studentsMock";

export default function ReviewLane({ rows, focus, resolved, total, onSelect }) {
  const key = (e, j) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(j);
    }
  };
  return (
    <section className="as-lane lwa db-rise" aria-label="Needs review">
      <header>
        <span className="li">
          <CircleAlert size={16} strokeWidth={2} aria-hidden="true" />
        </span>
        <div>
          <h4>Needs review</h4>
          <p>The photo couldn’t match them</p>
        </div>
        <span className="lc">{rows.length}</span>
      </header>
      <div
        className="as-nrbar"
        role="progressbar"
        aria-label="Students resolved"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={resolved}
      >
        <i style={{ width: `${(resolved / total) * 100}%` }} />
        <span>
          {resolved} of {total} resolved
        </span>
      </div>
      <div className="as-ll">
        {rows.length ? (
          rows.map((r) => (
            <div
              key={r.j}
              className={`as-ac2 as-rv2c ${r.j === focus ? "on" : ""}`}
              role="button"
              tabIndex={0}
              aria-pressed={r.j === focus}
              aria-label={`Review ${r.name}`}
              onClick={() => onSelect(r.j)}
              onKeyDown={(e) => key(e, r.j)}
            >
              <span className="as-av" aria-hidden="true">
                {initials(r.name)}
              </span>
              <span className="as-stn">
                <b>{r.name}</b>
                <i>
                  {r.roll} · {r.why}
                </i>
              </span>
            </div>
          ))
        ) : (
          <div className="as-lempty">
            <b>Nothing left to review</b>
            Everyone was matched or confirmed.
          </div>
        )}
      </div>
    </section>
  );
}
