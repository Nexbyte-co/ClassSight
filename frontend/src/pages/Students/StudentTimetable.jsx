// src/pages/Students/StudentTimetable.jsx
// Interactive weekly timetable: week navigation, day tabs, course filter and a detail panel per class.
// Past and current weeks use the student's records; future weeks show the weekly slots as upcoming.
import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, MousePointerClick } from "lucide-react";
import "./StudentPages.css";
import { useStudentModel } from "../../context/students/useStudentModel";
import { STUDENT_HISTORY_WEEKS, getWeekEntries, getWeekStart } from "../../context/students/studentCourses";
import { LevelPill, StatusPill } from "./studentUi";
import { formatClock, useCourseColor } from "./studentUiHelpers";

const FUTURE_WEEKS = 4;
const addDays = (date, n) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
const fmt = (date, opts) => date.toLocaleDateString("en-GB", opts);

function ClassButton({ entry, selected, color, onSelect }) {
  return (
    <button
      type="button"
      className={`tt-class ${selected ? "sel" : ""}`}
      style={{ "--c": color }}
      aria-pressed={selected}
      onClick={() => onSelect(entry.key)}
    >
      <span className="tt-time">
        {formatClock(entry.startMinutes)}–{formatClock(entry.endMinutes)}
      </span>
      <b>{entry.subject}</b>
      <span className="tt-meta"><MapPin size={12} strokeWidth={2} />{entry.room} · {entry.group}</span>
      {entry.live ? <StatusPill status="upcoming">In progress</StatusPill> : <StatusPill status={entry.status} />}
    </button>
  );
}

function Detail({ entry, m, color }) {
  const row = m.rows.find((r) => r.code === entry.code);
  return (
    <>
      <div className="sp-side-hd" style={{ "--c": color }}>
        <span className="sp-sub"><i className="sp-dot" />{entry.code} · {entry.group}</span>
        <h2>{entry.subject}</h2>
        <p>{fmt(new Date(...entry.dateKey.split("-").map((n, i) => (i === 1 ? n - 1 : +n))), { weekday: "long", day: "numeric", month: "long" })}</p>
      </div>
      <div className="sp-side-bd">
        <div className="sp-line">
          {entry.live ? <StatusPill status="upcoming">In progress</StatusPill> : <StatusPill status={entry.status} />}
          {entry.review && <span className="sp-sub">{entry.review}</span>}
          {entry.method && <span className="sp-sub">Marked via {entry.method}</span>}
        </div>
        <dl className="sp-facts">
          <div><dt>Time</dt><dd>{formatClock(entry.startMinutes)}–{formatClock(entry.endMinutes)}<small>{entry.endMinutes - entry.startMinutes} min {entry.course?.type?.toLowerCase()}</small></dd></div>
          <div><dt>Room</dt><dd>{entry.room}</dd></div>
          <div><dt>Instructor</dt><dd>{entry.instructor}</dd></div>
          <div><dt>Batch</dt><dd>{entry.group}<small>{entry.course?.year}</small></dd></div>
        </dl>
        {row && (
          <div className="sp-mini">
            <span className="sp-k">This course</span>
            <span className="sp-line">
              <b>{row.pct === null ? "—" : `${row.pct}%`} <small>{row.present} of {row.decided} attended</small></b>
              <LevelPill row={row} />
            </span>
          </div>
        )}
        <Link to="/student/courses" state={{ code: entry.code }} className="sp-btn">Open course details</Link>
      </div>
    </>
  );
}

