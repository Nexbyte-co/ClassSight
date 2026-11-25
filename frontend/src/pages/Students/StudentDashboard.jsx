// src/pages/Students/StudentDashboard.jsx
// Student portal Dashboard, laid out like the teacher Dashboard: greeting, Current Class card and attendance
// alerts on the left; Schedule Overview and Today's Lectures on the right. The page sits inside
// `.db-page.teacher-ui`, so it uses the teacher's cards, tags and entrance animations as they are.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CalendarDays, CheckCircle2, Info } from "lucide-react";
import { classesCanMiss, classesNeededToReach } from "../../context/students/studentOverview";
import "./StudentDashboard.css";
import { useDemoSession } from "../../context/demo-session/DemoSessionContext";
import { useTheme } from "../../context/theme/ThemeContext";
import { useStudentModel } from "../../context/students/useStudentModel";
import { classWeight } from "../../context/students/studentCourses";
import { STATUS, getGreeting, getRequirementStatus } from "../../context/students/studentWeek";
import { formatClock } from "./studentUiHelpers";
import CountUp from "../../components/motion/CountUp";

const ALERT_ICON = { bad: AlertTriangle, warn: AlertTriangle, info: Info };

// "13:50" style minutes -> ["01:50", "PM"] for the time chip
function clock12(minutes) {
  const h = Math.floor(minutes / 60);
  return [`${String(((h + 11) % 12) + 1).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`, h < 12 ? "AM" : "PM"];
}
const timeLabel = (minutes) => clock12(minutes).join(" ");

// Where a class is in the day: done (held), active (in progress), next (first still to come) or upcoming
function withProgress(today) {
  const nextKey = today.find((o) => !o.live && o.status === STATUS.upcoming)?.key;
  return today.map((o) => ({
    ...o,
    progress: o.live ? "active" : o.status !== STATUS.upcoming ? "done" : o.key === nextKey ? "next" : "upcoming",
  }));
}

const TAG = {
  active: ["t-active", "In Progress"],
  next: ["t-next", "Next Up"],
  upcoming: ["t-upcoming", "Scheduled"],
};
function tagFor(o) {
  if (o.progress !== "done") return TAG[o.progress];
  if (o.status === STATUS.present) return ["t-done", "✓ Present"];
  if (o.status === STATUS.absent) return ["t-upcoming", "Absent"];
  return ["t-next", "Awaiting review"];
}

function CurrentClass({ current, now, next }) {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const startedAgo = current ? Math.max(0, nowMin - current.startMinutes) : null;
  return (
    <section className="db-card db-banner db-asn db-rise" style={{ animationDelay: "80ms" }} aria-label="Current class">
      {current ? (
        <>
          <div className="db-row db-wrap">
            <span className="db-k">Current class</span>
            <span className="db-badge">
              <span className="db-pulse" />
              IN PROGRESS
            </span>
            <span className="db-sm db-ago">Class started {startedAgo}m ago</span>
          </div>
          <div className="db-col">
            <div className="db-course">{current.subject}</div>
            <div className="db-code">{current.slotCode}</div>
          </div>
          <div className="db-g3">
            <div className="db-col">
              <div className="db-k">Batch</div>
              <div className="db-v">{current.group}</div>
              <div className="db-g3-sub">{current.course?.year}</div>
            </div>
            <div className="db-col">
              <div className="db-k">Venue</div>
              <div className="db-v">{current.room}</div>
            </div>
            <div className="db-col">
              <div className="db-k">Time</div>
              <div className="db-v db-v-time">{formatClock(current.startMinutes)} – {formatClock(current.endMinutes)}</div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="db-row db-wrap">
            <span className="db-k">Current class</span>
            <span className="db-badge db-badge-idle">
              <span className="db-dot-idle" />
              NOT IN PROGRESS
            </span>
          </div>
          <p className="db-sm db-idle-text">
            {next
              ? `No class is in progress. ${next.subject} is next, at ${timeLabel(next.startMinutes)} in ${next.room}.`
              : "No class is in progress, and nothing else is scheduled for today."}
          </p>
        </>
      )}
    </section>
  );
}

// Attendance card for the lecture picked in Today's Lectures (the class in progress by default).
// Lectures, labs and tutorials make one percentage, a lab counting as two lectures, so the eligibility line
// is worded in the picked class's own kind. With nothing picked or in progress it shows all courses together.
const RING_R = 52;
const RING_LEN = 2 * Math.PI * RING_R;
const LEVEL = { safe: ["ok", "Healthy"], warning: ["warn", "Warning"], critical: ["bad", "Critical"] };
const KIND_NOUN = { Lecture: "lecture", Lab: "lab", Tutorial: "tutorial" };
const plural = (n, noun) => `${n} ${noun}${n === 1 ? "" : "s"}`;

