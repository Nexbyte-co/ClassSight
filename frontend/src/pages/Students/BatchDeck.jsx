// src/pages/Students/BatchDeck.jsx — average ring, Subject / Batch pickers, band mix and counts,
// and the last lab (one batch) or the weakest batch (several batches)
import { ArrowDown, ArrowUp, ChevronRight, Users } from "lucide-react";
import AttendanceRing from "../../components/attendance/AttendanceRing";
import {
  BAND_LABEL,
  BAND_ORDER,
  BATCHES,
  SUBJECTS,
  bandOf,
  bandRangeShort,
  dayLabel,
} from "./studentsMock";

export default function BatchDeck({
  thr,
  avg,
  delta,
  meta,
  subject,
  batch,
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
  const batchOptions = BATCHES.filter((b) => subject === "all" || b.courseIndex === +subject);
  return (
    <section className="st-card st-bdeck" aria-label="Batch overview">
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
          <label className="st-fld">
            <span className="st-k2">Subject</span>
            <select className="st-bsel" value={subject} onChange={(e) => onSubject(e.target.value)}>
              <option value="all">All subjects</option>
              {SUBJECTS.map((s, i) => (
                <option key={s.code} value={String(i)}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="st-fld">
            <span className="st-k2">Batch</span>
            <select className="st-bsel" value={batch} onChange={(e) => onBatch(e.target.value)}>
              <option value="all">All batches</option>
              {batchOptions.map((b) => (
                <option key={b.index} value={String(b.index)}>
                  {b.group}
                </option>
              ))}
            </select>
          </label>
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
              <span>Last lab</span>
              <b>{dayLabel(last.date)}</b>
              <span className="st-spill ok">{last.present} present</span>
              <span className="st-spill er">{last.absent} absent</span>
              <button type="button" className="st-lnk" onClick={onOpenRecord}>
                Open record
                <ChevronRight size={14} strokeWidth={2.4} aria-hidden="true" />
              </button>
            </>
          ) : (
            weakest && (
              <>
                <span>Weakest batch</span>
                <b>{weakest.group}</b>
                <span className={`st-spill ${bandOf(weakest.avg, thr)}`}>{weakest.avg}% avg</span>
                <button type="button" className="st-lnk" onClick={() => onShowBatch(weakest.index)}>
                  Show batch
                  <ChevronRight size={14} strokeWidth={2.4} aria-hidden="true" />
                </button>
              </>
            )
          )}
        </div>
      </div>
    </section>
  );
}
