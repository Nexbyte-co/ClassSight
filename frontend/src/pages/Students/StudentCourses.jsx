// src/pages/Students/StudentCourses.jsx
// My Courses: a card per course; selecting one opens its details and attendance history in the side panel.
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CalendarClock, GraduationCap, MousePointerClick, UserRound } from "lucide-react";
import "./StudentPages.css";
import { useStudentModel } from "../../context/students/useStudentModel";
import { relativeDayLabel } from "../../context/students/studentCourses";
import { classesCanMiss } from "../../context/students/studentOverview";
import { STATUS } from "../../context/students/studentWeek";
import { AttendanceBar, LevelPill, StatusPill } from "./studentUi";
import { LEVEL_TONE, formatClock, useCourseColor } from "./studentUiHelpers";

const prettyDate = (dateKey, opts = { weekday: "short", day: "numeric", month: "short" }) =>
  new Date(...dateKey.split("-").map((n, i) => (i === 1 ? n - 1 : +n))).toLocaleDateString("en-GB", opts);

function CourseCard({ row, selected, color, m, onSelect }) {
  const tone = row.status ? LEVEL_TONE[row.status.level] : "none";
  return (
    <button
      type="button"
      className={`cr-card ${selected ? "sel" : ""}`}
      style={{ "--c": color }}
      aria-pressed={selected}
      onClick={() => onSelect(row.code)}
    >
      <span className="cr-top">
        <span className="sp-sub"><i className="sp-dot" />{row.code}</span>
        <LevelPill row={row} />
      </span>
      <b className="cr-name">{row.name}</b>
      <span className="cr-pct">
        <b className={tone}>{row.pct === null ? "—" : `${row.pct}%`}</b>
        <span>attendance</span>
      </span>
      <AttendanceBar pct={row.pct} threshold={m.threshold} tone={tone} />
      <span className="cr-nums">
        <span><b>{row.present}</b> / {row.decided} attended</span>
        <span><b>{row.absent}</b> missed</span>
      </span>
      <span className="cr-foot">
        <span><CalendarClock size={13} strokeWidth={2} />{row.next ? `${relativeDayLabel(row.next.date, m.now)} · ${formatClock(row.next.startMinutes)}` : "No upcoming class"}</span>
        <span><UserRound size={13} strokeWidth={2} />{row.instructor} · {row.group}</span>
      </span>
    </button>
  );
}

function Detail({ row, m, color }) {
  const history = m.occurrences
    .filter((o) => o.code === row.code && o.status !== STATUS.upcoming)
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey) || b.startMinutes - a.startMinutes);
  const canMiss = row.pct !== null && row.pct >= m.threshold ? classesCanMiss(row.present, row.decided, m.threshold) : 0;
  return (
    <>
      <div className="sp-side-hd" style={{ "--c": color }}>
        <span className="sp-sub"><i className="sp-dot" />{row.code} · {row.year}</span>
        <h2>{row.name}</h2>
        <p>{row.instructor} · Batch {row.group}</p>
      </div>
      <div className="sp-side-bd cr-body">
        <dl className="sp-facts">
          <div><dt>Attendance</dt><dd>{row.pct === null ? "—" : `${row.pct}%`}<small>{row.present} of {row.decided} classes</small></dd></div>
          <div><dt>Missed</dt><dd>{row.absent}<small>{row.unverified ? `${row.unverified} awaiting review` : "none pending review"}</small></dd></div>
        </dl>
        {row.pct !== null && (
          <p className={`cr-note ${row.pct >= m.threshold ? "ok" : "warn"}`}>
            {row.pct >= m.threshold
              ? canMiss > 0
                ? `You are above ${m.threshold}%. You can miss up to ${canMiss} more class${canMiss === 1 ? "" : "es"} and stay there.`
                : `You are at the ${m.threshold}% requirement. Missing the next class would take you below it.`
              : Number.isFinite(row.needed)
                ? `Attend the next ${row.needed} class${row.needed === 1 ? "" : "es"} in a row to reach ${m.threshold}%.`
                : `Below the ${m.threshold}% requirement.`}
          </p>
        )}
        <div className="cr-slots">
          <span className="sp-k">Weekly schedule</span>
          {row.slots.map((s) => (
            <span key={s.id} className="sp-sub"><CalendarClock size={13} strokeWidth={2} />{s.day} {formatClock(s.startMinutes)}–{formatClock(s.startMinutes + s.duration)} · {s.room}</span>
          ))}
        </div>
        <div className="cr-hist">
          <span className="sp-k">Attendance history</span>
          {history.length === 0 ? (
            <p className="sp-empty">No classes held yet.</p>
          ) : (
            <ul className="sp-rows sp-scroll">
              {history.map((o) => (
                <li key={o.key} className="sp-row" style={{ "--c": color }}>
                  <span className="sp-grow">
                    <b>{prettyDate(o.dateKey)}</b>
                    <span className="sp-sub">{formatClock(o.startMinutes)} · {o.room}{o.method ? ` · ${o.method}` : ""}</span>
                  </span>
                  <StatusPill status={o.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
        <Link to="/student/attendance" className="sp-btn">See full attendance</Link>
      </div>
    </>
  );
}

export default function StudentCourses() {
  const m = useStudentModel();
  const colorFor = useCourseColor(m.courses);
  const location = useLocation();
  // Arriving from a timetable class opens that course
  const [selected, setSelected] = useState(location.state?.code ?? null);
  const row = m.rows.find((r) => r.code === selected) ?? null;
  const atRisk = m.atRisk.length;

  return (
    <div className="sp-page sp-courses">
      <header className="sp-hd">
        <div>
          <h1>My Courses</h1>
          <p>
            {m.rows.length} course{m.rows.length === 1 ? "" : "s"}
            {atRisk > 0 ? ` · ${atRisk} below the ${m.threshold}% requirement` : ` · all on track`}
          </p>
        </div>
        <span className="sp-sub"><GraduationCap size={15} strokeWidth={2} />Spring Term 2026</span>
      </header>

      <div className="tt-layout">
        <div className="cr-grid sp-scroll">
          {m.rows.length === 0 ? (
            <p className="sp-empty">You are not enrolled in any courses yet.</p>
          ) : (
            m.rows.map((r) => (
              <CourseCard key={r.code} row={r} selected={selected === r.code} color={colorFor(r.code)} m={m} onSelect={(c) => setSelected((cur) => (cur === c ? null : c))} />
            ))
          )}
        </div>
        <aside className="sp-side tt-side" aria-label="Course details">
          {row ? (
            <Detail row={row} m={m} color={colorFor(row.code)} />
          ) : (
            <div className="sp-side-empty">
              <MousePointerClick size={22} strokeWidth={1.8} />
              <h2>Select a course</h2>
              <p>Choose a course to see its schedule, how close you are to the requirement and your attendance history.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
