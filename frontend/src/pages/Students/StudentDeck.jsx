// src/pages/Students/StudentDeck.jsx — the selected student: identity, attendance by session, and what they need next
import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, CircleAlert, X } from "lucide-react";
import AttendanceRing from "../../components/attendance/AttendanceRing";
import { getAtRiskFloor } from "../../context/settings/settingsStore";
import { BAND_LABEL, bandOf, dayLabel, labsToReach, shortDate } from "./studentData";

// Days shown at once (the CSS shows the last 4 of them on phones)
const WINDOW = 6;

const weekday = (d) => d.toLocaleDateString("en-GB", { weekday: "short" });
const dayMonth = (d) => `${d.getDate()} ${d.toLocaleDateString("en-GB", { month: "short" })}`;

function DayCell({ date, classes, current }) {
  const [c] = classes;
  const status = c.excused ? "Excused" : c.ok ? "Present" : "Absent";
  return (
    <div className={`st-dc${current ? " cur" : ""}`} title={`${dayLabel(date)} · ${c.t} · ${status}`}>
      <span className="st-dw">{weekday(date)}</span>
      <span className={`st-dq ${c.ok ? "p" : "a"}`}>
        {c.ok ? <Check size={13} strokeWidth={3} aria-hidden="true" /> : <X size={11} strokeWidth={3} aria-hidden="true" />}
        <span className="sr-only">{status}</span>
      </span>
      <span className="st-dd">{dayMonth(date)}</span>
    </div>
  );
}

/** Attendance by session day, paged with ‹ › (starts on the latest days) */
function DayStrip({ days }) {
  const max = Math.max(0, days.length - WINDOW);
  const [offset, setOffset] = useState(max);
  if (!days.length) {
    return (
      <div className="st-dhd">
        <span className="st-k2">Attendance by day</span>
        <span className="st-dnote">No attendance saved for this student yet</span>
      </div>
    );
  }
  const from = days[offset].date;
  const to = days[Math.min(days.length, offset + WINDOW) - 1].date;
  return (
    <>
      <div className="st-dhd">
        <span className="st-k2">Attendance by day</span>
        <span className="st-dnote">
          {shortDate(from)} – {shortDate(to)}
        </span>
      </div>
      <div className="st-drow">
        <button
          type="button"
          className="st-lnav"
          aria-label="Earlier days"
          disabled={offset <= 0}
          onClick={() => setOffset((o) => Math.max(0, o - WINDOW))}
        >
          <ChevronLeft size={16} strokeWidth={2.4} aria-hidden="true" />
        </button>
        <div className="st-dcells">
          {days.slice(offset, offset + WINDOW).map((day, k) => {
            const w = offset + k;
            return <DayCell key={w} date={day.date} classes={day.classes} current={w === days.length - 1} />;
          })}
        </div>
        <button
          type="button"
          className="st-lnav"
          aria-label="Later days"
          disabled={offset >= max}
          onClick={() => setOffset((o) => Math.min(max, o + WINDOW))}
        >
          <ChevronRight size={16} strokeWidth={2.4} aria-hidden="true" />
        </button>
      </div>
    </>
  );
}

/** "Missed 28 Sept, 5 Oct, 19 Oct and 2 more. Attending the next 12 sessions in a row brings them up to 75%." */
function standingNote(student, thr) {
  if (!student.h) return "No attendance has been saved for this student yet.";
  const missed = student.days.filter((d) => !d.classes[0].ok).map((d) => shortDate(d.date));
  const list = missed.length > 3 ? `${missed.slice(-3).join(", ")} and ${missed.length - 3} more` : missed.join(", ");
  if (student.pct >= thr) return student.a === student.h ? "Hasn’t missed a single session so far." : `On track. Missed ${list}.`;
  const need = labsToReach(student, thr);
  const target = student.pct >= getAtRiskFloor(thr) ? "them back to Good." : `them up to ${thr}%.`;
  return `Missed ${list}. Attending the next ${need} session${need > 1 ? "s" : ""} in a row brings ${target}`;
}

export default function StudentDeck({ student, thr }) {
  if (!student) {
    return (
      <section className="st-card st-sdeck" aria-label="Selected student">
        <div className="st-sempty">
          <b>No student selected</b>
          Pick a student from the lists below.
        </div>
      </section>
    );
  }
  const band = bandOf(student.pct, thr);
  return (
    <section className="st-card st-sdeck" aria-label="Selected student" aria-live="polite">
      <div className="st-sid">
        <AttendanceRing pct={student.pct} size={64} stroke={7} fontSize={15} color={`var(--st-${band}f)`} />
        <div style={{ minWidth: 0 }}>
          <b className="st-snm">{student.name}</b>
          <span className="st-srl">
            {student.roll} · {student.batch}
          </span>
        </div>
        <div className="st-sst">
          <span className={`st-spill ${band}`}>
            {BAND_LABEL[band]} · {student.a} of {student.h} sessions
          </span>
          <span>{student.last ? `Last attended ${shortDate(student.last)}` : "No sessions attended yet"}</span>
          <span>{student.faceEnrolled ? "Face enrolled" : "Face not enrolled"}</span>
        </div>
      </div>
      <DayStrip days={student.days} />
      <div className={`st-snote ${band}`}>
        <CircleAlert size={15} strokeWidth={2} aria-hidden="true" />
        <span>{standingNote(student, thr)}</span>
      </div>
    </section>
  );
}
