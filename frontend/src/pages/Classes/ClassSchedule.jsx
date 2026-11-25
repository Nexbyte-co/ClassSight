// src/pages/Classes/ClassSchedule.jsx
import { useState, useMemo, useEffect } from "react";
import { BookOpen, Calendar, CalendarX2, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import "./ClassSchedule.css";
import TeacherShell from "../../components/navigation/TeacherShell";
import { toMinutes, toClock, endTime } from "../../data/schedule/timeUtils";
import { useTeacherTimetable } from "../../hooks/useTeacherTimetable";

// Accent per course (colours live in ClassSchedule.css as .ac-* classes)
const ACCENTS = ["mr", "blue", "violet", "teal"];
const accentOf = (slot) => ACCENTS[slot.courseIndex % ACCENTS.length];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const PERIOD_MIN = 50;
const ROW_H = 88; // px per 50-minute period
const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Periods start at 08:00 and run every 50 minutes; the grid grows to fit any earlier or later session.
function gridRange(slots) {
  let start = 8 * 60;
  let end = 18 * 60; // 17:10 + 50
  slots.forEach((s) => {
    while (toMinutes(s.start) < start) start -= PERIOD_MIN;
    end = Math.max(end, toMinutes(s.start) + s.dur);
  });
  const periods = Math.ceil((end - start) / PERIOD_MIN);
  return { START_MIN: start, PERIODS: periods, rows: Array.from({ length: periods }, (_, i) => start + i * PERIOD_MIN) };
}

// Monday of the week `offset` weeks from this one.
function startOfWeek(offset) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + offset * 7);
  return d;
}

// How long a slot is once moved: a lab always takes two periods (100 min), anything else keeps its length.
const movedDuration = (slot) => (slot.type === "Lab" ? 2 * PERIOD_MIN : slot.dur);

