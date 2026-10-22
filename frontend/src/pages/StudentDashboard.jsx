// src/pages/StudentDashboard.jsx
// Student portal Dashboard (frontend demo): greeting, weekly stacked attendance chart,
// subject-wise attendance and recent attendance. Uses sessions recorded in ClassSight
// when the student can be matched by roll number; otherwise clearly labelled demo data.
import { useState, useEffect } from "react";
import "./Students.css";
import { useTheme } from "../context/ThemeContext";
import { useAttendance } from "../context/AttendanceContext";
import { useSchedule } from "../context/ScheduleContext";
import { useSettings } from "../context/SettingsContext";
import { useDemoSession } from "../context/DemoSessionContext";
import { findDemoAccount } from "../context/demoSession";
import { formatShortSessionDate } from "../context/scheduleStatus";
import {
  STATUS,
  buildDemoOccurrences,
  buildRecentAttendance,
  buildSubjectSummary,
  buildWeeklyChart,
  firstName,
  getGreeting,
  getRecordedOccurrences,
  getWeekDateKeys,
  mergeOccurrences,
} from "../context/studentWeek";
import { DEMO_HISTORY_WEEKS, DEMO_SUBJECTS, DEMO_TIMETABLE } from "../data/studentDemo";

const STATUS_LABELS = {
  [STATUS.present]: "Present",
  [STATUS.absent]: "Absent",
  [STATUS.unverified]: "Unverified",
  [STATUS.upcoming]: "Upcoming",
};

// Extra colours for recorded subjects that are not in the demo subject list
const FALLBACK_COLORS = [
  ["#b45309", "#f5b356"],
  ["#0f766e", "#5fd1c2"],
  ["#9d174d", "#f08ab5"],
];

function formatMinutes(minutes) {
  const h = Math.floor(minutes / 60);
  const m = String(minutes % 60).padStart(2, "0");
  return `${((h + 11) % 12) + 1}:${m} ${h < 12 ? "AM" : "PM"}`;
}

function DemoDataTag() {
  return (
    <span
      className="section-chip student-demo-data-tag"
      title="Sample timetable data, not records linked to your account"
      style={{ marginLeft: 8, verticalAlign: "middle" }}
    >
      Demo data
    </span>
  );
}

