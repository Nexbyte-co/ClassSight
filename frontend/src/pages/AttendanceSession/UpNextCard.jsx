// src/pages/AttendanceSession/UpNextCard.jsx — the next class on today's schedule
import { Clock, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

export default function UpNextCard({ next, to }) {
  return (
    <section className="as-card as-next db-rise" aria-label="Up next">
      <div className="as-anh">
        <span className="as-ri2">
          <Clock size={16} strokeWidth={2} aria-hidden="true" />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h4>Up next</h4>
          <div className="as-rs">After this class</div>
        </div>
      </div>
      {next ? (
        <>
          <div className="as-anbody">
            <b className="as-ant">{next.title}</b>
            <div className="as-anm">
              <span className="as-chip br">{next.section}</span>
              {next.code && <span className="as-chip">{next.code}</span>}
            </div>
            <div className="as-anrows">
              <span>
                <Clock size={14} strokeWidth={2} aria-hidden="true" />
                {next.timeRange || next.time}
              </span>
              <span>
                <MapPin size={14} strokeWidth={2} aria-hidden="true" />
                Room {next.room}
              </span>
            </div>
          </div>
          <Link to={to} className="as-b1 as-anb" style={{ textAlign: "center" }}>
            Open attendance
          </Link>
        </>
      ) : (
        <div className="as-lempty fill">
          <b>No more classes</b>
          Nothing else is scheduled today.
        </div>
      )}
    </section>
  );
}
