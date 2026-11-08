// src/pages/Students/reports/ReportCalendar.jsx
// Month calendar for choosing the report's date range, laid out like the teacher Reports calendar:
// the first click sets the start, the second click the end. Days outside the term's recorded classes are disabled.
import { ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const keyOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const short = (k) => new Date(...k.split("-").map((n, i) => (i === 1 ? n - 1 : +n))).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export default function ReportCalendar({ month, onMonthChange, min, max, from, to, anchor, onPick, onReset, todayKey }) {
  const y = month.getFullYear();
  const m = month.getMonth();
  const first = new Date(y, m, 1);
  const atMin = min.slice(0, 7) >= keyOf(first).slice(0, 7);
  const atMax = max.slice(0, 7) <= keyOf(first).slice(0, 7);
  const full = from === min && to === max;

  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(y, m, 1 - first.getDay() + i);
    const k = keyOf(d);
    const outside = d.getMonth() !== m;
    const disabled = k < min || k > max;
    const inRange = k >= from && k <= to && !disabled && !outside;
    const cls = [outside && "o", inRange && (k === from || k === to ? "ed" : "in"), k === todayKey && "td"].filter(Boolean).join(" ");
    return { d, k, cls, disabled };
  });

  return (
    <section className="sp-card rp-cal" aria-label="Date range">
      <div className="rp-mh">
        <button type="button" className="rp-nv" aria-label="Previous month" disabled={atMin} onClick={() => onMonthChange(new Date(y, m - 1, 1))}>
          <ChevronLeft size={20} strokeWidth={2.4} />
        </button>
        <div className="rp-mt">{first.toLocaleDateString("en-GB", { month: "long" })} {y}</div>
        <button type="button" className="rp-nv" aria-label="Next month" disabled={atMax} onClick={() => onMonthChange(new Date(y, m + 1, 1))}>
          <ChevronRight size={20} strokeWidth={2.4} />
        </button>
      </div>
      <div className="rp-cg">
        {WEEKDAYS.map((w) => <i key={w}>{w}</i>)}
        {cells.map(({ d, k, cls, disabled }) => (
          <button type="button" key={k} className={cls} disabled={disabled} aria-label={d.toDateString()} aria-pressed={cls.includes("ed") || cls.includes("in")} onClick={() => onPick(k)}>
            {d.getDate()}
          </button>
        ))}
      </div>
      <div className="rp-cft">
        <span>{anchor !== null ? "Pick an end date" : full ? "Whole semester" : `${short(from)} – ${short(to)}`}</span>
        {!(full && anchor === null) && <button type="button" onClick={onReset}>Whole semester</button>}
      </div>
    </section>
  );
}
