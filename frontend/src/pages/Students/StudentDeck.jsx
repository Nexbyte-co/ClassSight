// src/pages/Students/StudentDeck.jsx — the selected student: identity, attendance by day, and what they need next
import { useId, useState } from "react";
import { Check, ChevronLeft, ChevronRight, CircleAlert, X } from "lucide-react";
import AttendanceRing from "../../components/attendance/AttendanceRing";
import { getAtRiskFloor } from "../../context/settings/settingsStore";
import { BAND_LABEL, SESSIONS, bandOf, dayLabel, labDate, labsToReach, shortDate } from "./studentsMock";

// Days shown at once (the CSS shows the last 4 of them on phones)
const WINDOW = 6;

const weekday = (d) => d.toLocaleDateString("en-GB", { weekday: "short" });
const dayMonth = (d) => `${d.getDate()} ${d.toLocaleDateString("en-GB", { month: "short" })}`;

/** Hover/focus details for a day with 2+ classes */
function DayTooltip({ id, date, classes, attended, held }) {
  return (
    <div className="st-dtip" role="tooltip" id={id}>
      <div className="th">
        <b>{dayLabel(date)}</b>
        <span>{classes.length} classes</span>
      </div>
      {classes.map((c, i) => (
        <div className="tr" key={i}>
          <span className={`st-dq s ${c.ok ? "p" : "a"}`}>
            {c.ok ? <Check size={10} strokeWidth={3} aria-hidden="true" /> : <X size={10} strokeWidth={3} aria-hidden="true" />}
          </span>
          <b>{c.t}</b>
          <span>
            {c.tm} · {c.mn} min
          </span>
          <em className={c.ok ? "ok" : "er"}>{c.ok ? "Present" : "Absent"}</em>
        </div>
      ))}
      <div className="tf">
        Attended {attended} of {held} min · {Math.round((attended / held) * 100)}%
      </div>
    </div>
  );
}

function DayCell({ date, classes, current }) {
  const tipId = useId();
  const cls = `st-dc${current ? " cur" : ""}`;
  if (classes.length === 1) {
    const [c] = classes;
    return (
      <div className={cls} title={`${dayLabel(date)} · ${c.t} ${c.tm} · ${c.ok ? "Present" : "Absent"}`}>
        <span className="st-dw">{weekday(date)}</span>
        <span className={`st-dq ${c.ok ? "p" : "a"}`}>
          {c.ok ? <Check size={13} strokeWidth={3} aria-hidden="true" /> : <X size={11} strokeWidth={3} aria-hidden="true" />}
          <span className="sr-only">{c.ok ? "Present" : "Absent"}</span>
        </span>
        <span className="st-dd">{dayMonth(date)}</span>
      </div>
    );
  }
  // 2+ classes: the square fills from the bottom by minutes attended / minutes held
  const held = classes.reduce((s, c) => s + c.mn, 0);
  const attended = classes.filter((c) => c.ok).reduce((s, c) => s + c.mn, 0);
  return (
    <div
      className={`${cls} mul`}
      tabIndex={0}
      aria-label={`${dayLabel(date)}: attended ${attended} of ${held} minutes`}
      aria-describedby={tipId}
    >
      <span className="st-dw">{weekday(date)}</span>
      <span className="st-dq m">
        <i style={{ height: `${Math.round((attended / held) * 100)}%` }} />
        <em>{classes.length}</em>
      </span>
      <span className="st-dd">{dayMonth(date)}</span>
      <DayTooltip id={tipId} date={date} classes={classes} attended={attended} held={held} />
    </div>
  );
}

/** Attendance by day, paged with ‹ › (starts on the latest days) */
function DayStrip({ days, batchIndex }) {
  const max = Math.max(0, days.length - WINDOW);
  const [offset, setOffset] = useState(max);
  const from = labDate(batchIndex, offset);
  const to = labDate(batchIndex, Math.min(days.length, offset + WINDOW) - 1);
  return (
    <>
      <div className="st-dhd">
        <span className="st-k2">Attendance by day</span>
        <span className="st-dnote" title="On days with 2 or more classes the square fills by time attended. Hover it for details.">
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
          {days.slice(offset, offset + WINDOW).map((classes, k) => {
            const w = offset + k;
            return <DayCell key={w} date={labDate(batchIndex, w)} classes={classes} current={w === days.length - 1} />;
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

/** "Missed 28 Sept, 5 Oct, 19 Oct and 2 more. Attending the next 12 labs in a row brings them up to 75%." */
function standingNote(student, thr) {
  const missed = student.pres.map((p, w) => (p ? null : shortDate(labDate(student.batchIndex, w)))).filter(Boolean);
  const list = missed.length > 3 ? `${missed.slice(-3).join(", ")} and ${missed.length - 3} more` : missed.join(", ");
  if (student.pct >= thr) return student.a === student.h ? "Hasn’t missed a single lab this term." : `On track. Missed ${list}.`;
  const need = labsToReach(student, thr);
  const target = student.pct >= getAtRiskFloor(thr) ? "them back to Good." : `them up to ${thr}%.`;
  return `Missed ${list}. Attending the next ${need} lab${need > 1 ? "s" : ""} in a row brings ${target}`;
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
            {BAND_LABEL[band]} · {student.a} of {student.h} labs
          </span>
          <span>{student.last ? `Last attended ${shortDate(student.last)}` : "No labs attended yet"}</span>
        </div>
      </div>
      <DayStrip days={SESSIONS[student.key]} batchIndex={student.batchIndex} />
      <div className={`st-snote ${band}`}>
        <CircleAlert size={15} strokeWidth={2} aria-hidden="true" />
        <span>{standingNote(student, thr)}</span>
      </div>
    </section>
  );
}
