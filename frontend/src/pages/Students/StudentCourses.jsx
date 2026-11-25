// src/pages/Students/StudentCourses.jsx
// My Courses: a card per course; selecting one opens its attendance and, per lecture / lab / tutorial, the teacher and attendance.
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CalendarClock, GraduationCap, MousePointerClick } from "lucide-react";
import "./StudentPages.css";
import { termLabel } from "../../utils/termLabel";
import { useStudentModel } from "../../context/students/useStudentModel";
import { relativeDayLabel } from "../../context/students/studentCourses";
import { classesCanMiss } from "../../context/students/studentOverview";
import { STATUS } from "../../context/students/studentWeek";
import { AttendanceBar, LevelPill } from "./studentUi";
import { LEVEL_TONE, formatClock, useCourseColor } from "./studentUiHelpers";

// Session kinds in the order they are shown; a card appears only when the timetable has that kind for the course
const KINDS = ["Lecture", "Lab", "Tutorial"];

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
        <span className="cr-next"><CalendarClock size={14} strokeWidth={2} />Next: {row.next ? `${relativeDayLabel(row.next.date, m.now)} · ${formatClock(row.next.startMinutes)}` : "No upcoming class"}</span>
      </span>
    </button>
  );
}

function Detail({ row, m, color }) {
  const canMiss = row.pct !== null && row.pct >= m.threshold ? classesCanMiss(row.present, row.decided, m.threshold) : 0;
  // One card per kind of session the timetable has for this course: its teacher and attendance for that kind
  const kinds = KINDS.map((kind) => {
    const slots = row.slots.filter((s) => s.type === kind);
    if (slots.length === 0) return null;
    const held = m.occurrences.filter((o) => o.code === row.code && o.type === kind && o.status !== STATUS.upcoming);
    const present = held.filter((o) => o.status === STATUS.present).length;
    const decided = held.filter((o) => o.status !== STATUS.unverified).length;
    const teachers = [...new Set(slots.map((s) => s.instructor).filter(Boolean))];
    const pct = decided > 0 ? Math.round((present / decided) * 100) : null;
    return { kind, teachers, present, decided, pct, pending: held.length - decided };
  }).filter(Boolean);
  return (
    <>
      <div className="sp-side-hd" style={{ "--c": color }}>
        <span className="sp-sub"><i className="sp-dot" />{row.code} · {row.year}</span>
        <h2>{row.name}</h2>
        <p>Batch {row.group}</p>
      </div>
      <div className="sp-side-bd cr-body">
        <dl className="sp-facts">
          <div><dt>Attendance</dt><dd>{row.pct === null ? "—" : `${row.pct}%`}<small>{row.present} of {row.decided} (a lab counts as 2)</small></dd></div>
          <div><dt>Missed</dt><dd>{row.absent}<small>{row.unverified ? `${row.unverified} awaiting review` : "none pending review"}</small></dd></div>
        </dl>
        <div className="cr-kinds">
          {kinds.map((k) => (
            <section key={k.kind} className="cr-kind" aria-label={k.kind}>
              <span className="sp-k">{k.kind}{k.kind === "Lab" ? " · counts as 2" : ""}</span>
              <b className="cr-teacher">{k.teachers.join(", ")}</b>
              <span className="cr-kn">
                <b>{k.present}</b> of {k.decided} attended
                {k.pct !== null && <em>{k.pct}%</em>}
              </span>
              <AttendanceBar pct={k.pct} threshold={m.threshold} tone={k.pct === null ? "none" : k.pct >= m.threshold ? "ok" : "warn"} />
              {k.pending > 0 && <span className="sp-sub">{k.pending} awaiting review</span>}
            </section>
          ))}
        </div>
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
        <Link to="/student/reports" className="sp-btn">See full report</Link>
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
        <span className="sp-sub"><GraduationCap size={15} strokeWidth={2} />{termLabel()}</span>
      </header>

      <div className="tt-layout cr-layout">
        <div className="cr-grid sp-scroll">
          {m.rows.length === 0 ? (
            <p className="sp-empty">You are not enrolled in any courses yet.</p>
          ) : (
            m.rows.map((r) => (
              <CourseCard key={r.code} row={r} selected={selected === r.code} color={colorFor(r.code)} m={m} onSelect={(c) => setSelected((cur) => (cur === c ? null : c))} />
            ))
          )}
        </div>
        <aside className="sp-side tt-side cr-side" aria-label="Course details">
          {row ? (
            <Detail row={row} m={m} color={colorFor(row.code)} />
          ) : (
            <div className="sp-side-empty">
              <MousePointerClick size={22} strokeWidth={1.8} />
              <h2>Select a course</h2>
              <p>Choose a course to see your attendance, how close you are to the requirement and each lecture, lab or tutorial with its teacher.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
