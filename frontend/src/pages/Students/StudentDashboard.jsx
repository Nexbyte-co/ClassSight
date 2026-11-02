// src/pages/Students/StudentDashboard.jsx
// Student portal Dashboard: overall attendance, classes attended/held, at-risk courses, upcoming classes,
// today's schedule, alerts and a compact week. On desktop-size windows the page fits the window and only
// the lists inside the cards scroll. All records come from the shared student model.
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, Info, MapPin } from "lucide-react";
import "./StudentPages.css";
import { useDemoSession } from "../../context/demo-session/DemoSessionContext";
import { useStudentModel } from "../../context/students/useStudentModel";
import { relativeDayLabel } from "../../context/students/studentCourses";
import { firstName, getGreeting } from "../../context/students/studentWeek";
import { AttendanceBar, LevelPill, StatusPill } from "./studentUi";
import { LEVEL_TONE, STATUS_LABEL, formatClock, useCourseColor } from "./studentUiHelpers";

// ---------------------------------------------------------------------------
// Dashboard sections
// ---------------------------------------------------------------------------
function Kpis({ m }) {
  const { overall, rows, atRisk, threshold, upcoming, now } = m;
  const meeting = overall.pct !== null && overall.pct >= threshold;
  const next = upcoming[0];
  return (
    <div className="sp-kpis">
      <section className="sp-kpi" aria-label="Overall attendance">
        <span className="sp-k">Overall attendance</span>
        <b className="sp-n">{overall.pct === null ? "—" : `${overall.pct}%`}</b>
        <AttendanceBar pct={overall.pct} threshold={threshold} tone={overall.pct === null ? "none" : meeting ? "ok" : "warn"} />
        <span className="sp-s">
          {overall.pct === null
            ? "No classes held yet"
            : meeting
              ? `Meeting the ${threshold}% requirement`
              : `Below the ${threshold}% requirement`}
        </span>
      </section>
      <section className="sp-kpi" aria-label="Classes attended">
        <span className="sp-k">Classes attended</span>
        <b className="sp-n">
          {overall.present}
          <small> of {overall.held}</small>
        </b>
        <span className="sp-s">
          {overall.absent} missed
          {overall.unverified > 0 ? ` · ${overall.unverified} awaiting review` : ""}
        </span>
      </section>
      <section className="sp-kpi" aria-label="At-risk courses">
        <span className="sp-k">At-risk courses</span>
        <b className={`sp-n ${atRisk.length ? "warn" : ""}`}>
          {atRisk.length}
          <small> of {rows.length}</small>
        </b>
        <span className="sp-s">{atRisk.length ? atRisk.map((r) => r.name).join(", ") : "All courses on track"}</span>
      </section>
      <section className="sp-kpi" aria-label="Next class">
        <span className="sp-k">Next class</span>
        {next ? (
          <>
            <b className="sp-n sm">{next.course.name}</b>
            <span className="sp-s">
              {relativeDayLabel(next.date, now)} · {formatClock(next.startMinutes)} · {next.slot.room}
            </span>
          </>
        ) : (
          <b className="sp-n sm">No upcoming classes</b>
        )}
      </section>
    </div>
  );
}

