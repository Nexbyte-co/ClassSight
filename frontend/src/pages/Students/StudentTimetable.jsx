// src/pages/Students/StudentTimetable.jsx
// The student's weekly timetable, laid out exactly like the teacher's Class Schedule page (same grid, week
// navigation, course filter and detail popover) but filled with the student's own classes (Sunday–Saturday).
// It reuses the teacher's `.sc-*` styles by sitting inside `.db-page.teacher-ui`; the day keeps a fixed height, so the card scrolls up/down and sideways when cramped.
import { useEffect, useMemo, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import "../Classes/ClassSchedule.css";
import "./StudentDashboard.css";
import { useTheme } from "../../context/theme/ThemeContext";
import { useStudentModel } from "../../context/students/useStudentModel";
import { getLocalDateKey } from "../../context/schedule/scheduleStatus";
import { DAYS, toClock } from "../../data/schedule/timetable";
import { STATUS_LABEL } from "./studentUiHelpers";

// Accent per course (colours live in ClassSchedule.css as .ac-* classes)
const ACCENTS = ["mr", "blue", "violet", "teal", "amber", "green", "pink"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SHOWN_DAYS = [0, 1, 2, 3, 4, 5, 6]; // Sun–Sat

const START_MIN = 8 * 60; // grid starts at 08:00
const PERIOD_MIN = 50;
const PERIODS = 11;
const TOTAL_MIN = PERIODS * PERIOD_MIN;
const TIME_MARKS = Array.from({ length: PERIODS + 1 }, (_, i) => START_MIN + i * PERIOD_MIN);
const pct = (min) => `${(min / TOTAL_MIN) * 100}%`;

function startOfWeek(now, offset) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() - d.getDay() + offset * 7);
  return d;
}

