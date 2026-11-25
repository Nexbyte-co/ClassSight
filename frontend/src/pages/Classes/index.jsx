// src/pages/Classes/index.jsx
import { useState, useMemo, useEffect } from "react";
import { termLabel } from "../../utils/termLabel";
import { Link } from "react-router-dom";
import {
  Search,
  SearchX,
  X,
  BookOpen,
  Clock,
  MapPin,
  Users,
  Calendar,
  CalendarClock,
  ArrowUpDown,
  ClipboardCheck,
  GraduationCap,
  MousePointerClick,
} from "lucide-react";
import "./Classes.css";
import Dropdown from "./Dropdown";
import TeacherShell from "../../components/navigation/TeacherShell";
import { useDialogA11y } from "../../hooks/useDialogA11y";
import { DAYS, HEALTHY_ATTENDANCE, endTime, toMinutes } from "../../data/schedule/timeUtils";
import { useTeacherTimetable } from "../../hooks/useTeacherTimetable";
import { attendanceOf } from "../../context/teacherModel";

// Wide screens dock the details panel on the right and lock the page height; narrower ones use a drawer
const WIDE_QUERY = "(min-width: 1366px) and (min-height: 640px)";
const SEARCH_DELAY = 200;

// att is null for a class with no saved attendance yet
const attendanceTone = (att) => (att == null ? "none" : att >= HEALTHY_ATTENDANCE ? "ok" : "warn");
const toneLabel = (att) => (att == null ? "No sessions yet" : att >= HEALTHY_ATTENDANCE ? "Healthy" : "Needs attention");
const gapText = (att) => {
  if (att == null) return "Attendance shows once a session is saved";
  const gap = Math.abs(att - HEALTHY_ATTENDANCE);
  return `${gap} pt${gap === 1 ? "" : "s"} ${att >= HEALTHY_ATTENDANCE ? "above" : "below"} the ${HEALTHY_ATTENDANCE}% target`;
};

