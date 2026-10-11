import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ScanFace,
  Sun,
  Moon,
  ArrowLeft,
  Search,
  CheckCircle2,
  Check,
  Radio,
  Camera,
  UserCheck,
  X,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useAttendance } from "../context/AttendanceContext";
import "./Attendance.css";

function VerifiedStudents() {
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { sessionData, verifiedStudents, totalStudentsCount } = useAttendance();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMethodFilter, setSelectedMethodFilter] = useState("all");

  const filteredStudents = useMemo(() => {
    return verifiedStudents.filter((student) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        student.name.toLowerCase().includes(q) ||
        student.roll.toLowerCase().includes(q);

      const matchesMethod =
        selectedMethodFilter === "all" ||
        (selectedMethodFilter === "ai" && student.method === "AI Match") ||
        (selectedMethodFilter === "nfc" && student.method === "NFC") ||
        (selectedMethodFilter === "manual" && student.method === "Manual");

      return matchesSearch && matchesMethod;
    });
  }, [verifiedStudents, searchQuery, selectedMethodFilter]);

  return (
    <div className={`attendance-page-root ${isDarkMode ? "dark-mode" : ""}`}>
      {/* ================= HEADER ================= */}
      <header className="attendance-top-header">
        <div className="header-left">
          <Link to="/dashboard" className="brand-link" title="ClassSight Dashboard">
            <div className="brand-icon">
              <ScanFace size={20} strokeWidth={2.2} />
            </div>
            <span className="brand-name">ClassSight</span>
          </Link>
          <span className="header-crumb-sep">/</span>
          <Link to="/attendance" className="header-crumb-current" style={{ textDecoration: "none" }}>
            Attendance
          </Link>
          <span className="header-crumb-sep">/</span>
          <span className="header-crumb-current">All Verified Students</span>
        </div>

        <div className="header-right">
          <button
            className="header-icon-btn"
            onClick={toggleDarkMode}
            aria-label="Toggle color theme"
          >
            {isDarkMode ? <Sun size={19} strokeWidth={1.8} /> : <Moon size={19} strokeWidth={1.8} />}
          </button>
          <div className="profile-pill">
            <div className="profile-avatar">PJ</div>
            <span className="profile-name">Prof. Jhonsy</span>
          </div>
        </div>
      </header>

      {/* ================= SUB HEADER ================= */}
      <div className="session-context-bar">
        <div className="session-context-inner">
          <div className="session-context-left">
            <button
              type="button"
              className="btn-back-dashboard"
              onClick={() => navigate("/attendance")}
            >
              <ArrowLeft size={16} strokeWidth={2.2} />
              <span>Back to Attendance Overview</span>
            </button>
            <div className="session-title-block">
              <div className="session-badge-row">
                <span className="badge-section">{sessionData.section}</span>
                <span className="badge-course-code">{sessionData.courseCode}</span>
                <span className="count-pill green">
                  {verifiedStudents.length} of {totalStudentsCount} Present
                </span>
              </div>
              <h1 className="session-main-title">
                Complete Verified Attendance Roster &bull; {sessionData.classTitle}
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* ================= WORKSPACE ================= */}
      <main className="attendance-workspace-container" style={{ maxWidth: 1100 }}>
        <section className="attendance-card-section verified-section">
          <div className="table-card-header" style={{ flexWrap: "wrap" }}>
            <div className="table-card-title-group">
              <div className="icon-badge verified-badge">
                <CheckCircle2 size={18} strokeWidth={2.2} />
              </div>
              <div>
                <div className="title-with-pill">
                  <h3>All Verified Students ({verifiedStudents.length})</h3>
                  <span className="count-pill green">Confirmed Present</span>
                </div>
                <p className="table-card-subtitle">
                  Strictly sorted in ascending order by Roll No. Filter by verification method or search by student name.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {/* Method Filter Buttons */}
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setSelectedMethodFilter("all")}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 6,
                    border: "1px solid var(--att-border)",
                    background: selectedMethodFilter === "all" ? "var(--att-crimson)" : "transparent",
                    color: selectedMethodFilter === "all" ? "#ffffff" : "var(--att-text-secondary)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  All ({verifiedStudents.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMethodFilter("ai")}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 6,
                    border: "1px solid var(--att-border)",
                    background: selectedMethodFilter === "ai" ? "var(--att-crimson)" : "transparent",
                    color: selectedMethodFilter === "ai" ? "#ffffff" : "var(--att-text-secondary)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  AI Match
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMethodFilter("nfc")}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 6,
                    border: "1px solid var(--att-border)",
                    background: selectedMethodFilter === "nfc" ? "var(--att-crimson)" : "transparent",
                    color: selectedMethodFilter === "nfc" ? "#ffffff" : "var(--att-text-secondary)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  NFC
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMethodFilter("manual")}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 6,
                    border: "1px solid var(--att-border)",
                    background: selectedMethodFilter === "manual" ? "var(--att-crimson)" : "transparent",
                    color: selectedMethodFilter === "manual" ? "#ffffff" : "var(--att-text-secondary)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Manual
                </button>
              </div>

              {/* Search Input */}
              <div className="search-input-wrapper" style={{ minWidth: 240 }}>
                <Search size={15} color="var(--att-text-secondary)" />
                <input
                  type="text"
                  placeholder="Search name or roll no..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    color: "inherit",
                    fontSize: 13,
                    width: "100%",
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--att-text-secondary)" }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="empty-table-state">
              <p>No verified students match the selected filter criteria.</p>
            </div>
          ) : (
            <div className="table-responsive-wrapper">
              <table className="cs-table attendance-table">
                <thead>
                  <tr>
                    <th style={{ width: "35%" }}>Student Name</th>
                    <th style={{ width: "20%" }}>Roll No.</th>
                    <th style={{ width: "22%" }}>Status</th>
                    <th style={{ width: "23%", textAlign: "right" }}>Verification Method</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="table-row-verified">
                      <td>
                        <div className="student-name-cell">
                          <span className="student-avatar-letter green">{student.name.charAt(0)}</span>
                          <span className="name-bold">{student.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className="roll-badge">{student.roll}</span>
                      </td>
                      <td>
                        <span className="status-badge-present">
                          <Check size={13} strokeWidth={2.5} />
                          <span>{student.status}</span>
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <span
                          className={`method-pill ${
                            student.method === "AI Match"
                              ? "method-ai"
                              : student.method === "NFC"
                              ? "method-nfc"
                              : "method-manual"
                          }`}
                        >
                          {student.method === "AI Match" && <Camera size={12} strokeWidth={2} />}
                          {student.method === "NFC" && <Radio size={12} strokeWidth={2} />}
                          {student.method === "Manual" && <UserCheck size={12} strokeWidth={2} />}
                          <span>{student.method}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="table-card-footer">
            <span>Showing {filteredStudents.length} of {verifiedStudents.length} verified students</span>
            <Link to="/attendance" className="footer-read-more-btn">
              <span>← Back to Attendance Overview</span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

export default VerifiedStudents;

