// src/pages/AttendanceSession/FaceCheckCard.jsx — compare the enrolled photo with today's face
import { Ban, Camera, Check, CircleAlert, X } from "lucide-react";
import { FACE_THRESHOLD, faceScore } from "./attendanceMock";

function Face({ label, tone }) {
  return (
    <div className="as-fcc">
      <div className={`as-fci ${tone}`} aria-hidden="true">
        <i />
        <b />
      </div>
      <span>{label}</span>
    </div>
  );
}

export default function FaceCheckCard({ row, saved, onConfirm, onReject }) {
  const header = (
    <div className="as-ash">
      <div className="as-rt">
        <span className="as-ri2">
          <Camera size={16} strokeWidth={2} aria-hidden="true" />
        </span>
        <div>
          <h4>Face check</h4>
          <div className="as-rs">{row ? `Is this really ${row.name.split(" ")[0]}?` : "Compare faces before you decide"}</div>
        </div>
      </div>
    </div>
  );

  if (!row) {
    return (
      <section className="as-card as-face db-rise" aria-live="polite" aria-label="Face check">
        {header}
        <div className="as-lempty fill">
          <b>No student selected</b>
          Pick someone from Needs review.
        </div>
      </section>
    );
  }

  const notFound = /Not found/.test(row.why);
  const score = faceScore(row.j);
  return (
    <section className="as-card as-face db-rise" aria-live="polite" aria-label="Face check">
      {header}
      <div className="as-fcr">
        <Face label="Enrolled photo" tone="e" />
        {notFound ? (
          <div className="as-fcc">
            <div className="as-fci none">
              <Ban size={22} strokeWidth={2} aria-hidden="true" />
              <em>No face detected</em>
            </div>
            <span>From today’s photo</span>
          </div>
        ) : (
          <Face label="From today’s photo" tone="t" />
        )}
      </div>
      {notFound ? (
        <div className="as-fcm ne">
          <CircleAlert size={14} strokeWidth={2} aria-hidden="true" />
          <span>The photo didn’t pick up this student. Use NFC or Retake photo.</span>
        </div>
      ) : (
        <div className="as-fcm wa">
          <CircleAlert size={14} strokeWidth={2} aria-hidden="true" />
          <span>
            Match <b>{score}%</b> · needs {FACE_THRESHOLD}% to auto-mark
          </span>
          <div className="as-fbar" aria-hidden="true">
            <i style={{ width: `${score}%` }} />
            <s style={{ left: `${FACE_THRESHOLD}%` }} />
          </div>
        </div>
      )}
      <div className="as-fcb">
        <button type="button" className="as-b1 yes" disabled={notFound || saved} onClick={() => onConfirm(row)}>
          <Check size={14} strokeWidth={2.6} aria-hidden="true" />
          It’s them
        </button>
        <button type="button" className="as-b1" disabled={notFound || saved} onClick={() => onReject(row)}>
          <X size={14} strokeWidth={2.4} aria-hidden="true" />
          Not them
        </button>
      </div>
    </section>
  );
}
