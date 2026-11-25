// src/pages/AttendanceSession/ResolveCard.jsx — confirm the selected student: mark present or keep
// absent (NFC is not available yet; photo verification is in the Face check card), with their
// recent sessions in this class for context.
import { useState } from "react";
import {
  Check, ChevronLeft, ChevronRight,
  CircleAlert, CircleMinus, Hand, X,
} from "lucide-react";
import { useSettings } from "../../context/settings/SettingsContext";
import { getAtRiskFloor } from "../../context/settings/settingsStore";
import { initials } from "../../utils/initials";

const WINDOW = 4; // sessions visible at once
const BAND_LABEL = { er: "Critical", wa: "Warning", ok: "Good" };
const bandOf = (pct, thr) => (pct >= thr ? "ok" : pct >= getAtRiskFloor(thr) ? "wa" : "er");
const shortDate = (key) => new Date(`${key}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/* ---------- Recent sessions widget ---------- */
function RecentSessions({ history }) {
  const N = history.length;
  const max = Math.max(0, N - WINDOW);
  const [offset, setOffset] = useState(max);
  const o = Math.min(offset, max);
  if (!N) {
    return (
      <div className="as-rlab">
        <div className="as-rlh">
          <span className="as-k2">Recent sessions</span>
          <span className="as-dnote">No earlier attendance in this class</span>
        </div>
      </div>
    );
  }
  const slice = history.slice(o, o + WINDOW);
  return (
    <div className="as-rlab">
      <div className="as-rlh">
        <span className="as-k2">Recent sessions</span>
        <span className="as-dnote">
          {shortDate(slice[0].date)} – {shortDate(slice[slice.length - 1].date)}
        </span>
      </div>
      <div className="as-drow">
        <button type="button" className="as-lnav" aria-label="Earlier sessions" disabled={o <= 0} onClick={() => setOffset(Math.max(0, o - WINDOW))}>
          <ChevronLeft size={15} strokeWidth={2.4} aria-hidden="true" />
        </button>
        <div className="as-rlabs">
          {slice.map((entry) => (
            <div key={entry.date} className="as-rlc" title={`${shortDate(entry.date)} · ${entry.present ? "Present" : "Absent"}`}>
              <span className={`as-rlq ${entry.present ? "p" : "a"}`}>
                {entry.present ? <Check size={12} strokeWidth={3} aria-hidden="true" /> : <X size={12} strokeWidth={3} aria-hidden="true" />}
                <span className="sr-only">{entry.present ? "Present" : "Absent"}</span>
              </span>
              <b>{shortDate(entry.date)}</b>
            </div>
          ))}
        </div>
        <button type="button" className="as-lnav" aria-label="Later sessions" disabled={o >= max} onClick={() => setOffset(Math.min(max, o + WINDOW))}>
          <ChevronRight size={15} strokeWidth={2.4} aria-hidden="true" />
        </button>
      </div>
      <div className="as-rl-legend">
        <span className="as-rl-leg-p"><Check size={9} strokeWidth={3} aria-hidden="true" /> Present</span>
        <span className="as-rl-leg-a"><X size={9} strokeWidth={3} aria-hidden="true" /> Absent</span>
      </div>
    </div>
  );
}

/* ---------- Main ResolveCard ---------- */
export default function ResolveCard({
  row, left, saved, locked, history = [], section,
  onResolve, onKeepAbsent,
  reviewRows = [], onSelectStudent, photos = null,
}) {
  const { attendanceThreshold: thr } = useSettings();

  if (!row) {
    return (
      <section className="as-card as-res as-res-empty db-rise" aria-live="polite" aria-label="Student under review">
        <div className="as-res-inner">
          <div className="as-res-title">
            <h4>Student under review</h4>
            <span className="as-res-pos">{left ? `${left} left` : "0 left"}</span>
          </div>
          <div className="as-lempty fill as-res-none">
            <span className="as-ri2">
              <Check size={18} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <b>{saved ? "Record saved" : left ? "Pick a student" : "All resolved"}</b>
            {saved ? "Use Edit details to make changes." : left ? "Click a student in Needs review." : "Nobody left to review."}
          </div>
        </div>
      </section>
    );
  }

  const attended = history.filter((h) => h.present).length;
  const pct = history.length ? Math.round((attended / history.length) * 100) : null;
  const band = pct == null ? null : bandOf(pct, thr);
  const lastPresent = [...history].reverse().find((h) => h.present);
  const studentIndex = reviewRows.findIndex((s) => s.j === row.j);
  const canPrev = studentIndex > 0;
  const canNext = studentIndex >= 0 && studentIndex < reviewRows.length - 1;
  const disabled = saved || locked;

  const actions = [
    { key: "man", label: "Mark present", Icon: Hand, tone: "br", disabled, onClick: () => onResolve(row, "man") },
    { key: "abs", label: "Keep absent", Icon: CircleMinus, tone: "ne", disabled, onClick: () => onKeepAbsent(row) },
  ];

  return (
    <section className="as-card as-res as-res-with-nav db-rise" aria-live="polite" aria-label={`Resolve ${row.name}`}>
      <button
        type="button"
        className={`as-side-nav as-side-nav-l${canPrev ? "" : " as-side-nav-off"}`}
        aria-label="Previous student"
        title={canPrev ? `Previous: ${reviewRows[studentIndex - 1]?.name ?? ""}` : "No previous student"}
        disabled={!canPrev}
        onClick={() => canPrev && onSelectStudent?.(reviewRows[studentIndex - 1]?.j)}
      >
        <ChevronLeft size={22} strokeWidth={1.6} aria-hidden="true" />
      </button>

      <div className="as-res-inner">
        <div className="as-res-title">
          <h4>Student under review</h4>
          <span className="as-res-pos" aria-label={`Student ${studentIndex + 1} of ${reviewRows.length}`}>
            {studentIndex + 1} of {reviewRows.length}
          </span>
        </div>
        <div className="as-rhd">
          <span className="as-av lg" aria-hidden="true">
            {initials(row.name)}
          </span>
          <div style={{ minWidth: 0 }}>
            <h4>{row.name}</h4>
            <div className="as-rs">Roll {row.roll} · Batch {section}</div>
          </div>
          {band ? (
            <span className={`as-spill ${band}`} title="Attendance in this class so far">
              {pct}%&thinsp;·&thinsp;{BAND_LABEL[band]}
            </span>
          ) : (
            <span className="as-spill ne" title="No earlier sessions in this class">New</span>
          )}
        </div>

        {photos}

        <div className="as-rwhy">
          <CircleAlert size={14} strokeWidth={2} aria-hidden="true" />
          <span>
            {row.why}
            {!row.faceEnrolled && " · no enrolled face, so the photo can never match them"}
          </span>
        </div>

        <RecentSessions history={history} />

        <div className="as-ropts">
          {actions.map(({ key, label, Icon, tone, disabled: off, onClick }) => (
            <button key={key} type="button" className="as-ro" disabled={off} onClick={onClick}>
              <span className={`as-ati ${tone}`}>
                <Icon size={15} strokeWidth={2} aria-hidden="true" />
              </span>
              {label}
            </button>
          ))}
        </div>

        <div className="as-rft">
          <span>{lastPresent ? `Last attended ${shortDate(lastPresent.date)}` : "No attendance yet"}</span>
          <span>{left} left to review</span>
        </div>
      </div>

      <button
        type="button"
        className={`as-side-nav as-side-nav-r${canNext ? "" : " as-side-nav-off"}`}
        aria-label="Next student"
        title={canNext ? `Next: ${reviewRows[studentIndex + 1]?.name ?? ""}` : "No next student"}
        disabled={!canNext}
        onClick={() => canNext && onSelectStudent?.(reviewRows[studentIndex + 1]?.j)}
      >
        <ChevronRight size={22} strokeWidth={1.6} aria-hidden="true" />
      </button>
    </section>
  );
}
