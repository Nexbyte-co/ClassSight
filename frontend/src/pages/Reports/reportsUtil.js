// Small pure helpers shared by the Reports pages (no data in here).

const shortDate = (t) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
export const formatRange = (from, to) => `${shortDate(from)} – ${shortDate(to)}`;

export const LOW_ATTENDANCE_PCT = 75;

const isoDate = (t) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const rangeFileTag = (from, to) => `${isoDate(from)}-to-${isoDate(to)}`;

export function downloadStudentCsv(rows, filename) {
  const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [["Roll No", "Name", "Batch", "Classes Held", "Classes Attended", "Attendance %"]]
    .concat(rows.map((r) => [r.roll, r.name, r.batch, r.h, r.a, r.pct]))
    .map((row) => row.map(q).join(","));
  const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
