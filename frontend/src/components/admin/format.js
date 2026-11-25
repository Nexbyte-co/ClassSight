// Small display helpers shared by the admin pages.

export const pct = (value, digits = 0) =>
  value === null || value === undefined || Number.isNaN(value) ? "—" : `${(value * 100).toFixed(digits)}%`;

export const num = (value) => (value ?? 0).toLocaleString("en-US");

// "2026-11-09" -> "Mon, Nov 9" (date-only strings are parsed as local dates, not UTC).
export function shortDate(iso, { year = false } = {}) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(year ? { year: "numeric" } : {}),
  });
}

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// API weekday: 0 = Monday ... 6 = Sunday.
export const todayWeekday = () => (new Date().getDay() + 6) % 7;

export const hhmm = (t) => (t ? t.slice(0, 5) : "—");

// Builds and downloads a CSV from real rows. `columns`: [{ key, label }] or [label, (row) => value].
export function downloadCsv(filename, columns, rows) {
  const cols = columns.map((c) => (Array.isArray(c) ? { label: c[0], get: c[1] } : { label: c.label, get: (r) => r[c.key] }));
  const escape = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [cols.map((c) => escape(c.label)).join(",")];
  rows.forEach((r) => lines.push(cols.map((c) => escape(c.get(r))).join(",")));
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const teacherName = (userById, id) => userById.get(id)?.name || `User #${id}`;