function StudentTimetable() {
  const m = useStudentModel();
  const { isDarkMode } = useTheme();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [detail, setDetail] = useState(null); // { slot, date, x, y }
  const now = m.now;

  useEffect(() => {
    if (!detail) return undefined;
    const close = () => setDetail(null);
    const onKey = (e) => e.key === "Escape" && close();
    const onDown = (e) => {
      if (!e.target.closest?.(".sc-pop, .sc-blk")) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", close);
    };
  }, [detail]);

  // Every weekly slot of the student's courses, in the same shape the teacher's page uses
  const slots = useMemo(
    () =>
      m.courses.flatMap((course, courseIndex) =>
        course.slots.map((s) => ({
          id: s.id,
          name: course.name,
          code: s.label,
          courseCode: course.code,
          courseIndex,
          group: course.group,
          sheet: course.year,
          venue: s.room,
          day: s.day,
          startMin: s.startMinutes,
          dur: s.duration,
          type: s.type,
          start: toClock(s.startMinutes),
          end: toClock(s.startMinutes + s.duration),
        }))
      ),
    [m.courses]
  );

  const courses = useMemo(
    () => m.courses.map((c, index) => ({ ...c, index, count: slots.filter((s) => s.courseIndex === index).length })),
    [m.courses, slots]
  );

  const days = useMemo(() => {
    const ws = startOfWeek(now, weekOffset);
    return SHOWN_DAYS.map((i) => {
      const date = new Date(ws);
      date.setDate(ws.getDate() + i);
      return { name: DAYS[i], date };
    });
  }, [now, weekOffset]);

  const todayKey = getLocalDateKey(now);
  const isToday = (d) => getLocalDateKey(d) === todayKey;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const first = days[0].date;
  const last = days[days.length - 1].date;
  const weekLabel = `${first.getDate()} ${MONTHS[first.getMonth()]} – ${last.getDate()} ${MONTHS[last.getMonth()]}`;

  const openDetail = (slot, date, el) => {
    const r = el.getBoundingClientRect();
    const W = 260;
    const x = Math.min(Math.max(8, r.right + 8 + W > window.innerWidth ? r.left - W - 8 : r.right + 8), window.innerWidth - W - 8);
    const y = Math.min(Math.max(8, r.top), window.innerHeight - 260);
    setDetail((d) => (d?.slot.id === slot.id && d.date.getTime() === date.getTime() ? null : { slot, date, x, y }));
  };

  // The student's attendance record for the class on that day, when there is one
  const recordOf = (slot, date) =>
    m.occurrences.find((o) => o.dateKey === getLocalDateKey(date) && o.code === slot.courseCode && o.startMinutes === slot.startMin) ?? null;
  const detailRecord = detail ? recordOf(detail.slot, detail.date) : null;

  return (
    <div className={`db-page teacher-ui sp-chrome sp-dashwrap sp-ttwrap ${isDarkMode ? "dark-mode" : ""}`}>
      <main className="db-main">
        <div className="sc-page">
          <div className="sc-hd">
            <div className="sc-hl">
              <div className="sc-hico"><Calendar size={26} strokeWidth={1.8} /></div>
              <div>
                <h1 className="sc-title">Class Schedule</h1>
                <p className="sc-sub">Your weekly timetable across all courses</p>
              </div>
            </div>
            <div className="sc-wk">
              <button type="button" className="sc-ib" aria-label="Previous week" onClick={() => { setDetail(null); setWeekOffset((w) => w - 1); }}>
                <ChevronLeft size={16} strokeWidth={2} />
              </button>
              <span className="sc-wl" aria-live="polite">{weekLabel}</span>
              <button type="button" className="sc-ib" aria-label="Next week" onClick={() => { setDetail(null); setWeekOffset((w) => w + 1); }}>
                <ChevronRight size={16} strokeWidth={2} />
              </button>
              <button type="button" className="sc-today" onClick={() => { setDetail(null); setWeekOffset(0); }}>Today</button>
            </div>
          </div>

          <div className="sc-grid">
            <div className="sc-tt" role="region" aria-label="Weekly timetable">
              <div className="sc-tti">
                <div className="sc-tth">
                  <div />
                  {days.map(({ name, date }) => (
                    <div key={name} className={isToday(date) ? "td" : ""}>
                      <span className="dn">{name}</span>
                      <b>{date.getDate()}</b>
                    </div>
                  ))}
                </div>
                <div className="sc-ttb" key={weekOffset}>
                  <div className="sc-tlab">
                    {TIME_MARKS.map((t) => (
                      <span key={t} style={{ top: pct(t - START_MIN) }}>{toClock(t)}</span>
                    ))}
                  </div>
                  {days.map(({ name, date }) => (
                    <div key={name} className={`sc-tcol ${isToday(date) ? "td" : ""}`}>
                      {isToday(date) && nowMin >= START_MIN && nowMin <= START_MIN + TOTAL_MIN && (
                        <div className="sc-now" style={{ top: pct(nowMin - START_MIN) }} aria-hidden="true" />
                      )}
                      {slots.filter((o) => o.day === name).map((o) => {
                        const state = selectedCourse == null ? "" : selectedCourse === o.courseIndex ? "hi" : "dim";
                        const open = detail?.slot.id === o.id && detail.date.getTime() === date.getTime();
                        return (
                          <div
                            key={o.id}
                            className={`sc-blk ac-${ACCENTS[o.courseIndex % ACCENTS.length]} ${o.dur <= PERIOD_MIN ? "short" : ""} ${state} ${open ? "open" : ""}`}
                            tabIndex={0}
                            role="button"
                            aria-haspopup="dialog"
                            aria-label={`${o.name} ${o.type}, ${o.group}, ${o.venue}`}
                            onClick={(e) => openDetail(o, date, e.currentTarget)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                openDetail(o, date, e.currentTarget);
                              }
                            }}
                            style={{ top: pct(o.startMin - START_MIN), height: pct(o.dur) }}
                          >
                            <div className="n">{o.name}</div>
                            <div className="t">{o.code} · {o.venue}</div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <aside className="sc-spn" aria-label="Classes">
              <h4>Classes</h4>
              <div className="sc-cl">
                {courses.map((c) => {
                  const on = selectedCourse === c.index;
                  const toggle = () => setSelectedCourse(on ? null : c.index);
                  return (
                    <div
                      key={c.code}
                      className={`sc-cr ac-${ACCENTS[c.index % ACCENTS.length]} ${on ? "on" : ""}`}
                      tabIndex={0}
                      role="button"
                      aria-pressed={on}
                      onClick={toggle}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggle();
                        }
                      }}
                    >
                      <span className="cdt" />
                      <div>
                        <b>{c.name}</b>
                        <small>{c.code} · {c.count} {c.count === 1 ? "session" : "sessions"} / week</small>
                      </div>
                    </div>
                  );
                })}
              </div>
            </aside>
          </div>
        </div>
        {detail && (
          <div className={`sc-pop ac-${ACCENTS[detail.slot.courseIndex % ACCENTS.length]}`} role="dialog" aria-label={`${detail.slot.name} details`} style={{ left: detail.x, top: detail.y }}>
            <div className="ph">
              <b>{detail.slot.name}</b>
              <button type="button" aria-label="Close details" onClick={() => setDetail(null)}>×</button>
            </div>
            <dl>
              <dt>Batch</dt><dd>{detail.slot.group}</dd>
              <dt>Room</dt><dd>{detail.slot.venue}</dd>
              <dt>Time</dt><dd>{detail.slot.day} · {detail.slot.start}–{detail.slot.end}</dd>
              <dt>Type</dt><dd>{detail.slot.type} · {detail.slot.code}</dd>
              <dt>Year</dt><dd>{detail.slot.sheet}</dd>
              {detailRecord && (
                <>
                  <dt>Attendance</dt><dd>{STATUS_LABEL[detailRecord.status]}</dd>
                </>
              )}
            </dl>
          </div>
        )}
      </main>
    </div>
  );
}

export default StudentTimetable;
