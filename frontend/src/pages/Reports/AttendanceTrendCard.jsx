import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "./icons";
import { BATCHES, formatRange, trendPoints } from "./reportsMock";

const PAD = { L: 34, R: 12, T: 14, B: 28 };

// Line + area chart that fills its container; y-axis snaps to 5% steps around the data
function TrendChart({ points }) {
  const boxRef = useRef(null);
  const [size, setSize] = useState({ w: 640, h: 230 });
  const [hover, setHover] = useState(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => {
      const w = Math.max(320, Math.round(el.clientWidth) || 640);
      const h = Math.max(230, Math.round(el.clientHeight) || 230);
      setSize((s) => (s.w === w && Math.abs(s.h - h) <= 1 ? s : { w, h }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!points.length) {
    return (
      <div className="rp-trend" ref={boxRef}>
        <div className="rp-empty">No classes in this date range.</div>
      </div>
    );
  }

  const { w: W, h: H } = size;
  const vs = points.map((p) => p.v);
  const min = Math.floor((Math.min(...vs) - 2) / 5) * 5;
  const max = Math.max(min + 10, Math.ceil((Math.max(...vs) + 2) / 5) * 5);
  const step = points.length > 10 ? Math.ceil(points.length / 8) : 1;
  const x = (i) => PAD.L + (points.length === 1 ? (W - PAD.L - PAD.R) / 2 : (i * (W - PAD.L - PAD.R)) / (points.length - 1));
  const y = (v) => PAD.T + ((max - v) * (H - PAD.T - PAD.B)) / (max - min);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1)} ${H - PAD.B} L${x(0)} ${H - PAD.B} Z`;
  const grid = [];
  for (let v = min; v <= max; v += 5) grid.push(v);

  return (
    <div className="rp-trend" ref={boxRef}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label="Attendance trend">
        <defs>
          <linearGradient id="rp-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--rp-mr)" stopOpacity=".14" />
            <stop offset="1" stopColor="var(--rp-mr)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {grid.map((v) => (
          <g key={v}>
            <line className="gl" x1={PAD.L} x2={W - PAD.R} y1={y(v)} y2={y(v)} />
            <text className="tk" x={PAD.L - 8} y={y(v) + 4} textAnchor="end">{v}%</text>
          </g>
        ))}
        {points.length > 1 && (
          <>
            <path className="ar" d={area} />
            <path className="ln" d={line} />
          </>
        )}
        {points.map((p, i) => (
          <g key={p.label}>
            {i % step === 0 && (
              <text className="tk" x={x(i)} y={H - 8} textAnchor="middle">{p.label}</text>
            )}
            <circle
              className={`pt ${hover === i ? "h" : ""}`}
              cx={x(i)}
              cy={y(p.v)}
              r={hover === i ? 6 : 4}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          </g>
        ))}
      </svg>
      <div
        className={`rp-tip ${hover !== null ? "on" : ""}`}
        style={hover !== null ? { left: x(hover), top: y(points[hover].v) - 4 } : undefined}
      >
        {hover !== null ? points[hover].tip : ""}
      </div>
    </div>
  );
}

function AttendanceTrendCard({ batchIndex, allMode, from, to, onExport }) {
  const navigate = useNavigate();
  const batch = BATCHES[batchIndex];
  // Same page as "Open record": every session of the batch (all batches -> All recorded lectures)
  const viewMore = () =>
    navigate(
      allMode
        ? "/reports/all"
        : `/reports/details?mode=total&course=${encodeURIComponent(batch.name)}&section=${encodeURIComponent(batch.group)}`
    );
  const subtitle = `${allMode ? "Average attendance across all your classes" : `${batch.group} · ${batch.name}`} · ${formatRange(from, to)}`;

  return (
    <section className="rp-card rp-trendcard" aria-label="Attendance trend">
      <div className="rp-rh">
        <div className="rp-rt">
          <span className="rp-ri"><Icon name="calendar" size={18} /></span>
          <div>
            <h4>Attendance trend</h4>
            <div className="rp-rs">{subtitle}</div>
          </div>
        </div>
        <div className="rp-tacts">
          <button type="button" className="rp-exp" title="Export class CSV for the selected batch and period" onClick={onExport}>
            <Icon name="download" size={15} />
            Export CSV
          </button>
          <button type="button" className="rp-exp" title="Open every session of this batch" onClick={viewMore}>
            View more
            <Icon name="expand" size={13} />
          </button>
        </div>
      </div>
      <TrendChart points={trendPoints(batchIndex, allMode, from, to)} />
    </section>
  );
}

export default AttendanceTrendCard;
