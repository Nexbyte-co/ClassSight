// src/pages/Classes/ClassSchedule.jsx
import { useState, useMemo, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import "./ClassSchedule.css";
import TeacherShell from "../../components/navigation/TeacherShell";
import { SLOTS, COURSES, DAYS, toMinutes, toClock, endTime } from "../../data/schedule/timetable";

// Accent per course (colours live in ClassSchedule.css as .ac-* classes)
const ACCENTS = ["mr", "blue", "violet", "teal"];
const ACCENT_BY_NAME = [
  [/software/i, "mr"],
  [/database/i, "blue"],
  [/operating/i, "violet"],
  [/discrete/i, "teal"],
];
const accentOf = (slot) => {
  const hit = ACCENT_BY_NAME.find(([re]) => re.test(slot.name));
  return hit ? hit[1] : ACCENTS[slot.courseIndex % ACCENTS.length];
};
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const START_MIN = 8 * 60; // grid starts at 08:00
const PERIOD_MIN = 50;
const PERIODS = 11;
const TOTAL_MIN = PERIODS * PERIOD_MIN;
// Positions are percentages of the day, so the whole grid always fits its box (no scrolling)
const pct = (min) => `${(min / TOTAL_MIN) * 100}%`;
const TIME_MARKS = Array.from({ length: PERIODS + 1 }, (_, i) => START_MIN + i * PERIOD_MIN);

function startOfWeek(offset) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay() + offset * 7);
  return d;
}

function ClassSchedule() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [detail, setDetail] = useState(null); // { slot, x, y }
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

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

  const openDetail = (slot, el) => {
    const r = el.getBoundingClientRect();
    const W = 260;
    const x = Math.min(Math.max(8, r.right + 8 + W > window.innerWidth ? r.left - W - 8 : r.right + 8), window.innerWidth - W - 8);
    const y = Math.min(Math.max(8, r.top), window.innerHeight - 220);
    setDetail((d) => (d?.slot.id === slot.id ? null : { slot, x, y }));
  };

  const courses = useMemo(
    () => COURSES.map((c, i) => ({ ...c, index: i, slot: SLOTS.find((o) => o.courseIndex === i) })),
    []
  );

  const days = useMemo(() => {
    const ws = startOfWeek(weekOffset);
    return DAYS.map((name, i) => {
      const date = new Date(ws);
      date.setDate(ws.getDate() + i);
      return { name, date };
    });
  }, [weekOffset]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isToday = (d) => d.getTime() === today.getTime();

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const first = days[0].date;
  const last = days[6].date;
  const weekLabel = `${first.getDate()} ${MONTHS[first.getMonth()]} – ${last.getDate()} ${MONTHS[last.getMonth()]}`;

  return (
    <TeacherShell active="schedule" rootClassName="sc-root">
      <main className="db-main">
        <div className="sc-page">
          <div className="sc-hd">
            <div className="sc-hl">
              <div className="sc-hico"><Calendar size={26} strokeWidth={1.8} /></div>
              <div>
                <h1 className="sc-title">Class Schedule</h1>
                <p className="sc-sub">Your weekly timetable across all sections</p>
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
                    {TIME_MARKS.map((m) => (
                      <span key={m} style={{ top: pct(m - START_MIN) }}>{toClock(m)}</span>
                    ))}
                  </div>
                  {days.map(({ name, date }) => (
                    <div key={name} className={`sc-tcol ${isToday(date) ? "td" : ""}`}>
                      {isToday(date) && nowMin >= START_MIN && nowMin <= START_MIN + PERIODS * PERIOD_MIN && (
                        <div className="sc-now" style={{ top: pct(nowMin - START_MIN) }} aria-hidden="true" />
                      )}
                      {SLOTS.filter((o) => o.day === name).map((o) => {
                        const state = selectedCourse == null ? "" : selectedCourse === o.courseIndex ? "hi" : "dim";
                        return (
                          <div
                            key={o.id}
                            className={`sc-blk ac-${accentOf(o)} ${state} ${detail?.slot.id === o.id ? "open" : ""}`}
                            tabIndex={0}
                            role="button"
                            aria-haspopup="dialog"
                            aria-label={`${o.name}, ${o.group}, ${o.venue}`}
                            onClick={(e) => openDetail(o, e.currentTarget)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                openDetail(o, e.currentTarget);
                              }
                            }}
                            style={{
                              top: pct(toMinutes(o.start) - START_MIN),
                              height: pct(o.dur),
                            }}
                          >
                            <div className="n">{o.name}</div>
                            <div className="t">{o.group} · {o.venue}</div>
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
                      key={c.key}
                      className={`sc-cr ac-${accentOf(c.slot)} ${on ? "on" : ""}`}
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
                        <small>{c.code} · {c.slots} {c.slots === 1 ? "session" : "sessions"} / week</small>
                      </div>
                    </div>
                  );
                })}
              </div>
            </aside>
          </div>
        </div>
        {detail && (
          <div className={`sc-pop ac-${accentOf(detail.slot)}`} role="dialog" aria-label={`${detail.slot.name} details`} style={{ left: detail.x, top: detail.y }}>
            <div className="ph">
              <b>{detail.slot.name}</b>
              <button type="button" aria-label="Close details" onClick={() => setDetail(null)}>×</button>
            </div>
            <dl>
              <dt>Batch</dt><dd>{detail.slot.group}{detail.slot.gid ? ` (${detail.slot.gid})` : ""}</dd>
              <dt>Room</dt><dd>{detail.slot.venue}</dd>
              <dt>Time</dt><dd>{detail.slot.day} · {detail.slot.start}–{endTime(detail.slot)}</dd>
              <dt>Type</dt><dd>{detail.slot.type} · {detail.slot.code}</dd>
              <dt>Year</dt><dd>{detail.slot.sheet}</dd>
            </dl>
          </div>
        )}
      </main>
    </TeacherShell>
  );
}

export default ClassSchedule;