const unique = (list) => [...new Set(list)];
// The filter choices come from the teacher's own classes.
const buildFilters = (slots) => {
  const years = unique(slots.map((o) => o.sheet)).sort();
  const groups = unique(slots.map((o) => o.group)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const codes = unique(slots.map((o) => o.code)).sort();
  const weekdays = DAYS.filter((d) => slots.some((o) => o.day === d));
  return [
    { key: "year", label: "Year", options: years },
    { key: "group", label: "Group", options: groups },
    { key: "day", label: "Day", options: weekdays },
    { key: "code", label: "Course", options: codes },
  ].map((f) => ({ ...f, choices: [{ value: "All", label: "All" }, ...f.options.map((v) => ({ value: v, label: v }))] }));
};
const NO_FILTERS = { year: "All", group: "All", day: "All", code: "All" };
const FIELD = { year: "sheet", group: "group", day: "day", code: "code" };

const SORTS = [
  { key: "name-asc", label: "Course name, A–Z" },
  { key: "name-desc", label: "Course name, Z–A" },
  { key: "next", label: "Next lecture, soonest" },
  { key: "att-desc", label: "Attendance, highest" },
  { key: "att-asc", label: "Attendance, lowest" },
];
const SORT_OPTIONS = SORTS.map((s) => ({ value: s.key, label: s.label }));

/** When the slot next happens, from the weekly timetable and the current time. */
const nextLecture = (o, now) => {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const start = toMinutes(o.start);
  let ahead = (DAYS.indexOf(o.day) - now.getDay() + 7) % 7;
  if (ahead === 0 && nowMin >= start && nowMin < start + o.dur) return { ahead: 0, live: true, at: start, date: now };
  if (ahead === 0 && nowMin >= start) ahead = 7;
  const date = new Date(now);
  date.setDate(now.getDate() + ahead);
  return { ahead, live: false, at: ahead * 1440 + start, date };
};
/** The soonest upcoming session of a class (a class has one or more weekly sessions). */
const nextOf = (c, now) =>
  c.sessions.map((s) => ({ ...nextLecture(s, now), slot: s })).sort((a, b) => (b.live - a.live) || a.at - b.at)[0];
const byWeekOrder = (a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || toMinutes(a.start) - toMinutes(b.start);
// "2 Lectures · 1 Lab"
const typeSummary = (sessions) =>
  Object.entries(sessions.reduce((m, s) => ({ ...m, [s.type]: (m[s.type] ?? 0) + 1 }), {}))
    .map(([t, n]) => `${n} ${t}${n === 1 ? "" : "s"}`)
    .join(" · ");
const nextDayText = (n) =>
  n.live
    ? "In progress"
    : n.ahead === 0
      ? "Today"
      : n.ahead === 1
        ? "Tomorrow"
        : n.date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

// Attendance bars animate only the first time the page is shown, not on every tab switch
let hasAnimated = false;

function AttendanceBar({ att }) {
  return (
    <span className={`cx-bar ${attendanceTone(att)}`} aria-hidden="true">
      <i style={{ width: `${att ?? 0}%` }} />
      <s style={{ left: `${HEALTHY_ATTENDANCE}%` }} />
    </span>
  );
}

const RING = 132;
const STROKE = 11;
/** Circular attendance indicator with a tick at the healthy target. */
function AttendanceRing({ att }) {
  const r = (RING - STROKE) / 2;
  const c = 2 * Math.PI * r;
  const mid = RING / 2;
  const angle = ((HEALTHY_ATTENDANCE / 100) * 360 - 90) * (Math.PI / 180);
  const at = (d) => [mid + d * Math.cos(angle), mid + d * Math.sin(angle)];
  const [x1, y1] = at(r - STROKE / 2 - 3);
  const [x2, y2] = at(r + STROKE / 2 + 3);
  return (
    <div className={`cx-ring ${attendanceTone(att)}`} role="img" aria-label={att == null ? "No attendance saved yet" : `${att}% average attendance, ${gapText(att)}`}>
      <svg viewBox={`0 0 ${RING} ${RING}`} aria-hidden="true">
        <circle className="trk" cx={mid} cy={mid} r={r} strokeWidth={STROKE} />
        <circle
          className="arc"
          cx={mid}
          cy={mid}
          r={r}
          strokeWidth={STROKE}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - (att ?? 0) / 100)}
          transform={`rotate(-90 ${mid} ${mid})`}
        />
        <line className="tgt" x1={x1} y1={y1} x2={x2} y2={y2} />
      </svg>
      <div className="cx-ring-val">
        <b>{att == null ? "—" : `${att}%`}</b>
        <span>average</span>
      </div>
    </div>
  );
}

