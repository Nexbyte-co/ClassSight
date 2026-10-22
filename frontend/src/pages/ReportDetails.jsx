import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Sun,
  Moon,
  ArrowLeft,
  ScanFace,
  Menu,
  LineChart,
  Calendar,
  Layers,
  Users,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import "./Dashboard.css";
import "./Reports.css";
import { useTheme } from "../context/ThemeContext";
import AppNavigationDrawer from "../components/AppNavigationDrawer";
import TeacherProfileMenu from "../components/TeacherProfileMenu";
import TeacherNotificationsMenu from "../components/TeacherNotificationsMenu";
import { useSettings } from "../context/SettingsContext";

function ReportDetails() {
  const [searchParams] = useSearchParams();

  // Dark mode state
  const { isDarkMode, toggleDarkMode } = useTheme();
  // Attendance requirement from Settings (default 75%)
  const { attendanceThreshold } = useSettings();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Parse parameters
  const mode = searchParams.get("mode") || "total"; // 'total' or 'range'
  const course = searchParams.get("course") || "Data Structures";
  const section = searchParams.get("section") || "3C2";
  const fromDate = searchParams.get("from") || "01 Sep 2026";
  const toDate = searchParams.get("to") || "05 Sep 2026";

  const isTotalMode = mode === "total";

  // Per-course baseline stats (mirrors the sample data used on the Reports page)
  const courseStatsMap = {
    "Data Structures": { code: "UCE301", totalStudents: 50, totalLectures: 28 },
    "Database Systems": { code: "UCE305", totalStudents: 50, totalLectures: 26 },
    "Operating Systems": { code: "UCE304", totalStudents: 48, totalLectures: 30 },
  };
  const stats = courseStatsMap[course] || courseStatsMap["Data Structures"];

  // Build lecture-wise rows: one row per day in range mode, or the most
  // recent sessions in total mode. Present-count is derived deterministically
  // so the numbers stay stable for a given course/date instead of re-randomizing.
  const buildLectureRows = () => {
    const rows = [];
    const seed = course.length;

    if (isTotalMode) {
      const count = Math.min(stats.totalLectures, 8);
      for (let i = 0; i < count; i++) {
        const lectureNum = stats.totalLectures - count + i + 1;
        const present = Math.max(
          Math.round(stats.totalStudents * 0.7),
          stats.totalStudents - ((lectureNum * 3 + seed) % 9)
        );
        rows.push({ label: `Lecture ${lectureNum}`, present, total: stats.totalStudents });
      }
    } else {
      const start = new Date(fromDate);
      const end = new Date(toDate);
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        const cursor = new Date(start);
        let dayIndex = 0;
        while (cursor <= end) {
          const present = Math.max(
            Math.round(stats.totalStudents * 0.7),
            stats.totalStudents - ((dayIndex * 3 + seed) % 9)
          );
          rows.push({
            label: cursor.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
            present,
            total: stats.totalStudents,
          });
          cursor.setDate(cursor.getDate() + 1);
          dayIndex++;
        }
      }
    }
    return rows;
  };

  const lectureRows = buildLectureRows();
  const presentSum = lectureRows.reduce((sum, r) => sum + r.present, 0);
  const possibleSum = lectureRows.length * stats.totalStudents;
  const overallPct = possibleSum > 0 ? Math.round((presentSum / possibleSum) * 100) : 0;
  const belowThresholdCount = lectureRows.filter(
    (r) => Math.round((r.present / r.total) * 100) < attendanceThreshold
  ).length;

  return (
    <div className={`reports-root teacher-ui ${isDarkMode ? "dark-mode" : ""}`}>
      {/* ================= HEADER ================= */}
      <header className="dashboard-header">
        <div className="header-left">
          <button
            type="button"
            className="hamburger-nav-btn"
            aria-expanded={isNavOpen}
            onClick={() => setIsNavOpen(!isNavOpen)}
            aria-label={isNavOpen ? "Close navigation menu" : "Open navigation menu"}
            title={isNavOpen ? "Close navigation" : "Open navigation"}
          >
            <Menu size={22} aria-hidden="true" />
          </button>

          <Link to="/dashboard" className="brand-link">
            <div className="brand-icon">
              <ScanFace size={20} strokeWidth={2.2} />
            </div>
            <span className="brand-name">ClassSight</span>
          </Link>
        </div>

        <div className="header-right">
          <button
            className="header-icon-btn"
            onClick={toggleDarkMode}
            aria-label="Toggle color theme"
          >
            {isDarkMode ? <Sun size={19} strokeWidth={1.8} /> : <Moon size={19} strokeWidth={1.8} />}
          </button>

          {/* Notifications (demo content) */}
          <TeacherNotificationsMenu
            items={[{ id: 1, title: "Monthly Report Ready", text: "August attendance consolidated for 3C2." }]}
            open={isNotificationsOpen}
            onOpenChange={(open) => {
              setIsNotificationsOpen(open);
              if (open) setIsProfileOpen(false);
            }}
          />

          <TeacherProfileMenu
            open={isProfileOpen}
            onOpenChange={(open) => {
              setIsProfileOpen(open);
              if (open) setIsNotificationsOpen(false);
            }}
          />
        </div>
      </header>

      {/* ================= MAIN SHELL ================= */}
      <div className="dashboard-body">
        {/* Navigation Drawer */}
        <AppNavigationDrawer
          isOpen={isNavOpen}
          onClose={() => setIsNavOpen(false)}
          activePage="reports"
        />

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
                {course} <span className="section-chip" style={{ fontSize: 13, verticalAlign: "middle" }}>{section}</span>
              </h1>
              <div className="scope-meta">
                {isTotalMode ? (
                  <span>Showing Total Recorded Lectures (All-Time Cumulative Information)</span>
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
              <div className="stat-label">{isTotalMode ? "Total Lectures" : "Lectures in Range"}</div>
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
              <h3>Lecture-wise Attendance</h3>
              <span className="scope-badge">
                <CheckCircle2 size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
                {isTotalMode ? "All Recorded Sessions" : "Selected Range"}
              </span>
            </div>

            <div className="lecture-breakdown-table">
              <div className="lecture-row lecture-row-head">
                <span>Session</span>
                <span>Present</span>
                <span>Percentage</span>
                <span>Status</span>
              </div>

              {lectureRows.length === 0 ? (
                <div className="lecture-row-empty">No lectures found for this selection.</div>
              ) : (
                lectureRows.map((row, idx) => {
                  const pct = Math.round((row.present / row.total) * 100);
                  const isLow = pct < attendanceThreshold;
                  return (
                    <div className="lecture-row" key={idx}>
                      <span>{row.label}</span>
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
                        {isLow ? (
                          <span className="badge-detained">Low</span>
                        ) : (
                          <span className="badge-eligible">Good</span>
                        )}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default ReportDetails;