// The weekly timetable itself. The teacher's own page and the admin's view of a teacher both render this.
// `edit` (admin only) turns on drag and drop: { onMove(slot, day, startMin, dur), movedIds: Set, panel: node }.
export function ScheduleView({ slots: SLOTS, courses: COURSES, loading, error, title = "Class Schedule", sub = "Your weekly timetable across all sections", emptyText, onSaveVenue, edit }) {
  const { START_MIN, PERIODS, rows: ROWS } = useMemo(() => gridRange(SLOTS), [SLOTS]);
  const [drag, setDrag] = useState(null); // { slot, grab } grab = period of the block the pointer holds
  const [hover, setHover] = useState(null); // { day, start, dur, ok }

  // Can `slot` start at `start` (minutes) on `day`? Inside the grid and not over another of the teacher's slots.
  const fits = (slot, day, start) => {
    const dur = movedDuration(slot);
    if (start < START_MIN || start + dur > START_MIN + PERIODS * PERIOD_MIN) return false;
    return !SLOTS.some((o) => o.id !== slot.id && o.day === day && toMinutes(o.start) < start + dur && start < toMinutes(o.start) + o.dur);
  };

  const dragOver = (e, day) => {
    if (!drag) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const row = Math.max(0, Math.floor((e.clientY - rect.top) / ROW_H) - drag.grab);
    const start = START_MIN + row * PERIOD_MIN;
    const same = day === drag.slot.day && start === toMinutes(drag.slot.start);
    const ok = same || fits(drag.slot, day, start);
    e.dataTransfer.dropEffect = ok ? "move" : "none";
    if (hover?.day !== day || hover?.start !== start || hover?.ok !== ok) setHover({ day, start, dur: movedDuration(drag.slot), ok });
  };
  const drop = (e) => {
    e.preventDefault();
    if (drag && hover?.ok) edit.onMove(drag.slot, hover.day, hover.start, hover.dur);
    setDrag(null);
    setHover(null);
  };
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
    () => COURSES.map((c, i) => ({ ...c, index: i, slot: SLOTS.find((o) => o.courseIndex === i) ?? { courseIndex: i } })),
    [COURSES, SLOTS]
  );

  const days = useMemo(() => {
    const ws = startOfWeek(weekOffset);
    const shown = SLOTS.some((s) => s.day === "Sun") ? WEEK : WEEK.slice(0, 6); // Sunday only when something is on it
    return shown.map((name, i) => {
      const date = new Date(ws);
      date.setDate(ws.getDate() + i);
      return { name, date };
    });
  }, [weekOffset, SLOTS]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isToday = (d) => d.getTime() === today.getTime();

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const first = days[0].date;
  const last = days[days.length - 1].date;
  const weekLabel = `${first.getDate()} ${MONTHS[first.getMonth()]} – ${last.getDate()} ${MONTHS[last.getMonth()]}`;

  return (
    <>
        <div className="sc-page">
          <div className="sc-hd">
            <div className="sc-hl">
              <div className="sc-hico"><Calendar size={26} strokeWidth={1.8} /></div>
              <div>
                <h1 className="sc-title">{title}</h1>
                <p className="sc-sub">{sub}</p>
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

          {(loading || error) && (
            <p className="sc-sub" role="status" style={{ margin: "12px 4px" }}>
              {loading ? "Loading the timetable…" : `We couldn't load the timetable: ${error}`}
            </p>
          )}
          <div className="sc-grid">
            <div className="sc2" role="region" aria-label="Weekly timetable" style={{ "--cols": days.length, "--row": `${ROW_H}px` }}>
              <div className="sc2-in">
                <div className="sc2-head">
                  <div className="sc2-corner" />
                  {days.map(({ name, date }) => (
                    <div key={name} className={`sc2-day ${isToday(date) ? "td" : ""}`}>
                      <span>{name}</span>
                      <b>{date.getDate()}</b>
                    </div>
                  ))}
                </div>
                <div className="sc2-body" key={weekOffset} style={{ height: PERIODS * ROW_H }}>
                  <div className="sc2-times">
                    {ROWS.map((m) => (
                      <div key={m} className="sc2-time">
                        <b>{toClock(m)}</b>
                      </div>
                    ))}
                  </div>
                  {days.map(({ name, date }) => (
                    <div
                      key={name}
                      className={`sc2-col ${isToday(date) ? "td" : ""} ${drag ? "drop-on" : ""}`}
                      onDragOver={edit ? (e) => dragOver(e, name) : undefined}
                      onDragLeave={edit ? (e) => !e.currentTarget.contains(e.relatedTarget) && setHover(null) : undefined}
                      onDrop={edit ? drop : undefined}
                    >
                      {drag && hover?.day === name && (
                        <div
                          className={`sc2-ghost ${hover.ok ? "ok" : "bad"}`}
                          style={{ top: ((hover.start - START_MIN) / PERIOD_MIN) * ROW_H + 3, height: (hover.dur / PERIOD_MIN) * ROW_H - 6 }}
                          aria-hidden="true"
                        >
                          {hover.ok ? `${toClock(hover.start)}–${toClock(hover.start + hover.dur)}` : "No room here"}
                        </div>
                      )}
                      {isToday(date) && nowMin >= START_MIN && nowMin <= START_MIN + PERIODS * PERIOD_MIN && (
                        <div className="sc2-now" style={{ top: ((nowMin - START_MIN) / PERIOD_MIN) * ROW_H }} aria-hidden="true" />
                      )}
                      {SLOTS.filter((o) => o.day === name).map((o) => {
                        const state = selectedCourse == null ? "" : selectedCourse === o.courseIndex ? "hi" : "dim";
                        const top = ((toMinutes(o.start) - START_MIN) / PERIOD_MIN) * ROW_H;
                        const height = (o.dur / PERIOD_MIN) * ROW_H;
                        return (
                          <div
                            key={o.id}
                            className={`sc2-blk ac-${accentOf(o)} ${state} ${detail?.slot.id === o.id ? "open" : ""} ${o.dur > PERIOD_MIN ? "long" : ""} ${edit ? "drag" : ""} ${drag?.slot.id === o.id ? "dragging" : ""} ${edit?.movedIds.has(o.id) ? "moved" : ""}`}
                            draggable={!!edit}
                            onDragStart={
                              edit
                                ? (e) => {
                                    setDetail(null);
                                    e.dataTransfer.effectAllowed = "move";
                                    e.dataTransfer.setData("text/plain", o.id);
                                    const r = e.currentTarget.getBoundingClientRect();
                                    setDrag({ slot: o, grab: Math.max(0, Math.floor((e.clientY - r.top) / ROW_H)) });
                                  }
                                : undefined
                            }
                            onDragEnd={edit ? () => { setDrag(null); setHover(null); } : undefined}
                            tabIndex={0}
                            role="button"
                            aria-haspopup="dialog"
                            title={`${o.name} · ${o.group} · ${o.start}–${endTime(o)}${o.venue && o.venue !== "—" ? ` · ${o.venue}` : ""}`}
                            aria-label={`${o.name}, ${o.type}, ${o.group}, ${o.start} to ${endTime(o)}, ${o.venue}`}
                            onClick={(e) => openDetail(o, e.currentTarget)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                openDetail(o, e.currentTarget);
                              }
                            }}
                            style={{ top: top + 3, height: height - 6 }}
                          >
                            <div className="sc2-r1">
                              <b>{o.code}</b>
                            </div>
                            <div className="sc2-r2">
                              <span className="sc2-batch">{o.group}</span>
                              <span>{o.type}</span>
                            </div>
                            <div className={`sc2-venue ${o.venue && o.venue !== "—" ? "" : "none"}`}>
                              <MapPin size={12} strokeWidth={2.2} aria-hidden="true" />
                              {o.venue && o.venue !== "—" ? o.venue : "No venue"}
                            </div>
                            {o.dur > PERIOD_MIN && <div className="sc2-r3">{o.name}</div>}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
              {!loading && !error && !SLOTS.length && (
                <div className="sc-empty" role="status">
                  <span className="sc-empty-ic" aria-hidden="true"><CalendarX2 size={26} strokeWidth={1.8} /></span>
                  <b>No classes on the timetable yet</b>
                  <p>{emptyText || "Your weekly lectures, labs and tutorials show up here once an administrator gives you a class and sets its days and times."}</p>
                </div>
              )}
            </div>

            <div className={edit?.panel ? "sc-side" : "sc-side plain"}>
            <aside className="sc-spn" aria-label="Classes">
              <h4>Classes</h4>
              <div className="sc-cl">
                {!courses.length && !loading && (
                  <div className="sc-cl-empty">
                    <BookOpen size={20} strokeWidth={1.8} aria-hidden="true" />
                    <span>No classes yet</span>
                  </div>
                )}
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
            {edit?.panel}
            </div>
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
              <dt>Room</dt><dd>{onSaveVenue ? <VenueEdit key={detail.slot.id} slot={detail.slot} onSave={onSaveVenue} /> : detail.slot.venue}</dd>
              <dt>Time</dt><dd>{detail.slot.day} · {detail.slot.start}–{endTime(detail.slot)}</dd>
              <dt>Type</dt><dd>{detail.slot.type} · {detail.slot.code}</dd>
              <dt>Year</dt><dd>{detail.slot.sheet}</dd>
            </dl>
          </div>
        )}
    </>
  );
}

// Admin only: set or change a slot's venue from its details pop-up.
function VenueEdit({ slot, onSave }) {
  const initial = slot.venue === "—" ? "" : slot.venue;
  const [value, setValue] = useState(initial);
  const [base, setBase] = useState(initial); // last saved value
  const [state, setState] = useState({ busy: false, error: "", saved: false });
  const dirty = value.trim() !== base;
  const save = async (e) => {
    e.preventDefault();
    if (!dirty) return;
    setState({ busy: true, error: "", saved: false });
    try {
      await onSave(slot, value.trim());
      setBase(value.trim());
      setState({ busy: false, error: "", saved: true });
    } catch (err) {
      setState({ busy: false, error: err.message || "Could not save the venue.", saved: false });
    }
  };
  return (
    <form className="sc-venue-edit" onSubmit={save}>
      <input
        value={value}
        maxLength={40}
        placeholder="e.g. LT-3"
        aria-label="Venue"
        onChange={(e) => {
          setValue(e.target.value);
          setState((s) => ({ ...s, saved: false, error: "" }));
        }}
      />
      <button type="submit" disabled={!dirty || state.busy}>{state.busy ? "…" : "Save"}</button>
      {state.saved && <small className="ok">Saved</small>}
      {state.error && <small className="err">{state.error}</small>}
    </form>
  );
}

function ClassSchedule() {
  const { slots, courses, loading, error } = useTeacherTimetable();
  return (
    <TeacherShell active="schedule" rootClassName="sc-root">
      <main className="db-main">
        <ScheduleView slots={slots} courses={courses} loading={loading} error={error} />
      </main>
    </TeacherShell>
  );
}

export default ClassSchedule;
