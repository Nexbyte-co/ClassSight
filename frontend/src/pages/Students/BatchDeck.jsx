// src/pages/Students/BatchDeck.jsx — average ring, Subject / Class pickers, band mix and counts,
// and the last session (one class) or the weakest class (several classes)
import { ArrowDown, ArrowUp, ChevronRight, Users } from "lucide-react";
import AttendanceRing from "../../components/attendance/AttendanceRing";
import { BAND_LABEL, BAND_ORDER, bandOf, bandRangeShort, dayLabel } from "./studentData";
import Dropdown from "../Classes/Dropdown";

export default function BatchDeck({
  thr,
  avg,
  delta,
  meta,
  subject,
  batch,
  subjects,
  batches,
  allActive,
  counts,
  total,
  last,
  weakest,
  onSubject,
  onBatch,
  onAll,
  onOpenRecord,
  onShowBatch,
}) {
  const batchOptions = batches.filter((b) => subject === "all" || b.courseKey === subject);
  return (
    <section className="st-card st-bdeck" aria-label="Class overview">
      <div className="st-bring">
        <AttendanceRing className="st-avg-ring" pct={avg} size={128} stroke={11} fontSize={28} label="AVG" color={`var(--st-${bandOf(avg, thr)}f)`} />
        {delta != null && (
          <span className={`st-spill ${delta >= 0 ? "ok" : "er"}`}>
            {delta >= 0 ? (
              <ArrowUp size={12} strokeWidth={2.4} aria-hidden="true" />
            ) : (
              <ArrowDown size={12} strokeWidth={2.4} aria-hidden="true" />
            )}
            {Math.abs(delta)}% vs subject
          </span>
        )}
        <span className="st-bring-meta">{meta}</span>
      </div>

      <div className="st-bmain">
        <div className="st-bpick">
          <div className="st-fld">
            <span className="st-k2" aria-hidden="true">Subject</span>
            <Dropdown
              ariaLabel="Subject"
              value={subject}
              onChange={onSubject}
              options={[{ value: "all", label: "All subjects" }, ...subjects.map((s) => ({ value: s.key, label: s.name }))]}
            />
          </div>
          <div className="st-fld">
            <span className="st-k2" aria-hidden="true">Class</span>
            <Dropdown
              ariaLabel="Class"
              value={batch}
              onChange={onBatch}
              options={[
                { value: "all", label: "All classes" },
                ...batchOptions.map((b) => ({ value: String(b.index), label: `${b.group}${subject === "all" ? ` · ${b.code || b.name}` : ""}` })),
              ]}
            />
          </div>
          <button type="button" className={`st-allb ${allActive ? "on" : ""}`} aria-pressed={allActive} onClick={onAll}>
            <Users size={15} strokeWidth={2} aria-hidden="true" />
            All students
          </button>
        </div>

        <div className="st-mix" role="img" aria-label={`${counts.er} critical, ${counts.wa} warning, ${counts.ok} good`}>
          {total ? (
            BAND_ORDER.map((k) => (counts[k] ? <i key={k} style={{ flex: counts[k], background: `var(--st-${k}f)` }} /> : null))
          ) : (
            <i style={{ flex: 1, background: "var(--st-track)" }} />
          )}
        </div>

        <div className="st-cnts">
          {BAND_ORDER.map((k) => (
            <div key={k} className={`c${k}`}>
              <span>
                {BAND_LABEL[k]}
                <em>{bandRangeShort(k, thr)}</em>
              </span>
              <b>{counts[k]}</b>
            </div>
          ))}
        </div>

        <div className="st-blast">
          {last ? (
            <>
              <span>Last session</span>
              <b>{dayLabel(last.date)}</b>
              <span className="st-spill ok">{last.present} present</span>
              <span className="st-spill er">{last.absent} absent</span>
              <button type="button" className="st-lnk" onClick={onOpenRecord}>
                Take attendance
                <ChevronRight size={14} strokeWidth={2.4} aria-hidden="true" />
              </button>
            </>
          ) : weakest && weakest.group ? (
            <>
              <span>Weakest class</span>
              <b>{weakest.group}</b>
              <span className={`st-spill ${bandOf(weakest.avg, thr)}`}>{weakest.avg}% avg</span>
              <button type="button" className="st-lnk" onClick={() => onShowBatch(weakest.index)}>
                Show class
                <ChevronRight size={14} strokeWidth={2.4} aria-hidden="true" />
              </button>
            </>
          ) : (
            <>
              <span>Last session</span>
              <b>No attendance saved yet</b>
              {batch !== "all" && (
                <button type="button" className="st-lnk" onClick={onOpenRecord}>
                  Take attendance
                  <ChevronRight size={14} strokeWidth={2.4} aria-hidden="true" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
