// src/pages/Students/reports/ReportCharts.jsx
// The two charts of the Reports page, drawn as plain SVG / HTML (no chart library): the attendance trend line and the
// course comparison bars. Both mark the required percentage and answer hover, touch and keyboard.
import { useEffect, useMemo, useRef, useState } from "react";

const H = 236;
const PAD = { l: 42, r: 18, t: 16, b: 34 };

function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(640);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

export function TrendChart({ points, threshold, view, signature }) {
  const [ref, W] = useWidth();
  const [hover, setHover] = useState(null);
  const geo = useMemo(() => {
    const vals = points.map((p) => p.pct);
    const lo = Math.max(0, Math.floor((Math.min(...vals, threshold) - 8) / 10) * 10);
    const x = (i) => (points.length === 1 ? (PAD.l + W - PAD.r) / 2 : PAD.l + (i * (W - PAD.l - PAD.r)) / (points.length - 1));
    const y = (v) => PAD.t + ((100 - v) * (H - PAD.t - PAD.b)) / (100 - lo);
    let d = "";
    points.forEach((p, i) => {
      if (i === 0) d = `M${x(0)},${y(p.pct)}`;
      else {
        const mid = (x(i - 1) + x(i)) / 2;
        d += ` C${mid},${y(points[i - 1].pct)} ${mid},${y(p.pct)} ${x(i)},${y(p.pct)}`;
      }
    });
    const area = points.length > 1 ? `${d} L${x(points.length - 1)},${H - PAD.b} L${x(0)},${H - PAD.b} Z` : "";
    const ticks = [];
    for (let v = lo; v <= 100; v += lo >= 60 ? 10 : 20) ticks.push(v);
    return { lo, x, y, d, area, ticks };
  }, [points, W, threshold]);

  const move = (clientX, rect) => {
    if (!points.length) return;
    const px = clientX - rect.left;
    let best = 0;
    points.forEach((_, i) => {
      if (Math.abs(geo.x(i) - px) < Math.abs(geo.x(best) - px)) best = i;
    });
    setHover(best);
  };
  const labelEvery = Math.ceil(points.length / Math.max(2, Math.floor((W - PAD.l - PAD.r) / 84)));
  const hp = hover === null ? null : points[hover];

  // The measured wrapper is always rendered, so its width is tracked even while the selection has no classes
  if (points.length === 0) return <div className="rp-chart" ref={ref}><p className="sp-empty">No classes held in this selection.</p></div>;
  return (
    <div className="rp-chart" ref={ref}>
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Attendance trend, ${view}`}
        tabIndex={0}
        onPointerMove={(e) => move(e.clientX, e.currentTarget.getBoundingClientRect())}
        onPointerLeave={() => setHover(null)}
        onFocus={() => setHover((h) => h ?? points.length - 1)}
        onBlur={() => setHover(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? points.length) - 1));
          if (e.key === "ArrowRight") setHover((h) => Math.min(points.length - 1, (h ?? -1) + 1));
        }}
      >
        <defs>
          <linearGradient id="rp-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--cs-crimson)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--cs-crimson)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {geo.ticks.map((v) => (
          <g key={v}>
            <line className="rp-grid" x1={PAD.l} x2={W - PAD.r} y1={geo.y(v)} y2={geo.y(v)} />
            <text className="rp-ax" x={PAD.l - 8} y={geo.y(v) + 4} textAnchor="end">{v}%</text>
          </g>
        ))}
        <line className="rp-req" x1={PAD.l} x2={W - PAD.r} y1={geo.y(threshold)} y2={geo.y(threshold)} />
        <text className="rp-reqt" x={W - PAD.r} y={geo.y(threshold) + 15} textAnchor="end">{threshold}% required</text>
        {points.map((p, i) =>
          i % labelEvery === 0 || i === points.length - 1 ? (
            <text key={p.key} className="rp-ax" x={geo.x(i)} y={H - 12} textAnchor="middle">
              {view === "weekly" ? p.label.replace("Week of ", "") : view === "monthly" ? p.label.split(" ")[0].slice(0, 3) : p.label}
            </text>
          ) : null
        )}
        <g key={signature}>
          {geo.area && <path className="rp-area" d={geo.area} fill="url(#rp-fill)" />}
          <path className="rp-line" d={geo.d} pathLength="1" />
          {points.length <= 40 && points.map((p, i) => <circle key={p.key} className="rp-dot" cx={geo.x(i)} cy={geo.y(p.pct)} r="3.5" />)}
        </g>
        {hp && (
          <g>
            <line className="rp-cross" x1={geo.x(hover)} x2={geo.x(hover)} y1={PAD.t} y2={H - PAD.b} />
            <circle className="rp-hot" cx={geo.x(hover)} cy={geo.y(hp.pct)} r="6" />
          </g>
        )}
      </svg>
      {hp && (
        <div className="rp-tip" style={{ left: Math.min(Math.max(geo.x(hover), 90), W - 90), top: geo.y(hp.pct) }} role="status">
          <b>{hp.label}</b>
          <span className={hp.pct >= threshold ? "ok" : "bad"}>{hp.pct}% cumulative</span>
          <small>{hp.present} of {hp.decided} attended so far</small>
          <small>This {view === "daily" ? "day" : view === "weekly" ? "week" : "month"}: {hp.bucketPresent} of {hp.bucketDecided}</small>
        </div>
      )}
    </div>
  );
}

export function CourseBars({ rows, threshold, selected, onSelect, colorFor }) {
  const sorted = [...rows].filter((r) => r.pct !== null).sort((a, b) => a.pct - b.pct);
  if (sorted.length === 0) return <p className="sp-empty">No classes held in this selection.</p>;
  return (
    <ul className="rp-bars" aria-label="Attendance by course">
      {sorted.map((r) => {
        const tone = r.eligible ? "ok" : r.status?.level === "critical" ? "bad" : "warn";
        return (
          <li key={r.code}>
            <button type="button" className={`rp-bar ${tone} ${selected === r.code ? "on" : ""}`} aria-pressed={selected === r.code} onClick={() => onSelect(r.code)} style={{ "--c": colorFor(r.code) }}>
              <span className="rp-bn"><i className="sp-dot" />{r.name}</span>
              <span className="rp-track" aria-hidden="true">
                <i style={{ width: `${r.pct}%` }} />
                <s style={{ left: `${threshold}%` }} />
              </span>
              <b>{r.pct}%</b>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

const SHORT = { daily: (l) => l, weekly: (l) => l.replace("Week of ", ""), monthly: (l) => l.split(" ")[0].slice(0, 3) };

/** Stacked columns of attended / missed / awaiting-review classes per day, week or month. */
export function HistoryChart({ buckets, view }) {
  const [hover, setHover] = useState(null);
  if (buckets.length === 0) return <p className="sp-empty">No classes held in this selection.</p>;
  const max = Math.max(...buckets.map((b) => b.total));
  const every = Math.ceil(buckets.length / 12);
  const hb = hover === null ? null : buckets[hover];
  return (
    <div className="rp-hc" onPointerLeave={() => setHover(null)}>
      <div className="rp-hcols" role="img" aria-label={`Classes attended and missed by ${view === "daily" ? "day" : view === "weekly" ? "week" : "month"}`}>
        {buckets.map((b, i) => (
          <div key={b.key} className={`rp-hcol ${hover === i ? "on" : ""}`} onPointerEnter={() => setHover(i)} style={{ "--i": i }}>
            <div className="rp-hstack" style={{ height: `${(b.total / max) * 100}%` }}>
              {b.unverified > 0 && <i className="u" style={{ flexGrow: b.unverified }} />}
              {b.absent > 0 && <i className="a" style={{ flexGrow: b.absent }} />}
              {b.present > 0 && <i className="p" style={{ flexGrow: b.present }} />}
            </div>
            <span>{i % every === 0 || i === buckets.length - 1 ? SHORT[view](b.label) : ""}</span>
          </div>
        ))}
      </div>
      {hb && (
        <div className="rp-htip" style={{ left: `${((hover + 0.5) / buckets.length) * 100}%` }} role="status">
          <b>{hb.label}</b>
          <small>{hb.present} attended · {hb.absent} missed{hb.unverified ? ` · ${hb.unverified} pending` : ""}</small>
        </div>
      )}
    </div>
  );
}
