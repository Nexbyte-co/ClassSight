import { Icon } from "./icons";
import { SEMESTER_START, SEMESTER_END, formatRange } from "./reportsMock";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// Month grid (always 6 rows). First click sets the range start, second click the end.
function MonthCalendar({ month, onMonthChange, from, to, anchor, onPick, onReset }) {
  const y = month.getFullYear();
  const m = month.getMonth();
  const first = new Date(y, m, 1);
  const lead = first.getDay();
  const today = new Date().setHours(0, 0, 0, 0);
  const minM = new Date(SEMESTER_START);
  const maxM = new Date(SEMESTER_END);
  const atMin = y === minM.getFullYear() && m === minM.getMonth();
  const atMax = y === maxM.getFullYear() && m === maxM.getMonth();
  const full = from === SEMESTER_START && to === SEMESTER_END;

  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(y, m, 1 - lead + i);
    const t = d.getTime();
    const outside = d.getMonth() !== m;
    const disabled = t < SEMESTER_START || t > SEMESTER_END;
    const inRange = t >= from && t <= to && !disabled && !outside;
    const cls = [
      outside && "o",
      inRange && (t === from || t === to ? "ed" : "in"),
      t === today && "td",
    ]
      .filter(Boolean)
      .join(" ");
    return { d, t, cls, disabled };
  });

  return (
    <section className="rp-card rp-cal" aria-label="Date range">
      <div className="rp-mh">
        <button type="button" className="rp-nv" aria-label="Previous month" disabled={atMin} onClick={() => onMonthChange(new Date(y, m - 1, 1))}>
          <Icon name="left" size={22} strokeWidth={2.4} />
        </button>
        <div className="rp-mt">{first.toLocaleDateString("en-GB", { month: "long" })} {y}</div>
        <button type="button" className="rp-nv" aria-label="Next month" disabled={atMax} onClick={() => onMonthChange(new Date(y, m + 1, 1))}>
          <Icon name="right" size={22} strokeWidth={2.4} />
        </button>
      </div>
      <div className="rp-cg">
        {WEEKDAYS.map((w) => <i key={w}>{w}</i>)}
        {cells.map(({ d, t, cls, disabled }) => (
          <button
            type="button"
            key={t}
            className={cls}
            disabled={disabled}
            aria-label={d.toDateString()}
            aria-pressed={cls.includes("ed") || cls.includes("in")}
            onClick={() => onPick(t)}
          >
            {d.getDate()}
          </button>
        ))}
      </div>
      <div className="rp-cft">
        <span>{anchor !== null ? "Pick an end date" : full ? "Full semester" : formatRange(from, to)}</span>
        {!(full && anchor === null) && (
          <button type="button" onClick={onReset}>Full semester</button>
        )}
      </div>
    </section>
  );
}

export default MonthCalendar;
