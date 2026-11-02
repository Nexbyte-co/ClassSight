const RING_R = 20;
const RING_C = 2 * Math.PI * RING_R;

// Ring showing attendance %: darker burgundy under 50%, lighter from 50–74%
function Ring({ pct }) {
  return (
    <svg width="54" height="54" viewBox="0 0 54 54" aria-hidden="true">
      <circle cx="27" cy="27" r={RING_R} fill="none" className="rp-ring-track" strokeWidth="4.5" />
      <circle
        cx="27"
        cy="27"
        r={RING_R}
        fill="none"
        className={pct < 50 ? "rp-ring-low" : "rp-ring-mid"}
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeDasharray={`${((RING_C * pct) / 100).toFixed(1)} ${RING_C.toFixed(1)}`}
        transform="rotate(-90 27 27)"
      />
      <text x="27" y="31" textAnchor="middle" fontSize="12" fontWeight="700" className="rp-ring-text">{pct}%</text>
    </svg>
  );
}

function StudentTile({ student, showBatch }) {
  const initials = student.name.split(" ").map((x) => x[0]).join("");
  return (
    <div className="rp-stile" aria-label={`${student.name}, ${student.pct}% attendance`}>
      <span className="rp-av">{initials}</span>
      <div className="rp-sbody">
        <div className="rp-snm">{student.name}</div>
        <div className="rp-ssb">{student.roll}{showBatch ? ` · ${student.batch}` : ""}</div>
        <div className="rp-ssb rp-ssl">{student.a} of {student.h} labs attended</div>
      </div>
      <div className="rp-bat"><Ring pct={student.pct} /></div>
    </div>
  );
}

export default StudentTile;
