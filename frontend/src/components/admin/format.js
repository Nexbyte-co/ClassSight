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

export const teacherName = (userById, id) => (id == null ? "No teacher yet" : userById.get(id)?.name || `User #${id}`);

// A random 16-character password with upper and lower case, digits and symbols.
// Uses the browser's secure random source; every character class is always present.
export function generatePassword(length = 16) {
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", "!@#$%&*?-_+"];
  const all = sets.join("");
  const rand = (max) => {
    // rejection sampling: no modulo bias
    const limit = Math.floor(0x100000000 / max) * max;
    const buf = new Uint32Array(1);
    do crypto.getRandomValues(buf);
    while (buf[0] >= limit);
    return buf[0] % max;
  };
  const chars = sets.map((set) => set[rand(set.length)]);
  while (chars.length < length) chars.push(all[rand(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

// A subject = one course across batches, identified by its code (else its name). Used in subject URLs.
export const subjectKey = (c) => (c.course_code || c.course).toLowerCase();

// A batch name starts with its year digit(s) and degree letters: "3P1A" -> "3P", "1MCA2" -> "1MCA", "3C23" -> "3C".
// Names that don't start that way are returned unchanged.
export const degreeProgramme = (batchName) => {
  const m = /^\s*(\d+)\s*([A-Za-z]+)/.exec(batchName || "");
  return m ? `${m[1]}${m[2]}`.toUpperCase() : String(batchName || "").trim();
};

// Typical length in years of a degree programme label (used to suggest a batch's last year; always editable).
export const programmeYears = (label) => {
  const l = (label || "").toLowerCase();
  if (!l) return null;
  if (l.includes("integrated be-mba")) return 5;
  if (l.includes("lateral entry")) return 3;
  if (l.includes("(tiet pg)")) return 2; // MCA
  return 4; // BE / BTech / International Engineering Programme
};

// Which year of the course a batch that started in `startYear` is in now. The academic year runs July to June:
// a 2024 batch is in year 1 until June 2025 and in year 3 from July 2026 to June 2027 (same rule as the backend).
export function yearOfStudy(startYear, today = new Date()) {
  const academicStart = today.getMonth() >= 6 ? today.getFullYear() : today.getFullYear() - 1;
  return academicStart - startYear + 1;
}

// A subbatch's name continues its batch's name: 3C23 belongs to 3C2. Parent = the longest other batch name it starts with.
export const parentBatchOf = (batch, sections) =>
  sections
    .filter((s) => s.id !== batch.id && batch.name.length > s.name.length && batch.name.toLowerCase().startsWith(s.name.toLowerCase()))
    .sort((a, b) => b.name.length - a.name.length)[0] ?? null;
export const subbatchesOf = (batch, sections) => sections.filter((s) => s.id !== batch.id && parentBatchOf(s, sections)?.id === batch.id);
