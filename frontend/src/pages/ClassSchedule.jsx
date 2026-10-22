// src/pages/ClassSchedule.jsx
import { useState, useMemo } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import "./ClassSchedule.css";
import TeacherShell from "../components/TeacherShell";
import { SLOTS, DAYS, toMinutes, toClock, endTime } from "../data/timetable";

// [background, border, text] per course colour
const PALETTE = [
  ["#EEF3FF", "#C5D5FB", "#2B5BD7"],
  ["#FEEFF0", "#F9C3C8", "#D12F3A"],
  ["#F2EFFD", "#D3C9F4", "#5A3EC2"],
];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const START_MIN = 8 * 60; // grid starts at 08:00
const PERIOD_MIN = 50;
const PERIODS = 11;
const PX_PER_MIN = 1.6;
const GRID_HEIGHT = PERIODS * PERIOD_MIN * PX_PER_MIN;
const TIME_MARKS = Array.from({ length: PERIODS + 1 }, (_, i) => START_MIN + i * PERIOD_MIN);

// Colour per course; courses with back-to-back or overlapping slots on a day never share a colour
const COLOR_INDEX = [];
SLOTS.forEach((slot) => {
  const ci = slot.courseIndex;
  if (COLOR_INDEX[ci] !== undefined) return;
  const clash = new Set();
  SLOTS.filter((a) => a.courseIndex === ci).forEach((a) =>
    SLOTS.forEach((o) => {
      if (o.courseIndex < ci && o.day === a.day && Math.abs(toMinutes(o.start) - toMinutes(a.start)) <= a.dur) {
        clash.add(COLOR_INDEX[o.courseIndex]);
      }
    })
  );
  let x = ci % PALETTE.length;
  for (let n = 0; n < PALETTE.length && clash.has(x); n++) x = (x + 1) % PALETTE.length;
  COLOR_INDEX[ci] = x;
});
const paletteOf = (slot) => PALETTE[COLOR_INDEX[slot.courseIndex]];

function startOfWeek(offset) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay() + offset * 7);
  return d;
}

function ClassSchedule() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedId, setSelectedId] = useState(null);

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

  const first = days[0].date;
  const last = days[6].date;
  const weekLabel = `${first.getDate()} ${MONTHS[first.getMonth()]} – ${last.getDate()} ${MONTHS[last.getMonth()]}`;

  return (
    <TeacherShell active="schedule">
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
              <button type="button" className="sc-ib" aria-label="Previous week" onClick={() => setWeekOffset((w) => w - 1)}>
                <ChevronLeft size={16} strokeWidth={2} />
              </button>
              <span className="sc-wl" aria-live="polite">{weekLabel}</span>
              <button type="button" className="sc-ib" aria-label="Next week" onClick={() => setWeekOffset((w) => w + 1)}>
                <ChevronRight size={16} strokeWidth={2} />
              </button>
              <button type="button" className="sc-today" onClick={() => setWeekOffset(0)}>Today</button>
            </div>
          </div>

          <div className="sc-grid">
            <div className="sc-tt" role="region" aria-label="Weekly timetable" tabIndex={0}>
              <div className="sc-tti">
                <div className="sc-tth">
                  <div />
                  {days.map(({ name, date }) => (
                    <div key={name} className={isToday(date) ? "td" : ""}>
                      <b>{date.getDate()}</b>
                      <span>{name}</span>
                    </div>
                  ))}
                </div>
                <div className="sc-ttb">
                  <div className="sc-tlab" style={{ height: GRID_HEIGHT }}>
                    {TIME_MARKS.map((m) => (
                      <span key={m} style={{ top: (m - START_MIN) * PX_PER_MIN }}>{toClock(m)}</span>
                    ))}
                  </div>
                  {days.map(({ name, date }) => (
                    <div key={name} className={`sc-tcol ${isToday(date) ? "td" : ""}`} style={{ height: GRID_HEIGHT }}>
                      {SLOTS.filter((o) => o.day === name).map((o) => {
                        const [bg, br, fg] = paletteOf(o);
                        const state = selectedId == null ? "" : selectedId === o.id ? "hi" : "dim";
                        return (
                          <div
                            key={o.id}
                            className={`sc-blk ${state}`}
                            tabIndex={0}
                            aria-label={`${o.name}, ${o.group}, ${o.venue}`}
                            title={`${o.name} · ${o.group}${o.gid ? ` (${o.gid})` : ""} · ${o.venue} · ${o.start}–${endTime(o)} · ${o.type}`}
                            style={{
                              "--c": fg,
                              "--b": bg,
                              "--br": br,
                              top: (toMinutes(o.start) - START_MIN) * PX_PER_MIN,
                              height: o.dur * PX_PER_MIN,
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
                {SLOTS.map((o) => (
                  <div
                    key={o.id}
                    className={`sc-cr ${selectedId === o.id ? "on" : ""}`}
                    tabIndex={0}
                    role="button"
                    aria-pressed={selectedId === o.id}
                    style={{ "--c": paletteOf(o)[2] }}
                    onClick={() => setSelectedId(selectedId === o.id ? null : o.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedId(selectedId === o.id ? null : o.id);
                      }
                    }}
                  >
                    <span className="cdt" />
                    <div>
                      <b>{o.name}</b>
                      <small>{o.group} · {o.code} · {o.day} {o.start}</small>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </main>
    </TeacherShell>
  );
}

export default ClassSchedule;
