// src/pages/AttendanceSession/ResolveCard.jsx — confirm the selected student: NFC card, retake photo,
// mark present or keep absent, with their recent labs for context.
// Nav arrows are now tall side-panels on the left/right edges of the card.
import { useEffect, useRef, useState } from "react";
import {
  Camera, Check, ChevronLeft, ChevronRight,
  CircleAlert, CircleMinus, Hand, Nfc, X,
} from "lucide-react";
import { useSettings } from "../../context/settings/SettingsContext";
import { BAND_LABEL, bandOf, initials, labDate, shortDate } from "../Students/studentsMock";
import { BATCH_INDEX, OVERALL, SESSION } from "./attendanceMock";

const WINDOW = 4; // labs visible at once
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const ACTIONS = [
  ["nfc",  "NFC card",     Nfc,         "nfc"],
  ["ai",   "Retake photo", Camera,      "info"],
  ["man",  "Mark present", Hand,        "br"],
  ["abs",  "Keep absent",  CircleMinus, "ne"],
];

/* ---------- Recent Labs widget ---------- */
function RecentLabs({ pres, offset, onPage }) {
  const N = pres.length;
  const [slide, setSlide] = useState("");
  const o = Math.max(0, Math.min(N - WINDOW, offset ?? N - WINDOW));

  const handlePrev = () => { setSlide("prev"); onPage(o - 1); };
  const handleNext = () => { setSlide("next"); onPage(o + 1); };

  return (
    <div className="as-rlab">
      {/* Header row */}
      <div className="as-rlh">
        <span className="as-k2">Recent labs</span>
        <span className="as-dnote">
          {shortDate(labDate(BATCH_INDEX, o))} – {shortDate(labDate(BATCH_INDEX, o + WINDOW - 1))}
        </span>
      </div>

      {/* Scrollable row of lab cells + navigation chevrons */}
      <div className="as-drow">
        <button
          type="button"
          className="as-lnav"
          aria-label="Earlier labs"
          disabled={o <= 0}
          onClick={handlePrev}
        >
          <ChevronLeft size={15} strokeWidth={2.4} aria-hidden="true" />
        </button>

        <div
          key={`${o}-${slide}`}
          className={`as-rlabs ${slide ? `slide-${slide}` : ""}`}
        >
          {pres.slice(o, o + WINDOW).map((present, k) => {
            const w = o + k;
            const d = labDate(BATCH_INDEX, w);
            const isCurrent = w === N - 1;
            return (
              <div
                key={w}
                className={`as-rlc ${isCurrent ? "cur" : ""}`}
                title={`${shortDate(d)} · ${SESSION.start} · ${present ? "Present" : "Absent"}`}
              >
                {/* Status icon */}
                <span className={`as-rlq ${present ? "p" : "a"}`}>
                  {present
                    ? <Check size={12} strokeWidth={3} aria-hidden="true" />
                    : <X    size={12} strokeWidth={3} aria-hidden="true" />}
                  <span className="sr-only">{present ? "Present" : "Absent"}</span>
                </span>

                {/* Date label – day + short month */}
                <b>{shortDate(d)}</b>

                {/* Session start time */}
                <i>{SESSION.start}</i>

                {isCurrent && (
                  <span className="as-rlc-now" aria-label="Today's session">Now</span>
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          className="as-lnav"
          aria-label="Later labs"
          disabled={o >= N - WINDOW}
          onClick={handleNext}
        >
          <ChevronRight size={15} strokeWidth={2.4} aria-hidden="true" />
        </button>
      </div>

      {/* Mini legend */}
      <div className="as-rl-legend">
        <span className="as-rl-leg-p"><Check size={9} strokeWidth={3} aria-hidden="true" /> Present</span>
        <span className="as-rl-leg-a"><X     size={9} strokeWidth={3} aria-hidden="true" /> Absent</span>
        <span className="as-rl-leg-cur">Highlighted = today</span>
      </div>
    </div>
  );
}

/* ---------- Main ResolveCard ---------- */
export default function ResolveCard({
  row, left, saved, labOffset, onLabs,
  onResolve, onKeepAbsent,
  reviewRows = [], onSelectStudent,
}) {
  const { attendanceThreshold: thr } = useSettings();
  const [busy, setBusy] = useState(null);
  const timer = useRef(null);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  /* ---- Empty / saved state ---- */
  if (!row) {
    return (
      <section className="as-card as-res db-rise" aria-live="polite" aria-label="Resolve">
        <div className="as-rhd">
          <span className="as-ri2">
            <Check size={16} strokeWidth={2} aria-hidden="true" />
          </span>
          <div>
            <h4>Resolve</h4>
            <div className="as-rs">Click a student in Needs review</div>
          </div>
        </div>
        <div className="as-lempty fill">
          <b>{saved ? "Record saved" : "All resolved"}</b>
          {saved ? "Use Edit to make changes." : "Nobody left to review."}
        </div>
      </section>
    );
  }

  const o = OVERALL[row.j];
  const band = bandOf(o.pct, thr);
  const studentIndex = reviewRows.findIndex((s) => s.j === row.j);

  const canPrev = studentIndex > 0;
  const canNext = studentIndex >= 0 && studentIndex < reviewRows.length - 1;

  const act = (k) => {
    if (k === "abs") return onKeepAbsent(row);
    if (k === "man") return onResolve(row, "man");
    // NFC and Retake photo wait for the reader / the new photo (900ms in the demo)
    setBusy(k);
    timer.current = window.setTimeout(() => {
      setBusy(null);
      onResolve(row, k);
    }, reducedMotion() ? 0 : 900);
  };

  return (
    <section
      className="as-card as-res as-res-with-nav db-rise"
      aria-live="polite"
      aria-label={`Resolve ${row.name}`}
    >
      {/* ── LEFT side-arrow: previous student ── */}
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

      {/* ── MAIN CONTENT ── */}
      <div className="as-res-inner">
        {/* Student identity row */}
        <div className="as-rhd">
          <span className="as-av lg" aria-hidden="true">
            {initials(row.name)}
          </span>
          <div style={{ minWidth: 0 }}>
            <h4>{row.name}</h4>
            <div className="as-rs">{row.roll} · {SESSION.group}</div>
          </div>
          <span className={`as-spill ${band}`} title="Overall attendance">
            {o.pct}%&thinsp;·&thinsp;{BAND_LABEL[band]}
          </span>
          {/* Position indicator */}
          <span className="as-res-pos" aria-label={`Student ${studentIndex + 1} of ${reviewRows.length}`}>
            {studentIndex + 1}/{reviewRows.length}
          </span>
        </div>

        {/* Reason */}
        <div className="as-rwhy">
          <CircleAlert size={14} strokeWidth={2} aria-hidden="true" />
          <span>{row.why}</span>
        </div>

        {/* Action buttons */}
        <div className="as-ropts">
          {busy ? (
            <div className="as-busy" role="status">
              <span className="as-spin" aria-hidden="true" />
              {busy === "nfc"
                ? `Waiting for ${row.name.split(" ")[0]}'s card…`
                : "Matching the new photo…"}
            </div>
          ) : (
            ACTIONS.map(([k, label, Icon, tone]) => (
              <button
                key={k}
                type="button"
                className="as-ro"
                disabled={saved}
                onClick={() => act(k)}
              >
                <span className={`as-ati ${tone}`}>
                  <Icon size={15} strokeWidth={2} aria-hidden="true" />
                </span>
                {label}
              </button>
            ))
          )}
        </div>

        {/* Recent labs */}
        <RecentLabs pres={o.pres} offset={labOffset} onPage={onLabs} />

        {/* Footer */}
        <div className="as-rft">
          <span>{o.last ? `Last attended ${shortDate(o.last)}` : "No attendance yet"}</span>
          <span>{left} left to review</span>
        </div>
      </div>

      {/* ── RIGHT side-arrow: next student ── */}
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
