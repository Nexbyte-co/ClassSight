// src/pages/AttendanceSession/UpNextCard.jsx — the next class today and how long until it starts
import { Clock, MapPin, User } from "lucide-react";
import { UP_NEXT } from "./attendanceMock";

export default function UpNextCard({ onStartEarly }) {
  const n = UP_NEXT;
  return (
    <section className="as-card as-next db-rise" aria-label="Up next">
      <div className="as-anh">
        <span className="as-ri2">
          <Clock size={16} strokeWidth={2} aria-hidden="true" />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h4>Up next</h4>
          <div className="as-rs">After this lab</div>
        </div>
        <span className="as-spill ne">{n.type}</span>
      </div>
      <div className="as-anbody">
        <b className="as-ant">{n.name}</b>
        <div className="as-anm">
          <span className="as-chip br">{n.group}</span>
          <span className="as-chip">{n.code}</span>
        </div>
        <div className="as-anrows">
          <span>
            <Clock size={14} strokeWidth={2} aria-hidden="true" />
            {n.time}
          </span>
          <span>
            <MapPin size={14} strokeWidth={2} aria-hidden="true" />
            Room {n.venue}
          </span>
          <span>
            <User size={14} strokeWidth={2} aria-hidden="true" />
            {n.students} students
          </span>
        </div>
      </div>
      {/* Shown only when there's room: tall screens, or the 2-column layout */}
      <div className="as-anlater">
        <span className="as-k2">Later today</span>
        {n.later.map((c) => (
          <div key={c.time} className="as-anli">
            <b>{c.time}</b>
            <div style={{ minWidth: 0, flex: 1 }}>
              <span>{c.name}</span>
              <i>{c.meta}</i>
            </div>
          </div>
        ))}
        <div className="as-anli done">
          <b>{n.dayEnd.time}</b>
          <div style={{ flex: 1 }}>
            <span>No more classes</span>
            <i>{n.dayEnd.meta}</i>
          </div>
        </div>
      </div>
      <div className="as-ancd">
        <span className="as-k2">Starts in</span>
        <b>{n.startsIn}</b>
      </div>
      <button type="button" className="as-b1 as-anb" onClick={onStartEarly}>
        Start attendance early
      </button>
    </section>
  );
}
