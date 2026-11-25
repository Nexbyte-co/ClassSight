// src/pages/AttendanceSession/SessionHeader.jsx — back button, class title and session chips
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, MapPin } from "lucide-react";
import { formatShortSessionDate } from "../../context/schedule/scheduleStatus";

export default function SessionHeader({ classroom, lecture, dateKey, state, picker }) {
  const navigate = useNavigate();
  const pill = state === "saved" ? ["ok", "Saved"] : state === "ready" ? ["ok", "Ready to save"] : ["wa", "In review"];
  return (
    <div className="as-hd db-rise">
      <button type="button" className="as-back" aria-label="Back to Dashboard" title="Back to Dashboard" onClick={() => navigate("/dashboard")}>
        <ArrowLeft size={22} strokeWidth={2.2} aria-hidden="true" />
      </button>
      <div className="as-atl">
        <div className="as-title-row">
          <h1 className="as-title">{classroom ? classroom.course : "Attendance"}</h1>
          <div className="as-chips">
            {classroom && <span className="as-chip br">{classroom.section}</span>}
            {classroom?.course_code && <span className="as-chip">{classroom.course_code}</span>}
            <span className="as-chip ic">
              <Calendar size={12} strokeWidth={2} aria-hidden="true" />
              {formatShortSessionDate(dateKey)}
            </span>
            {lecture && (
              <span className="as-chip ic">
                <Clock size={12} strokeWidth={2} aria-hidden="true" />
                {lecture.timeRange || lecture.time}
              </span>
            )}
            {lecture?.room && (
              <span className="as-chip ic">
                <MapPin size={12} strokeWidth={2} aria-hidden="true" />
                {lecture.room}
              </span>
            )}
            {classroom && (
              <span className={`as-spill ${pill[0]}`} role="status">
                {pill[1]}
              </span>
            )}
            {picker}
          </div>
        </div>
      </div>
    </div>
  );
}
