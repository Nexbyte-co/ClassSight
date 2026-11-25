// src/pages/AttendanceSession/SessionSummary.jsx — "This session": segmented ring, count tiles,
// how present students were verified, and Save record / Edit
import { useEffect, useRef, useState } from "react";
import { Camera, Nfc, UserCheck } from "lucide-react";
import { formatShortSessionDate } from "../../context/schedule/scheduleStatus";

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const SIZE = 112;
const STROKE = 8;
const R = (SIZE - STROKE) / 2 - 2;
const C = 2 * Math.PI * R;
const MID = SIZE / 2;

/** Ring with one arc per group (present, review, absent); arcs draw in on load. */
function AttendanceRing({ counts, total, arcRefs }) {
  const [shown, setShown] = useState(() => (reducedMotion() ? counts.p : 0));
  const [anim, setAnim] = useState(() => !reducedMotion());

  // Count the present number up once, over 900ms (ease-out cubic)
  const target = useRef(counts.p);
  useEffect(() => {
    if (reducedMotion()) return undefined;
    const to = target.current;
    const t0 = performance.now();
    let id;
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / 900);
      setShown(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    const off = setTimeout(() => setAnim(false), 1400);
    return () => {
      cancelAnimationFrame(id);
      clearTimeout(off);
    };
  }, []);

  const segs = [
    ["p", counts.p, "okf"],
    ["u", counts.u, "waf"],
    ["a", counts.a, "fa"],
  ].filter((s) => s[1]);
  const gap = segs.length > 1 ? STROKE + 3 : 0;
  let off = 0;
  const pct = (v) => `${Math.round((v / total) * 100)}%`;
  const centre = (key, big, small, label, color) => (
    <g className={`as-rv as-rv-${key}`}>
      <text x={MID} y={MID + 3} textAnchor="middle" fontFamily="inherit" style={{ fill: color || "var(--as-tx)" }}>
        <tspan fontSize="24" fontWeight="700">
          {big}
        </tspan>
        {small && (
          <tspan fontSize="13" fontWeight="600" style={{ fill: "var(--as-mu)" }}>
            {small}
          </tspan>
        )}
      </text>
      <text x={MID} y={MID + 20} textAnchor="middle" fontSize="9.5" fontWeight="700" letterSpacing=".08em" style={{ fill: "var(--as-mu)" }} fontFamily="inherit">
        {label}
      </text>
    </g>
  );

  return (
    <div className={`as-ring ${anim ? "anim" : ""}`}>
      <span role="img" aria-label={`${counts.p} of ${total} present, ${counts.u} to review, ${counts.a} absent`}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
          <circle cx={MID} cy={MID} r={R} fill="none" style={{ stroke: "var(--as-track)" }} strokeWidth={STROKE - 2} />
          {segs.map(([key, v, col], k) => {
            const len = (C * v) / total;
            const L = Math.max(0.01, len - gap);
            const dashoffset = -(off + gap / 2);
            off += len;
            return (
              <circle
                key={key}
                ref={(el) => (arcRefs.current[key] = el)}
                className={`as-sg as-sg-${key}`}
                cx={MID}
                cy={MID}
                r={R}
                fill="none"
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={`${L.toFixed(1)} ${C.toFixed(1)}`}
                strokeDashoffset={dashoffset.toFixed(1)}
                transform={`rotate(-90 ${MID} ${MID})`}
                style={{ stroke: `var(--as-${col})`, "--L": L.toFixed(1), "--C": C.toFixed(1), animationDelay: `${k * 180}ms` }}
              />
            );
          })}
          {centre("d", shown, `/${total}`, "PRESENT")}
          {centre("p", pct(counts.p), "", "PRESENT", "var(--as-ok)")}
          {centre("u", pct(counts.u), "", "TO REVIEW", "var(--as-wa)")}
          {centre("a", pct(counts.a), "", "ABSENT", "var(--as-ne)")}
        </svg>
      </span>
    </div>
  );
}

/** Present / Review / Absent tiles; hovering one replays that colour's arc */
function CountTiles({ counts, onReplay }) {
  const tiles = [
    ["p", "Present", "ok"],
    ["u", "Review", "wa"],
    ["a", "Absent", "ne"],
  ];
  return (
    <div className="as-cq3">
      {tiles.map(([k, label, c]) => (
        <div
          key={k}
          className={`as-cq cr-${c}`}
          data-hl={k}
          tabIndex={0}
          onMouseEnter={() => onReplay(k)}
          onFocus={() => onReplay(k)}
        >
          <span>
            <i aria-hidden="true" />
            {label}
          </span>
          <b>{counts[k]}</b>
        </div>
      ))}
    </div>
  );
}

const METHODS = [
  ["ai", "Face photo", Camera],
  ["nfc", "NFC card", Nfc],
  ["man", "Manual", UserCheck],
];

export default function SessionSummary({ list, excused = 0, dateKey, lecture }) {
  const counts = { p: 0, u: 0, a: 0 };
  list.forEach((r) => {
    if (r.st in counts) counts[r.st] += 1;
  });
  const total = list.length - excused;
  const by = (m) => list.filter((r) => r.st === "p" && r.m === m).length;
  const arcRefs = useRef({});

  const replay = (k) => {
    const g = arcRefs.current[k];
    if (!g || reducedMotion()) return;
    g.style.animation = "none";
    void g.getBoundingClientRect();
    g.style.animation = "as-arcIn .7s cubic-bezier(.25,.8,.25,1) both";
    g.style.animationDelay = "0ms";
  };

  return (
    <section className="as-card as-sess db-rise" aria-label="This session">
      <div className="as-ash">
        <div className="as-rt">
          <span className="as-ri2">
            <Camera size={18} strokeWidth={2} aria-hidden="true" />
          </span>
          <div>
            <h4>This session</h4>
            <div className="as-rs">
              {formatShortSessionDate(dateKey)}
              {lecture ? ` · ${lecture.timeRange || lecture.time}` : ""}
            </div>
          </div>
        </div>
        <div className="as-ahd2">
          <span className="as-chip sm">{list.length} enrolled</span>
          {excused > 0 && <span className="as-chip sm">{excused} excused</span>}
        </div>
      </div>

      <div className="as-asb">
        <AttendanceRing counts={counts} total={Math.max(1, total)} arcRefs={arcRefs} />
        <CountTiles counts={counts} onReplay={replay} />
      </div>

      <div className="as-asf">
        <div className="as-mth">
          <span className="as-mth-l">Verified by</span>
          {METHODS.map(([k, label, Icon]) => (
            <span key={k} className="as-mc" title={`${label}: ${by(k)}`} aria-label={`${label} ${by(k)}`}>
              <Icon size={13} strokeWidth={2} aria-hidden="true" />
              <b>{by(k)}</b>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
