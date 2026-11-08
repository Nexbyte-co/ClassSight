// Building blocks for the admin pages (header, stat tiles, cards, states, charts).
import { useEffect, useId, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { useAdminData } from "../../context/AdminDataContext";
import { pct, shortDate } from "./format";

export function AdminPageHeader({ title, lead, actions }) {
  const { loading, loadedAt, refresh } = useAdminData();
  return (
    <div className="db-hd adm-hd db-rise">
      <div>
        <h1>{title}</h1>
        {lead && <p className="db-sm db-lead">{lead}</p>}
      </div>
      <div className="db-row db-wrap adm-hd-actions">
        {actions}
        <button
          type="button"
          className="db-btn adm-refresh"
          onClick={refresh}
          disabled={loading}
          title={loadedAt ? `Last updated ${loadedAt.toLocaleTimeString()}` : "Refresh"}
        >
          <RefreshCw size={15} strokeWidth={2} className={loading ? "adm-spin" : ""} aria-hidden="true" />
          <span>{loading ? "Loading…" : "Refresh"}</span>
        </button>
      </div>
    </div>
  );
}

// Load error for the whole admin data set, with retry.
export function AdminLoadState() {
  const { loading, error, loadedAt, refresh } = useAdminData();
  if (error) {
    return (
      <div className="adm-alert adm-alert-error" role="alert">
        <AlertCircle size={18} strokeWidth={2} aria-hidden="true" />
        <span>{error}</span>
        <button type="button" className="db-btn" onClick={refresh}>
          Try again
        </button>
      </div>
    );
  }
  if (loading && !loadedAt) {
    return (
      <div className="adm-loading" role="status">
        <Loader2 size={18} strokeWidth={2} className="adm-spin" aria-hidden="true" />
        <span>Loading data from the server…</span>
      </div>
    );
  }
  return null;
}

export function StatTile({ icon: Icon, label, value, sub, tone }) {
  return (
    <div className={`adm-stat ${tone ? `adm-tone-${tone}` : ""}`}>
      <div className="adm-stat-top">
        <span className="adm-stat-label">{label}</span>
        {Icon && (
          <span className="adm-stat-icon" aria-hidden="true">
            <Icon size={17} strokeWidth={2} />
          </span>
        )}
      </div>
      <div className="adm-stat-value">{value}</div>
      {sub && <div className="adm-stat-sub">{sub}</div>}
    </div>
  );
}

export function Card({ title, sub, actions, children, className = "", delay = 0 }) {
  return (
    <section className={`db-card adm-card db-rise ${className}`} style={delay ? { animationDelay: `${delay}ms` } : undefined}>
      {(title || actions) && (
        <div className="adm-card-hd">
          <div>
            {title && <h2>{title}</h2>}
            {sub && <p className="db-sm">{sub}</p>}
          </div>
          {actions && <div className="db-row db-wrap">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({ icon: Icon, title, children }) {
  return (
    <div className="adm-empty">
      {Icon && <Icon size={22} strokeWidth={1.8} aria-hidden="true" />}
      <b>{title}</b>
      {children && <p>{children}</p>}
    </div>
  );
}

export function FormMessage({ msg }) {
  if (!msg) return null;
  const ok = msg.kind === "ok";
  return (
    <p className={`adm-msg ${ok ? "ok" : "error"}`} role={ok ? "status" : "alert"}>
      {ok ? <CheckCircle2 size={15} strokeWidth={2} /> : <AlertCircle size={15} strokeWidth={2} />}
      <span>{msg.text}</span>
    </p>
  );
}

export function Tabs({ tabs, value, onChange, label }) {
  return (
    <div className="adm-tabs" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={value === t.key}
          className={value === t.key ? "on" : ""}
          onClick={() => onChange(t.key)}
        >
          {t.label}
          {t.count !== undefined && <span className="adm-tab-count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

// Status chip: icon-free text label + color, so state is never color-alone.
export function RateChip({ value }) {
  if (value === null || value === undefined) return <span className="adm-chip">No data</span>;
  const tone = value >= 0.75 ? "good" : value >= 0.6 ? "warn" : "bad";
  const word = tone === "good" ? "Good" : tone === "warn" ? "Watch" : "Low";
  return (
    <span className={`adm-chip adm-chip-${tone}`}>
      {pct(value)} · {word}
    </span>
  );
}

// ---------- charts ----------

/**
 * Horizontal bars, one series. rows: [{ key, label, value, display, sub }]; max defaults to the largest value.
 * Each bar is a hover/focus target with its own tooltip; the value is also printed at the bar end.
 */
export function BarList({ rows, max, ariaLabel, emptyText = "No data yet." }) {
  const [hover, setHover] = useState(null);
  if (!rows.length) return <p className="db-sm adm-chart-empty">{emptyText}</p>;
  const top = max ?? Math.max(...rows.map((r) => r.value || 0), 1);
  return (
    <ul className="adm-bars" aria-label={ariaLabel}>
      {rows.map((r) => {
        const w = top ? Math.max(0, Math.min(1, (r.value || 0) / top)) : 0;
        return (
          <li
            key={r.key}
            className={`adm-bar-row ${hover === r.key ? "hot" : ""}`}
            onPointerEnter={() => setHover(r.key)}
            onPointerLeave={() => setHover(null)}
            onFocus={() => setHover(r.key)}
            onBlur={() => setHover(null)}
            tabIndex={0}
          >
            <span className="adm-bar-label" title={r.label}>
              {r.label}
            </span>
            <span className="adm-bar-track">
              <span className="adm-bar-fill" style={{ width: `${w * 100}%` }} />
            </span>
            <span className="adm-bar-value">{r.display ?? r.value}</span>
            {hover === r.key && r.sub && (
              <span className="adm-tip adm-bar-tip" role="tooltip">
                <b>{r.label}</b>
                <span>{r.sub}</span>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Attendance-rate line over dates (0–100%), one series, with a crosshair + tooltip.
 * points: [{ date, rate, present, total, sessions }] oldest -> newest.
 */
export function TrendChart({ points, height = 200, ariaLabel }) {
  const [idx, setIdx] = useState(null);
  const gradId = useId();
  // Draw at the real pixel width so axis text stays 11px at any card size.
  const boxRef = useRef(null);
  const [width, setWidth] = useState(640);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [points.length]); // re-attach when switching between the empty state and the chart
  const valid = points.filter((p) => p.rate !== null);
  if (valid.length < 2) {
    return (
      <p className="db-sm adm-chart-empty" ref={boxRef}>
        {valid.length === 1
          ? `One day recorded so far (${shortDate(valid[0].date)}: ${pct(valid[0].rate)}). The trend line appears after a second day.`
          : "No attendance sessions recorded yet."}
      </p>
    );
  }
  const W = width;
  const H = height;
  const pad = { l: 40, r: 14, t: 12, b: 26 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const x = (i) => pad.l + (valid.length === 1 ? iw / 2 : (i / (valid.length - 1)) * iw);
  const y = (r) => pad.t + (1 - r) * ih;
  const line = valid.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.rate).toFixed(1)}`).join(" ");
  const area = `${line} L${x(valid.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const labelEvery = Math.ceil(valid.length / Math.max(2, Math.floor(iw / 90)));

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - pad.l) / iw) * (valid.length - 1));
    setIdx(Math.max(0, Math.min(valid.length - 1, i)));
  };
  const cur = idx === null ? null : valid[idx];

  return (
    <div className="adm-trend" ref={boxRef}>
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={ariaLabel}
        onPointerMove={onMove}
        onPointerLeave={() => setIdx(null)}
      >
        <defs>
          <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--db-mr)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--db-mr)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="adm-grid" />
            <text x={pad.l - 8} y={y(t) + 4} className="adm-axis" textAnchor="end">
              {t * 100}%
            </text>
          </g>
        ))}
        {valid.map((p, i) =>
          i % labelEvery === 0 || i === valid.length - 1 ? (
            <text key={p.date} x={x(i)} y={H - 6} className="adm-axis" textAnchor="middle">
              {shortDate(p.date).replace(/^\w+, /, "")}
            </text>
          ) : null
        )}
        <path d={area} fill={`url(#${gradId})`} />
        <path d={line} className="adm-line" />
        {cur && (
          <g>
            <line x1={x(idx)} x2={x(idx)} y1={pad.t} y2={pad.t + ih} className="adm-cross" />
            <circle cx={x(idx)} cy={y(cur.rate)} r="5" className="adm-dot" />
          </g>
        )}
      </svg>
      {cur && (
        <div
          className="adm-tip adm-trend-tip"
          role="tooltip"
          style={{ left: `${(x(idx) / W) * 100}%` }}
        >
          <b>{shortDate(cur.date, { year: true })}</b>
          <span>
            {pct(cur.rate)} present · {cur.present}/{cur.total} records
          </span>
          <span>
            {cur.sessions} session{cur.sessions === 1 ? "" : "s"}
          </span>
        </div>
      )}
    </div>
  );
}

/** Present / absent / excused split as one stacked bar with labelled counts (status colors + text). */
export function StatusSplit({ present, absent, excused }) {
  const total = present + absent + excused;
  const parts = [
    { key: "present", label: "Present", value: present },
    { key: "absent", label: "Absent", value: absent },
    { key: "excused", label: "Excused", value: excused },
  ];
  if (!total) return <p className="db-sm adm-chart-empty">No attendance has been recorded yet.</p>;
  return (
    <div className="adm-split">
      <div className="adm-split-bar" role="img" aria-label={parts.map((p) => `${p.label} ${p.value}`).join(", ")}>
        {parts.map((p) =>
          p.value ? (
            <span
              key={p.key}
              className={`adm-split-seg adm-seg-${p.key}`}
              style={{ flexGrow: p.value }}
              title={`${p.label}: ${p.value} (${pct(p.value / total)})`}
            />
          ) : null
        )}
      </div>
      <ul className="adm-split-legend">
        {parts.map((p) => (
          <li key={p.key}>
            <span className={`adm-swatch adm-seg-${p.key}`} aria-hidden="true" />
            <span className="adm-split-name">{p.label}</span>
            <b>{p.value.toLocaleString("en-US")}</b>
            <span className="adm-split-pct">{pct(p.value / total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
