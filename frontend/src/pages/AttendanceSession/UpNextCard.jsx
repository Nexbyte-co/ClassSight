// src/pages/AttendanceSession/UpNextCard.jsx — the next lecture today (from the timetable API)
import { Link } from "react-router-dom";
import { Clock, MapPin } from "lucide-react";
import { makeSessionId } from "../../context/schedule/scheduleStatus";

// "09:40 AM" -> minutes since midnight
function toMinutes(label) {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(label || "");
  if (!match) return null;
  let h = Number(match[1]) % 12;
  if ((match[3] || "").toUpperCase() === "PM") h += 12;
  return h * 60 + Number(match[2]);
}

function startsIn(item) {
  const start = toMinutes(item.time);
  if (start == null) return "";
  const now = new Date();
  const diff = start - (now.getHours() * 60 + now.getMinutes());
  if (diff <= 0) return "Started";
  return diff >= 60 ? `${Math.floor(diff / 60)}h ${diff % 60}m` : `${diff}m`;
}

export default function UpNextCard({ upcoming, todayKey, isToday }) {
  const [next, ...later] = upcoming;
  return (
    <section className="as-card as-next db-rise" aria-label="Up next">
      <div className="as-anh">
        <span className="as-ri2">
          <Clock size={16} strokeWidth={2} aria-hidden="true" />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h4>Up next</h4>
          <div className="as-rs">{isToday ? "After this class" : "Past session"}</div>
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
              {next.room && (
                <span>
                  <MapPin size={14} strokeWidth={2} aria-hidden="true" />
                  Room {next.room}
                </span>
              )}
            </div>
          </div>
          {later.length > 0 && (
            <div className="as-anlater">
              <span className="as-k2">Later today</span>
              {later.map((c) => (
                <div key={c.id} className="as-anli">
                  <b>{c.time}</b>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <span>{c.title}</span>
                    <i>{c.section}{c.room ? ` · ${c.room}` : ""}</i>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="as-ancd">
            <span className="as-k2">Starts in</span>
            <b>{startsIn(next) || "—"}</b>
          </div>
          <Link to={`/attendance/${makeSessionId(next.id, todayKey)}`} className="as-b1 as-anb">
            Open its attendance
          </Link>
        </>
      ) : (
        <div className="as-lempty fill">
          <b>{isToday ? "No more classes today" : "Nothing scheduled"}</b>
          {isToday ? "This is your last lecture of the day." : "You are viewing an earlier day."}
        </div>
      )}
    </section>
  );
}
