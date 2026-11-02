// src/pages/Students/StudentAttendance.jsx
// Attendance: overall summary, course-wise breakdown with a "classes to attend" calculation,
// a month calendar and the chronological history. Selecting a calendar day filters the history.
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import "./StudentPages.css";
import { useStudentModel } from "../../context/students/useStudentModel";
import { classesCanMiss } from "../../context/students/studentOverview";
import { STATUS } from "../../context/students/studentWeek";
import { AttendanceBar, LevelPill, StatusPill } from "./studentUi";
import { LEVEL_TONE, STATUS_LABEL, formatClock, useCourseColor } from "./studentUiHelpers";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const keyOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parseKey = (k) => new Date(...k.split("-").map((n, i) => (i === 1 ? n - 1 : +n)));

/** What the student has to do to reach, or stay above, the requirement. */
function targetText(present, decided, threshold, needed) {
  if (decided === 0) return "No classes held yet.";
  if (present / decided >= threshold / 100) {
    const can = classesCanMiss(present, decided, threshold);
    return can > 0 ? `Can miss ${can} more class${can === 1 ? "" : "es"} and stay at ${threshold}%.` : `At ${threshold}%: don't miss the next class.`;
  }
  return Number.isFinite(needed)
    ? `Attend the next ${needed} class${needed === 1 ? "" : "es"} in a row to reach ${threshold}%.`
    : `Below ${threshold}%.`;
}

function neededFor(present, decided, threshold) {
  const t = threshold / 100;
  if (decided <= 0 || present / decided >= t) return 0;
  return t >= 1 ? Infinity : Math.ceil((t * decided - present) / (1 - t));
}

function Calendar({ m, month, setMonth, byDate, picked, onPick }) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay());
  const cells = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  const rows = cells.slice(35).every((d) => d.getMonth() !== month.getMonth()) ? 5 : 6;
  return (
    <section className="sp-card at-cal" aria-label="Attendance calendar">
      <header className="sp-ch">
        <h2>{month.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</h2>
        <span className="sp-tools">
          <button type="button" className="sp-chip icon" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
            <ChevronLeft size={16} strokeWidth={2.2} />
          </button>
          <button type="button" className="sp-chip icon" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
            <ChevronRight size={16} strokeWidth={2.2} />
          </button>
        </span>
      </header>
      <div className="cal">
        {WEEKDAYS.map((d) => <span key={d} className="cal-h" aria-hidden="true">{d}</span>)}
        {cells.slice(0, rows * 7).map((d) => {
          const k = keyOf(d);
          const items = byDate.get(k) ?? [];
          const out = d.getMonth() !== month.getMonth();
          return (
            <button
              key={k}
              type="button"
              className={`cal-d ${out ? "out" : ""} ${k === m.todayKey ? "today" : ""} ${picked === k ? "sel" : ""}`}
              aria-pressed={picked === k}
              aria-label={`${d.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}, ${items.length ? items.map((o) => `${o.subject} ${STATUS_LABEL[o.status]}`).join(", ") : "no classes"}`}
              disabled={items.length === 0}
              onClick={() => onPick(picked === k ? null : k)}
            >
              <span>{d.getDate()}</span>
              <i>
                {items.map((o) => <b key={o.key} className={`s-${o.status}`} />)}
              </i>
            </button>
          );
        })}
      </div>
      <p className="sp-legend">
        <span><i className="s-present" />Present</span>
        <span><i className="s-absent" />Absent</span>
        <span><i className="s-unverified" />Unverified</span>
        <span><i className="s-upcoming" />Upcoming</span>
      </p>
    </section>
  );
}