function TodayCard({ m, colorFor }) {
  return (
    <section className="sp-card" aria-labelledby="sp-today">
      <header className="sp-ch">
        <h2 id="sp-today">Today&apos;s schedule</h2>
        <Link to="/student/timetable" className="sp-link">Timetable <ArrowRight size={14} strokeWidth={2.2} /></Link>
      </header>
      {m.today.length === 0 ? (
        <p className="sp-empty">No classes today.</p>
      ) : (
        <ul className="sp-rows sp-scroll">
          {m.today.map((o) => (
            <li key={o.key} className="sp-row" style={{ "--c": colorFor(o.code) }}>
              <span className="sp-time">
                {formatClock(o.startMinutes)}
                <small>{formatClock(o.endMinutes)}</small>
              </span>
              <span className="sp-grow">
                <b>{o.subject}</b>
                <span className="sp-sub"><MapPin size={12} strokeWidth={2} />{o.room} · {o.group}</span>
              </span>
              {o.live ? <StatusPill status="upcoming">In progress</StatusPill> : <StatusPill status={o.status} />}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function UpcomingCard({ m, colorFor }) {
  // Today's classes are already in the schedule card above, so this list starts tomorrow
  const items = m.upcoming.filter((u) => u.ahead > 0).slice(0, 4);
  return (
    <section className="sp-card" aria-labelledby="sp-up">
      <header className="sp-ch">
        <h2 id="sp-up">Upcoming classes</h2>
      </header>
      {items.length === 0 ? (
        <p className="sp-empty">No upcoming classes.</p>
      ) : (
        <ul className="sp-rows sp-scroll">
          {items.map((u) => (
            <li key={u.key} className="sp-row" style={{ "--c": colorFor(u.code) }}>
              <span className="sp-day">
                <b>{u.date.toLocaleDateString("en-GB", { day: "numeric" })}</b>
                <small>{u.date.toLocaleDateString("en-GB", { weekday: "short" })}</small>
              </span>
              <span className="sp-grow">
                <b>{u.course.name}</b>
                <span className="sp-sub"><CalendarClock size={12} strokeWidth={2} />{formatClock(u.startMinutes)}–{formatClock(u.slot.startMinutes + u.slot.duration)} · {u.slot.room}</span>
              </span>
              <span className="sp-rel">{relativeDayLabel(u.date, m.now)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const ALERT_ICON = { bad: AlertTriangle, warn: AlertTriangle, info: Info };

function AlertsCard({ m }) {
  return (
    <section className="sp-card" aria-labelledby="sp-alerts">
      <header className="sp-ch">
        <h2 id="sp-alerts">Attendance alerts</h2>
        {m.alerts.length > 0 && <span className="sp-count">{m.alerts.length}</span>}
      </header>
      {m.alerts.length === 0 ? (
        <p className="sp-empty ok"><CheckCircle2 size={16} strokeWidth={2} /> You&apos;re on track in every course.</p>
      ) : (
        <ul className="sp-alerts sp-scroll">
          {m.alerts.map((a) => {
            const Icon = ALERT_ICON[a.tone];
            return (
              <li key={a.id} className={`sp-alert ${a.tone}`}>
                <Icon size={16} strokeWidth={2} aria-hidden="true" />
                <span>
                  <b>{a.title}</b>
                  <span>{a.text}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function CoursesCard({ m, colorFor }) {
  // Lowest attendance first, so at-risk courses lead; courses with no held classes go last
  const rows = [...m.rows].sort((a, b) => (a.pct ?? 101) - (b.pct ?? 101));
  return (
    <section className="sp-card" aria-labelledby="sp-courses">
      <header className="sp-ch">
        <h2 id="sp-courses">Courses</h2>
        <Link to="/student/courses" className="sp-link">All courses <ArrowRight size={14} strokeWidth={2.2} /></Link>
      </header>
      <ul className="sp-rows sp-scroll">
        {rows.map((r) => (
          <li key={r.code} className="sp-row stack" style={{ "--c": colorFor(r.code) }}>
            <span className="sp-line">
              <b>{r.name}</b>
              <LevelPill row={r} />
            </span>
            <span className="sp-line">
              <AttendanceBar pct={r.pct} threshold={m.threshold} tone={r.status ? LEVEL_TONE[r.status.level] : "none"} />
              <span className="sp-pct">{r.pct === null ? "—" : `${r.pct}%`}</span>
            </span>
            <span className="sp-sub">{r.present} of {r.decided} classes attended</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// Compact week: one column per day with a mark for every class, coloured by status
function WeekStrip({ m, colorFor }) {
  return (
    <section className="sp-card" aria-labelledby="sp-week">
      <header className="sp-ch">
        <h2 id="sp-week">This week</h2>
        <span className="sp-sub">Classes attended out of classes held</span>
      </header>
      <ol className="sp-week">
        {m.week.map((d) => {
          const isToday = d.dateKey === m.todayKey;
          return (
            <li key={d.dateKey} className={isToday ? "today" : ""}>
              <span className="wd">{d.label}</span>
              <span className="wn">{Number(d.dateKey.slice(8))}</span>
              <span className="wm">
                {d.segments.length === 0 && <i className="none" aria-label="No classes" />}
                {d.segments.map((o) => (
                  <i
                    key={o.key}
                    className={`s-${o.status}`}
                    style={{ "--c": colorFor(o.code) }}
                    title={`${o.subject} · ${formatClock(o.startMinutes)} · ${STATUS_LABEL[o.status]}`}
                  />
                ))}
              </span>
              <span className="wc">{d.total === 0 ? "" : d.upcoming === d.total ? "Upcoming" : `${d.attended}/${d.held}`}</span>
            </li>
          );
        })}
      </ol>
      <p className="sp-legend">
        <span><i className="s-present" />Present</span>
        <span><i className="s-absent" />Absent</span>
        <span><i className="s-unverified" />Unverified</span>
        <span><i className="s-upcoming" />Upcoming</span>
      </p>
    </section>
  );
}

function StudentDashboard() {
  const { session } = useDemoSession();
  const m = useStudentModel();
  const colorFor = useCourseColor(m.courses);

  return (
    <div className="student-dashboard sp-page sp-dash">
      <header className="sp-hd">
        <div>
          <h1 className="student-greeting">
            {getGreeting(m.now)}, {firstName(session.name)}
          </h1>
          <p>Here&apos;s where your attendance stands.</p>
        </div>
        {m.usingDemo && (
          <p className="sp-note" role="note">
            <Info size={15} strokeWidth={2} aria-hidden="true" />
            <span>
              <b>Frontend demo.</b> Classes come from the real timetable; attendance marks are sample data.
            </span>
          </p>
        )}
      </header>

      <Kpis m={m} />

      <div className="sp-grid">
        <div className="sp-col">
          <TodayCard m={m} colorFor={colorFor} />
          <UpcomingCard m={m} colorFor={colorFor} />
        </div>
        <div className="sp-col">
          <AlertsCard m={m} />
          <CoursesCard m={m} colorFor={colorFor} />
        </div>
      </div>

      <WeekStrip m={m} colorFor={colorFor} />
    </div>
  );
}

export default StudentDashboard;