function SectionHeading({ title, desc, demo }) {
  return (
    <>
      <div className="section-title-tag">
        {title}
        {demo && <DemoDataTag />}
      </div>
      <div className="section-desc" style={{ marginBottom: 12 }}>
        {desc}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Weekly stacked bar chart (SVG)
// ---------------------------------------------------------------------------
const CHART = { width: 700, height: 290, left: 40, right: 12, top: 34, bottom: 46, barWidth: 46, gap: 2 };

function SegmentGlyph({ status, x, y, color }) {
  const glyph = status === STATUS.present ? "✓" : status === STATUS.absent ? "✕" : status === STATUS.unverified ? "?" : "";
  if (!glyph) return null;
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize="12"
      fontWeight="700"
      style={{ fill: status === STATUS.present ? "#ffffff" : status === STATUS.absent ? color : "var(--cs-text-secondary)", pointerEvents: "none" }}
    >
      {glyph}
    </text>
  );
}

function WeeklyAttendanceChart({ days, colorFor, todayKey }) {
  const [selected, setSelected] = useState(null);
  const plotHeight = CHART.height - CHART.top - CHART.bottom;
  const plotWidth = CHART.width - CHART.left - CHART.right;
  const maxTotal = Math.max(1, ...days.map((d) => d.total));
  const unit = plotHeight / maxTotal;
  const slot = plotWidth / days.length;
  const baseline = CHART.top + plotHeight;

  const select = (o) => setSelected(o);

  return (
    <div className="student-week-chart">
      <div className="student-week-chart-scroll" style={{ overflowX: "auto" }}>
        <svg
          viewBox={`0 0 ${CHART.width} ${CHART.height}`}
          role="img"
          aria-label="Attendance this week by day, stacked by subject"
          style={{ width: "100%", minWidth: 560, height: "auto", display: "block" }}
        >
          <defs>
            <pattern id="cs-unverified-stripes" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" style={{ fill: "var(--cs-card-hover)" }} />
              <line x1="0" y1="0" x2="0" y2="6" strokeWidth="2.5" style={{ stroke: "var(--cs-text-muted)" }} />
            </pattern>
          </defs>

          {/* Y axis: number of classes */}
          {Array.from({ length: maxTotal + 1 }, (_, n) => {
            const y = baseline - n * unit;
            return (
              <g key={`tick-${n}`}>
                <line x1={CHART.left} x2={CHART.width - CHART.right} y1={y} y2={y} strokeWidth="1" style={{ stroke: "var(--cs-border)" }} />
                <text x={CHART.left - 10} y={y} textAnchor="end" dominantBaseline="central" fontSize="11" style={{ fill: "var(--cs-text-muted)" }}>
                  {n}
                </text>
              </g>
            );
          })}
          <text
            x={12}
            y={CHART.top + plotHeight / 2}
            fontSize="11"
            textAnchor="middle"
            transform={`rotate(-90 12 ${CHART.top + plotHeight / 2})`}
            style={{ fill: "var(--cs-text-muted)" }}
          >
            Classes
          </text>

          {days.map((day, i) => {
            const cx = CHART.left + slot * i + slot / 2;
            const x = cx - CHART.barWidth / 2;
            const isToday = day.dateKey === todayKey;
            const barTop = baseline - day.total * unit;
            const label = day.total === 0 ? "—" : day.held > 0 ? `${day.attended}/${day.held}` : "Upcoming";
            return (
              <g key={day.dateKey} className="week-day" data-date={day.dateKey}>
                {day.segments.map((o, idx) => {
                  const y = baseline - (idx + 1) * unit + CHART.gap / 2;
                  const h = Math.max(unit - CHART.gap, 2);
                  const color = colorFor(o.code);
                  const isSelected = selected?.key === o.key;
                  const common = {
                    x,
                    y,
                    width: CHART.barWidth,
                    height: h,
                    rx: 4,
                  };
                  let fillStyle;
                  if (o.status === STATUS.present) fillStyle = { fill: color, stroke: color };
                  else if (o.status === STATUS.absent) fillStyle = { fill: color, fillOpacity: 0.25, stroke: color };
                  else if (o.status === STATUS.unverified) fillStyle = { fill: "url(#cs-unverified-stripes)", stroke: color };
                  else fillStyle = { fill: "transparent", stroke: color, strokeDasharray: "4 3" };
                  return (
                    <g
                      key={o.key}
                      className={`week-segment status-${o.status}`}
                      data-code={o.code}
                      data-status={o.status}
                      tabIndex={0}
                      role="button"
                      aria-label={`${o.subject}, ${formatShortSessionDate(o.dateKey)}, ${STATUS_LABELS[o.status]}`}
                      onMouseEnter={() => select(o)}
                      onFocus={() => select(o)}
                      onClick={() => select(o)}
                      style={{ cursor: "pointer", outline: "none" }}
                    >
                      <rect {...common} strokeWidth={isSelected ? 3 : 1.5} style={fillStyle} />
                      {h >= 16 && <SegmentGlyph status={o.status} x={cx} y={y + h / 2} color={color} />}
                    </g>
                  );
                })}

                {/* attended/held above the bar, or a dash when no class is scheduled */}
                <text
                  className="week-day-count"
                  x={cx}
                  y={(day.total === 0 ? baseline : barTop) - 8}
                  textAnchor="middle"
                  fontSize="13"
                  fontWeight="700"
                  style={{ fill: day.total === 0 ? "var(--cs-text-muted)" : "var(--cs-text-primary)" }}
                >
                  {label}
                </text>

                <text
                  className="week-day-label"
                  x={cx}
                  y={baseline + 18}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight={isToday ? 700 : 500}
                  style={{ fill: isToday ? "var(--cs-crimson)" : "var(--cs-text-secondary)" }}
                >
                  {day.label}
                </text>
                <text x={cx} y={baseline + 34} textAnchor="middle" fontSize="11" style={{ fill: "var(--cs-text-muted)" }}>
                  {isToday ? "Today" : formatShortSessionDate(day.dateKey).slice(5, 11)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div
        className="week-chart-details"
        aria-live="polite"
        style={{ minHeight: 22, marginTop: 8, fontSize: 13, color: "var(--cs-text-secondary)" }}
      >
        {selected ? (
          <span>
            <strong style={{ color: "var(--cs-text-primary)" }}>{selected.subject}</strong> ·{" "}
            {formatShortSessionDate(selected.dateKey)} · {formatMinutes(selected.startMinutes)} ·{" "}
            <strong>{STATUS_LABELS[selected.status]}</strong>
          </span>
        ) : (
          "Hover over, tap or tab to a class to see its details."
        )}
      </div>
    </div>
  );
}

function ChartLegend({ subjects, colorFor }) {
  const swatch = (status, label) => (
    <span key={status} className="week-status-legend-item" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <svg width="16" height="12" aria-hidden="true">
        <rect
          x="1"
          y="1"
          width="14"
          height="10"
          rx="2"
          strokeWidth="1.5"
          style={
            status === STATUS.present
              ? { fill: "var(--cs-text-secondary)", stroke: "var(--cs-text-secondary)" }
              : status === STATUS.absent
              ? { fill: "var(--cs-text-secondary)", fillOpacity: 0.25, stroke: "var(--cs-text-secondary)" }
              : status === STATUS.unverified
              ? { fill: "url(#cs-unverified-stripes)", stroke: "var(--cs-text-secondary)" }
              : { fill: "transparent", stroke: "var(--cs-text-secondary)", strokeDasharray: "3 2" }
          }
        />
      </svg>
      {label}
    </span>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12, fontSize: 13, color: "var(--cs-text-secondary)" }}>
      <div className="week-subject-legend" style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px" }}>
        {subjects.map((s) => (
          <span key={s.code} className="week-subject-legend-item" data-code={s.code} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: colorFor(s.code), display: "inline-block" }} />
            {s.name}
          </span>
        ))}
      </div>
      <div className="week-status-legend" style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px" }}>
        {swatch(STATUS.present, "Present ✓ (solid)")}
        {swatch(STATUS.absent, "Absent ✕ (light)")}
        {swatch(STATUS.unverified, "Unverified ? (striped)")}
        {swatch(STATUS.upcoming, "Upcoming (outline)")}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subject-wise and recent attendance
// ---------------------------------------------------------------------------
function RequirementBadge({ status }) {
  if (!status) return <span className="room-text">No records yet</span>;
  if (status.level === "safe") return <span className="badge-eligible">{status.label}</span>;
  if (status.level === "critical") return <span className="badge-detained">{status.label}</span>;
  return (
    <span className="badge-eligible" style={{ background: "var(--cs-warning-bg)", color: "var(--cs-warning)" }}>
      {status.label}
    </span>
  );
}

function SubjectAttendance({ rows, colorFor }) {
  return (
    <div className="reports-table-card student-subject-card">
      <div className="reports-table-header">
        <div>SUBJECT</div>
        <div>ATTENDANCE</div>
        <div>STATUS</div>
      </div>
      {rows.map((row) => (
        <div key={row.code} className="reports-table-row student-subject-row" data-code={row.code}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="course-title-text">
              <span style={{ width: 10, height: 10, borderRadius: 3, background: colorFor(row.code), display: "inline-block" }} />
              {row.subject}
            </span>
            <span className="room-text">
              {row.decided > 0 ? `${row.present} of ${row.decided} classes attended` : "No attended or missed classes yet"}
              {row.unverified > 0 && ` · ${row.unverified} awaiting verification`}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              role="progressbar"
              aria-label={`${row.subject} attendance`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={row.pct ?? 0}
              style={{ flex: 1, maxWidth: 220, height: 8, borderRadius: 4, background: "var(--cs-border-subtle)", overflow: "hidden" }}
            >
              <div style={{ width: `${row.pct ?? 0}%`, height: "100%", background: colorFor(row.code), borderRadius: 4 }} />
            </div>
            <span className="attendance-pct-badge">{row.pct === null ? "—" : `${row.pct}%`}</span>
          </div>
          <div>
            <RequirementBadge status={row.status} />
          </div>
        </div>
      ))}
    </div>
  );
}

function RecentAttendance({ entries, colorFor }) {
  const [filter, setFilter] = useState("all");
  const counts = {
    all: entries.length,
    present: entries.filter((e) => e.status === STATUS.present).length,
    absent: entries.filter((e) => e.status === STATUS.absent).length,
  };
  const visible = filter === "all" ? entries : entries.filter((e) => e.status === filter);
  return (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {[
          ["all", "All"],
          ["present", "Present"],
          ["absent", "Absent"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            className="btn-view-session student-recent-filter"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            style={filter === value ? { background: "var(--cs-crimson)", borderColor: "var(--cs-crimson)", color: "#ffffff" } : undefined}
          >
            {label} ({counts[value]})
          </button>
        ))}
      </div>
      <div className="reports-table-card">
        {visible.length === 0 ? (
          <div style={{ padding: 28, textAlign: "center", color: "var(--cs-text-muted)" }}>
            {entries.length === 0 ? "No attendance history yet." : `No ${filter} classes in this list.`}
          </div>
        ) : (
          visible.map((e) => (
            <div
              key={e.key}
              className="student-recent-row"
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: "1px solid var(--cs-border-subtle)" }}
            >
              <span style={{ width: 10, height: 10, borderRadius: 3, background: colorFor(e.code), flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: "var(--cs-text-primary)", fontSize: 14 }}>{e.subject}</div>
                <div className="room-text">
                  {formatShortSessionDate(e.dateKey)} · {formatMinutes(e.startMinutes)}
                </div>
              </div>
              <span
                className={`history-status-badge ${
                  e.status === STATUS.present ? "present" : e.status === STATUS.unverified ? "late" : "absent"
                }`}
              >
                {STATUS_LABELS[e.status]}
              </span>
            </div>
          ))
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
function StudentDashboard() {
  const { session } = useDemoSession();
  const { isDarkMode } = useTheme();
  const { sessions } = useAttendance();
  const { scheduleList } = useSchedule();
  const { attendanceThreshold } = useSettings();

  // Re-evaluate the greeting and which classes are upcoming every minute
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const account = findDemoAccount(session.email);
  const recorded = getRecordedOccurrences(account?.roll, sessions, scheduleList);
  const usingDemo = recorded.length === 0;
  const occurrences = usingDemo
    ? buildDemoOccurrences(DEMO_TIMETABLE, DEMO_SUBJECTS, now, DEMO_HISTORY_WEEKS)
    : mergeOccurrences(recorded, []);

  // Subjects: demo subject list, or the subjects found in recorded sessions
  const subjects = usingDemo
    ? DEMO_SUBJECTS
    : [...new Map(recorded.map((o) => [o.code, { code: o.code, name: o.subject }])).values()];
  const colorFor = (code) => {
    const demo = DEMO_SUBJECTS.find((s) => s.code === code);
    if (demo) return isDarkMode ? demo.darkColor : demo.color;
    const idx = Math.max(0, subjects.findIndex((s) => s.code === code)) % FALLBACK_COLORS.length;
    return FALLBACK_COLORS[idx][isDarkMode ? 1 : 0];
  };

  const weekKeys = getWeekDateKeys(now);
  const days = buildWeeklyChart(occurrences, weekKeys);
  const weekSubjects = subjects.filter((s) => days.some((d) => d.segments.some((o) => o.code === s.code)));
  const subjectRows = buildSubjectSummary(occurrences, subjects, attendanceThreshold);
  const recent = buildRecentAttendance(occurrences, 10);
  const weekHasClasses = days.some((d) => d.total > 0);

  return (
    <div className="student-dashboard">
      <div className="greeting-section">
        <div className="greeting-text">
          <h1 className="student-greeting">
            {getGreeting(now)}, {firstName(session.name)}
          </h1>
          <p>Here&apos;s your attendance this week.</p>
        </div>
      </div>

      {usingDemo && (
        <div
          className="student-demo-notice"
          role="note"
          style={{
            padding: "10px 14px",
            marginBottom: 20,
            borderRadius: 10,
            border: "1px solid var(--cs-crimson-border)",
            background: "var(--cs-crimson-light)",
            color: "var(--cs-text-primary)",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          <strong>Frontend demo.</strong> Your account is not linked to attendance recorded in
          ClassSight yet, so the figures below are <strong>sample demo data</strong> from a demo
          timetable — not your real attendance.
        </div>
      )}

      <section className="student-week-section" style={{ marginBottom: 28 }}>
        <SectionHeading
          title="THIS WEEK"
          desc={`${formatShortSessionDate(weekKeys[0])} – ${formatShortSessionDate(weekKeys[6])} · classes attended out of classes held each day`}
          demo={usingDemo}
        />
        <div className="reports-table-card" style={{ padding: "16px 18px" }}>
          {weekHasClasses ? (
            <>
              <WeeklyAttendanceChart days={days} colorFor={colorFor} todayKey={weekKeys[now.getDay()]} />
              <ChartLegend subjects={weekSubjects} colorFor={colorFor} />
            </>
          ) : (
            <div className="student-week-empty" style={{ padding: 28, textAlign: "center", color: "var(--cs-text-muted)" }}>
              No classes recorded for you this week.
            </div>
          )}
        </div>
      </section>

      <section className="student-subjects-section" style={{ marginBottom: 28 }}>
        <SectionHeading
          title="SUBJECT-WISE ATTENDANCE"
          desc={
            usingDemo
              ? `Sample data over the last ${DEMO_HISTORY_WEEKS} weeks · requirement ${attendanceThreshold}%`
              : `Classes recorded in ClassSight · requirement ${attendanceThreshold}%`
          }
          demo={usingDemo}
        />
        <SubjectAttendance rows={subjectRows} colorFor={colorFor} />
      </section>

      <section className="student-recent-section">
        <SectionHeading title="RECENT ATTENDANCE" desc="Your most recent classes, newest first" demo={usingDemo} />
        <RecentAttendance entries={recent} colorFor={colorFor} />
      </section>
    </div>
  );
}

export default StudentDashboard;