function typeBreakdown(byType) {
  const parts = Object.entries(byType)
    .filter(([, b]) => b.present + b.absent > 0)
    .map(([kind, b]) => `${b.present} ${KIND_NOUN[kind]}${b.present === 1 ? "" : "s"}`);
  return parts.length ? parts.join(" · ") : "classes";
}

function AttendanceOverview({ model, focus, onAll }) {
  const { overall, rows, threshold } = model;
  const row = focus ? rows.find((r) => r.code === focus.code) ?? null : null;
  const src = row ?? overall;
  const [open, setOpen] = useState(null); // "present" | "absent": swaps the tile's note for a per-type count
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const { present, absent, unverified, decided, pct, byType } = src;
  const level = pct === null ? null : getRequirementStatus(pct, threshold).level;
  const [tone, levelLabel] = level ? LEVEL[level] : ["none", "No classes held"];
  const weight = row && focus ? classWeight(focus.type) : 1;
  const noun = row && focus ? KIND_NOUN[focus.type] ?? "lecture" : null;
  const below = pct !== null && pct < threshold;
  // Both counts are in lecture units; a lab covers two of them
  const units = below ? classesNeededToReach(present, decided, threshold) : classesCanMiss(present, decided, threshold);
  const asClasses = (u) => (Number.isFinite(u) ? Math.ceil(u / weight) : u);
  const missable = Math.floor(units / weight);
  const toggle = (key) => setOpen((o) => (o === key ? null : key));
  const note = (key, fallback) => (open === key ? typeBreakdown(byType) : fallback);

  // Overall view: what each course needs on its own, since one course's classes cannot fix another's percentage
  const perCourse = rows
    .filter((r) => r.pct !== null)
    .map((r) => {
      const low = r.pct < threshold;
      const u = low ? r.needed : classesCanMiss(r.present, r.decided, threshold);
      const kinds = [...new Set(r.slots.map((sl) => sl.type))];
      const opts = [];
      if (kinds.some((k) => k !== "Lab")) opts.push(Number.isFinite(u) ? plural(u, "lecture") : "every lecture");
      if (kinds.includes("Lab")) opts.push(Number.isFinite(u) ? plural(low ? Math.ceil(u / 2) : Math.floor(u / 2), "lab") : "every lab");
      return { code: r.code, name: r.name, low, text: opts.join(" or ") };
    })
    .sort((a, b) => Number(b.low) - Number(a.low));

  let figure;
  let figureNote;
  if (pct === null) {
    figure = <b>—</b>;
    figureNote = "Nothing held yet.";
  } else if (below) {
    const need = asClasses(units);
    figure = <b className="bad">{Number.isFinite(need) ? need : "All"}<i> {noun ? `${KIND_NOUN[focus.type]}${need === 1 ? "" : "s"}` : "lectures"} to attend</i></b>;
    figureNote = noun
      ? `Attend the next ${plural(Number.isFinite(need) ? need : 0, noun)} in a row to reach ${threshold}%.`
      : `Attend ${Number.isFinite(units) ? `${plural(units, "lecture")} or ${plural(Math.ceil(units / 2), "lab")}` : "every class"} in a row to reach ${threshold}%.`;
  } else {
    figure = <b><CountUp value={missable} /><i> {noun ? `${noun}${missable === 1 ? "" : "s"} can be missed` : "lectures can be missed"}</i></b>;
    figureNote = noun
      ? `You can miss ${plural(missable, noun)} and stay at ${threshold}% or above.`
      : `You can miss ${plural(units, "lecture")} or ${plural(Math.floor(units / 2), "lab")} and stay at ${threshold}% or above.`;
  }

  return (
    <section className="db-card db-pad sp-ov db-rise" style={{ animationDelay: "120ms" }} aria-labelledby="sp-ov-h">
      <div className="db-shd">
        <div>
          <h2 id="sp-ov-h">{row ? row.name : "Overall Attendance"}</h2>
          <p className="db-sm">
            {row && focus
              ? `${focus.type ?? "Class"} selected · lectures, labs and tutorials count together (a lab is 2).`
              : `All your courses against the ${threshold}% requirement.`}
          </p>
        </div>
        <div className="sp-ov-hd">
          {row && (
            <button type="button" className="sp-ov-all" onClick={onAll}>All courses</button>
          )}
          <span className={`sp-ov-st ${tone}`}>{levelLabel}</span>
        </div>
      </div>

      <div className="sp-ov-body">
        <div className="sp-ring" role="img" aria-label={pct === null ? "No attendance yet" : `${pct} percent attendance`}>
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle className="trk" cx="60" cy="60" r={RING_R} />
            <circle
              className={`bar ${tone}`}
              cx="60" cy="60" r={RING_R}
              strokeDasharray={RING_LEN}
              strokeDashoffset={RING_LEN * (1 - (drawn && pct !== null ? pct : 0) / 100)}
            />
            <line className="tick" x1="60" y1="3" x2="60" y2="11" transform={`rotate(${(threshold / 100) * 360} 60 60)`} />
          </svg>
          <div className="sp-ring-c">
            <b>{pct === null ? "—" : <><CountUp key={row?.code ?? "all"} value={pct} />%</>}</b>
            <span>attendance</span>
          </div>
        </div>

        <div className="sp-ov-stats">
          <button type="button" className={`sp-ov-m ${open === "present" ? "on" : ""}`} aria-pressed={open === "present"} onClick={() => toggle("present")}>
            <span className="db-k">Attended</span>
            <b><CountUp key={`p-${row?.code ?? "all"}`} value={present} /><i> / {decided}</i></b>
            <span className="db-sm">{note("present", "tap for lectures / labs")}</span>
          </button>
          <button type="button" className={`sp-ov-m ${open === "absent" ? "on" : ""}`} aria-pressed={open === "absent"} onClick={() => toggle("absent")}>
            <span className="db-k">Missed</span>
            <b><CountUp key={`a-${row?.code ?? "all"}`} value={absent} /></b>
            <span className="db-sm">
              {open === "absent"
                ? Object.entries(byType).filter(([, b]) => b.absent > 0).map(([kind, b]) => `${b.absent} ${KIND_NOUN[kind]}${b.absent === 1 ? "" : "s"}`).join(" · ") || "none"
                : unverified > 0 ? `${unverified} awaiting review` : "tap for lectures / labs"}
            </span>
          </button>
          <div className="sp-ov-m wide">
            <span className="db-k">Eligibility</span>
            {row ? (
              <>
                {figure}
                <span className="db-sm">{figureNote}</span>
              </>
            ) : (
              <div className="sp-ov-el">
                {perCourse.map((c) => (
                  <div key={c.code} className="sp-ov-r">
                    <span>{c.name}</span>
                    <b className={c.low ? "bad" : "ok"}>{c.low ? "Attend" : "Can miss"} {c.text}</b>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function AlertsCard({ alerts }) {
  return (
    <section className="db-card db-pad sp-alertcard db-rise" style={{ animationDelay: "200ms" }} aria-labelledby="sp-alerts">
      <div className="db-shd">
        <div>
          <h2 id="sp-alerts">Attendance Alerts</h2>
          <p className="db-sm">Courses that need attention and classes waiting for review.</p>
        </div>
        {alerts.length > 0 && <span className="db-cap2">{alerts.length}</span>}
      </div>
      {alerts.length === 0 ? (
        <div className="db-ci db-empty">
          <span className="db-ok sp-ontrack"><CheckCircle2 size={16} strokeWidth={2} /> You&apos;re on track in every course.</span>
        </div>
      ) : (
        <div className="db-list">
          {alerts.map((a, index) => {
            const Icon = ALERT_ICON[a.tone];
            return (
              <div key={a.id} className={`db-ci db-slidein sp-al-${a.tone}`} style={{ animationDelay: `${index * 80}ms` }}>
                <div className="db-info">
                  <Icon size={18} strokeWidth={2} aria-hidden="true" />
                  <div>
                    <div className="db-nm">{a.title}</div>
                    <p className="db-sm">{a.text}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function StudentDashboard() {
  const { session } = useDemoSession();
  const { isDarkMode } = useTheme();
  const m = useStudentModel();

  const today = useMemo(() => withProgress(m.today), [m.today]);
  const current = today.find((o) => o.progress === "active") ?? null;
  const next = today.find((o) => o.progress === "next") ?? null;
  // Lecture shown in the attendance card: the one clicked in the list, else the class in progress, else all courses.
  // Not stored, so a reload goes back to the class in progress.
  const [picked, setPicked] = useState(undefined); // undefined = default, "all", or an occurrence key
  const focus = picked === "all" ? null : today.find((o) => o.key === picked) ?? current;
  const done = today.filter((o) => o.progress === "done").length;

  // The list fills the card's height and scrolls; the caption shows while rows are hidden
  const listRef = useRef(null);
  const [overflows, setOverflows] = useState(false);
  useEffect(() => {
    const list = listRef.current;
    if (!list) {
      setOverflows(false);
      return undefined;
    }
    const measure = () => setOverflows(list.scrollHeight > list.clientHeight + 2);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [today]);

  return (
    <div className={`db-page teacher-ui sp-chrome sp-dashwrap ${isDarkMode ? "dark-mode" : ""}`}>
      <main className="db-main db-dash">
        <div className="db-cols">
          <div className="db-lcol">
            <div className="db-hd db-rise">
              <div>
                <h1>
                  {getGreeting(m.now)}, {session.name}
                </h1>
                <p className="db-sm db-lead">Here&apos;s where your attendance stands.</p>
              </div>
            </div>

            <CurrentClass current={current} now={m.now} next={next} />
            <AttendanceOverview model={m} focus={focus} onAll={() => setPicked("all")} />
            <AlertsCard alerts={m.alerts} />
          </div>

          <div className="db-rcol">
            <section className="db-card db-pad db-bur db-ovw db-rise" style={{ animationDelay: "240ms" }}>
              <div className="db-shd">
                <div>
                  <h2>Schedule Overview</h2>
                  <p className="db-sm">Follow your day: classes held, what is in progress and what comes next.</p>
                </div>
                <Link to="/student/timetable" className="db-btn">
                  <CalendarDays size={14} strokeWidth={2} />
                  Open Timetable
                </Link>
              </div>

              <div className="db-stats">
                <div className="db-stat">
                  <div className="db-k">Today&apos;s Total</div>
                  <div className="db-big">
                    <CountUp value={today.length} /> Lectures
                  </div>
                  <div className="db-sm">Scheduled today</div>
                </div>
                <div className="db-stat">
                  <div className="db-k">Next Lecture</div>
                  {next ? (
                    <>
                      <div className="db-nl-name">
                        {next.subject}
                        <span>{next.slotCode}</span>
                      </div>
                      <div className="db-sm">{timeLabel(next.startMinutes)}</div>
                      <div className="db-sm">{next.room}</div>
                    </>
                  ) : (
                    <div className="db-nl-name">No upcoming lectures</div>
                  )}
                </div>
                <div className="db-stat">
                  <div className="db-k">Completed</div>
                  <div className="db-big">
                    <CountUp value={done} /> of <CountUp value={today.length} />
                  </div>
                  <div className="db-sm">
                    <CountUp value={current ? 1 : 0} /> Currently in progress
                  </div>
                </div>
              </div>
            </section>

            <section className="db-card db-pad db-bur db-sched db-rise" style={{ animationDelay: "320ms" }}>
              <div className="db-shd db-lh">
                <div>
                  <h2>Today&apos;s Lectures</h2>
                  <p className="db-sm">Check your attendance for each class and open course details.</p>
                </div>
                <span className="db-cap2">{overflows ? "Scroll for more" : ""}</span>
              </div>

              {today.length === 0 ? (
                <div className="db-ci db-empty">
                  <span className="db-sm">No classes scheduled for today.</span>
                </div>
              ) : (
                <div className="db-list" ref={listRef}>
                  {today.map((o, index) => {
                    const [clock, period] = clock12(o.startMinutes);
                    const [tagClass, tagText] = tagFor(o);
                    const selected = focus?.key === o.key;
                    return (
                      <div
                        key={o.key}
                        role="button"
                        tabIndex={0}
                        aria-pressed={selected}
                        className={`db-ci db-slidein sp-pick ${selected ? "sel" : ""} ${o.progress === "active" ? "act" : ""} ${o.progress === "done" ? "dn" : ""}`}
                        style={{ animationDelay: `${index * 80}ms` }}
                        onClick={() => setPicked(selected && o.key !== current?.key ? undefined : o.key)}
                        onKeyDown={(e) => {
                          if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                            e.preventDefault();
                            setPicked(selected && o.key !== current?.key ? undefined : o.key);
                          }
                        }}
                      >
                        <div className="db-info">
                          <div className="db-tm">
                            {clock}
                            <i>{period}</i>
                          </div>
                          <div>
                            <div className="db-nm">
                              {o.subject}
                              <span className={`db-tag ${tagClass}`}>{tagText}</span>
                            </div>
                            <p className="db-sm">{[o.group, o.room, o.slotCode].filter(Boolean).join(" • ")}</p>
                            {o.progress === "done" ? (
                              o.status === STATUS.present ? (
                                <div className="db-ok">Attendance: marked present{o.method ? ` (${o.method})` : ""}</div>
                              ) : (
                                <div className="db-warn">
                                  {o.status === STATUS.absent ? "Attendance: marked absent" : "Awaiting teacher review"}
                                </div>
                              )
                            ) : o.progress === "active" ? (
                              <div className="db-warn">Class in progress</div>
                            ) : (
                              <div className="db-sm">
                                {o.type} · {o.endMinutes - o.startMinutes} min
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="db-row db-acts">
                          <Link to="/student/courses" state={{ code: o.code }} className={o.progress === "active" ? "db-bm" : "db-b1"}>
                            Course Details
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

export default StudentDashboard;