export default function StudentAttendance() {
  const m = useStudentModel();
  const colorFor = useCourseColor(m.courses);
  const [month, setMonth] = useState(() => new Date(m.now.getFullYear(), m.now.getMonth(), 1));
  const [picked, setPicked] = useState(null);
  const [course, setCourse] = useState("all");

  const byDate = useMemo(() => {
    const map = new Map();
    m.occurrences.forEach((o) => map.set(o.dateKey, [...(map.get(o.dateKey) ?? []), o]));
    map.forEach((list) => list.sort((a, b) => a.startMinutes - b.startMinutes));
    return map;
  }, [m.occurrences]);

  const history = m.occurrences
    .filter((o) => o.status !== STATUS.upcoming && (course === "all" || o.code === course) && (!picked || o.dateKey === picked))
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey) || b.startMinutes - a.startMinutes);

  const o = m.overall;
  const tiles = [
    { k: "Overall", v: o.pct === null ? "—" : `${o.pct}%`, s: o.pct === null ? "" : o.pct >= m.threshold ? `Meets ${m.threshold}%` : `Below ${m.threshold}%`, tone: o.pct !== null && o.pct < m.threshold ? "warn" : "" },
    { k: "Attended", v: o.present, s: `of ${o.held} held` },
    { k: "Missed", v: o.absent, s: "counted as absent" },
    { k: "Pending review", v: o.unverified, s: "not counted as absent" },
  ];

  return (
    <div className="sp-page sp-att">
      <header className="sp-hd">
        <div>
          <h1>Attendance</h1>
          <p>
            {targetText(o.present, o.decided, m.threshold, neededFor(o.present, o.decided, m.threshold))}
            {m.usingDemo ? " (sample data)" : ""}
          </p>
        </div>
      </header>

      <div className="at-layout">
        <div className="at-col">
          <div className="at-tiles">
            {tiles.map((t) => (
              <section key={t.k} className="sp-kpi">
                <span className="sp-k">{t.k}</span>
                <b className={`sp-n ${t.tone}`}>{t.v}</b>
                <span className="sp-s">{t.s}</span>
              </section>
            ))}
          </div>

          <section className="sp-card at-break" aria-labelledby="at-courses">
            <header className="sp-ch">
              <h2 id="at-courses">Course-wise attendance</h2>
              <span className="sp-sub">{m.threshold}% required</span>
            </header>
            <ul className="sp-rows sp-scroll">
              {m.rows.map((r) => {
                const tone = r.status ? LEVEL_TONE[r.status.level] : "none";
                return (
                  <li key={r.code} className="sp-row stack" style={{ "--c": colorFor(r.code) }}>
                    <span className="sp-line">
                      <b>{r.name}</b>
                      <LevelPill row={r} />
                    </span>
                    <span className="sp-line">
                      <AttendanceBar pct={r.pct} threshold={m.threshold} tone={tone} />
                      <span className="sp-pct">{r.pct === null ? "—" : `${r.pct}%`}</span>
                    </span>
                    <span className="sp-sub">{r.present} attended · {r.absent} missed{r.unverified ? ` · ${r.unverified} pending review` : ""}</span>
                    <span className={`at-need ${tone}`}>{targetText(r.present, r.decided, m.threshold, neededFor(r.present, r.decided, m.threshold))}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <div className="at-col">
          <Calendar m={m} month={month} setMonth={setMonth} byDate={byDate} picked={picked} onPick={setPicked} />

          <section className="sp-card at-hist" aria-labelledby="at-history">
            <header className="sp-ch">
              <h2 id="at-history">History</h2>
              <span className="sp-tools">
                {picked && (
                  <button type="button" className="sp-chip" onClick={() => setPicked(null)}>
                    {parseKey(picked).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}<X size={13} strokeWidth={2.4} />
                  </button>
                )}
                <select className="sp-select" value={course} onChange={(e) => setCourse(e.target.value)} aria-label="Filter history by course">
                  <option value="all">All courses</option>
                  {m.courses.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </span>
            </header>
            {history.length === 0 ? (
              <p className="sp-empty">No classes match.</p>
            ) : (
              <ul className="sp-rows sp-scroll">
                {history.map((h) => (
                  <li key={h.key} className="sp-row" style={{ "--c": colorFor(h.code) }}>
                    <span className="sp-day">
                      <b>{parseKey(h.dateKey).getDate()}</b>
                      <small>{parseKey(h.dateKey).toLocaleDateString("en-GB", { month: "short" })}</small>
                    </span>
                    <span className="sp-grow">
                      <b>{h.subject}</b>
                      <span className="sp-sub">
                        {formatClock(h.startMinutes)} · {h.room}
                        {h.method ? ` · Verified by ${h.method}` : h.source === "demo" ? " · method not recorded (sample)" : ""}
                      </span>
                      {h.review && <span className="at-review">{h.review}</span>}
                    </span>
                    <StatusPill status={h.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