export default function StudentTimetable() {
  const m = useStudentModel();
  const colorFor = useCourseColor(m.courses);
  const [offset, setOffset] = useState(0);
  const [course, setCourse] = useState("all");
  const [day, setDay] = useState("week");
  const [selectedKey, setSelectedKey] = useState(null);

  const weekStart = addDays(getWeekStart(m.now), offset * 7);
  const days = getWeekEntries(m, weekStart);
  // Sunday only appears when it has classes
  const shown = days
    .map((d, i) => ({ ...d, index: i, entries: d.entries.filter((e) => course === "all" || e.code === course) }))
    .filter((d) => d.index !== 0 || d.entries.length > 0);
  const visible = day === "week" ? shown : shown.filter((d) => d.index === day);
  const all = shown.flatMap((d) => d.entries);
  const selected = all.find((e) => e.key === selectedKey) ?? null;
  const total = all.length;
  const lastDay = addDays(weekStart, 6);

  const go = (n) => {
    setOffset((o) => o + n);
    setSelectedKey(null);
  };

  return (
    <div className="sp-page sp-tt">
      <header className="sp-hd">
        <div>
          <h1>Timetable</h1>
          <p>Your weekly classes from the college timetable.</p>
        </div>
        <div className="sp-tools">
          <div className="sp-weeknav" role="group" aria-label="Week">
            <button type="button" className="sp-chip icon" onClick={() => go(-1)} disabled={offset <= -(STUDENT_HISTORY_WEEKS - 1)} aria-label="Previous week">
              <ChevronLeft size={16} strokeWidth={2.2} />
            </button>
            <span className="sp-weeklabel" aria-live="polite">
              {fmt(weekStart, { day: "numeric", month: "short" })} – {fmt(lastDay, { day: "numeric", month: "short", year: "numeric" })}
            </span>
            <button type="button" className="sp-chip icon" onClick={() => go(1)} disabled={offset >= FUTURE_WEEKS} aria-label="Next week">
              <ChevronRight size={16} strokeWidth={2.2} />
            </button>
          </div>
          <button type="button" className="sp-chip" onClick={() => { setOffset(0); setSelectedKey(null); }} disabled={offset === 0}>
            <CalendarDays size={14} strokeWidth={2} />This week
          </button>
        </div>
      </header>

      <div className="tt-layout">
        <section className="sp-card tt-board" aria-label="Weekly timetable">
          <div className="tt-bar">
            <div className="sp-tools" role="group" aria-label="Filter by course">
              <button type="button" className={`sp-chip ${course === "all" ? "on" : ""}`} aria-pressed={course === "all"} onClick={() => setCourse("all")}>All courses</button>
              {m.courses.map((c) => (
                <button key={c.code} type="button" className={`sp-chip ${course === c.code ? "on" : ""}`} aria-pressed={course === c.code} onClick={() => setCourse(c.code)} style={{ "--c": colorFor(c.code) }}>
                  <i className="sp-dot" />{c.name}
                </button>
              ))}
            </div>
            <div className="tt-days" role="tablist" aria-label="Day">
              {[{ key: "week", label: "Week" }, ...shown.map((d) => ({ key: d.index, label: d.label, sub: d.entries.length }))].map((t) => (
                <button key={t.key} type="button" role="tab" aria-selected={day === t.key} className={`tt-day ${day === t.key ? "on" : ""}`} onClick={() => setDay(t.key)}>
                  {t.label}
                  {t.sub !== undefined && <em>{t.sub}</em>}
                </button>
              ))}
            </div>
          </div>

          {total === 0 ? (
            <p className="sp-empty">No classes {course === "all" ? "this week" : "for this course this week"}.</p>
          ) : (
            <div className={`tt-cols sp-scroll ${day === "week" ? "week" : "one"}`} style={{ "--n": visible.length }}>
              {visible.map((d) => (
                <section key={d.dateKey} className={`tt-col ${d.isToday ? "today" : ""}`} aria-label={`${d.label} ${fmt(d.date, { day: "numeric", month: "long" })}`}>
                  <header>
                    <span>{d.label}</span>
                    <b>{d.date.getDate()}</b>
                    {d.isToday && <em>Today</em>}
                  </header>
                  {d.entries.length === 0 ? (
                    <p className="tt-none">No classes</p>
                  ) : (
                    d.entries.map((e) => (
                      <ClassButton key={e.key} entry={e} selected={selectedKey === e.key} color={colorFor(e.code)} onSelect={(k) => setSelectedKey((cur) => (cur === k ? null : k))} />
                    ))
                  )}
                </section>
              ))}
            </div>
          )}
        </section>

        <aside className="sp-side tt-side" aria-label="Class details">
          {selected ? (
            <Detail entry={selected} m={m} color={colorFor(selected.code)} />
          ) : (
            <div className="sp-side-empty">
              <MousePointerClick size={22} strokeWidth={1.8} />
              <h2>Select a class</h2>
              <p>Choose a class to see its room, instructor, batch, attendance status and your course attendance.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
