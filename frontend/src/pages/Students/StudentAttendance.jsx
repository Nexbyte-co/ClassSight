// src/pages/Students/StudentAttendance.jsx
// Reports: an analytics page for the student's attendance. Global filters (semester, date range, course) drive four KPIs,
// the attendance trend, the course comparison, the course table, insights and the full history, and the same selection
// is what the CSV / PDF export contains. Calculations live in reports/reportData.js and reuse the portal's weighting
// (a lab counts as two lectures) and the configured required percentage.
import { useMemo, useState } from "react";
import { Download, FileText, TrendingUp } from "lucide-react";
import "./StudentPages.css";
import "./StudentReports.css";
import CountUp from "../../components/motion/CountUp";
import { useStudentModel } from "../../context/students/useStudentModel";
import { STATUS } from "../../context/students/studentWeek";
import { termLabel } from "../../utils/termLabel";
import { LevelPill } from "./studentUi";
import { STATUS_LABEL, formatClock, useCourseColor } from "./studentUiHelpers";
import { CourseBars, HistoryChart, TrendChart } from "./reports/ReportCharts";
import ReportCalendar from "./reports/ReportCalendar";
import Dropdown from "../Classes/Dropdown";
import "./StudentReportFilters.css";
import { buildHistory, buildTrend, courseRows, filterHeld, kindOf, summarise } from "./reports/reportData";
import { downloadCsv, downloadPdf } from "./reports/exportFiles";

