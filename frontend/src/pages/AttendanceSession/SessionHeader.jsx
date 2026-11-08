// src/pages/AttendanceSession/SessionHeader.jsx — back button, class title and session chips
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, MapPin } from "lucide-react";
import { SESSION } from "./attendanceMock";

export default function SessionHeader({ state }) {
  const navigate = useNavigate();
  const pill = state === "saved" ? ["ok", "Saved"] : state === "ready" ? ["ok", "Ready to save"] : ["wa", "In review"];
  return (
    <div className="as-hd db-rise">
      <button type="button" className="as-back" aria-label="Back to Dashboard" title="Back to Dashboard" onClick={() => navigate("/dashboard")}>
        <ArrowLeft size={22} strokeWidth={2.2} aria-hidden="true" />
      </button>
      <div className="as-atl">
        <div className="as-title-row">
          <h1 className="as-title">{SESSION.name}</h1>
        <div className="as-chips">
          <span className="as-chip">{SESSION.type}</span>
          <span className="as-chip br">{SESSION.group}</span>
          <span className="as-chip">{SESSION.code}</span>
          <span className="as-chip ic">
            <Clock size={12} strokeWidth={2} aria-hidden="true" />
            {SESSION.start} – {SESSION.end}
          </span>
          <span className="as-chip ic">
            <MapPin size={12} strokeWidth={2} aria-hidden="true" />
            {SESSION.venue}
          </span>
          <span className={`as-spill ${pill[0]}`} role="status">
            {pill[1]}
          </span>
        </div>
        </div>
      </div>
    </div>
  );
}
