// src/pages/Students/studentUi.jsx
// Small components shared by the student portal pages.
import { LEVEL_LABEL, LEVEL_TONE, STATUS_LABEL } from "./studentUiHelpers";

export function StatusPill({ status, children }) {
  return <span className={`sp-pill s-${status}`}>{children ?? STATUS_LABEL[status]}</span>;
}

/** Healthy / Warning / Critical pill for a course row from the model (none until a class has been held). */
export function LevelPill({ row }) {
  if (!row.status) return <span className="sp-pill s-none">No classes held</span>;
  return <span className={`sp-pill l-${LEVEL_TONE[row.status.level]}`}>{LEVEL_LABEL[row.status.level]}</span>;
}

/** Attendance bar with a tick at the required percentage. */
export function AttendanceBar({ pct, threshold, tone }) {
  return (
    <span className={`sp-bar ${tone}`} aria-hidden="true">
      <i style={{ width: `${pct ?? 0}%` }} />
      <s style={{ left: `${threshold}%` }} />
    </span>
  );
}
