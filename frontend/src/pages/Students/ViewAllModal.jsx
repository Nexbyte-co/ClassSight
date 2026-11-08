// src/pages/Students/ViewAllModal.jsx — every student in one band (the page's Subject / Batch filters apply)
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownToLine, X } from "lucide-react";
import { useDialogA11y } from "../../hooks/useDialogA11y";
import { BAND_ICON } from "./bandIcons";
import {
  BAND_LABEL,
  BAND_ORDER,
  SEMESTER_END,
  SEMESTER_START,
  bandOf,
  bandRange,
  downloadStudentsCsv,
  initials,
  labsToReach,
  shortDate,
} from "./studentsMock";

const SORTS = {
  lo: (a, b) => a.pct - b.pct,
  hi: (a, b) => b.pct - a.pct,
  az: (a, b) => a.name.localeCompare(b.name),
  roll: (a, b) => a.roll.localeCompare(b.roll),
};

export default function ViewAllModal({ band: initialBand, students, thr, context, onClose, onPick }) {
  const [band, setBand] = useState(initialBand);
  const [sort, setSort] = useState("lo");
  const dialogRef = useDialogA11y(true, onClose);
  // Start on the first control (Export CSV), as in the design, rather than the hook's default (the Sort select)
  const firstRef = useRef(null);
  useEffect(() => firstRef.current?.focus(), []);

  const counts = useMemo(() => {
    const c = { er: 0, wa: 0, ok: 0 };
    students.forEach((r) => (c[bandOf(r.pct, thr)] += 1));
    return c;
  }, [students, thr]);
  const list = useMemo(
    () => students.filter((r) => bandOf(r.pct, thr) === band).sort(SORTS[sort]),
    [students, thr, band, sort]
  );

  const Icon = BAND_ICON[band];
  const n = list.length;
  return (
    <div className="st-mdl" onClick={onClose}>
      <div
        className="st-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="st-va-title"
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`st-vah ${band}`}>
          <span className="vi" style={{ color: `var(--st-${band})` }}>
            <Icon size={22} strokeWidth={2} aria-hidden="true" />
          </span>
          <div style={{ minWidth: 0 }}>
            <h3 id="st-va-title" style={{ color: `var(--st-${band})` }}>
              {BAND_LABEL[band]} · {n} student{n === 1 ? "" : "s"}
            </h3>
            <p>
              {context} · {bandRange(band, thr).toLowerCase()} · {shortDate(SEMESTER_START)} – {shortDate(SEMESTER_END)}
            </p>
          </div>
          <button type="button" className="st-exp" ref={firstRef} onClick={() => downloadStudentsCsv(list, thr, band)}>
            <ArrowDownToLine size={15} strokeWidth={2} aria-hidden="true" />
            Export CSV
          </button>
          <button type="button" className="st-mx" aria-label="Close" onClick={onClose}>
            <X size={16} strokeWidth={2.4} aria-hidden="true" />
          </button>
        </div>

        <div className="st-vat">
          <div className="st-vseg" role="group" aria-label="Status">
            {BAND_ORDER.map((k) => (
              <button key={k} type="button" className={k === band ? "on" : ""} aria-pressed={k === band} onClick={() => setBand(k)}>
                {BAND_LABEL[k]} {counts[k]}
              </button>
            ))}
          </div>
          <select className="st-bsel" aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="lo">Lowest first</option>
            <option value="hi">Highest first</option>
            <option value="az">Name A–Z</option>
            <option value="roll">Roll number</option>
          </select>
        </div>

        {/* Header and rows share one scroll box so they stay aligned when the table scrolls sideways */}
        <div className="st-vbody">
          <div className="st-vgrid st-vhd" aria-hidden="true">
            <span>Student</span>
            <span>Batch</span>
            <span>Labs</span>
            <span>Attendance</span>
            <span>Last seen</span>
            <span>To reach {thr}%</span>
          </div>
          {n ? (
            list.map((r) => {
              const b = bandOf(r.pct, thr);
              const need = labsToReach(r, thr);
              return (
                <button key={r.key} type="button" className="st-vrow st-vgrid" onClick={() => onPick(r.key)}>
                  <div className="st-anm">
                    <span className="st-av" aria-hidden="true">
                      {initials(r.name)}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <b>{r.name}</b>
                      <i>{r.roll}</i>
                    </div>
                  </div>
                  <span className="st-chip">{r.batch}</span>
                  <span className="st-num">
                    {r.a} / {r.h}
                  </span>
                  <div className="st-gbar">
                    <span>
                      <i style={{ width: `${r.pct}%`, background: `var(--st-${b}f)` }} />
                    </span>
                    <b style={{ color: `var(--st-${b})` }}>{r.pct}%</b>
                  </div>
                  <span className="st-tla">{r.last ? shortDate(r.last) : "—"}</span>
                  <span className="st-vrec" style={{ color: need ? `var(--st-${b})` : "var(--st-ok)" }}>
                    {need ? `Next ${need} lab${need > 1 ? "s" : ""} in a row` : "On track"}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="st-aempty">
              <b>No students in this band</b>
              Try another status.
            </div>
          )}
        </div>

        <div className="st-vft">
          <span>{n ? "Click a student to open them in the Students page" : ""}</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
}
