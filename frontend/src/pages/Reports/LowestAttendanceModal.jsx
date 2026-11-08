// src/pages/Reports/LowestAttendanceModal.jsx — every student under 75% for the selected batch
// (or all batches) and date range, with search and sort. Opened from the Lowest attendance students card.
import { useEffect, useMemo, useRef, useState } from "react";
import { useDialogA11y } from "../../hooks/useDialogA11y";
import { Icon } from "./icons";
import { BATCHES, LOW_ATTENDANCE_PCT, formatRange } from "./reportsMock";

const SORTS = {
  lo: (a, b) => a.pct - b.pct || a.name.localeCompare(b.name),
  hi: (a, b) => b.pct - a.pct || a.name.localeCompare(b.name),
  az: (a, b) => a.name.localeCompare(b.name),
  roll: (a, b) => a.roll.localeCompare(b.roll),
};

/** Labs in a row needed to reach 75%: ceil((T·held − attended) / (1 − T)) */
const labsToReach = (s) => {
  const T = LOW_ATTENDANCE_PCT / 100;
  return Math.max(0, Math.ceil((T * s.h - s.a) / (1 - T) - 1e-9));
};

const initials = (name) =>
  name
    .split(" ")
    .map((x) => x[0])
    .join("");

export default function LowestAttendanceModal({ students, batchIndex, allMode, from, to, onExport, onClose }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("lo");
  const dialogRef = useDialogA11y(true, onClose);
  // Start in the search box
  const searchRef = useRef(null);
  useEffect(() => searchRef.current?.focus(), []);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students
      .filter((s) => !q || s.name.toLowerCase().includes(q) || s.roll.includes(q))
      .sort(SORTS[sort]);
  }, [students, query, sort]);

  const batch = BATCHES[batchIndex];
  const scope = allMode ? "All subjects · All batches" : `${batch.name} · ${batch.group}`;
  const q = query.trim();

  return (
    <div className="rp-mdl" onClick={onClose}>
      <div
        className="rp-va"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rp-va-title"
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rp-vah">
          <div style={{ minWidth: 0 }}>
            <h3 id="rp-va-title">
              Lowest attendance students · {students.length}
            </h3>
            <p>
              {scope} · below {LOW_ATTENDANCE_PCT}% · {formatRange(from, to)}
            </p>
          </div>
          <button type="button" className="rp-exp" onClick={() => onExport(list)}>
            <Icon name="download" size={15} />
            Export CSV
          </button>
          <button type="button" className="rp-mx" aria-label="Close" onClick={onClose}>
            <Icon name="close" size={16} strokeWidth={2.4} />
          </button>
        </div>

        <div className="rp-vat">
          <label className="rp-lsr">
            <Icon name="search" size={15} />
            <input
              ref={searchRef}
              type="search"
              placeholder="Search name or roll number"
              autoComplete="off"
              aria-label="Search students by name or roll number"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <select className="rp-vsel" aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="lo">Lowest first</option>
            <option value="hi">Highest first</option>
            <option value="az">Name A–Z</option>
            <option value="roll">Roll number</option>
          </select>
        </div>

        {/* Header and rows share one scroll box so they stay aligned when the table scrolls sideways */}
        <div className="rp-vbody">
          <div className="rp-vgrid rp-vhd" aria-hidden="true">
            <span>Student</span>
            <span>Batch</span>
            <span>Labs</span>
            <span>Attendance</span>
            <span>To reach {LOW_ATTENDANCE_PCT}%</span>
          </div>
          {list.length ? (
            list.map((s) => {
              const need = labsToReach(s);
              return (
                <div key={s.roll} className="rp-vgrid rp-vrow">
                  <div className="rp-vnm">
                    <span className="rp-av" aria-hidden="true">
                      {initials(s.name)}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <b>{s.name}</b>
                      <i>{s.roll}</i>
                    </div>
                  </div>
                  <span className="rp-vchip">{s.batch}</span>
                  <span className="rp-vnum">
                    {s.a} / {s.h}
                  </span>
                  <div className="rp-vbar">
                    <span>
                      <i className={s.pct < 50 ? "low" : "mid"} style={{ width: `${s.pct}%` }} />
                    </span>
                    <b>{s.pct}%</b>
                  </div>
                  <span className="rp-vrec">Next {need} lab{need > 1 ? "s" : ""} in a row</span>
                </div>
              );
            })
          ) : (
            <div className="rp-lempty">
              {q ? `No student matches "${q}".` : "No students with low attendance in this period."}
            </div>
          )}
        </div>

        <div className="rp-vft">
          <span>
            Showing {list.length} of {students.length}
          </span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
}