const dayLabel = (k) => new Date(...k.split("-").map((n, i) => (i === 1 ? n - 1 : +n))).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default function StudentAttendance() {
  const m = useStudentModel();
  const colorFor = useCourseColor(m.courses);
  const T = m.threshold;

  // Filters: semester and course in the header, date range from the calendar
  const heldAll = useMemo(() => m.occurrences.filter((o) => o.status !== STATUS.upcoming), [m.occurrences]);
  const first = heldAll.reduce((k, o) => (o.dateKey < k ? o.dateKey : k), m.todayKey);
  const [range, setRange] = useState(null); // null = whole semester
  const [anchor, setAnchor] = useState(null);
  const [month, setMonth] = useState(() => new Date(m.now.getFullYear(), m.now.getMonth(), 1));
  const [course, setCourse] = useState(() => m.courses[0]?.code ?? "all");
  const [selected, setSelected] = useState(null);
  const from = range?.from ?? first;
  const to = range?.to ?? m.todayKey;
  const pick = (k) => {
    if (anchor === null) {
      setAnchor(k);
      setRange({ from: k, to: k });
    } else {
      setAnchor(null);
      setRange({ from: k < anchor ? k : anchor, to: k < anchor ? anchor : k });
    }
  };
  const reset = () => {
    setAnchor(null);
    setRange(null);
  };
  const rangeText = range ? `${dayLabel(from)} to ${dayLabel(to)}` : "Whole semester";

  const held = useMemo(() => filterHeld(m.occurrences, { from, to, course }), [m.occurrences, from, to, course]);
  const shownCourses = useMemo(() => (course === "all" ? m.courses : m.courses.filter((c) => c.code === course)), [m.courses, course]);
  const rows = useMemo(() => courseRows(shownCourses, held, T), [shownCourses, held, T]);
  const summary = useMemo(() => summarise(rows, held, T), [rows, held, T]);
  // Short ranges read best day by day, a term week by week, and a long span month by month
  const days = Math.round((new Date(...to.split("-").map((n, i) => (i === 1 ? n - 1 : +n))) - new Date(...from.split("-").map((n, i) => (i === 1 ? n - 1 : +n)))) / 86400000) + 1;
  const view = days <= 21 ? "daily" : days <= 150 ? "weekly" : "monthly";
  const points = useMemo(() => buildTrend(held, view), [held, view]);
  // Course comparison is independent of the Course filter: it always covers every course (the date range still applies)
  const cmpHeld = useMemo(() => filterHeld(m.occurrences, { from, to, course: "all" }), [m.occurrences, from, to]);
  const cmpRows = useMemo(() => courseRows(m.courses, cmpHeld, T), [m.courses, cmpHeld, T]);
  const cmpSummary = useMemo(() => summarise(cmpRows, cmpHeld, T), [cmpRows, cmpHeld, T]);
  // Overall card: every course over the whole semester, not affected by any filter
  const allSummary = useMemo(() => summarise(courseRows(m.courses, heldAll, T), heldAll, T), [m.courses, heldAll, T]);
  // Course history: follows the Semester and Course filters and the calendar range
  const buckets = useMemo(() => buildHistory(held, view), [held, view]);
  const recent = useMemo(() => [...held].sort((a, b) => b.dateKey.localeCompare(a.dateKey) || b.startMinutes - a.startMinutes), [held]);
  // The detail under the bars shows the clicked course, otherwise the one chosen in the Course filter
  const sel = cmpRows.find((r) => r.code === (selected ?? course)) ?? null;

  // Not shown on the page; the exports list every class in the selection
  const history = useMemo(
    () => held.map((h) => ({ ...h, kind: kindOf(h), statusLabel: STATUS_LABEL[h.status], time: formatClock(h.startMinutes) })).sort((a, b) => b.dateKey.localeCompare(a.dateKey) || b.startMinutes - a.startMinutes),
    [held]
  );
  const exportData = {
    filters: { semester: termLabel(), range: rangeText, course: course === "all" ? "All courses" : m.courses.find((c) => c.code === course)?.name },
    summary,
    rows,
    history,
    threshold: T,
  };
  const fileBase = `classsight-report-${m.todayKey}`;


  return (
    <div className="sp-page rp">
      <header className="sp-hd">
        <div>
          <h1>Reports</h1>
          <p>
            {T}% required · a lab counts as 2 lectures · {held.length} class{held.length === 1 ? "" : "es"}{m.usingDemo ? " · sample data" : ""}
          </p>
        </div>
        <span className="sp-tools rp-filters" aria-label="Report filters">
          <button type="button" className="sp-btn" onClick={() => downloadCsv(exportData, `${fileBase}.csv`)}><Download size={15} strokeWidth={2} />CSV</button>
          <button type="button" className="sp-btn primary" onClick={() => downloadPdf(exportData, `${fileBase}.pdf`)}><FileText size={15} strokeWidth={2} />PDF</button>
        </span>
      </header>

      <div className="rp-board">
      <div className="rp-top">
      <div className="rp-fl" role="group" aria-label="Report filters">
        <Dropdown label="Semester" ariaLabel="Semester" value="current" options={[{ value: "current", label: termLabel() }]} onChange={() => {}} />
        <Dropdown
          label="Course"
          ariaLabel="Course"
          value={course}
          options={m.courses.map((c) => ({ value: c.code, label: c.name }))}
          onChange={(v) => { setCourse(v); setSelected(null); }}
        />
      </div>
      <div className="rp-kpis">
        <section className="sp-kpi rp-kpi rp-overall">
          <span className="sp-k">Overall attendance</span>
          <b className={`sp-n ${allSummary.eligibleCourses < allSummary.courses ? "warn" : ""}`}><CountUp value={allSummary.eligibleCourses} /><small> / {allSummary.courses}</small></b>
          <span className="sp-s">courses meeting {T}% this semester</span>
        </section>
      </div>
      </div>

      <div className="rp-mid">
        <section className="sp-card rp-card rp-tr" aria-labelledby="rp-trend">
          <header className="sp-ch">
            <h2 id="rp-trend"><TrendingUp size={16} strokeWidth={2} />Attendance trend</h2>
          </header>
          <p className="sp-sub">Cumulative attendance by {view === "daily" ? "day" : view === "weekly" ? "week" : "month"} for the dates picked in the calendar. Hover or use the arrow keys for details.</p>
          <TrendChart points={points} threshold={T} view={view} signature={`${view}|${from}|${to}|${course}`} />
        </section>
        <ReportCalendar month={month} onMonthChange={setMonth} min={first} max={m.todayKey} from={from} to={to} anchor={anchor} onPick={pick} onReset={reset} todayKey={m.todayKey} />
        <section className="sp-card rp-card rp-cmp" aria-labelledby="rp-compare">
          <header className="sp-ch">
            <h2 id="rp-compare">Course comparison</h2>
            <span className="rp-key"><i className="ok" />At or above {T}%<i className="warn" />Below</span>
          </header>
          <div className="rp-scroll">
            <CourseBars rows={cmpRows} threshold={T} selected={sel?.code ?? null} onSelect={(c) => { setCourse(c); setSelected(null); }} colorFor={colorFor} />
          </div>
          {sel && (
            <div className="rp-detail" key={sel.code} aria-live="polite">
              <div className="rp-dh"><b>{sel.name}</b><LevelPill row={sel} /></div>
              <dl>
                <div><dt>Attendance</dt><dd>{sel.pct}%</dd></div>
                <div><dt>Attended</dt><dd>{sel.classes.present} class{sel.classes.present === 1 ? "" : "es"}</dd></div>
                <div><dt>Missed</dt><dd>{sel.classes.absent} class{sel.classes.absent === 1 ? "" : "es"}</dd></div>
              </dl>
            </div>
          )}
          {!sel && (
            <div className="rp-detail" aria-live="polite">
              <div className="rp-dh"><b>All courses</b><span className="sp-sub">Select a course for details</span></div>
              <dl>
                <div><dt>Attendance</dt><dd>{cmpSummary.pct === null ? "—" : `${cmpSummary.pct}%`}</dd></div>
                <div><dt>Attended</dt><dd>{cmpSummary.classes.present} classes</dd></div>
                <div><dt>Missed</dt><dd>{cmpSummary.classes.absent} classes</dd></div>
              </dl>
            </div>
          )}
        </section>

      </div>
      <section className="sp-card rp-card rp-hist" aria-labelledby="rp-hist">
        <header className="sp-ch">
          <h2 id="rp-hist">{course === "all" ? "Course history" : `${m.courses.find((c) => c.code === course)?.name} history`}</h2>
          <span className="rp-key"><i className="ok" />Attended<i className="bad" />Missed<i className="warn" />Pending · {rangeText}</span>
        </header>
        <div className="rp-hbody">
          <HistoryChart buckets={buckets} view={view} />
          <ul className="rp-hlist rp-scroll" aria-label="Classes in this selection, newest first">
            {recent.map((h) => (
              <li key={h.key}>
                <i className="sp-dot" style={{ "--c": colorFor(h.code) }} />
                <span className="rp-hl-n"><b>{h.subject}</b><small>{dayLabel(h.dateKey)} · {formatClock(h.startMinutes)} · {kindOf(h)}</small></span>
                <span className={`sp-pill s-${h.status}`}>{STATUS_LABEL[h.status]}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
      </div>
    </div>
  );
}
