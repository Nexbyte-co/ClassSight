import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ScanFace,
  Sun,
  Moon,
  ArrowLeft,
  Search,
  AlertCircle,
  Radio,
  Camera,
  UserCheck,
  UserX,
  X,
  CheckCircle2,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useAttendance } from "../context/AttendanceContext";
import "./Attendance.css";

function UnverifiedStudents() {
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const {
    sessionData,
    unverifiedStudents,
    resolveStudent,
    totalStudentsCount,
  } = useAttendance();

  const [searchQuery, setSearchQuery] = useState("");
  const [resolvingStudent, setResolvingStudent] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const filteredStudents = useMemo(() => {
    return unverifiedStudents.filter((student) => {
      const q = searchQuery.toLowerCase().trim();
      return (
        student.name.toLowerCase().includes(q) ||
        student.roll.toLowerCase().includes(q) ||
        (student.reason && student.reason.toLowerCase().includes(q))
      );
    });
  }, [unverifiedStudents, searchQuery]);

  const handleExecuteResolve = (studentId, method) => {
    const student = unverifiedStudents.find((s) => s.id === studentId);
    resolveStudent(studentId, method);
    setResolvingStudent(null);

    const actionText =
      method === "absent"
        ? `Marked ${student?.name || "Student"} as Absent`
        : `Verified ${student?.name || "Student"} via ${
            method === "nfc" ? "NFC Card" : method === "photo" ? "AI Photo Match" : "Manual Check"
          }`;

    setToastMessage(actionText);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

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
          <span className="header-crumb-current">All Unverified Students</span>
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
                <span className="count-pill amber">
                  {unverifiedStudents.length} of {totalStudentsCount} Unverified
                </span>
              </div>
              <h1 className="session-main-title">
                Complete Unverified Students List &bull; {sessionData.classTitle}
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* ================= WORKSPACE ================= */}
      <main className="attendance-workspace-container" style={{ maxWidth: 1100 }}>
        <section className="attendance-card-section unverified-section">
          <div className="table-card-header">
            <div className="table-card-title-group">
              <div className="icon-badge unverified-badge">
                <AlertCircle size={18} strokeWidth={2.2} />
              </div>
              <div>
                <div className="title-with-pill">
                  <h3>All Unverified Records ({unverifiedStudents.length})</h3>
                  <span className="count-pill amber">Requires Attention</span>
                </div>
                <p className="table-card-subtitle">
                  Sorted strictly by Roll No. Click Resolve on any row to verify using NFC, Camera, or Manual attendance.
                </p>
              </div>
            </div>

            {/* Search Input */}
            <div className="search-input-wrapper" style={{ minWidth: 260 }}>
              <Search size={15} color="var(--att-text-secondary)" />
              <input
                type="text"
                placeholder="Search by student name or roll..."
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

          {filteredStudents.length === 0 ? (
            <div className="empty-table-state">
              <CheckCircle2 size={36} strokeWidth={2} color="#16a34a" />
              <h4>{searchQuery ? "No matching unverified students" : "All Students Verified!"}</h4>
              <p>
                {searchQuery
                  ? "Try clearing your search query to see other records."
                  : "All students in this batch have been verified present."}
              </p>
            </div>
          ) : (
            <div className="table-responsive-wrapper">
              <table className="cs-table attendance-table">
                <thead>
                  <tr>
                    <th style={{ width: "32%" }}>Student Name</th>
                    <th style={{ width: "20%" }}>Roll No.</th>
                    <th style={{ width: "30%" }}>Status &amp; Reason</th>
                    <th style={{ width: "18%", textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="table-row-unverified">
                      <td>
                        <div className="student-name-cell">
                          <span className="student-avatar-letter">{student.name.charAt(0)}</span>
                          <div className="student-meta-text">
                            <span className="name-bold">{student.name}</span>
                            {student.reason && <span className="sub-reason">{student.reason}</span>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="roll-badge">{student.roll}</span>
                      </td>
                      <td>
                        <span className="status-badge-unverified">
                          <AlertCircle size={13} strokeWidth={2.2} />
                          <span>{student.status}</span>
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="btn-resolve-action"
                          onClick={() => setResolvingStudent(student)}
                        >
                          Resolve
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="table-card-footer">
            <span>Showing {filteredStudents.length} of {unverifiedStudents.length} total unverified students</span>
            <Link to="/attendance" className="footer-read-more-btn">
              <span>← Back to Attendance Overview</span>
            </Link>
          </div>
        </section>
      </main>

      {/* Resolve Modal */}
      {resolvingStudent && (
        <div className="cs-modal-backdrop" onClick={() => setResolvingStudent(null)}>
          <div className="cs-modal-card resolve-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="cs-modal-header">
              <div className="resolve-student-profile">
                <div className="resolve-avatar">{resolvingStudent.name.charAt(0)}</div>
                <div>
                  <h3>Resolve Verification</h3>
                  <p className="cs-modal-subtitle">
                    <strong>{resolvingStudent.name}</strong> &bull; Roll No:{" "}
                    <strong>{resolvingStudent.roll}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="cs-modal-close"
                onClick={() => setResolvingStudent(null)}
              >
                <X size={19} />
              </button>
            </div>

            <div className="resolve-modal-body">
              {resolvingStudent.reason && (
                <div className="detection-note">
                  <AlertCircle size={15} strokeWidth={2} />
                  <span>Detection Note: {resolvingStudent.reason}</span>
                </div>
              )}

              <p className="resolve-instruction-text">
                Select an action to verify attendance for {resolvingStudent.name}:
              </p>

              <div className="resolve-options-grid">
                <button
                  type="button"
                  className="resolve-option-btn option-nfc"
                  onClick={() => handleExecuteResolve(resolvingStudent.id, "nfc")}
                >
                  <div className="option-icon-box">
                    <Radio size={20} strokeWidth={2} />
                  </div>
                  <div className="option-text-box">
                    <strong>NFC Verify</strong>
                    <span>Scan physical smart card or student tag</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="resolve-option-btn option-photo"
                  onClick={() => handleExecuteResolve(resolvingStudent.id, "photo")}
                >
                  <div className="option-icon-box">
                    <Camera size={20} strokeWidth={2} />
                  </div>
                  <div className="option-text-box">
                    <strong>Upload Another Photo</strong>
                    <span>Re-scan with alternative angle or close-up</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="resolve-option-btn option-manual"
                  onClick={() => handleExecuteResolve(resolvingStudent.id, "manual")}
                >
                  <div className="option-icon-box">
                    <UserCheck size={20} strokeWidth={2} />
                  </div>
                  <div className="option-text-box">
                    <strong>Mark Present Manually</strong>
                    <span>Teacher manual roll-call override</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="resolve-option-btn option-absent"
                  onClick={() => handleExecuteResolve(resolvingStudent.id, "absent")}
                >
                  <div className="option-icon-box">
                    <UserX size={20} strokeWidth={2} />
                  </div>
                  <div className="option-text-box">
                    <strong>Keep Absent</strong>
                    <span>Confirm student is not in classroom</span>
                  </div>
                </button>
              </div>
            </div>

            <div className="cs-modal-actions">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setResolvingStudent(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="attendance-floating-toast">
          <CheckCircle2 size={18} strokeWidth={2.2} color="#16a34a" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default UnverifiedStudents;