/** Term totals: in the empty details panel on wide screens, above the toolbar otherwise. */
function Overview({ slots: SLOTS, courses: COURSES, compact = false }) {
  const rated = SLOTS.filter((o) => o.att != null);
  const avg = rated.length ? `${Math.round(rated.reduce((sum, o) => sum + o.att, 0) / rated.length)}%` : "—";
  const below = rated.filter((o) => o.att < HEALTHY_ATTENDANCE).length;
  const items = [
    { label: "Courses", value: COURSES.length },
    { label: "Groups", value: SLOTS.length },
    { label: "Avg. attendance", value: avg },
    { label: `Below ${HEALTHY_ATTENDANCE}%`, value: below, warn: below > 0 },
  ];
  return (
    <dl className={`cx-ovw ${compact ? "strip" : ""}`}>
      {items.map((it) => (
        <div key={it.label}>
          <dt>{it.label}</dt>
          <dd className={it.warn ? "warn" : ""}>{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Classes() {
  const { slots: SLOTS, courses: COURSES, byClass, loading, error } = useTeacherTimetable();
  const FILTERS = useMemo(() => buildFilters(SLOTS), [SLOTS]);
  // One card per class (a subject taught to one batch), with all its weekly sessions and that batch's own attendance.
  const CLASSES = useMemo(() => {
    const m = new Map();
    SLOTS.forEach((s) => m.set(s.classroomId, [...(m.get(s.classroomId) ?? []), s]));
    return [...m.entries()].map(([cid, list]) => {
      const sessions = [...list].sort(byWeekOrder);
      return { ...sessions[0], id: `class-${cid}`, sessions, att: attendanceOf([cid], byClass) };
    });
  }, [SLOTS, byClass]);
  const [animate] = useState(() => !hasAnimated);
  useEffect(() => {
    hasAnimated = true;
  }, []);
  const [now] = useState(() => new Date());

  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(NO_FILTERS);
  const [sort, setSort] = useState("name-asc");
  const [selectedId, setSelectedId] = useState(null);

  // Debounced search: the list updates once typing pauses
  useEffect(() => {
    const t = setTimeout(() => setQuery(searchInput.trim()), SEARCH_DELAY);
    return () => clearTimeout(t);
  }, [searchInput]);

  const [wide, setWide] = useState(() => window.matchMedia(WIDE_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(WIDE_QUERY);
    const onChange = (e) => setWide(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const rows = useMemo(() => {
    const q = query.toLowerCase();
    const byName = (a, b) => a.name.localeCompare(b.name);
    const byWeek = (a, b) => nextOf(a, now).at - nextOf(b, now).at;
    const order = {
      "name-asc": (a, b) => byName(a, b) || byWeek(a, b),
      "name-desc": (a, b) => byName(b, a) || byWeek(a, b),
      next: byWeek,
      "att-desc": (a, b) => (b.att ?? -1) - (a.att ?? -1) || byName(a, b) || byWeek(a, b),
      "att-asc": (a, b) => (a.att ?? 101) - (b.att ?? 101) || byName(a, b) || byWeek(a, b),
    }[sort];
    return CLASSES.filter(
      (o) =>
        Object.keys(FIELD).every((k) => filters[k] === "All" || (k === "day" ? o.sessions.some((s) => s.day === filters.day) : o[FIELD[k]] === filters[k])) &&
        (!q || [o.code, o.name, o.group, o.gid, o.sheet, ...o.sessions.flatMap((s) => [s.venue, s.day])].join(" ").toLowerCase().includes(q))
    ).sort(order);
  }, [query, filters, sort, now, CLASSES]);

  const active = [
    ...(query ? [{ key: "search", label: "Search", value: `“${query}”` }] : []),
    ...FILTERS.filter((f) => filters[f.key] !== "All").map((f) => ({ key: f.key, label: f.label, value: filters[f.key] })),
  ];
  const removeFilter = (key) => {
    if (key === "search") {
      setSearchInput("");
      setQuery("");
    } else setFilters((f) => ({ ...f, [key]: "All" }));
  };
  const clearAll = () => {
    setSearchInput("");
    setQuery("");
    setFilters(NO_FILTERS);
  };

  // A class hidden by the filters is no longer shown as selected
  const current = rows.find((o) => o.id === selectedId) ?? null;
  const select = (o) => setSelectedId((id) => (id === o.id && wide ? null : o.id));
  const close = () => setSelectedId(null);

  const dialogRef = useDialogA11y(Boolean(current) && !wide, close);

  const detail = (o) => {
    const next = nextOf(o, now);
    const venues = unique(o.sessions.map((s) => s.venue).filter((v) => v && v !== "—"));
    const tone = attendanceTone(o.att);
    return (
      <>
        <div className="cx-dh">
          <div className="cx-dh-t">
            <div className="cx-tags">
              <span className="cd">{o.code}</span>
              <span>{o.group}</span>
            </div>
            <h2 id="cx-detail-title">{o.name}</h2>
            <p>
              {o.sheet}
              {o.gid ? ` · Group ${o.gid}` : ""}
            </p>
          </div>
          <button type="button" className="cx-x" onClick={close} aria-label={wide ? "Clear selection" : "Close class details"}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="cx-db">
          <section className="cx-att" aria-label="Attendance">
            <AttendanceRing att={o.att} />
            <div className="cx-att-tx">
              <span className={`cx-pill ${tone}`}>{toneLabel(o.att)}</span>
              <p className="cx-gap">{gapText(o.att)}</p>
              <p className="cx-note">
                Attendance of batch {o.group} in this subject
              </p>
            </div>
          </section>

          <section className={`cx-next ${next.live ? "live" : ""}`} aria-label="Upcoming lecture">
            <span className="cx-next-ico"><CalendarClock size={18} strokeWidth={2} /></span>
            <div>
              <span className="cx-next-k">{next.live ? "Lecture now" : "Next lecture"}</span>
              <b>
                {nextDayText(next)}
                {next.live ? "" : `, ${next.slot.start}`}
              </b>
              <span className="cx-next-s">
                {next.slot.type} · {next.slot.start}–{endTime(next.slot)} · {next.slot.venue}
              </span>
            </div>
          </section>

          <dl className="cx-info">
            <div className="cx-info-wide">
              <Calendar size={16} strokeWidth={2} />
              <dt>Weekly sessions</dt>
              <dd className="cx-sessions">
                {o.sessions.map((s) => (
                  <span key={s.id} className="cx-sess"><b>{s.day.slice(0, 3)}</b><span>{s.start}–{endTime(s)}</span><em>{s.type}</em></span>
                ))}
              </dd>
            </div>
            <div>
              <MapPin size={16} strokeWidth={2} />
              <dt>Venue</dt>
              <dd>{venues.length ? venues.join(", ") : "—"}</dd>
            </div>
            <div>
              <Clock size={16} strokeWidth={2} />
              <dt>Type</dt>
              <dd>{typeSummary(o.sessions)}<small>{o.sessions.length} session{o.sessions.length === 1 ? "" : "s"} a week</small></dd>
            </div>
            <div>
              <GraduationCap size={16} strokeWidth={2} />
              <dt>Year</dt>
              <dd>{o.sheet}</dd>
            </div>
          </dl>
        </div>

        <div className="cx-df">
          <Link to="/attendance" className="cx-start">
            <ClipboardCheck size={17} strokeWidth={2} />
            Start attendance
          </Link>
        </div>
      </>
    );
  };

  const overlays = !wide && current && (
    <div className="cx-drawer-bg" onClick={close}>
      <aside
        className="cx-drawer"
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cx-detail-title"
      >
        {detail(current)}
      </aside>
    </div>
  );

  return (
    <TeacherShell active="classes" overlays={overlays} rootClassName="cx-root">
      <main className="db-main">
        <section className={`cx-panel ${animate ? "" : "cx-still"}`} aria-labelledby="cx-title">
          <header className="cx-hd">
            <div className="cx-hl">
              <div className="cx-hico"><BookOpen size={24} strokeWidth={1.8} /></div>
              <div>
                <h1 className="cx-title" id="cx-title">My Classes</h1>
                <p className="cx-sub">Your courses, groups and weekly slots</p>
              </div>
            </div>
            <span className="cx-term">
              <Calendar size={15} strokeWidth={2} />
              {termLabel()}
            </span>
          </header>

          <div className="cx-layout">
            <div className="cx-left">
              {!wide && <Overview slots={CLASSES} courses={COURSES} compact />}

              <div className="cx-tools">
                <div className="cx-tools-r1">
                  <label className="cx-search">
                    <Search size={16} strokeWidth={2} aria-hidden="true" />
                    <input
                      type="search"
                      placeholder="Search courses, codes, groups, rooms…"
                      aria-label="Search classes"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                    />
                  </label>
                  <Dropdown
                    className="cx-sort"
                    icon={ArrowUpDown}
                    ariaLabel="Sort classes by"
                    value={sort}
                    options={SORT_OPTIONS}
                    onChange={setSort}
                    align="right"
                  />
                </div>
                <div className="cx-tools-r2">
                  {FILTERS.map((f) => (
                    <Dropdown
                      key={f.key}
                      label={f.label}
                      ariaLabel={`Filter by ${f.label.toLowerCase()}`}
                      value={filters[f.key]}
                      options={f.choices}
                      active={filters[f.key] !== "All"}
                      onChange={(v) => setFilters((cur) => ({ ...cur, [f.key]: v }))}
                    />
                  ))}
                </div>
              </div>

              <div className="cx-status">
                <span role="status" aria-live="polite" className="cx-count">
                  Showing <b>{rows.length}</b> of {CLASSES.length} classes
                </span>
                {active.length > 0 && (
                  <ul className="cx-active" aria-label="Active filters">
                    {active.map((a) => (
                      <li key={a.key}>
                        <span>{a.label}: <b>{a.value}</b></span>
                        <button type="button" onClick={() => removeFilter(a.key)} aria-label={`Remove ${a.label.toLowerCase()} filter ${a.value}`}>
                          <X size={12} strokeWidth={2.4} />
                        </button>
                      </li>
                    ))}
                    <li>
                      <button type="button" className="cx-clear" onClick={clearAll}>Clear all</button>
                    </li>
                  </ul>
                )}
              </div>

              <div className="cx-scroll">
                {loading ? (
                  <div className="cx-empty" role="status">
                    <h3>Loading your classes…</h3>
                  </div>
                ) : error ? (
                  <div className="cx-empty" role="alert">
                    <h3>We couldn't load your classes</h3>
                    <p>{error}</p>
                  </div>
                ) : SLOTS.length === 0 ? (
                  <div className="cx-empty">
                    <span className="cx-empty-ico"><BookOpen size={22} strokeWidth={1.8} /></span>
                    <h3>No classes assigned yet</h3>
                    <p>Classes appear here once an administrator gives you a class and adds its weekly lecture slots.</p>
                  </div>
                ) : rows.length === 0 ? (
                  <div className="cx-empty">
                    <span className="cx-empty-ico"><SearchX size={22} strokeWidth={1.8} /></span>
                    <h3>No classes match</h3>
                    <p>Try a different search term or remove a filter.</p>
                    <button type="button" className="cx-btn" onClick={clearAll}>Clear all filters</button>
                  </div>
                ) : (
                  <ul className="cx-grid">
                    {rows.map((o) => {
                      const on = current?.id === o.id;
                      const next = nextOf(o, now);
                      const tone = attendanceTone(o.att);
                      return (
                        <li key={o.id}>
                          <button
                            type="button"
                            className={`cx-card ${on ? "sel" : ""}`}
                            aria-pressed={on}
                            aria-controls={wide && on ? "cx-detail" : undefined}
                            aria-label={`${o.name}, ${o.code}, group ${o.group}. ${o.att == null ? "No attendance saved yet" : `${o.att}% attendance`}, ${toneLabel(o.att).toLowerCase()}. Next session ${nextDayText(next)}${next.live ? "" : ` at ${next.slot.start}`}, ${next.slot.venue}`}
                            onClick={() => select(o)}
                          >
                            <span className="cx-c-top">
                              <span className="cx-year">{o.sheet}</span>
                              <span className={`cx-pill ${tone}`}>{toneLabel(o.att)}</span>
                            </span>
                            <span className="cx-c-name">{o.name}</span>
                            <span className="cx-c-sub">
                              {o.code} · {o.group}
                            </span>
                            <span className="cx-c-att">
                              <span className="cx-c-pct">
                                <b className={tone}>{o.att == null ? "—" : `${o.att}%`}</b>
                                <span>avg. attendance</span>
                              </span>
                              <AttendanceBar att={o.att} />
                            </span>
                            <span className="cx-c-meta">
                              <span className={next.live ? "live" : ""}>
                                <CalendarClock size={14} strokeWidth={2} />
                                {nextDayText(next)}
                                {next.live ? "" : ` · ${next.slot.start}`}
                              </span>
                              <span>
                                <Clock size={14} strokeWidth={2} />
                                {o.sessions.length}/week
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            {wide && (
              <aside className="cx-side" id="cx-detail" aria-label="Class details">
                {current ? (
                  <div className="cx-side-in" key={current.id}>
                    {detail(current)}
                  </div>
                ) : (
                  <div className="cx-side-empty">
                    <span className="cx-empty-ico"><MousePointerClick size={22} strokeWidth={1.8} /></span>
                    <h2>Select a class</h2>
                    <p>Choose a class to see its attendance, next lecture and details, and to start a session.</p>
                    <div className="cx-side-ovw">
                      <span className="cx-ovw-k"><Users size={14} strokeWidth={2} />This term</span>
                      <Overview slots={CLASSES} courses={COURSES} />
                    </div>
                  </div>
                )}
              </aside>
            )}
          </div>
        </section>
      </main>
    </TeacherShell>
  );
}

export default Classes;
