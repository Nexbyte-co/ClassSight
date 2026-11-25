// src/pages/AttendanceSession/PresentLane.jsx — students marked present and how (Undo asks first)
import { CircleCheck, Maximize2 } from "lucide-react";
import { initials } from "../../utils/initials";

const HOW = { ai: "Face match", nfc: "NFC card", man: "Marked by you" };
const percent = (value) => `${Math.round(value * 100)}%`;

export default function PresentLane({ rows, saved, locked, onUndo, onExpand }) {
  return (
    <section className="as-lane lok db-rise" aria-label="Present">
      <header>
        <span className="li">
          <CircleCheck size={16} strokeWidth={2} aria-hidden="true" />
        </span>
        <div>
          <h4>Present</h4>
          <p>Recognised or confirmed</p>
        </div>
        <span className="lc">{rows.length}</span>
        {onExpand && (
          <button type="button" className="as-lexp" aria-label="Open Present in a larger window" title="Open in a larger window" onClick={onExpand}>
            <Maximize2 size={14} strokeWidth={2.2} aria-hidden="true" />
          </button>
        )}
      </header>
      <div className="as-ll">
        {rows.length ? (
          rows.map((r) => (
            <div key={r.j} className="as-ac2">
              <span className="as-av" aria-hidden="true">
                {initials(r.name)}
              </span>
              <span className="as-stn">
                <b>{r.name}</b>
                <i>
                  {r.roll} · {HOW[r.m] || "Present"}
                  {r.m === "ai" && r.confidence != null ? ` ${percent(r.confidence)}` : ""}
                </i>
              </span>
              {!saved && (
                <button type="button" className="as-undo" disabled={locked} onClick={() => onUndo(r.j)}>
                  Undo
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="as-lempty">
            <b>Nobody marked present yet</b>
            Scan a class photo or confirm students one by one.
          </div>
        )}
      </div>
    </section>
  );
}
