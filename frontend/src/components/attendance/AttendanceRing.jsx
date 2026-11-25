// src/components/attendance/AttendanceRing.jsx
// Circular attendance meter with the percentage in the middle (and an optional small label under it).
// Colours come from CSS variables so each page can theme it: --ring-track, --ring-text, --ring-sub.

export default function AttendanceRing({ pct, size, stroke, fontSize, color, label, className }) {
  const r = (size - stroke) / 2 - 1;
  const C = 2 * Math.PI * r;
  const c = size / 2;
  return (
    <svg className={className} width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${pct}%`}>
      <circle cx={c} cy={c} r={r} fill="none" style={{ stroke: "var(--ring-track, #EEF0F2)" }} strokeWidth={stroke} />
      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        style={{ stroke: color, "--ring-dash": `${((C * pct) / 100).toFixed(1)} ${C.toFixed(1)}` }}
        className="attendance-ring-fill"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${((C * pct) / 100).toFixed(1)} ${C.toFixed(1)}`}
        transform={`rotate(-90 ${c} ${c})`}
      />
      <text
        x={c}
        y={c + (label ? fontSize * 0.15 : fontSize * 0.36)}
        textAnchor="middle"
        fontSize={fontSize}
        fontWeight="700"
        style={{ fill: "var(--ring-text, currentColor)" }}
        fontFamily="inherit"
      >
        {pct}%
      </text>
      {label && (
        <text
          x={c}
          y={c + fontSize * 0.95}
          textAnchor="middle"
          fontSize="11"
          fontWeight="600"
          letterSpacing=".04em"
          style={{ fill: "var(--ring-sub, currentColor)" }}
          fontFamily="inherit"
        >
          {label}
        </text>
      )}
    </svg>
  );
}
