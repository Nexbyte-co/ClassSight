import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Layers,
  Users,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import "../../styles/Dashboard.css";
import "../../styles/Reports.css";
import TeacherShell from "../../components/navigation/TeacherShell";
import { useSettings } from "../../context/settings/SettingsContext";
import { useReports } from "./useReports";

const fmtDate = (d) => d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

function ReportDetails() {
  const [searchParams] = useSearchParams();

  // Dark mode state
  // Attendance requirement from Settings (default 75%)
  const { attendanceThreshold } = useSettings();

  // Parse parameters
  const mode = searchParams.get("mode") || "total"; // 'total' or 'range'
  const course = searchParams.get("course") || "";
  const section = searchParams.get("section") || "";
  const fromDate = searchParams.get("from") || "";
  const toDate = searchParams.get("to") || "";

  const isTotalMode = mode === "total";

  // Every number comes from the batch's real saved sessions.
  const { BATCHES, findBatch, batchSessions, loading } = useReports();
  const batchIndex = findBatch(course, section);
  const batch = batchIndex >= 0 ? BATCHES[batchIndex] : null;
  const allRows = batch ? batchSessions(batchIndex) : [];
  const lectureRows = isTotalMode
    ? allRows
    : allRows.filter((r) => {
        const a = new Date(fromDate);
        const b = new Date(toDate);
        return !isNaN(a) && !isNaN(b) && r.date >= a && r.date <= b;
      });
  const stats = batch ? { code: batch.code, totalStudents: batch.students.length, totalLectures: allRows.length } : null;
  const presentSum = lectureRows.reduce((sum, r) => sum + r.present, 0);
  const possibleSum = lectureRows.reduce((sum, r) => sum + r.total, 0);
  const overallPct = possibleSum > 0 ? Math.round((presentSum / possibleSum) * 100) : 0;
  const rowPct = (r) => (r.total > 0 ? Math.round((r.present / r.total) * 100) : 0);
  const belowThresholdCount = lectureRows.filter((r) => rowPct(r) < attendanceThreshold).length;

  if (!batch) {
    return (
      <TeacherShell active="reports" rootClassName="reports-root">
        <main className="reports-main">
          <div className="teacher-page-nav">
            <Link to="/reports" className="btn-back-breadcrumb">
              <ArrowLeft size={16} aria-hidden="true" />
              <span>Back to Reports</span>
            </Link>
          </div>
          <div className="report-scope-card" role="status">
            <h1 className="scope-title">{loading ? "Loading the report…" : "We couldn't find that class"}</h1>
            {!loading && <div className="scope-meta">Open a class from Reports or Students to see its sessions.</div>}
          </div>
        </main>
      </TeacherShell>
    );
  }

  return (
    <TeacherShell active="reports" rootClassName="reports-root">

        {/* Content */}
        <main className="reports-main">
          {/* Back link + breadcrumb trail */}
          <div className="teacher-page-nav">
            <Link to="/reports" className="btn-back-breadcrumb">
              <ArrowLeft size={16} aria-hidden="true" />
              <span>Back to Reports</span>
            </Link>
            <nav aria-label="Breadcrumb" className="teacher-breadcrumb">
              <ol>
                <li>
                  <Link to="/reports">Reports</Link>
                </li>
                <li aria-current="page">
                  {course} · {section}
                </li>
              </ol>
            </nav>
          </div>

          {/* Scope Card */}
          <div className="report-scope-card">
            <div>
              <h1 className="scope-title">
                {course} <span className="rd-code">{stats.code}</span> <span className="section-chip" style={{ fontSize: 13, verticalAlign: "middle" }}>{section}</span>
              </h1>
              <div className="scope-meta">
                {isTotalMode ? (
                  <span>Showing every recorded session (all-time)</span>
                ) : (
                  <span>
                    Custom Range Report: <strong>{fromDate}</strong> to <strong>{toDate}</strong>
                  </span>
                )}
              </div>
            </div>

            <div className="scope-badge">
              {isTotalMode ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Layers size={14} />
                  <span>All-Time Info</span>
                </span>
              ) : (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Calendar size={14} />
                  <span>Selected Date Range</span>
                </span>
              )}
            </div>
          </div>

          {/* Report Metrics */}
          <div className="report-stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <Layers size={20} />
              </div>
              <div className="stat-value">{isTotalMode ? stats.totalLectures : lectureRows.length}</div>
              <div className="stat-label">{isTotalMode ? "Total Sessions" : "Sessions in Range"}</div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <TrendingUp size={20} />
              </div>
              <div className="stat-value">{overallPct}%</div>
              <div className="stat-label">Average Attendance</div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <Users size={20} />
              </div>
              <div className="stat-value">{stats.totalStudents}</div>
              <div className="stat-label">Enrolled Students</div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <AlertTriangle size={20} />
              </div>
              <div className="stat-value">{belowThresholdCount}</div>
              <div className="stat-label">Sessions Below {attendanceThreshold}%</div>
            </div>
          </div>

          {/* Lecture-wise Breakdown */}
          <div className="lecture-breakdown-card">
            <div className="lecture-breakdown-header">
              <h3>Session-wise Attendance</h3>
              <span className="scope-badge">
                <CheckCircle2 size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
                {isTotalMode ? "All Recorded Sessions" : "Selected Range"}
              </span>
            </div>

            <div className="lecture-breakdown-table">
              <div className="lecture-row lecture-row-head" aria-hidden="true">
                <span>Date</span>
                <span>Session</span>
                <span>Present</span>
                <span>Percentage</span>
                <span>Status</span>
              </div>

              {/* Rows scroll inside the card; the header row stays put */}
              <div className="lecture-breakdown-body" tabIndex={0} aria-label="Sessions">
                {lectureRows.length === 0 ? (
                  <div className="lecture-row-empty">No sessions found for this selection.</div>
                ) : (
                  lectureRows.map((row, idx) => {
                    const pct = rowPct(row);
                    const isLow = pct < attendanceThreshold;
                    return (
                      <div className="lecture-row" key={idx}>
                        <span className="rd-date">{fmtDate(row.date)}</span>
                        <span className="rd-ses">
                          <span className="rd-code">{row.code}</span>
                          <span className={`rd-type ${row.type === "Lab" ? "lab" : "lec"}`}>{row.type}</span>
                          {row.time && (
                            <span className="rd-meta">
                              {row.time} · {row.venue}
                            </span>
                          )}
                        </span>
                        <span>
                          {row.present} / {row.total}
                        </span>
                        <span className="lecture-pct-cell">
                          <span className="lecture-pct-bar-track">
                            <span className="lecture-pct-bar-fill" style={{ width: `${pct}%` }} />
                          </span>
                          {pct}%
                        </span>
                        <span>
                          {isLow ? <span className="badge-detained">Low</span> : <span className="badge-eligible">Good</span>}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </main>
    </TeacherShell>
  );
}

export default ReportDetails;

